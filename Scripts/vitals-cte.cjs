// Core Web Vitals for /code-to-experience against the production server (:3300), cold cache.
// LCP and CLS from PerformanceObserver (buffered); INP proxy = the slowest Event Timing entry across real
// interactions (open menu / jump to a chapter / type into the Folio catalogue search). Chromium on this machine.
// Usage: node Scripts/vitals-cte.cjs   (CTE_URL overrides the server URL)
const { chromium } = require("@playwright/test");

const URL = process.env.CTE_URL || "http://127.0.0.1:3300/code-to-experience";
const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

async function measure(browser, { name, ...options }) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__v = { lcp: 0, cls: 0, events: [] };
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__v.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) window.__v.events.push({ type: e.name, ms: e.duration }); }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  });
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: "load" });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(2500);
  // Interactions a recruiter performs.
  if (name === "mobile") { await page.getByRole("button", { name: "Menu" }).click(); await page.waitForTimeout(300); await page.getByRole("button", { name: "Close" }).click(); }
  await page.locator(".cte-rail a").nth(8).click();
  await page.waitForTimeout(1500);
  const search = page.getByRole("searchbox").first();
  if (await search.count()) { await search.scrollIntoViewIfNeeded(); await search.click(); await search.type("reliable", { delay: 60 }); }
  await page.waitForTimeout(1000);
  const v = await page.evaluate(() => window.__v);
  await context.close();
  const worst = v.events.sort((a, b) => b.ms - a.ms)[0] ?? null;
  return { name, loadMs, lcpMs: Math.round(v.lcp), cls: +v.cls.toFixed(4), inpProxyMs: worst ? Math.round(worst.ms) : 0, worstEvent: worst, interactions: v.events.length };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11"] });
  try {
    for (const v of VIEWPORTS) console.log(JSON.stringify(await measure(browser, v)));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
