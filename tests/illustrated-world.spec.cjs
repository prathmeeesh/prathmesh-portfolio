const { test, expect } = require("@playwright/test");

// Included in the existing portfolio Playwright setup, with desktop/tablet/mobile projects.
test("illustration preview has an accessible story and real project links", async ({ page }) => {
  await page.goto("/illustration");
  await expect(page.getByRole("heading", { level: 1, name: /From code to experience/i })).toBeVisible();
  await expect(page.locator("[data-illustrated-portfolio]")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /The backend makes the decision/i })).toBeAttached();
  await expect(page.getByRole("link", { name: /Explore the Folio demo/i })).toHaveAttribute("href", "https://prathmesh-library.runasp.net/");
  await expect(page.getByRole("link", { name: /Download CV/i })).toHaveAttribute("href", "/Prathmesh_Pawar_CV.pdf");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("scroll changes camera and navigating backwards rewinds the story", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/illustration");
  const camera = page.getByTestId("illustrated-camera");
  const before = await camera.evaluate((el) => getComputedStyle(el).transform);
  await page.locator("#illustrated-chapter-6").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-illustrated-portfolio]")).toHaveAttribute("data-scene", /[4-7]/);
  await page.waitForTimeout(350);
  const after = await camera.evaluate((el) => getComputedStyle(el).transform);
  expect(after).not.toBe(before);
  await page.locator("#illustrated-chapter-0").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-illustrated-portfolio]")).toHaveAttribute("data-scene", /[0-2]/);
});

test("reduced motion retains the readable story without moving scenery", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/illustration");
  await expect(page.locator("[data-illustrated-portfolio]")).toHaveAttribute("data-motion", "paused");
  await expect(page.locator("#illustrated-chapter-7 h2")).toBeAttached();
  await expect(page.getByRole("button", { name: /Reduced motion/i })).toBeDisabled();
});
