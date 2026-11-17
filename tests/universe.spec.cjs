const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function scrub(page, progress) {
  await page.evaluate(p => {
    const el=document.getElementById('journey');
    const top=el.getBoundingClientRect().top+scrollY-87;
    window.scrollTo({top:top+(el.offsetHeight-innerHeight+87)*p,behavior:'instant'});
  },progress);
}
test('one persistent WebGL world follows scroll and exactly retraces the camera path', async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  const canvas=page.getByTestId('universe-canvas').locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera',/.+/,{timeout:30000});
  await canvas.evaluate(el=>el.dataset.testIdentity='persistent');
  await scrub(page,.25);
  await expect(canvas).toHaveAttribute('data-progress',/0\.25/);
  const initial=await canvas.getAttribute('data-camera');
  await scrub(page,.75);
  await expect(canvas).toHaveAttribute('data-progress',/0\.75/);
  expect(await canvas.getAttribute('data-camera')).not.toBe(initial);
  await scrub(page,.25);
  await expect(canvas).toHaveAttribute('data-camera',initial);
  await expect(canvas).toHaveAttribute('data-test-identity','persistent');
  expect(errors).toEqual([]);
});

test('paused motion freezes camera and frames while native navigation remains usable',async({page})=>{
  await page.goto('/');
  const canvas=page.getByTestId('universe-canvas').locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera',/.+/,{timeout:30000});
  await page.getByRole('button',{name:'Pause animations',exact:true}).click();
  await page.waitForTimeout(150);
  const before=await canvas.getAttribute('data-camera');
  await scrub(page,.6);
  await page.waitForTimeout(200);
  expect(await canvas.getAttribute('data-camera')).toBe(before);
  const frame=await canvas.getAttribute('data-frame');
  await page.waitForTimeout(200);
  expect(await canvas.getAttribute('data-frame')).toBe(frame);
  await page.getByRole('button',{name:'Enable animations',exact:true}).click();
  await expect(canvas).not.toHaveAttribute('data-camera',before);
});

test('reduced motion removes WebGL and keeps all nine chapters and portfolio content',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await expect(page.getByTestId('engineering-universe')).toHaveAttribute('data-mode','static');
  await expect(page.getByTestId('universe-canvas')).toHaveCount(0);
  await expect(page.locator('[data-story-index]')).toHaveCount(9);
  await expect(page.getByRole('link',{name:/Explore the live Folio demonstration/})).toHaveAttribute('href','https://prathmesh-library.runasp.net/');
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});

test('WebGL creation failure leaves a complete readable portfolio',async({page})=>{
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.includes('webgl'))return null;return get.call(this,type,...args);};});
  await page.goto('/');
  await expect(page.getByTestId('engineering-universe')).toHaveAttribute('data-mode','static');
  await expect(page.getByRole('heading',{name:'The answer takes the return path.'})).toBeAttached();
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await expect(page.getByRole('link',{name:'Explore live catalogue'})).toBeVisible();
});

test('context loss safely switches to the motion-free story',async({page})=>{
  await page.goto('/');const canvas=page.getByTestId('universe-canvas').locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera',/.+/,{timeout:30000});
  await canvas.evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.getByTestId('engineering-universe')).toHaveAttribute('data-mode','static');
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
});

test('rendered chapter compositions, real canvas pixels and responsive evidence',async({page},testInfo)=>{
  test.setTimeout(90000);
  await page.goto('/');const canvas=page.getByTestId('universe-canvas').locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera',/.+/,{timeout:30000});
  for(const [label,p] of [['start',0],['quarter',.25],['middle',.5],['three-quarter',.75],['end',.998]]){
    await scrub(page,p);await page.waitForTimeout(400);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`${label}-${testInfo.project.name}.png`)});
  }
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await expect(page.getByRole('link',{name:'Explore live catalogue'})).toBeVisible();
});

test('case-study pages retain evidence scope and have working return navigation',async({page})=>{
  await page.goto('/work/folio');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Folio — Library Management System');
  await expect(page.getByText(/100 backend tests, including seven SQL Server tests/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Explore the read-only catalogue'})).toHaveAttribute('href','https://prathmesh-library.runasp.net/');
  await page.getByRole('link',{name:'Back to selected work'}).click();
  await expect(page).toHaveURL(/#projects$/);
  await page.goto('/work/observatory');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Engineering Observatory');
  await expect(page.getByText(/local release candidate until explicitly reviewed and published/)).toBeAttached();
  expect((await page.goto('/work/not-a-case-study')).status()).toBe(404);
});
