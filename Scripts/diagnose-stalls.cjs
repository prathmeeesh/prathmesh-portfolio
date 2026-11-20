// Controlled diagnosis of scroll stalls on /code-to-experience (production server on 127.0.0.1:3300).
// Usage: node Scripts/diagnose-stalls.cjs            (CTE_URL overrides the server)
// Runs one browser per GPU preference and, inside each, a small matrix of scroll scrubs (t 0 → 9.5 → 0):
//   films on / films off (rendered sequences blocked), CPU 1x / 4x, desktop / mobile viewport,
//   each as a cold pass (new context, empty cache) followed by a warm pass (same context, cached frames).
// For every run it records frame gaps (rAF), long tasks, JS heap, Windows available memory and commit charge
// (typeperf, 1 s), the WebGL renderer, and — for traced runs — which browser work overlapped each stall
// (Chromium trace: GC, image decode, raster, paint, GPU, script, by thread). Output: artifacts/diagnostics/.
const { chromium } = require("@playwright/test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const URL = process.env.CTE_URL || "http://127.0.0.1:3300/code-to-experience";
const OUT = path.resolve("artifacts", "diagnostics");
fs.mkdirSync(OUT, { recursive: true });
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const TO = 9.5;
const STALL_MS = 50;
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
const RUNS = [
  { id: "A films on · default GPU · 1x · desktop", gpu: "default", films: true, cpu: 1, vp: "desktop", trace: true },
  { id: "B films off · default GPU · 1x · desktop", gpu: "default", films: false, cpu: 1, vp: "desktop" },
  { id: "C films on · default GPU · 4x · desktop", gpu: "default", films: true, cpu: 4, vp: "desktop" },
  { id: "D films on · default GPU · 1x · mobile", gpu: "default", films: true, cpu: 1, vp: "mobile" },
  { id: "E films on · high-performance GPU · 1x · desktop", gpu: "high", films: true, cpu: 1, vp: "desktop", trace: true },
  { id: "F films off · high-performance GPU · 1x · desktop", gpu: "high", films: false, cpu: 1, vp: "desktop" },
  { id: "G films on · default GPU · 1x · desktop · slow network (1.6 Mbps, 150 ms)", gpu: "default", films: true, cpu: 1, vp: "desktop", net: true },
  { id: "H films on · default GPU · 4x · mobile", gpu: "default", films: true, cpu: 4, vp: "mobile" },
];

// Windows memory sampler: available MB, committed bytes and commit limit once a second.
function memorySampler() {
  const samples = [];
  let child = null;
  try {
    child = spawn("typeperf", ["\\Memory\\Available MBytes", "\\Memory\\Committed Bytes", "\\Memory\\Commit Limit", "-si", "1"], { windowsHide: true });
    let buf = "";
    child.stdout.on("data", d => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) {
        const cells = line.split('","').map(c => c.replace(/"/g, ""));
        if (cells.length === 4 && !Number.isNaN(Number(cells[1]))) samples.push({ availMB: Number(cells[1]), committed: Number(cells[2]), limit: Number(cells[3]) });
      }
    });
    child.on("error", () => { child = null; });
  } catch { child = null; }
  // GPU memory and utilisation from nvidia-smi (the RTX 3050); the Intel iGPU has no equivalent counter here.
  const gpu = [];
  let smi = null;
  try {
    smi = spawn("nvidia-smi", ["--query-gpu=memory.used,utilization.gpu", "--format=csv,noheader,nounits", "-lms", "1000"], { windowsHide: true });
    smi.stdout.on("data", d => { for (const line of d.toString().split(/\r?\n/)) { const [m, u] = line.split(",").map(Number); if (Number.isFinite(m)) gpu.push({ m, u }); } });
    smi.on("error", () => { smi = null; });
  } catch { smi = null; }
  return {
    stop() {
      child?.kill();
      try { smi?.kill(); } catch { /* gone */ }
      const nvidia = gpu.length ? { peakVramMB: Math.max(...gpu.map(x => x.m)), meanUtil: Math.round(gpu.reduce((a, x) => a + x.u, 0) / gpu.length), peakUtil: Math.max(...gpu.map(x => x.u)) } : null;
      if (!samples.length) return { nvidia };
      const minAvail = Math.min(...samples.map(s => s.availMB));
      const maxCommitPct = Math.max(...samples.map(s => (100 * s.committed) / s.limit));
      return { samples: samples.length, minAvailableMB: Math.round(minAvail), maxCommitPercent: +maxCommitPct.toFixed(1),
        commitLimitGB: +(samples[0].limit / 1073741824).toFixed(2), nvidia };
    },
  };
}

async function scrub(page, end) {
  const steps = 240;
  const dy = end / steps;
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy); await page.waitForTimeout(16); }
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, -dy); await page.waitForTimeout(16); }
  await page.waitForFunction(() => new Promise(r => { const y = scrollY; setTimeout(() => r(scrollY === y), 300); }), null, { timeout: 10000 }).catch(() => {});
}

async function pass(page, label, geometry) {
  await page.evaluate(() => {
    window.__f = []; window.__lt = [];
    try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push({ start: e.startTime, dur: e.duration }))).observe({ type: "longtask" }); } catch { /* not supported */ }
    let last = performance.now();
    // Per frame: playback health from the film canvases (QA data attributes): requested-vs-drawn frame lag, downloads
    // in flight, decoded frames held, and "blank" = a visible film canvas that has not drawn any frame yet.
    const canvases = [...document.querySelectorAll("canvas.cte-sequence")];
    const loop = now => {
      let lag = 0, inflight = 0, decoded = 0, blank = 0;
      for (const c of canvases) {
        inflight += Number(c.dataset.inflight || 0);
        decoded += Number(c.dataset.decoded || 0);
        if (Number(c.style.opacity || 0) > 0.5) {
          if (c.dataset.frame === undefined) blank = 1;
          else lag = Math.max(lag, Math.abs(Number(c.dataset.wanted || c.dataset.frame) - Number(c.dataset.frame)));
        }
      }
      window.__f.push([last, now, scrollY, lag, inflight, decoded, blank]);
      last = now;
      window.__raf = requestAnimationFrame(loop);
    };
    window.__raf = requestAnimationFrame(loop);
    performance.mark("cte-diag-sync");
  });
  const t0 = Date.now();
  await scrub(page, geometry.end);
  const raw = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    const sync = performance.getEntriesByName("cte-diag-sync").at(-1)?.startTime ?? 0;
    performance.clearMarks("cte-diag-sync");
    return { f: window.__f.slice(3), lt: window.__lt, sync, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null };
  });
  const gaps = raw.f.map(([a, b, y]) => ({ start: a, end: b, ms: b - a, y }));
  const health = {
    maxFrameLag: Math.max(0, ...raw.f.map(x => x[3])),
    framesLagOver3: raw.f.filter(x => x[3] > 3).length,
    maxInflight: Math.max(0, ...raw.f.map(x => x[4])),
    maxDecoded: Math.max(0, ...raw.f.map(x => x[5])),
    blankFrames: raw.f.filter(x => x[6]).length,
  };
  const sorted = gaps.map(g => g.ms).sort((a, b) => a - b);
  const q = p => +(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0).toFixed(1);
  const toT = y => { const a = geometry.tops; for (let i = 0; i < a.length - 1; i++) if (y < a[i + 1]) return i + (y - a[i]) / (a[i + 1] - a[i]); return a.length - 1; };
  return {
    label, seconds: +((Date.now() - t0) / 1000).toFixed(1), frames: gaps.length, median: q(0.5), p95: q(0.95), max: +(sorted.at(-1) ?? 0).toFixed(1),
    over33: sorted.filter(x => x > 33.4).length, over100: sorted.filter(x => x > 100).length,
    longTasks: raw.lt.length, longTaskMs: Math.round(raw.lt.reduce((s, x) => s + x.dur, 0)), jsHeapMB: raw.heapMB, ...health,
    worst: gaps.slice().sort((a, b) => b.ms - a.ms).slice(0, 6).map(g => ({ ms: +g.ms.toFixed(1), atT: +toT(g.y).toFixed(2) })),
    _stalls: gaps.filter(g => g.ms > STALL_MS), _sync: raw.sync,
  };
}

// Which browser work overlapped the stalls (Chromium trace, complete events on named threads).
function attribute(tracePath, stalls, syncMs) {
  if (!stalls.length || !fs.existsSync(tracePath)) return null;
  let events;
  try { const json = JSON.parse(fs.readFileSync(tracePath, "utf8")); events = Array.isArray(json) ? json : json.traceEvents; } catch { return null; }
  const threads = new Map();
  for (const e of events) if (e.ph === "M" && e.name === "thread_name") threads.set(`${e.pid}:${e.tid}`, e.args?.name || "?");
  const mark = events.find(e => e.name === "cte-diag-sync");
  if (!mark) return { note: "sync mark not found in trace" };
  const offsetUs = mark.ts - syncMs * 1000;
  const windows = stalls.map(s => [offsetUs + s.start * 1000, offsetUs + s.end * 1000]);
  const totals = new Map();
  for (const e of events) {
    if (e.ph !== "X" || !e.dur || e.dur < 2000) continue;
    const thread = threads.get(`${e.pid}:${e.tid}`) || "?";
    if (!/CrRendererMain|Compositor|CrGpuMain|VizCompositor|ThreadPool|Raster|DedicatedWorker|ImageDecoder/i.test(thread)) continue;
    let overlap = 0;
    for (const [a, b] of windows) overlap += Math.max(0, Math.min(b, e.ts + e.dur) - Math.max(a, e.ts));
    if (overlap <= 0) continue;
    const key = `${e.name} @ ${thread.replace(/\d+$/, "")}`;
    totals.set(key, (totals.get(key) || 0) + overlap / 1000);
  }
  const stallMs = stalls.reduce((s, x) => s + x.ms, 0);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, ms]) => ({ work: k, ms: Math.round(ms), shareOfStallTime: +(ms / stallMs).toFixed(2) }));
  const gcMs = [...totals.entries()].filter(([k]) => /GC|Scavenge|MarkCompact|Sweep/i.test(k)).reduce((s, [, ms]) => s + ms, 0);
  const decodeMs = [...totals.entries()].filter(([k]) => /Decode|ImageBitmap/i.test(k)).reduce((s, [, ms]) => s + ms, 0);
  return { stalls: stalls.length, stallMs: Math.round(stallMs), gcMs: Math.round(gcMs), decodeMs: Math.round(decodeMs), top };
}

async function run(browser, spec) {
  const context = await browser.newContext(VIEWPORTS[spec.vp]);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (spec.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: spec.cpu });
  if (spec.net) {   // roughly "fast 3G": 1.6 Mbps down, 750 kbps up, 150 ms latency
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 94 * 1024 });
  }
  const requests = { cinematic: 0, bytes: 0 };
  if (!spec.films) await page.route("**/cinematic/**", route => route.abort());
  page.on("response", async r => { if (r.url().includes("/cinematic/")) { requests.cinematic++; requests.bytes += Number(r.headers()["content-length"] || 0); } });
  const mem = memorySampler();
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  const geometry = await page.evaluate(to => {
    const tops = Array.from(document.querySelectorAll("[data-cte-step]")).map(s => s.getBoundingClientRect().top + scrollY);
    const i = Math.floor(to);
    return { tops, end: tops[i] + (to - i) * (tops[i + 1] - tops[i]) };
  }, TO);
  const tracePath = path.join(OUT, `trace-${STAMP}-${spec.id.slice(0, 1)}.json`);
  if (spec.trace) await browser.startTracing(page, { path: tracePath, categories: ["devtools.timeline", "v8.gc", "blink.user_timing", "disabled-by-default-devtools.timeline"] });
  const cold = await pass(page, "cold", geometry);
  if (spec.trace) await browser.stopTracing();
  const coldAttribution = spec.trace ? attribute(tracePath, cold._stalls, cold._sync) : null;
  if (spec.trace) { try { fs.unlinkSync(tracePath); } catch { /* keep it if it cannot be removed */ } }
  await page.waitForTimeout(800);
  const warm = await pass(page, "warm", geometry);
  const memory = mem.stop();
  await context.close();
  for (const p of [cold, warm]) { delete p._stalls; delete p._sync; }
  return { id: spec.id, renderer, cinematicResponses: requests.cinematic, cinematicMB: +(requests.bytes / 1048576).toFixed(1), memory, cold, warm, coldAttribution };
}

(async () => {
  const results = [];
  for (const gpu of ["default", "high"]) {
    const args = ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11"];
    if (gpu === "high") args.push("--force_high_performance_gpu");
    const browser = await chromium.launch({ headless: true, args });
    try {
      for (const spec of RUNS.filter(r => r.gpu === gpu)) {
        const r = await run(browser, spec);
        results.push(r);
        const line = p => `${p.label}: >33ms ${p.over33}/${p.frames} >100ms ${p.over100} p95 ${p.p95} max ${p.max} longTasks ${p.longTasks} | lag max ${p.maxFrameLag} (>3: ${p.framesLagOver3}) inflight ${p.maxInflight} decoded ${p.maxDecoded} blank ${p.blankFrames}`;
        console.log(`${r.id} | ${r.renderer} | films ${r.cinematicResponses} resp ${r.cinematicMB} MB | mem ${JSON.stringify(r.memory)}\n  ${line(r.cold)}\n  ${line(r.warm)}`);
        if (r.coldAttribution) console.log(`  attribution (cold): ${JSON.stringify(r.coldAttribution)}`);
      }
    } finally { await browser.close(); }
  }
  const file = path.join(OUT, `stalls-${STAMP}.json`);
  fs.writeFileSync(file, JSON.stringify({ url: URL, to: TO, stallThresholdMs: STALL_MS, results }, null, 1));
  console.log(`written ${file}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
