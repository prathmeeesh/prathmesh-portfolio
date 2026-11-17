const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs/promises");
const path = require("node:path");

test("recruiter journey, evidence boundaries and working CV download", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Engineering.*what comes next/,
  );
  await expect(
    page.getByRole("link", { name: "Explore live catalogue" }),
  ).toHaveAttribute("href", "https://prathmesh-library.runasp.net/");
  await expect(
    page.getByText(
      /Login, registration, borrowing, returns and administration are disabled/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Award not yet confirmed", { exact: true }),
  ).toBeAttached();
  await expect(page.getByText(/Private academic work/)).toBeAttached();
  const cv = await request.get("/Prathmesh_Pawar_CV.pdf");
  expect(cv.status()).toBe(200);
  expect(
    (await cv.body()).equals(
      await fs.readFile(
        path.join(__dirname, "../public/Prathmesh_Pawar_CV.pdf"),
      ),
    ),
  ).toBe(true);
  await expect(page).toHaveTitle("Prathmesh Pawar | Software Developer");
  expect(errors).toEqual([]);
});

test("navigation and accessible disclosure work on each viewport", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    const menu = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    await menu.click();
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await menu.click();
    await page
      .getByRole("navigation", { name: "Mobile navigation", exact: true })
      .getByRole("link", { name: "Work", exact: true })
      .click();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  } else {
    await page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link", { name: "Work", exact: true })
      .click();
  }
  await expect(page).toHaveURL(/#projects$/);
  const summary = page.locator(".case-study summary");
  await summary.click();
  await expect(page.locator(".case-study")).toHaveAttribute("open", "");
  await expect(
    page.getByRole("heading", { name: "100 backend. 8 browser." }),
  ).toBeVisible();
  await summary.click();
  await expect(page.locator(".case-study")).not.toHaveAttribute("open", "");
});

test("skills support arrow, Home and End keys with useful panels", async ({
  page,
}) => {
  await page.goto("/");
  const first = page.getByRole("tab", { name: /Commercial/ });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: /Project engineering/ }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Building complete applications.",
  );
  await page.keyboard.press("End");
  await expect(page.getByRole("tabpanel")).toContainText(
    "Design expressed through code.",
  );
  await page.keyboard.press("Home");
  await expect(first).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /Academic & AI/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "award not yet confirmed",
  );
});

test("motion can be paused and respects system preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pause animations", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page
    .getByRole("button", { name: "Enable animations", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(
    page.getByRole("button", { name: "Motion reduced by device preference" }),
  ).toBeDisabled();
});

test("responsive layout, sampled accessibility and visual evidence", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("engineering-universe")).toHaveAttribute("data-mode", "static");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const id of [
    "projects",
    "about",
    "skills",
    "experience",
    "education",
    "contact",
  ]) {
    await page.locator("#" + id).scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize(originalViewport);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  expect(
    await page
      .locator(".skip-link")
      .evaluate((element) => element.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(0);
  await page.screenshot({
    path: testInfo.outputPath("homepage-" + testInfo.project.name + ".png"),
    fullPage: true,
  });
  await page.screenshot({
    path: testInfo.outputPath("hero-" + testInfo.project.name + ".png"),
  });
  await page.evaluate(() =>
    window.scrollTo(0, document.getElementById("projects").offsetTop - 75),
  );
  await page.screenshot({
    path: testInfo.outputPath("projects-" + testInfo.project.name + ".png"),
  });
});

test("social image and metadata routes return real content", async ({
  request,
}) => {
  const image = await request.get("/opengraph-image");
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  expect((await image.body()).length).toBeGreaterThan(1000);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(
    "https://prathmesh-portfolio.vercel.app",
  );
});
