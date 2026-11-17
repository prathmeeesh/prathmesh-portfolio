
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const BASE = "http://127.0.0.1:3100/luminous-world";
const OUTPUT = path.resolve("artifacts", "visual-review");

fs.mkdirSync(OUTPUT, { recursive: true });

async function capture(browser, name, viewport, mobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "no-preference",
  });

  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", error => errors.push(error.message));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  const positions = [
    ["origin", 0],
    ["laboratory-transition", 1 / 24],
    ["workstation", 1 / 12],
    ["middle", 0.5],
    ["portfolio-end", 0.98],
  ];

  for (const [label, progress] of positions) {
    await page.evaluate(p => {
      const max = document.documentElement.scrollHeight - innerHeight;
      window.scrollTo({ top: max * p, behavior: "instant" });
    }, progress);

    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(OUTPUT, `${name}-${label}.png`),
    });
  }

  fs.writeFileSync(
    path.join(OUTPUT, `${name}-errors.json`),
    JSON.stringify(errors, null, 2)
  );

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    await capture(browser, "desktop", {
      width: 1440,
      height: 900,
    });

    await capture(
      browser,
      "mobile",
      { width: 390, height: 844 },
      true
    );

    console.log(`Screenshots saved to: ${OUTPUT}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
