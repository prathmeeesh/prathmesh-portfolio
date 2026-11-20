// Screenshot QA for the photo → laptop → IDE → packet transition.
// Captures fixed progress values (chapter units: 0 = hero, 1 = source, 2 = build)
// at 1440×900 and 390×844 so the same frames can be compared between iterations.
// Usage: node Scripts/capture-cte-transition.cjs [label]
// Requires a running server; set CTE_URL to override the default dev URL.
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.CTE_URL || "http://localhost:3200/code-to-experience";
const LABEL = process.argv[2] || "current";
const OUTPUT = path.resolve("artifacts", "code-to-experience-transition", LABEL);
const STEPS = (process.env.CTE_STEPS || "0,0.2,0.4,0.55,0.7,0.85,1,1.2,1.4,1.6,1.8,2").split(",").map(Number);
fs.mkdirSync(OUTPUT, { recursive: true });

async function scrollToProgress(page, t) {
  await page.evaluate(progress => {
    const sections = Array.from(document.querySelectorAll("[data-cte-step]"));
    const tops = sections.map(s => window.scrollY + s.getBoundingClientRect().top);
    const i = Math.min(sections.length - 2, Math.floor(progress));
    const y = tops[i] + (progress - i) * (tops[i + 1] - tops[i]);
    window.scrollTo({ top: Math.round(y), behavior: "instant" });
  }, t);
  await page.waitForTimeout(350);
  // When the rendered sequence is on screen, wait until the exact frame (not a nearby fallback) is drawn.
  await page.waitForFunction(() => {
    const c = document.querySelector("[data-testid=cte-sequence]");
    return !c || Number(getComputedStyle(c).opacity) === 0 || c.dataset.frame === c.dataset.wanted;
  }, null, { timeout: 20000 }).catch(() => {});
}

async function run(browser, name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto(BASE, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  for (const t of STEPS) {
    await scrollToProgress(page, t);
    await page.screenshot({ path: path.join(OUTPUT, `${name}-t${t.toFixed(2)}.png`) });
  }
  // Reverse scrub: return to the hero and confirm the photo is restored.
  await scrollToProgress(page, 1.5);
  await scrollToProgress(page, 0);
  await page.screenshot({ path: path.join(OUTPUT, `${name}-rewind-t0.00.png`) });
  fs.writeFileSync(path.join(OUTPUT, `${name}-errors.json`), JSON.stringify(errors, null, 2));
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    await run(browser, "desktop", { width: 1440, height: 900 });
    await run(browser, "mobile", { width: 390, height: 844 });
    if (!process.env.CTE_SKIP_TABLET) await run(browser, "tablet", { width: 768, height: 1024 });
    console.log("Saved to", OUTPUT);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
