const { test, expect } = require("@playwright/test");

const ROUTE = "/code-to-experience";

// Scrolls to a chapter-progress value (0 = hero top, 1 = source top, …) using real section anchors.
async function scrollToProgress(page, t) {
  await page.evaluate(progress => {
    const sections = Array.from(document.querySelectorAll("[data-cte-step]"));
    const tops = sections.map(s => window.scrollY + s.getBoundingClientRect().top);
    const i = Math.min(sections.length - 2, Math.floor(progress));
    window.scrollTo({ top: Math.round(tops[i] + (progress - i) * (tops[i + 1] - tops[i])), behavior: "instant" });
  }, t);
  // Two frames: scroll event → rAF paint.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const box = (page, selector) => page.locator(selector).first().evaluate(el => {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { x: r.x, y: r.y, w: r.width, h: r.height, opacity: Number(cs.opacity), visibility: cs.visibility, transform: cs.transform };
});

test("the laptop screen hands off to a crisp IDE that docks into the source chapter", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "transition geometry is asserted at the desktop composition");
  await page.goto(ROUTE);
  await page.evaluate(() => document.fonts.ready);
  await scrollToProgress(page, 0);

  // Opening frame: untouched photograph, no overlay yet.
  const photo0 = await box(page, ".cte-photo");
  expect(photo0.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(photo0.transform)).toBeTruthy();
  expect((await box(page, ".cte-screen")).opacity).toBe(0);

  // Early zoom: the overlay sits on the photographed display, inside the photo frame.
  await scrollToProgress(page, 0.2);
  const photo = await box(page, ".cte-photo");
  const screen = await box(page, ".cte-screen");
  expect(screen.opacity).toBeGreaterThan(0.9);
  expect(screen.x).toBeGreaterThan(photo.x);
  expect(screen.x + screen.w).toBeLessThan(photo.x + photo.w);
  expect(screen.y).toBeGreaterThan(photo.y + photo.h * 0.4);
  expect(screen.y + screen.h).toBeLessThan(photo.y + photo.h * 0.75);

  // Inside the screen: the IDE fills most of the composition and the photo has faded.
  await scrollToProgress(page, 0.62);
  const inside = await box(page, ".cte-screen");
  const viewport = page.viewportSize();
  expect(inside.w).toBeGreaterThan(viewport.width * 0.7);
  expect((await box(page, ".cte-photo")).visibility).toBe("hidden");

  // Docked: the in-flow editor takes over at the same place.
  await scrollToProgress(page, 1);
  const slot = await box(page, "#source .cte-editor");
  expect(slot.opacity).toBe(1);
  expect((await box(page, ".cte-screen")).opacity).toBe(0);

  // The code token lifts out as a packet, then hands off to the 3D signal.
  await scrollToProgress(page, 1.35);
  expect((await box(page, ".cte-packet")).opacity).toBeGreaterThan(0.9);
  await expect(page.locator("#source .cte-token")).toHaveAttribute("data-state", "lifted");
  await scrollToProgress(page, 1.95);
  expect((await box(page, ".cte-packet")).opacity).toBe(0);

  // Rewind is deterministic: back to the untouched photograph.
  await scrollToProgress(page, 0.62);
  await scrollToProgress(page, 0);
  const rewound = await box(page, ".cte-photo");
  expect(rewound.opacity).toBe(1);
  expect(rewound.x).toBeCloseTo(photo0.x, 0);
  expect(rewound.w).toBeCloseTo(photo0.w, 0);
  expect((await box(page, ".cte-screen")).opacity).toBe(0);
});

test("hero exposes identity, selected work and CV in one interaction", async ({ page }) => {
  await page.goto(ROUTE);
  const hero = page.locator("#studio");
  await expect(hero.getByText(/PRATHMESH PAWAR · SOFTWARE ENGINEER/)).toBeVisible();
  await expect(hero.getByRole("link", { name: /View selected work/i })).toHaveAttribute("href", "#work");
  await expect(hero.getByRole("link", { name: /Get my CV/i })).toHaveAttribute("href", "/Prathmesh_Pawar_CV.pdf");
});

test("photo-led journey preserves all 11 narrative chapters and links", async ({ page }) => {
  await page.goto(ROUTE);
  await expect(page.locator("[data-cte-step]")).toHaveCount(11);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /Software starts with/i })).toBeVisible();
  await expect(page.locator(".cte-photo img")).toHaveAttribute("src", /coding-workspace|workstation/);
  await expect(page.getByRole("link", { name: /Download CV/i })).toHaveAttribute("href", "/Prathmesh_Pawar_CV.pdf");
  await expect(page.getByRole("link", { name: /Explore live Folio/i })).toHaveAttribute("href", "https://prathmesh-library.runasp.net/");
});

test("the single scroll director reaches projects and returns to the original photo", async ({ page }) => {
  await page.goto(ROUTE);
  await page.locator(".cte-rail").getByRole("button", { name: "Go to Selected engineering" }).click();
  await expect(page.locator("#work")).toBeInViewport({ ratio: 0.2, timeout: 15000 });
  await expect(page.getByRole("heading", { name: /Evidence over/i })).toBeVisible();
  await page.locator(".cte-rail").getByRole("button", { name: "Go to The developer" }).click();
  await expect(page.locator("#studio")).toBeInViewport({ ratio: 0.2, timeout: 15000 });
});

test("the illustrative Folio catalogue really filters sample data", async ({ page }) => {
  await page.goto(ROUTE);
  const field = page.getByRole("searchbox", { name: /Try a catalogue search/i });
  await field.fill("Jane");
  await expect(page.locator(".cte-book")).toHaveCount(1);
  await expect(page.locator(".cte-book")).toContainText("Pride and Prejudice");
  await field.fill("no-such-book");
  await expect(page.getByText(/No matching sample titles/i)).toBeVisible();
});

test("reduced motion keeps a complete accessible portfolio without WebGL", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(ROUTE);
  await expect(page.getByTestId("cte-fallback")).toBeAttached();
  await expect(page.getByTestId("cte-world")).toHaveCount(0);
  await expect(page.locator(".cte-screen")).toBeHidden();
  await expect(page.locator("#source .cte-editor")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-cte-step]")).toHaveCount(11);
  await expect(page.getByRole("link", { name: /Read case study/i })).toHaveAttribute("href", "/work/folio");
});

test("layout has no horizontal overflow", async ({ page }) => {
  await page.goto(ROUTE);
  const width = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.actual).toBeLessThanOrEqual(width.viewport + 2);
});
