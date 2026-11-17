// Records a ~16 s scroll through the opening (t = 0 → 2, then rewind to 0) as WebM.
// Usage: node Scripts/record-cte-transition.cjs   (CTE_URL overrides the server URL)
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.CTE_URL || "http://localhost:3200/code-to-experience";
const OUTPUT = path.resolve("artifacts", "code-to-experience-transition", "recording");
fs.mkdirSync(OUTPUT, { recursive: true });

async function record(browser, name, viewport) {
  const context = await browser.newContext({ viewport, recordVideo: { dir: OUTPUT, size: viewport } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const end = await page.evaluate(() => document.getElementById("build").getBoundingClientRect().top + scrollY);
  const scrub = async (from, to, ms) => {
    const steps = Math.round(ms / 33);
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      const eased = k * k * (3 - 2 * k);
      await page.evaluate(y => window.scrollTo(0, y), from + (to - from) * eased);
      await page.waitForTimeout(33);
    }
  };
  await scrub(0, end, 11000);
  await page.waitForTimeout(800);
  await scrub(end, 0, 4000);
  await page.waitForTimeout(800);
  const video = page.video();
  await context.close();
  const target = path.join(OUTPUT, `${name}.webm`);
  await video.saveAs(target);
  await video.delete();
  return target;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    console.log(await record(browser, "desktop-1440x900", { width: 1440, height: 900 }));
    console.log(await record(browser, "mobile-390x844", { width: 390, height: 844 }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
