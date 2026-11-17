const { test, expect } = require("@playwright/test");

test("code journey supports build and request modes", async ({ page }) => {
  await page.goto('/experiments/code-journey');
  const journey = page.locator("#code-journey");
  await expect(journey.getByRole("heading", { name: /From code to experience/i })).toBeAttached();
  await journey.getByRole("button", { name: /click to response/i }).click();
  await expect(journey.getByText(/One click activates an entire system/i)).toBeVisible();
  await journey.getByRole("button", { name: /database/i }).click();
  await expect(journey.getByText(/SQL Server \+ EF Core/i)).toBeVisible();
  await journey.getByRole("button", { name: /build & ship/i }).click();
  await expect(journey.getByText(/An idea becomes something people can use/i)).toBeVisible();
});

test("journey supports stage buttons and a finish state", async ({ page }) => {
  await page.goto("/experiments/code-journey");

  const journey = page.locator("#code-journey");

  await expect(journey).toBeVisible();

  await expect(
  journey.getByRole("button", { name: /experience/i })
).toBeVisible();

  // Navigate directly to the final stage.
  await journey
    .getByRole("button", { name: /experience/i })
    .click();

  await expect(
    journey.getByText("STAGE 07 / 07")
  ).toBeVisible();

  await expect(
    journey.getByText(/Find your next read/i)
  ).toBeVisible();

  await expect(
    journey.getByText(/not a live request trace/i)
  ).toBeVisible();

  // Move back exactly one stage.
  await journey
    .getByRole("button", { name: "Previous engineering stage" })
    .click();

  await expect(
    journey.getByText("STAGE 06 / 07")
  ).toBeVisible();

  await expect(
    journey.getByText(/Published application/i)
  ).toBeVisible();
});
