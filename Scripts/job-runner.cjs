// Local job runner for the /code-to-experience production loop.
//
// Runs ONLY the named jobs below (no arbitrary commands), one at a time, from JSON files dropped into
// artifacts/jobs/queue/ (git-ignored). It lets a remote assistant queue Blender renders, encodes,
// lint/build/tests and browser captures on this machine without typing into a terminal.
//
//   node Scripts/job-runner.cjs          (leave the window open; Ctrl+C stops it)
//
// Queue file: artifacts/jobs/queue/<id>.json  →  { "type": "<job>", ...arguments }
// Output:     artifacts/jobs/logs/<id>.log, artifacts/jobs/done/<id>.json (exit code, timings)
// Heartbeat:  artifacts/jobs/runner.json (updated every few seconds while running)
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const JOBS = path.join(ROOT, "artifacts", "jobs");
const DIRS = Object.fromEntries(["queue", "taken", "logs", "done"].map(d => [d, path.join(JOBS, d)]));
for (const dir of Object.values(DIRS)) fs.mkdirSync(dir, { recursive: true });

const NODE = process.execPath;
const bin = (...p) => path.join(ROOT, "node_modules", ...p);

function findBlender() {
  if (process.env.BLENDER && fs.existsSync(process.env.BLENDER)) return process.env.BLENDER;
  const base = "C:\\Program Files\\Blender Foundation";
  if (fs.existsSync(base)) {
    const dirs = fs.readdirSync(base).filter(d => /^Blender/i.test(d)).sort().reverse();
    for (const d of dirs) { const exe = path.join(base, d, "blender.exe"); if (fs.existsSync(exe)) return exe; }
  }
  return "blender"; // on PATH
}

// --- argument validation (strict: anything unexpected rejects the job) ---------------------------
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const oneOf = (v, list) => list.includes(v);
const label = v => typeof v === "string" && /^[a-z0-9][a-z0-9-]{0,40}$/.test(v);

let prodServer = null;
let devServer = null;

// Windows: kill the whole process tree (Next spawns workers).
function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill("SIGTERM");
}

function background(name, args) {
  const out = fs.createWriteStream(path.join(DIRS.logs, `${name}.log`), { flags: "a" });
  out.write(`\n[${new Date().toISOString()}] start ${args.join(" ")}\n`);
  const child = spawn(NODE, args, { cwd: ROOT, windowsHide: true, env: { ...process.env, FORCE_COLOR: "0" } });
  child.stdout.pipe(out); child.stderr.pipe(out);
  return child;
}

// Blender scenes this runner may execute (blender/scripts/<name>_scene.py), and the asset hosts it may download from.
const SCENES = ["pipeline", "runtime", "library"];
const FETCH_URL = /^https:\/\/dl\.polyhaven\.org\/file\/ph-assets\/(HDRIs\/hdr\/[12]k\/[a-z0-9_]+_[12]k\.hdr|Textures\/jpg\/[12]k\/[a-z0-9_]+\/[a-z0-9_]+_(diff|nor_gl|rough|arm|ao|disp)_[12]k\.jpg)$/;
const renderDir = (scene, variant) => (scene === "pipeline" ? variant : `${scene}-${variant}`);

const JOB_TYPES = {
  // Blender: preview renders a few frames into blender/renders/preview-<scene>-<variant>/ (never the published
  // sequence); render renders frames into blender/renders/<scene>-<variant>/ (pipeline: <variant>) and exports packet.json.
  blender(job) {
    const scene = job.scene ?? "pipeline";
    if (!oneOf(scene, SCENES)) throw new Error("scene");
    if (!oneOf(job.variant, ["desktop", "mobile"]) || !oneOf(job.mode, ["preview", "render", "export"])) throw new Error("variant/mode");
    const args = ["-b", "--factory-startup", "-P", path.join(ROOT, "blender", "scripts", `${scene}_scene.py`), "--",
      "--variant", job.variant, "--mode", job.mode === "preview" ? "render" : job.mode];
    if (job.label !== undefined) {   // benchmark / experiment output: blender/renders/bench-<label>, never the production folders
      if (!label(job.label) || job.mode !== "preview") throw new Error("label (preview mode only)");
      args.push("--out", `bench-${job.label}`, "--no-export", "1");
    } else if (job.mode === "preview") args.push("--out", scene === "pipeline" ? `preview-${job.variant}` : `preview-${scene}-${job.variant}`, "--no-export", "1");
    else args.push("--out", renderDir(scene, job.variant));
    if (job.frames !== undefined) {
      if (!Array.isArray(job.frames) || !job.frames.length || job.frames.length > 400 || !job.frames.every(f => isInt(f, 0, 2000))) throw new Error("frames");
      args.push("--frames", job.frames.join(","));
    }
    if (job.samples !== undefined) { if (!isInt(job.samples, 1, 256)) throw new Error("samples"); args.push("--samples", String(job.samples)); }
    if (job.scale !== undefined) { if (!isInt(job.scale, 10, 100)) throw new Error("scale"); args.push("--scale", String(job.scale)); }
    if (job.engine !== undefined) { if (!oneOf(job.engine, ["eevee", "cycles"])) throw new Error("engine"); args.push("--engine", job.engine); }
    if (job.device !== undefined) { if (!oneOf(job.device, ["optix", "cuda", "cpu"])) throw new Error("device"); args.push("--device", job.device); }
    return [findBlender(), args, {}, { monitor: job.monitor === true }];
  },
  encode(job) {
    const q = job.quality ?? 68;
    const scene = job.scene ?? "pipeline";
    if (!isInt(q, 30, 95) || !oneOf(scene, SCENES)) throw new Error("quality/scene");
    return [NODE, [path.join(ROOT, "Scripts", "encode-cinematic.cjs"), scene, String(q)]];
  },
  // CC0 asset download (Poly Haven only, whitelisted file patterns, size-capped, licence logged).
  fetch(job) {
    if (typeof job.url !== "string" || !FETCH_URL.test(job.url)) throw new Error("url not whitelisted");
    return { special: "fetch", url: job.url };
  },
  // Extra Playwright browsers for compatibility checks.
  "playwright-install"(job) {
    if (!oneOf(job.browser, ["firefox", "webkit"])) throw new Error("browser");
    return [NODE, [bin("@playwright", "test", "cli.js"), "install", job.browser]];
  },
  // Core Web Vitals (LCP, CLS, INP proxy) against the production server on :3300.
  vitals: () => [NODE, [path.join(ROOT, "Scripts", "vitals-cte.cjs")]],
  lint: () => [NODE, [bin("eslint", "bin", "eslint.js")]],
  build: () => [NODE, [bin("next", "dist", "bin", "next"), "build"]],
  playwright(job) {
    const args = [bin("@playwright", "test", "cli.js"), "test"];
    if (job.spec !== undefined) {
      if (typeof job.spec !== "string" || !/^[a-z0-9-]+\.spec\.cjs$/.test(job.spec) || !fs.existsSync(path.join(ROOT, "tests", job.spec))) throw new Error("spec");
      args.push(`tests/${job.spec}`);
    }
    if (job.project !== undefined) { if (!oneOf(job.project, ["desktop", "tablet", "mobile"])) throw new Error("project"); args.push(`--project=${job.project}`); }
    if (job.grep !== undefined) { if (typeof job.grep !== "string" || !/^[A-Za-z0-9 ,.'()-]{1,80}$/.test(job.grep)) throw new Error("grep"); args.push("-g", job.grep); }
    // extraBrowsers adds the firefox/webkit projects defined in playwright.config.cjs (PW_EXTRA_BROWSERS=1).
    return [NODE, args, job.extraBrowsers === true ? { PW_EXTRA_BROWSERS: "1" } : {}];
  },
  // Headless captures / recording / profiling use the scripts already in Scripts/.
  capture(job) {
    if (!label(job.label)) throw new Error("label");
    const env = {};
    if (job.steps !== undefined) {
      if (!Array.isArray(job.steps) || !job.steps.length || job.steps.length > 40 || !job.steps.every(s => typeof s === "number" && s >= 0 && s <= 11)) throw new Error("steps");
      env.CTE_STEPS = job.steps.join(",");
    }
    if (job.url !== undefined) { if (!oneOf(job.url, ["dev", "prod"])) throw new Error("url"); env.CTE_URL = job.url === "prod" ? "http://127.0.0.1:3300/code-to-experience" : "http://localhost:3200/code-to-experience"; }
    if (job.skipTablet) env.CTE_SKIP_TABLET = "1";
    return [NODE, [path.join(ROOT, "Scripts", "capture-cte-transition.cjs"), job.label], env];
  },
  record(job) {
    const env = {};
    if (job.to !== undefined) { if (!label(job.to)) throw new Error("to"); env.CTE_RECORD_TO = job.to; }
    if (job.url !== undefined) { if (!oneOf(job.url, ["dev", "prod"])) throw new Error("url"); env.CTE_URL = job.url === "prod" ? "http://127.0.0.1:3300/code-to-experience" : "http://localhost:3200/code-to-experience"; }
    return [NODE, [path.join(ROOT, "Scripts", "record-cte-transition.cjs")], env];
  },
  profile(job) {
    const args = [path.join(ROOT, "Scripts", "profile-cte-scroll.cjs")];
    if (job.only !== undefined) { if (!oneOf(job.only, ["desktop", "mobile"])) throw new Error("only"); args.push(`--only=${job.only}`); }
    if (job.throttle !== undefined) { if (!isInt(job.throttle, 1, 6)) throw new Error("throttle"); args.push(`--throttle=${job.throttle}`); }
    if (job.to !== undefined) { if (typeof job.to !== "number" || job.to <= 0 || job.to > 10) throw new Error("to"); args.push(`--to=${job.to}`); }
    if (job.block !== undefined) { if (!oneOf(job.block, ["cinematic"])) throw new Error("block"); args.push(`--block=${job.block}`); }
    return [NODE, args];
  },
  // Production server on 127.0.0.1:3300 for profiling (start after a successful build; stop when done).
  "prod-server"(job) {
    if (!oneOf(job.action, ["start", "stop"])) throw new Error("action");
    return { special: `prod-${job.action}` };
  },
  // Dev server on :3200, managed here so it can be stopped to free RAM during Blender renders.
  "dev-server"(job) {
    if (!oneOf(job.action, ["start", "stop"])) throw new Error("action");
    return { special: `dev-${job.action}` };
  },
  // Memory report: totals plus the 20 largest processes (read-only).
  sysinfo: () => ({ special: "sysinfo" }),
  // Read-only GPU report: nvidia-smi capabilities and use, Windows display adapters, per-app GPU preferences.
  gpuinfo: () => ({ special: "gpuinfo" }),
  // Safe runner self-test: duplicate-instance refusal, atomic claim, child-tree cleanup, Blender failure detection,
  // heartbeat freshness. Uses throwaway processes and a temporary folder only.
  selftest: () => ({ special: "selftest" }),
  // Dependency audit (read-only; npm audit reports, it does not change packages). scope: all | prod
  audit(job) {
    const scope = job.scope ?? "all";
    if (!oneOf(scope, ["all", "prod"])) throw new Error("scope");
    const npmCli = path.join(path.dirname(NODE), "node_modules", "npm", "bin", "npm-cli.js");
    return [NODE, [npmCli, "audit", "--json", ...(scope === "prod" ? ["--omit=dev"] : [])]];
  },
  // Copy-only backup of production assets to <drive>:\Engineering-Observatory with size + SHA-256 verification.
  backup(job) {
    const root = job.root ?? "G:\\Engineering-Observatory";
    if (!/^[D-Z]:\\Engineering-Observatory$/.test(root)) throw new Error("root must be <drive>:\\Engineering-Observatory");
    return { special: "backup", root };
  },
  // Controlled stall diagnosis against the production server (Scripts/diagnose-stalls.cjs).
  diagnose: () => [NODE, [path.join(ROOT, "Scripts", "diagnose-stalls.cjs")]],
  // Read-only Git reporting for the release summary (no writes: status, diff statistics, recent log, one file's diff).
  git(job) {
    const views = { status: ["status", "--short", "--branch"], stat: ["diff", "--stat"], log: ["log", "-8", "--oneline", "--decorate"],
                    untracked: ["ls-files", "--others", "--exclude-standard"] };
    if (job.view === "diff") {
      if (typeof job.path !== "string" || !/^[A-Za-z0-9_./-]{1,160}$/.test(job.path) || job.path.includes("..")) throw new Error("path");
      return ["git", ["--no-pager", "diff", "--", job.path]];
    }
    if (!views[job.view]) throw new Error("view");
    return ["git", ["--no-pager", ...views[job.view]]];
  },
};

function stamp() { return new Date().toISOString(); }

function heartbeat(extra = {}) {
  fs.writeFileSync(path.join(JOBS, "runner.json"), JSON.stringify({ pid: process.pid, version: 4.1, alive: stamp(), devServer: Boolean(devServer), prodServer: Boolean(prodServer), freeGB: +(os.freemem() / 1073741824).toFixed(2), ...extra }, null, 2));
}

let busy = false;
let currentChild = null;

function tracebackIn(text) { return /Traceback \(most recent call last\)/.test(text); }

async function runSelftest(log) {
  const out = [];
  const record = (name, pass, detail) => { out.push({ name, pass, detail }); log.write(`${pass ? "PASS" : "FAIL"} ${name}: ${detail}\n`); };
  // 1. A second runner must refuse to start while this one is alive.
  const dup = spawnSync(NODE, [path.join(ROOT, "Scripts", "job-runner.cjs")], { cwd: ROOT, encoding: "utf8", timeout: 20000, windowsHide: true });
  record("duplicate runner refused", dup.status === 1 && /Another job runner is already active/.test(dup.stderr + dup.stdout),
    `exit ${dup.status}, "${(dup.stderr || dup.stdout).trim().split(/\r?\n/)[0]}"`);
  // 2. Atomic claim: the second rename of the same job must fail (ENOENT), so two runners cannot both take it.
  const tmp = path.join(JOBS, `selftest-${process.pid}`);
  fs.mkdirSync(tmp, { recursive: true });
  const a = path.join(tmp, "job.json");
  fs.writeFileSync(a, "{}");
  fs.renameSync(a, path.join(tmp, "claimed-1.json"));
  let second = "renamed";
  try { fs.renameSync(a, path.join(tmp, "claimed-2.json")); } catch (error) { second = error.code; }
  record("atomic claim", second === "ENOENT", `second claim → ${second}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  // 3. Child cleanup: a harmless child that starts its own child; killTree must end both.
  const tree = spawn(NODE, ["-e", "const c=require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(c.pid);setInterval(()=>{},1000)"], { windowsHide: true });
  const grandchild = await new Promise(resolve => { tree.stdout.once("data", d => resolve(Number(String(d).trim()))); setTimeout(() => resolve(null), 5000); });
  killTree(tree);
  await new Promise(r => setTimeout(r, 1500));
  record("child tree cleanup", grandchild && !pidAlive(tree.pid) && !pidAlive(grandchild), `child ${tree.pid} alive=${pidAlive(tree.pid)}, grandchild ${grandchild} alive=${grandchild ? pidAlive(grandchild) : "?"}`);
  // 4. Blender exits 0 when its script raises; the runner must still see the failure.
  const bl = spawnSync(findBlender(), ["-b", "--factory-startup", "--python-expr", "raise RuntimeError('runner selftest')"], { encoding: "utf8", timeout: 90000, windowsHide: true });
  record("Blender script failure detected", tracebackIn((bl.stdout || "") + (bl.stderr || "")), `blender exit ${bl.status}, traceback found → job would be marked exit 3`);
  // 5. Heartbeat freshness (after a pause, since the synchronous checks above briefly hold the event loop).
  await new Promise(r => setTimeout(r, 2500));
  let age = Infinity;
  try { age = Date.now() - Date.parse(JSON.parse(fs.readFileSync(path.join(JOBS, "runner.json"), "utf8")).alive); } catch { /* unreadable */ }
  record("heartbeat fresh", age < 5000, `${Math.round(age)} ms old`);
  return out;
}

// Copy-only backup with verification. Never deletes; copies a file only when missing or different in size.
async function runBackup(root, log) {
  const crypto = require("node:crypto");
  if (!fs.existsSync(path.parse(root).root)) throw new Error(`drive ${path.parse(root).root} not available`);
  const map = [
    ["blender/renders", "Production-Assets/Raw-Renders"],
    ["blender/scripts", "Production-Assets/Blender/scripts"],
    ["blender/assets/polyhaven/hdri", "Production-Assets/HDRI"],
    ["blender/assets/polyhaven/textures", "Production-Assets/PBR-Textures"],
    ["blender/assets/polyhaven/LICENSES.json", "Asset-Manifests/polyhaven-LICENSES.json"],
    ["artifacts/code-to-experience-transition/recording", "Recordings"],
    ["artifacts/code-to-experience-transition", "Visual-QA/code-to-experience-transition", "recording"],
    ["artifacts/m4-evidence", "Visual-QA/m4-evidence"],
    ["artifacts/comparison-m3-m4", "Visual-QA/comparison-m3-m4"],
    ["artifacts/claude-review", "Visual-QA/claude-review"],
    ["artifacts/visual-review", "Visual-QA/visual-review"],
    ["artifacts/code-to-experience-review", "Visual-QA/code-to-experience-review"],
    ["artifacts/chapter01-before", "Visual-QA/chapter01-before"],
    ["artifacts/diagnostics", "Performance/diagnostics"],
    ["artifacts/jobs/logs", "Performance/job-logs"],
    ["artifacts/m4-evidence/gpu-benchmark", "Benchmarks/gpu-benchmark"],
    ["artifacts/checkpoint-m3-2026-11-19", "Checkpoints/checkpoint-m3-2026-11-19"],
    ["artifacts/checkpoint-m4-pre", "Checkpoints/checkpoint-m4-pre"],
    ["artifacts/checkpoint-rc-approved-2026-11-20", "Checkpoints/checkpoint-rc-approved-2026-11-20"],
    ["artifacts/inherited-2026-11-19T0310Z", "Checkpoints/inherited-2026-11-19T0310Z"],
    ["public/cinematic", "Release-Backups/public-cinematic"],
    ["docs", "Documentation/docs"],
  ];
  const files = [];
  const walk = (src, dst, skip) => {
    const full = path.join(ROOT, src);
    if (!fs.existsSync(full)) return;
    if (fs.statSync(full).isFile()) { files.push([full, path.join(root, dst)]); return; }
    for (const e of fs.readdirSync(full, { withFileTypes: true })) {
      if (skip && e.name === skip) continue;
      if (e.isDirectory()) walk(path.join(src, e.name), path.join(dst, e.name));
      else if (e.isFile()) files.push([path.join(full, e.name), path.join(root, dst, e.name)]);
    }
  };
  for (const [src, dst, skip] of map) walk(src, dst, skip);
  const bytes = files.reduce((s, [f]) => s + fs.statSync(f).size, 0);
  const free = fs.statfsSync ? (() => { const st = fs.statfsSync(path.parse(root).root); return st.bavail * st.bsize; })() : null;
  log.write(`backup: ${files.length} files, ${(bytes / 1073741824).toFixed(2)} GB → ${root}; free ${free ? (free / 1073741824).toFixed(1) + " GB" : "unknown"}\n`);
  if (free !== null && free < bytes * 2) throw new Error("not enough free space on the destination (need 2x the backup size)");
  for (const d of ["Production-Assets/Blender", "Production-Assets/Raw-Renders", "Production-Assets/HDRI", "Production-Assets/PBR-Textures", "Recordings", "Visual-QA",
                   "Performance", "Benchmarks", "Checkpoints", "Release-Backups", "Documentation", "Asset-Manifests"]) fs.mkdirSync(path.join(root, d), { recursive: true });
  let copied = 0;
  const breathe = i => (i % 10 === 0 ? new Promise(r => setImmediate(r)) : null);   // keep the heartbeat ticking
  for (const [i, [src, dst]] of files.entries()) {
    await breathe(i);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) { fs.copyFileSync(src, dst); copied++; }
  }
  const sha = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  const mismatches = [];
  const entries = [];
  for (const [i, [src, dst]] of files.entries()) {
    await breathe(i);
    if (!fs.existsSync(dst)) { mismatches.push({ src, problem: "missing" }); continue; }
    const s1 = fs.statSync(src).size, s2 = fs.statSync(dst).size;
    const h1 = sha(src), h2 = sha(dst);
    if (s1 !== s2 || h1 !== h2) mismatches.push({ src, problem: s1 !== s2 ? "size" : "sha256" });
    entries.push({ file: path.relative(ROOT, src), dest: path.relative(root, dst), bytes: s1, sha256: h1 });
  }
  const stampId = stamp().replace(/[:.]/g, "-");
  const report = { root, createdAt: stamp(), files: files.length, bytes, copiedThisRun: copied, mismatches, entries };
  const local = path.join(ROOT, "artifacts", "backup");
  fs.mkdirSync(local, { recursive: true });
  const reportPath = path.join(local, `backup-report-${stampId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(root, "Documentation", `backup-report-${stampId}.json`), JSON.stringify(report, null, 1));
  log.write(`backup verified: ${files.length} files, ${mismatches.length} mismatches, copied this run ${copied}; report ${reportPath}\n`);
  return { ...report, reportPath };
}

// Samples GPU memory/utilisation (nvidia-smi, 1 s) and free system RAM while a job runs.
function startMonitor() {
  const gpu = [];
  const ram = [];
  let smi = null;
  try {
    smi = spawn("nvidia-smi", ["--query-gpu=memory.used,utilization.gpu", "--format=csv,noheader,nounits", "-lms", "1000"], { windowsHide: true });
    smi.stdout.on("data", d => { for (const line of d.toString().split(/\r?\n/)) { const [m, u] = line.split(",").map(Number); if (Number.isFinite(m)) gpu.push({ m, u }); } });
    smi.on("error", () => { smi = null; });
  } catch { smi = null; }
  const timer = setInterval(() => ram.push(os.freemem() / 1048576), 1000);
  return {
    stop() {
      clearInterval(timer);
      try { smi?.kill(); } catch { /* gone */ }
      return { samples: gpu.length, peakVramMB: gpu.length ? Math.max(...gpu.map(x => x.m)) : null, meanGpuUtil: gpu.length ? Math.round(gpu.reduce((s, x) => s + x.u, 0) / gpu.length) : null,
        peakGpuUtil: gpu.length ? Math.max(...gpu.map(x => x.u)) : null, minFreeRamMB: ram.length ? Math.round(Math.min(...ram)) : null };
    },
  };
}
async function runJob(file) {
  const id = path.basename(file, ".json");
  const taken = path.join(DIRS.taken, `${id}.json`);
  try { fs.renameSync(file, taken); }       // atomic claim: if it fails, something else took the job
  catch (error) { console.log(`[${stamp()}] ${id}: not claimed (${error.code})`); return; }
  const log = fs.createWriteStream(path.join(DIRS.logs, `${id}.log`));
  const result = { id, startedAt: stamp() };
  try {
    const job = JSON.parse(fs.readFileSync(taken, "utf8"));
    const make = JOB_TYPES[job.type];
    if (!make) throw new Error(`unknown job type ${job.type}`);
    result.type = job.type;
    const spec = make(job);
    if (spec.special) {
      const sp = spec.special;
      if (sp === "prod-start" && !prodServer) {
        prodServer = background("prod-server", [bin("next", "dist", "bin", "next"), "start", "--hostname", "127.0.0.1", "--port", "3300"]);
        prodServer.on("exit", () => { prodServer = null; });
        await new Promise(r => setTimeout(r, 6000));
      } else if (sp === "prod-stop") { killTree(prodServer); prodServer = null; }
      else if (sp === "dev-start" && !devServer) {
        devServer = background("dev-server", [bin("next", "dist", "bin", "next"), "dev", "--webpack", "--port", "3200"]);
        devServer.on("exit", () => { devServer = null; });
        await new Promise(r => setTimeout(r, 8000));
      } else if (sp === "dev-stop") { killTree(devServer); devServer = null; }
      else if (sp === "fetch") {
        const name = spec.url.split("/").pop();
        const kind = spec.url.includes("/HDRIs/") ? "hdri" : "textures";
        const dir = path.join(ROOT, "blender", "assets", "polyhaven", kind);
        fs.mkdirSync(dir, { recursive: true });
        const res = await fetch(spec.url);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${spec.url}`);
        const declared = Number(res.headers.get("content-length") || 0);
        if (declared > 60 * 1048576) throw new Error(`refusing ${declared} bytes`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 60 * 1048576) throw new Error("too large");
        fs.writeFileSync(path.join(dir, name), buf);
        const sha = require("node:crypto").createHash("sha256").update(buf).digest("hex");
        const ledger = path.join(ROOT, "blender", "assets", "polyhaven", "LICENSES.json");
        const list = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, "utf8")) : [];
        list.push({ file: `${kind}/${name}`, url: spec.url, bytes: buf.length, sha256: sha, licence: "CC0 1.0 (Poly Haven)", fetched: stamp() });
        fs.writeFileSync(ledger, JSON.stringify(list, null, 2));
        log.write(`saved ${kind}/${name} (${buf.length} bytes, sha256 ${sha})\n`);
      }
      else if (sp === "selftest") {
        const report = await runSelftest(log);
        result.selftest = report;
        result.exitCode = report.every(r => r.pass) ? 0 : 4;
      }
      else if (sp === "backup") {
        const report = await runBackup(spec.root, log);
        result.backup = { files: report.files, bytes: report.bytes, mismatches: report.mismatches.length, report: report.reportPath };
        result.exitCode = report.mismatches.length ? 5 : 0;
      }
      else if (sp === "gpuinfo") {
        const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: "utf8", windowsHide: true }); return (r.stdout || "") + (r.stderr || "") || `(${cmd} unavailable)`; };
        log.write("== nvidia-smi\n" + run("nvidia-smi", ["--query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw,power.limit,pstate,compute_cap", "--format=csv"]));
        log.write("== nvidia-smi processes\n" + run("nvidia-smi", ["--query-compute-apps=pid,process_name,used_memory", "--format=csv"]));
        log.write("== nvidia-smi -q (clocks/memory)\n" + run("nvidia-smi", ["-q", "-d", "MEMORY,CLOCK,UTILIZATION"]).slice(0, 6000));
        log.write("== Windows display adapters\n" + run("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,AdapterRAM,CurrentHorizontalResolution | Format-List | Out-String"]));
        log.write("== Per-app GPU preferences (HKCU, read-only)\n" + run("reg", ["query", "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences"]));
      }
      else if (sp === "sysinfo") {
        const gb = n => (n / 1073741824).toFixed(2);
        log.write(`total ${gb(os.totalmem())} GB, free ${gb(os.freemem())} GB, cpus ${os.cpus().length}\n`);
        const tl = spawnSync("tasklist", ["/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true });
        const rows = (tl.stdout || "").trim().split(/\r?\n/).map(l => l.split('","').map(c => c.replace(/"/g, "")))
          .map(c => ({ name: c[0], pid: c[1], kb: Number((c[4] || "0").replace(/[^0-9]/g, "")) }))
          .sort((a, b) => b.kb - a.kb).slice(0, 20);
        for (const r of rows) log.write(`${(r.kb / 1024).toFixed(0).padStart(7)} MB  ${r.name} (${r.pid})\n`);
        const wm = spawnSync("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVirtualMemorySize,FreeVirtualMemorySize,TotalVisibleMemorySize,FreePhysicalMemory | ConvertTo-Json"], { encoding: "utf8", windowsHide: true });
        log.write(`commit/physical (KB): ${wm.stdout || wm.stderr}\n`);
      }
      result.exitCode ??= 0;
    } else {
      const [cmd, args, env = {}, opts = {}] = spec;
      console.log(`[${stamp()}] ${id}: ${job.type} → ${path.basename(cmd)} ${args.map(a => path.basename(String(a))).join(" ")}`);
      log.write(`$ ${cmd} ${args.join(" ")}\n`);
      heartbeat({ running: id, type: job.type });
      const monitor = opts.monitor ? startMonitor() : null;
      result.exitCode = await new Promise(resolve => {
        const child = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env, FORCE_COLOR: "0" }, windowsHide: true });
        currentChild = child;
        child.stdout.on("data", d => { log.write(d); process.stdout.write(d); });
        child.stderr.on("data", d => { log.write(d); process.stderr.write(d); });
        child.on("error", e => { log.write(`spawn error: ${e.message}\n`); resolve(-1); });
        child.on("exit", code => resolve(code ?? -1));
      });
      currentChild = null;
      if (monitor) { result.monitor = monitor.stop(); log.write(`monitor: ${JSON.stringify(result.monitor)}\n`); }
    }
  } catch (error) {
    result.exitCode = -2;
    result.error = String(error.message || error);
    log.write(`rejected: ${result.error}\n`);
    console.log(`[${stamp()}] ${id}: rejected (${result.error})`);
  }
  result.endedAt = stamp();
  log.end();
  // Blender exits 0 even when the scene script raises: treat a Python traceback in the log as a failure.
  if (result.type === "blender" && result.exitCode === 0) {
    await new Promise(r => (log.writableFinished ? r() : log.once("finish", r)));
    const text = fs.readFileSync(path.join(DIRS.logs, `${id}.log`), "utf8");
    if (/Traceback \(most recent call last\)/.test(text)) { result.exitCode = 3; result.error = "Python exception in the Blender script (see log)"; }
  }
  fs.writeFileSync(path.join(DIRS.done, `${id}.json`), JSON.stringify(result, null, 2));
  console.log(`[${stamp()}] ${id}: exit ${result.exitCode}`);
}

async function poll() {
  heartbeat();
  if (busy) return;
  const next = fs.readdirSync(DIRS.queue).filter(f => f.endsWith(".json")).sort()[0];
  if (!next) return;
  busy = true;
  try { await runJob(path.join(DIRS.queue, next)); } finally { busy = false; heartbeat(); }
}

// Single instance: refuse to start while another runner (this version or an older one without a lock) is alive and
// heartbeating, so two runners can never take jobs from the same queue (two Blender renders exhausted memory).
const LOCK = path.join(JOBS, "runner.lock");
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; } }
function liveOther() {
  for (const file of [path.join(JOBS, "runner.json"), LOCK]) {
    try {
      const info = JSON.parse(fs.readFileSync(file, "utf8"));
      const fresh = Date.now() - Date.parse(info.alive || info.started) < 120000;
      if (info.pid && info.pid !== process.pid && pidAlive(info.pid) && fresh) return info.pid;
    } catch { /* missing or unreadable: not a live runner */ }
  }
  return null;
}
const other = liveOther();
if (other) {
  console.error(`Another job runner is already active (PID ${other}). This one exits so only one runner processes the queue.`);
  process.exit(1);
}
fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, started: stamp(), alive: stamp() }));
setInterval(() => { try { fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, alive: stamp() })); } catch { /* next tick */ } }, 15000);
process.on("exit", () => { try { if (JSON.parse(fs.readFileSync(LOCK, "utf8")).pid === process.pid) fs.unlinkSync(LOCK); } catch { /* already gone */ } });
// Interrupted jobs (claimed but never finished, e.g. the laptop slept or the runner was stopped) are reported and
// recorded as interrupted; they are not re-run automatically — requeue only the missing work after checking it.
for (const f of fs.readdirSync(DIRS.taken).filter(f => f.endsWith(".json"))) {
  const id = path.basename(f, ".json");
  if (fs.existsSync(path.join(DIRS.done, `${id}.json`))) continue;
  fs.writeFileSync(path.join(DIRS.done, `${id}.json`), JSON.stringify({ id, exitCode: -3, error: "interrupted: claimed but never finished (runner stopped); requeue missing work deliberately", endedAt: stamp() }, null, 2));
  console.log(`[${stamp()}] ${id}: marked interrupted (not re-run)`);
}
console.log(`Job runner v4.1 (PID ${process.pid}) watching ${DIRS.queue}`);
console.log(`Blender: ${findBlender()}`);
setInterval(() => { poll().catch(e => console.error(e)); }, 2000);
for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.on(sig, () => { killTree(currentChild); killTree(prodServer); killTree(devServer); process.exit(0); });
}
