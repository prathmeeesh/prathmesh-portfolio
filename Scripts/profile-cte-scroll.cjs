// Frame-time profile of the /code-to-experience scroll on this machine's GPU.
// Usage: node Scripts/profile-cte-scroll.cjs [--headed] [--throttle=4] [--to=3]
//   CTE_URL overrides the server (default: production server on 3300).
// Reports the WebGL renderer so software rendering (SwiftShader) is never mistaken for a GPU result.
const { chromium } = require("@playwright/test");

const URL = process.env.CTE_URL || "http://127.0.0.1:3300/code-to-experience";
const arg = (name, fallback) => { const hit = process.argv.find(a => a.startsWith(`--${name}=`)); return hit ? hit.slice(name.length + 3) : fallback; };
// Headless by default: it still uses the GPU (ANGLE/D3D11) and cannot be disturbed by desktop input.
const HEADLESS = !process.argv.includes("--headed");
const THROTTLE = Number(arg("throttle", 1));
const TO = Number(arg("to", 3));
const ALL_VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];
const ONLY = arg("only");
const VIEWPORTS = ALL_VIEWPORTS.filter(v => !ONLY || v.name === ONLY);

async function profile(browser, { name, ...options }) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  // A/B hook: --block=cinematic aborts the rendered-sequence downloads (page falls back to WebGL only).
  if (arg("block")) await page.route(`**/${arg("block")}/**`, route => route.abort());
  await page.goto(URL, { waitUntil: "load" });
  // Experiment hook: --css="selector{...}" injects a stylesheet before profiling.
  if (arg("css")) await page.addStyleTag({ content: arg("css") });
  await page.waitForSelector("[data-testid=cte-world] canvas", { timeout: 15000 }).catch(() => {});
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
  await page.evaluate(() => {
    window.__f = []; window.__lt = [];
    new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push({ start: e.startTime, dur: e.duration, y: scrollY }))).observe({ type: "longtask" });
    let last = performance.now();
    const loop = now => { window.__f.push([now - last, scrollY]); last = now; window.__raf = requestAnimationFrame(loop); };
    window.__raf = requestAnimationFrame(loop);
  });
  // ~4 s forward, ~4 s back: a brisk but realistic wheel scrub.
  const steps = 240;
  const dy = geometry.end / steps;
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy); await page.waitForTimeout(16); }
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, -dy); await page.waitForTimeout(16); }
  // Let any smooth-scroll animation finish before the idle check.
  await page.waitForFunction(() => new Promise(r => { const y = scrollY; setTimeout(() => r(scrollY === y), 300); }), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  // Idle check: nothing should render while the user is not scrolling.
  const idle = await page.evaluate(() => new Promise(resolve => {
    const canvas = document.querySelector("[data-testid=cte-world] canvas");
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    if (!gl) return resolve(null);
    let draws = 0, events = 0;
    const y0 = scrollY;
    const count = () => events++;
    window.addEventListener("cte:progress", count);
    const orig = gl.drawElements.bind(gl);
    gl.drawElements = (...a) => { draws++; return orig(...a); };
    setTimeout(() => {
      gl.drawElements = orig;
      window.removeEventListener("cte:progress", count);
      resolve({ draws, progressEvents: events, scrollMoved: scrollY - y0 });
    }, 1500);
  }));
  const raw = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return { f: window.__f.slice(3), lt: window.__lt }; });
  await context.close();

  const toT = y => {
    const anchors = geometry.tops;
    for (let i = 0; i < anchors.length - 1; i++) if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  };
  const stats = list => {
    const d = list.map(x => x[0]).sort((a, b) => a - b);
    const p = q => d[Math.min(d.length - 1, Math.floor(q * d.length))] ?? 0;
    return { frames: d.length, median: +p(0.5).toFixed(1), p95: +p(0.95).toFixed(1), max: +(d.at(-1) ?? 0).toFixed(1), over33: d.filter(x => x > 33.4).length };
  };
  const buckets = {};
  for (const frame of raw.f) {
    const t = toT(frame[1]);
    const key = t < 0.6 ? "0.0-0.6 photo zoom" : t < 1 ? "0.6-1.0 IDE dock" : t < 1.8 ? "1.0-1.8 packet" : "1.8+ world";
    (buckets[key] ||= []).push(frame);
  }
  return {
    name, renderer, throttle: THROTTLE, overall: stats(raw.f),
    phases: Object.fromEntries(Object.entries(buckets).sort().map(([k, v]) => [k, stats(v)])),
    slowestFrames: raw.f.map((x, i) => ({ ms: +x[0].toFixed(1), atT: +toT(x[1]).toFixed(2), pass: i < raw.f.length / 2 ? "forward" : "rewind" }))
      .sort((a, b) => b.ms - a.ms).slice(0, 10),
    longTasks: raw.lt.map(x => ({ ms: Math.round(x.dur), atT: +toT(x.y).toFixed(2) })).sort((a, b) => b.ms - a.ms).slice(0, 6),
    idle1500ms: idle,
  };
}

(async () => {
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11"],
  });
  try {
    for (const v of VIEWPORTS) {
      const r = await profile(browser, v);
      if (!process.argv.includes("--summary")) { console.log(JSON.stringify(r, null, 1)); continue; }
      const phases = Object.entries(r.phases).map(([k, s]) => `${k.split(" ")[0]}:p95=${s.p95}/>33=${s.over33}`).join(" ");
      const spikes = r.slowestFrames.slice(0, 4).map(f => `${f.ms}ms@t${f.atT}(${f.pass[0]})`).join(", ");
      console.log(`${r.name} median=${r.overall.median} p95=${r.overall.p95} max=${r.overall.max} >33ms=${r.overall.over33}/${r.overall.frames} longTasks=${r.longTasks.length} idle=${JSON.stringify(r.idle1500ms)}\n  ${phases}\n  spikes: ${spikes}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
