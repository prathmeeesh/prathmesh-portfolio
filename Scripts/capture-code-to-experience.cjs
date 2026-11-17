// Run while a Next.js server is already listening on port 3100.
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.CTE_URL || "http://127.0.0.1:3100/code-to-experience";
const OUTPUT = path.resolve("artifacts", "code-to-experience-review");
const STAGES = ["studio", "source", "build", "deploy", "backend", "database", "output", "work", "contact"];
fs.mkdirSync(OUTPUT, { recursive: true });

async function run(browser, name, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  for (const stage of STAGES) {
    await page.evaluate(id => document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" }), stage);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUTPUT, `${name}-${stage}.png`) });
  }
  fs.writeFileSync(path.join(OUTPUT, `${name}-page-errors.json`), JSON.stringify(errors, null, 2));
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await run(browser, "desktop", { width: 1440, height: 900 });
    await run(browser, "mobile", { width: 390, height: 844 });
    await run(browser, "reduced-motion", { width: 1440, height: 900 }, "reduce");
    console.log("Screenshots saved to", OUTPUT);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
