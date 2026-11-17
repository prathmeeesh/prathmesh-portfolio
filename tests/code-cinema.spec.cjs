const { test, expect } = require('@playwright/test');

test('scroll scrubs the story forward and backwards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/experiments/code-cinema');
  const story = page.locator('#code-cinema');
  await expect(story).toBeVisible();

  async function scrub(progress) {
    await page.evaluate((p) => {
      const section = document.querySelector('#code-cinema');
      const top = section.getBoundingClientRect().top + window.scrollY;
      const travel = section.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + p * travel, behavior: 'instant' });
    }, progress);
  }

  await scrub(0);
  await expect(page.getByTestId('cinema-stage')).toHaveText('SOURCE');
  await scrub(0.98);
  await expect(page.getByTestId('cinema-stage')).toHaveText('UI');
  await scrub(0);
  await expect(page.getByTestId('cinema-stage')).toHaveText('SOURCE');
});

test('reduced motion shows the readable static storyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/experiments/code-cinema');
  const story = page.locator('#code-cinema');
  await expect(story).toHaveAttribute('data-static', 'true');
  await expect(story.getByRole('heading', { name: 'An idea becomes code.' })).toBeVisible();
  await expect(story.getByRole('heading', { name: 'The user sees the result.' })).toBeAttached();
  await expect(story.getByRole('link', { name: /Skip story/ })).toHaveAttribute('href', '#projects');
});

test('scroll section does not create horizontal page overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/experiments/code-cinema');
  await page.locator('#code-cinema').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
