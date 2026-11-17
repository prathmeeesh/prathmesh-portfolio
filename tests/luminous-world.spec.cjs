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

/* ---------- Milestone 2: camera, scroll and fallback contract ---------- */

async function scrubV3(page, progress) {
  await page.evaluate(p => {
    const max = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo({ top: max * p, behavior: 'instant' });
  }, progress);
}
const cameraOf = async canvas => (await canvas.getAttribute('data-camera')).split(',').map(Number);
const STATION = 1 / 12; // 13 stations on one rail: station 1 (Chapter 02) sits at 1/12 of total scroll.

test('Chapter 01 camera descends from the establishing shot toward the workstation', async ({page}) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/luminous-world');
  const canvas = page.getByTestId('luminous-webgl').locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera', /.+/, {timeout:30000});
  await expect(canvas).toHaveAttribute('data-progress', '0.000');
  const establishing = await cameraOf(canvas);
  await scrubV3(page, STATION / 2);
  await expect(canvas).not.toHaveAttribute('data-progress', '0.000');
  const midway = await cameraOf(canvas);
  await scrubV3(page, STATION);
  await expect(canvas).toHaveAttribute('data-progress', STATION.toFixed(3));
  const workstation = await cameraOf(canvas);
  // Height drops monotonically and the camera moves closer (smaller z) as it approaches the IDE.
  expect(midway[1]).toBeLessThan(establishing[1]);
  expect(workstation[1]).toBeLessThan(midway[1]);
  expect(workstation[2]).toBeLessThan(establishing[2]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
  expect(errors).toEqual([]);
});

test('one persistent canvas retraces the exact camera path when scrolling back', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/luminous-world');
  const canvas = page.getByTestId('luminous-webgl').locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera', /.+/, {timeout:30000});
  await canvas.evaluate(el => { el.dataset.testIdentity = 'persistent'; });
  await scrubV3(page, 0.05);
  await expect(canvas).toHaveAttribute('data-progress', '0.050');
  const forward = await canvas.getAttribute('data-camera');
  await scrubV3(page, 0.6);
  await expect(canvas).toHaveAttribute('data-progress', '0.600');
  expect(await canvas.getAttribute('data-camera')).not.toBe(forward);
  await scrubV3(page, 0.05);
  await expect(canvas).toHaveAttribute('data-camera', forward);
  // Narrative progression stops when scrolling stops: no drift toward the next chapter.
  await page.waitForTimeout(400);
  await expect(canvas).toHaveAttribute('data-camera', forward);
  await expect(page.getByTestId('luminous-webgl').locator('canvas')).toHaveCount(1);
  await expect(canvas).toHaveAttribute('data-test-identity', 'persistent');
});

test('pausing freezes the camera while native scrolling and progress still work', async ({page}) => {
  await page.goto('/luminous-world');
  const canvas = page.getByTestId('luminous-webgl').locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera', /.+/, {timeout:30000});
  await page.getByRole('button', {name:'Pause 3D world'}).click();
  const frozen = await canvas.getAttribute('data-camera');
  await scrubV3(page, 0.4);
  await expect(page.getByTestId('lv3-progress')).toHaveAttribute('aria-valuenow', '40');
  expect(await canvas.getAttribute('data-camera')).toBe(frozen);
  await page.getByRole('button', {name:'Resume 3D world'}).click();
  await expect(canvas).not.toHaveAttribute('data-camera', frozen);
});

test('WebGL creation failure shows the static scene and the full portfolio', async ({page}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return String(type).includes('webgl') ? null : get.call(this, type, ...args); };
  });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/luminous-world');
  await expect(page.locator('.lv3-static-scene')).toBeVisible();
  await expect(page.getByTestId('luminous-webgl')).toHaveCount(0);
  await expect(page.locator('[data-lv3-chapter]')).toHaveCount(13);
  await expect(page.getByRole('heading', {level:1})).toBeVisible();
  expect(errors).toEqual([]);
});

test('WebGL context loss falls back without losing content', async ({page}) => {
  await page.goto('/luminous-world');
  const canvas = page.getByTestId('luminous-webgl').locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera', /.+/, {timeout:30000});
  await canvas.evaluate(el => el.dispatchEvent(new Event('webglcontextlost', {cancelable:true})));
  await expect(page.locator('.lv3-static-scene')).toBeVisible();
  await expect(page.locator('[data-lv3-chapter]')).toHaveCount(13);
});
