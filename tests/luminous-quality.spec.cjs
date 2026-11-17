const { test, expect } = require("@playwright/test");

test("Luminous V3 has direct mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/luminous-world");
  const menu = page.locator(".lv3-mobile-menu");
  await menu.locator("summary").click();
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Work" })).toHaveAttribute("href", "#work");
  await expect(nav.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "#contact");
});

test("Luminous V3 distinguishes experience, education and project evidence", async ({ page }) => {
  await page.goto("/luminous-world");
  await expect(page.locator("[data-lv3-chapter]")).toHaveCount(13);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("article").filter({ hasText: "Folio" })).toContainText("read-only");
  await expect(page.getByRole("link", { name: "Read engineering case study" }).first()).toHaveAttribute("href", "/work/folio");
  await expect(page.getByText("Junior Software Developer", {exact:true})).toBeAttached();
  await expect(page.getByText("BSc Information Technology", {exact:true})).toBeAttached();
  await expect(page.getByText(/Degree award not yet confirmed/)).toBeAttached();
  await expect(page.getByRole("link", { name: "Email me" })).toHaveAttribute("href", "mailto:prathmeshwork01@gmail.com");
});
