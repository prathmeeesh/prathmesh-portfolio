const { test, expect } = require('@playwright/test');

test('3D engineering world is isolated from the portfolio homepage', async ({ page }) => {
  await page.goto('/engineering-world');
  await expect(page.getByRole('heading', {name: /From code to experience/i})).toBeVisible();
  await expect(page.getByRole('link', {name: /Folio demo/i})).toHaveAttribute('href','https://prathmesh-library.runasp.net/');
  await expect(page.getByTestId('world-scroll')).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('moving through the 3D world updates the story and supports rewind', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/engineering-world');
  await page.locator('#journey').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Jump to 05 / USER INTERACTION'}).click();
  await expect(page.getByText(/A person interacts with the interface/i)).toBeVisible();
  await page.getByRole('button',{name:'Jump to 02 / SOURCE CONTROL'}).click();
  await expect(page.getByText(/The idea becomes a tracked change/i)).toBeVisible();
});

test('prefers-reduced-motion provides complete non-3D alternative',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/engineering-world');
  await expect(page.getByRole('heading',{name:'Engineering journey'})).toBeVisible();
  await expect(page.getByText(/The backend retrieves the right records/i)).toBeVisible();
});
