const { test, expect } = require('@playwright/test');

test('luminous portfolio has all 13 sections and verified links', async ({page}) => {
  await page.goto('/luminous-world');
  await expect(page.locator('[data-lv3-chapter]')).toHaveCount(13);
  await expect(page.getByRole('heading', {name:/Engineering what comes/i})).toBeVisible();
  await expect(page.getByRole('link', {name:/Explore the Folio demo/i})).toHaveAttribute('href','https://prathmesh-library.runasp.net/');
  await expect(page.getByRole('link', {name:/Download CV/i})).toHaveAttribute('href','/Prathmesh_Pawar_CV.pdf');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
});

test('heading outline has one H1 and announces the active chapter', async ({page}) => {
  await page.goto('/luminous-world');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main h2')).toHaveCount(12);
  const announcer = page.getByTestId('lv3-chapter-announcer');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  await expect(announcer).toHaveText(/Chapter 01 of 13: Origin/);
  await page.getByRole('button',{name:'Go to Contact'}).click();
  await expect(announcer).toHaveText(/Chapter 13 of 13: Contact/);
});

test('archived V2 route is excluded from indexing', async ({page}) => {
  await page.goto('/observatory-v2');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('navigation reaches the end and returns to beginning', async ({page})=> {
  await page.goto('/luminous-world');
  await page.getByRole('button',{name:'Go to Contact'}).click();
  await expect(page.locator('#contact')).toBeInViewport({ratio:0.3});
  await page.getByRole('button',{name:'Go to Origin'}).click();
  await expect(page.locator('#origin')).toBeInViewport({ratio:0.3});
});

test('rendering pause and quality controls are accessible', async ({page})=> {
  await page.goto('/luminous-world');
  await page.getByRole('button',{name:'Pause 3D world'}).click();
  await expect(page.getByRole('button',{name:'Resume 3D world'})).toBeVisible();
  await page.getByRole('combobox',{name:'Render quality'}).selectOption('low');
  await expect(page.getByRole('combobox',{name:'Render quality'})).toHaveValue('low');
});

test('reduced motion fallback retains the complete portfolio', async ({page})=> {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/luminous-world');
  await expect(page.locator('.lv3-static-scene')).toBeVisible();
  await expect(page.locator('[data-lv3-chapter]')).toHaveCount(13);
  await expect(page.locator('#contact').getByRole('link',{name:/GitHub/i})).toHaveAttribute('href','https://github.com/prathmeeesh');
});
