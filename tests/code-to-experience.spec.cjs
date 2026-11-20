const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

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

// A film is revealed on the animation frame after its first picture is drawn (never blank), so opacity is read
// two frames after the drawn-frame attribute changes.
const nextFrames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

const waitForDirector = page => page.locator("[data-testid=code-to-experience]").and(page.locator("[data-director]")).waitFor({ state: "attached", timeout: 15000 });

test("the photographed display hands off to a full-bleed editor and a followed packet", async ({ page }) => {
  await page.goto(ROUTE);
  await page.evaluate(() => document.fonts.ready);
  await waitForDirector(page);
  await scrollToProgress(page, 0);
  const viewport = page.viewportSize();
  const compact = viewport.width <= 800;

  // Shot 1: untouched photograph, no overlay yet.
  const photo0 = await box(page, ".cte-photo");
  expect(photo0.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(photo0.transform)).toBeTruthy();
  expect((await box(page, ".cte-screen")).opacity).toBe(0);

  // Shot 2: once fully faded in, the live editor sits inside the photographed display, with its proportions.
  await scrollToProgress(page, 0.24);
  const photo = await box(page, ".cte-photo");
  const screen = await box(page, ".cte-screen");
  expect(screen.opacity).toBeGreaterThan(0.9);
  expect(screen.x).toBeGreaterThan(photo.x);
  expect(screen.x + screen.w).toBeLessThan(photo.x + photo.w);
  expect(screen.y).toBeGreaterThan(photo.y);
  expect(screen.y + screen.h).toBeLessThan(photo.y + photo.h);
  expect(screen.w / screen.h).toBeGreaterThan(1.35);
  expect(screen.w / screen.h).toBeLessThan(1.9);

  // Shot 3: inside the screen — the editor covers the frame edge to edge and the room is gone.
  await scrollToProgress(page, 0.6);
  const inside = await box(page, ".cte-screen");
  expect(inside.x).toBeLessThanOrEqual(1);
  expect(inside.x + inside.w).toBeGreaterThanOrEqual(viewport.width - 1);
  if (!compact) {
    expect(inside.y).toBeLessThanOrEqual(81);
    expect(inside.y + inside.h).toBeGreaterThanOrEqual(viewport.height - 1);
  }
  expect((await box(page, ".cte-photo")).visibility).toBe("hidden");

  // Shots 4–5: the editor holds full-bleed while the pulse marks the followed call.
  await scrollToProgress(page, 1.02);
  const hold = await box(page, ".cte-screen");
  expect(hold.opacity).toBe(1);
  expect(hold.x).toBeLessThanOrEqual(1);
  expect(hold.x + hold.w).toBeGreaterThanOrEqual(viewport.width - 1);
  await expect(page.locator(".cte-screen .cte-token")).toHaveAttribute("data-state", "lit");
  expect((await box(page, ".cte-packet-ring")).opacity).toBeGreaterThan(0.3);

  // Shot 6: the call lifts out as a packet, the editor recedes, the packet becomes the 3D signal.
  await scrollToProgress(page, 1.35);
  expect((await box(page, ".cte-packet")).opacity).toBe(1);
  await expect(page.locator(".cte-screen .cte-token")).toHaveAttribute("data-state", "lifted");
  await scrollToProgress(page, 1.95);
  expect((await box(page, ".cte-packet")).opacity).toBe(0);
  expect((await box(page, ".cte-screen")).opacity).toBe(0);

  // Rewind is deterministic: back to the untouched photograph.
  await scrollToProgress(page, 0.62);
  await scrollToProgress(page, 0);
  const rewound = await box(page, ".cte-photo");
  expect(rewound.opacity).toBe(1);
  expect(rewound.x).toBeCloseTo(photo0.x, 0);
  expect(rewound.w).toBeCloseTo(photo0.w, 0);
  expect((await box(page, ".cte-screen")).opacity).toBe(0);
});

// Milestone 2: Blender-rendered Git → CI → deployment sequence, scrubbed frame-accurately by scroll.
test("the rendered pipeline sequence is frame-accurate, carries the same packet and rewinds", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForDirector(page);
  const variant = page.viewportSize().width <= 800 ? "mobile" : "desktop";
  const manifest = await (await page.request.get(`/cinematic/pipeline/${variant}/manifest.json`)).json();
  const frameFor = t => Math.round(Math.min(1, Math.max(0, (t - manifest.tStart) / (manifest.tEnd - manifest.tStart))) * (manifest.frames - 1));
  const sequence = page.getByTestId("cte-sequence");

  // Not loaded or shown during the photograph.
  await scrollToProgress(page, 0.2);
  expect((await box(page, "[data-testid=cte-sequence]")).opacity).toBe(0);

  // Inside the pipeline: the canvas shows exactly the frame for this scroll position.
  // Exact: the drawn frame equals round(local × (n − 1)) for the progress the director itself reports.
  const site = page.getByTestId("code-to-experience");
  for (const t of [2.1, 2.6, 3.4]) {
    await scrollToProgress(page, t);
    const progress = Number(await site.getAttribute("data-progress"));
    expect(Math.abs(progress - t)).toBeLessThan(0.01);
    await expect(sequence).toHaveAttribute("data-frame", String(frameFor(progress)), { timeout: 20000 });
    await nextFrames(page);
    expect((await box(page, "[data-testid=cte-sequence]")).opacity).toBe(1);
  }

  // Hand-off: just before the DOM packet fades, it sits on the rendered packet's exported position.
  await scrollToProgress(page, 1.69);
  const vp = page.viewportSize();
  const row = manifest.packet[frameFor(1.69)];
  const scale = Math.max(vp.width / manifest.width, vp.height / manifest.height);
  const expected = { x: (vp.width - manifest.width * scale) / 2 + row[0] * manifest.width * scale, y: (vp.height - manifest.height * scale) / 2 + row[1] * manifest.height * scale };
  const actual = await page.locator(".cte-packet").evaluate(el => { const m = new DOMMatrix(getComputedStyle(el).transform); return { x: m.m41, y: m.m42 }; });
  expect(Math.hypot(actual.x - expected.x, actual.y - expected.y)).toBeLessThan(vp.width * 0.05);

  // Rewind: back inside the editor the sequence is gone again.
  await scrollToProgress(page, 1.0);
  expect((await box(page, "[data-testid=cte-sequence]")).opacity).toBe(0);
  expect((await box(page, ".cte-screen")).opacity).toBe(1);
});

// Milestone 3 — acceptance checks from the cinematic review.
test("the live packet arrives at the rendered artifact's size and position at the hand-off", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForDirector(page);
  const variant = page.viewportSize().width <= 800 ? "mobile" : "desktop";
  const manifest = await (await page.request.get(`/cinematic/pipeline/${variant}/manifest.json`)).json();
  // Wait for the sequence to be ready (packetAt drives the hand-off target), then sit just before the fade.
  await scrollToProgress(page, 1.6);
  await expect(page.getByTestId("cte-sequence")).toHaveAttribute("data-frames", String(manifest.frames), { timeout: 20000 });
  await scrollToProgress(page, 1.715);
  const t = Number(await page.getByTestId("code-to-experience").getAttribute("data-progress"));
  const f = Math.round(Math.min(1, Math.max(0, (t - manifest.tStart) / (manifest.tEnd - manifest.tStart))) * (manifest.frames - 1));
  const vp = page.viewportSize();
  const scale = Math.max(vp.width / manifest.width, vp.height / manifest.height);
  const row = manifest.packet[f];
  expect(row[3]).toBe(1); // the rendered artifact is on screen during the hand-off
  const expectedDiameter = 2 * row[4] * manifest.height * scale;
  const core = await page.locator(".cte-packet-core").evaluate(el => el.getBoundingClientRect());
  // The rotated 16 px square's bounding box is its diagonal; it must be within 35% of the rendered size.
  expect(Math.abs(core.width - expectedDiameter) / expectedDiameter).toBeLessThan(0.35);
});

test("portrait framing keeps the whole followed line readable inside the screen", async ({ page }) => {
  test.skip(page.viewportSize().width > 800, "portrait-specific framing");
  await page.goto(ROUTE);
  await page.evaluate(() => document.fonts.ready);
  await waitForDirector(page);
  await scrollToProgress(page, 1.0);
  const vp = page.viewportSize();
  const token = await page.locator(".cte-screen .cte-token").evaluate(el => el.getBoundingClientRect());
  expect(token.x).toBeGreaterThanOrEqual(0);
  expect(token.x + token.width).toBeLessThanOrEqual(vp.width);
  expect(token.height).toBeGreaterThanOrEqual(12); // ≈ ≥ 10 px glyphs after the homography scale (old framing: ~8 px)
  // The editor band is a framed shot at the top; the caption has its own reading area below the followed call.
  const caption = await page.locator("#source .cte-copy").evaluate(el => el.getBoundingClientRect());
  expect(caption.y).toBeGreaterThan(token.y + token.height);
});

test("portrait chapter plates leave the followed artifact clear during the rendered journey", async ({ page }) => {
  test.skip(page.viewportSize().width > 800, "portrait-specific composition");
  await page.goto(ROUTE);
  await waitForDirector(page);
  const manifest = await (await page.request.get("/cinematic/pipeline/mobile/manifest.json")).json();
  const vp = page.viewportSize();
  const scale = Math.max(vp.width / manifest.width, vp.height / manifest.height);
  const oy = (vp.height - manifest.height * scale) / 2;
  for (const [t, id] of [[2.15, "build"], [2.35, "build"], [3.2, "deploy"]]) {
    await scrollToProgress(page, t);
    const f = Math.round(Math.min(1, Math.max(0, (t - manifest.tStart) / (manifest.tEnd - manifest.tStart))) * (manifest.frames - 1));
    const row = manifest.packet[f];
    const artifactBottom = oy + (row[1] + row[4]) * manifest.height * scale;
    const plate = await page.locator(`#${id} .cte-copy`).evaluate(el => ({ ...el.getBoundingClientRect().toJSON(), opacity: Number(getComputedStyle(el).opacity) }));
    // Either the plate sits below the artifact, or it has faded out.
    expect(plate.y > artifactBottom || plate.opacity < 0.05, `plate covers the artifact at t=${t}`).toBeTruthy();
  }
});

// Milestone 4: every chapter after deployment has its own rendered environment; nothing is held as a backdrop.
test("runtime and library films follow the request, then the portfolio sits on the page background", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(ROUTE);
  await waitForDirector(page);
  const variant = page.viewportSize().width <= 800 ? "mobile" : "desktop";
  const manifestFor = scene => page.evaluate(async ([sc, v]) => (await fetch(`/cinematic/${sc}/${v}/manifest.json`)).json(), [scene, variant]);
  const frameOf = (m, t) => Math.round(Math.min(1, Math.max(0, (t - m.tStart) / (m.tEnd - m.tStart))) * (m.frames - 1));
  const runtimeManifest = await manifestFor("runtime");
  await scrollToProgress(page, 3.4);
  const runtime = page.getByTestId("cte-sequence-runtime");
  await expect(runtime).toHaveAttribute("data-frames", String(runtimeManifest.frames), { timeout: 30000 });
  for (const t of [4.5, 5.5, 6.5]) {
    await scrollToProgress(page, t);
    await expect(runtime).toHaveAttribute("data-frame", String(frameOf(runtimeManifest, t)), { timeout: 20000 });
    await nextFrames(page);
    expect((await box(page, "[data-testid=cte-sequence-runtime]")).opacity).toBe(1);
    expect((await box(page, "[data-testid=cte-sequence]")).opacity).toBe(0);
    expect((await box(page, ".cte-world-layer")).opacity).toBe(0);
  }
  const libraryManifest = await manifestFor("library");
  await scrollToProgress(page, 8.3);
  const library = page.getByTestId("cte-sequence-library");
  await expect(library).toHaveAttribute("data-frame", String(frameOf(libraryManifest, 8.3)), { timeout: 30000 });
  await nextFrames(page);
  expect((await box(page, "[data-testid=cte-sequence-library]")).opacity).toBe(1);
  expect((await box(page, "[data-testid=cte-sequence-runtime]")).opacity).toBe(0);
  await expect(page.locator("#experience").getByText(/Conceptual illustration/)).toBeAttached();
  await scrollToProgress(page, 9.6);
  for (const id of ["cte-sequence", "cte-sequence-runtime", "cte-sequence-library"]) {
    expect((await box(page, `[data-testid=${id}]`)).opacity, id).toBe(0);
  }
  expect((await box(page, ".cte-dim")).opacity).toBe(0);
  // Rewind into the runtime film.
  await scrollToProgress(page, 5.0);
  await expect(runtime).toHaveAttribute("data-frame", String(frameOf(runtimeManifest, 5.0)), { timeout: 20000 });
});

test("the JSON response assembles into the catalogue as the result chapter arrives", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForDirector(page);
  const catalogue = page.getByTestId("cte-catalogue");
  await scrollToProgress(page, 6.2);
  await expect(catalogue).toHaveAttribute("data-assembled", "false");
  await scrollToProgress(page, 7.35);
  await expect(catalogue).toHaveAttribute("data-assembled", "true");
  expect((await box(page, ".cte-catalogue-ui")).opacity).toBe(1);
});

test("jumping straight to the portfolio downloads no film, and only the viewport's variant is ever requested", async ({ page }) => {
  const requests = [];
  page.on("request", r => { if (r.url().includes("/cinematic/")) requests.push(r.url()); });
  await page.goto(ROUTE + "#about");
  await waitForDirector(page);
  await page.waitForTimeout(2500);
  expect(requests).toEqual([]);
  await expect(page.locator("#about")).toBeInViewport({ ratio: 0.2 });
  await scrollToProgress(page, 1.2);
  await page.waitForTimeout(1500);
  const other = page.viewportSize().width <= 800 ? "/desktop/" : "/mobile/";
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.filter(u => u.includes(other))).toEqual([]);
  expect(requests.filter(u => u.includes("/runtime/") || u.includes("/library/"))).toEqual([]);
});

test("reduced motion never downloads the rendered sequence", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests = [];
  page.on("request", r => { if (r.url().includes("/cinematic/")) requests.push(r.url()); });
  await page.goto(ROUTE);
  await page.evaluate(() => window.scrollTo(0, document.getElementById("deploy").offsetTop));
  await page.waitForTimeout(1500);
  expect(requests).toEqual([]);
  await expect(page.getByTestId("cte-sequence")).toBeHidden();
});

test("hero exposes identity, the film, the work, a skip and the CV in one interaction", async ({ page }) => {
  await page.goto(ROUTE);
  const hero = page.locator("#studio");
  await expect(hero.getByText(/PRATHMESH PAWAR · SOFTWARE ENGINEER/)).toBeVisible();
  await expect(hero.getByText(/From source code to the systems, services and interfaces people use/)).toBeAttached();
  await expect(hero.getByRole("link", { name: /Enter the code/i })).toHaveAttribute("href", "#source");
  await expect(hero.getByRole("link", { name: /Explore my work/i })).toHaveAttribute("href", "#work");
  await expect(hero.getByRole("link", { name: /Skip the film/i })).toHaveAttribute("href", "#work");
  // Touch layouts keep the CV in the header menu.
  if (page.viewportSize().width <= 800) await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("link", { name: "CV, curriculum vitae (PDF)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "CV, curriculum vitae (PDF)" })).toHaveAttribute("href", "/Prathmesh_Pawar_CV.pdf");
});

test("hero text never overlaps the photograph", async ({ page }) => {
  await page.goto(ROUTE);
  await scrollToProgress(page, 0);
  const photo = await box(page, ".cte-photo");
  for (const selector of ["#studio h1", "#studio .cte-actions"]) {
    const el = await box(page, selector);
    const overlapX = Math.min(el.x + el.w, photo.x + photo.w) - Math.max(el.x, photo.x);
    const overlapY = Math.min(el.y + el.h, photo.y + photo.h) - Math.max(el.y, photo.y);
    // Desktop lets the copy sit over the photo's masked (transparent) left edge only.
    const allowedX = page.viewportSize().width > 800 ? photo.w * 0.26 : 0;
    expect(overlapX <= allowedX || overlapY <= 0, `${selector} overlaps the photo`).toBeTruthy();
  }
});

test("photo-led journey preserves all 12 narrative chapters and links", async ({ page }) => {
  await page.goto(ROUTE);
  await expect(page.locator("[data-cte-step]")).toHaveCount(12);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /Software starts with/i })).toBeVisible();
  await expect(page.locator(".cte-photo img")).toHaveAttribute("src", /coding-workspace|workstation/);
  await expect(page.getByRole("link", { name: /Download CV/i })).toHaveAttribute("href", "/Prathmesh_Pawar_CV.pdf");
  await expect(page.getByRole("link", { name: /Explore live Folio/i })).toHaveAttribute("href", "https://prathmesh-library.runasp.net/");
});

test("the single scroll director reaches projects and returns to the original photo", async ({ page }) => {
  await page.goto(ROUTE);
  await page.locator(".cte-rail").getByRole("link", { name: "Go to Selected engineering" }).click();
  await expect(page.locator("#work")).toBeInViewport({ ratio: 0.2, timeout: 15000 });
  await expect(page.getByRole("heading", { name: /Evidence over/i })).toBeVisible();
  await page.locator(".cte-rail").getByRole("link", { name: "Go to The developer" }).click();
  await expect(page.locator("#studio")).toBeInViewport({ ratio: 0.2, timeout: 15000 });
});

test("the Folio catalogue filters the demo's synthetic records and shows the API's JSON shape", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForDirector(page);
  const field = page.getByRole("searchbox", { name: /Try a catalogue search/i });
  await field.fill("reliable");
  await expect(page.locator(".cte-book")).toHaveCount(1);
  await expect(page.locator(".cte-book")).toContainText("Building Reliable Web Services");
  await expect(page.locator(".cte-request-line")).toContainText("GET /api/catalogue?search=reliable&page=1&pageSize=12");
  await field.fill("");
  await page.getByRole("group", { name: "Filter by category" }).getByRole("button", { name: "History" }).click();
  await expect(page.locator(".cte-book")).toHaveCount(2);
  await page.getByRole("button", { name: "JSON response" }).click();
  const json = JSON.parse(await page.getByTestId("cte-json").textContent());
  expect(json).toMatchObject({ total: 2, page: 1, pageSize: 12 });
  expect(json.items.map(b => b.title)).toEqual(["Cities Built on Stories", "The Atlas of Ancient Routes"]);
  await page.getByRole("button", { name: "Interface" }).click();
  await field.fill("no-such-book");
  await expect(page.getByText(/No matching sample titles/i)).toBeVisible();
});

test("runtime chapters name the real public route and label conceptual parts", async ({ page }) => {
  await page.goto(ROUTE);
  await expect(page.locator("#request")).toContainText("GET /api/catalogue?search=reliable");
  await expect(page.locator("#backend")).toContainText(/Middleware stage names are illustrative/);
  await expect(page.locator("#database")).toContainText(/synthetic catalogue/);
  await expect(page.locator("#experience h2")).toContainText(/From a line of code/);
});

test("reduced motion keeps a complete accessible portfolio without WebGL", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(ROUTE);
  await expect(page.getByTestId("cte-fallback")).toBeAttached();
  await expect(page.getByTestId("cte-world")).toHaveCount(0);
  await expect(page.locator(".cte-screen")).toBeHidden();
  await expect(page.locator("#source .cte-editor")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-cte-step]")).toHaveCount(12);
  await expect(page.getByRole("link", { name: "Read case study: Folio" })).toHaveAttribute("href", "/work/folio");
  await expect(page.getByRole("link", { name: "Read case study: Engineering Observatory" })).toHaveAttribute("href", "/work/observatory");
});

test("layout has no horizontal overflow", async ({ page }) => {
  await page.goto(ROUTE);
  const width = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.actual).toBeLessThanOrEqual(width.viewport + 2);
});

test("no axe WCAG 2.0-2.2 A/AA violations at the hero, the runtime chapters and the catalogue", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(ROUTE);
  await waitForDirector(page);
  for (const t of [0, 5.0, 7.2, 9.4]) {
    await scrollToProgress(page, t);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.slice(0, 3).map(n => n.target.join(" ")) })), `t=${t}`).toEqual([]);
  }
});

// ── Release hardening: interaction quality ───────────────────────────────────────────────────────────────
const variantOf = page => (page.viewportSize().width <= 800 ? "mobile" : "desktop");
const frameFor = (m, t) => Math.round(Math.min(1, Math.max(0, (t - m.tStart) / (m.tEnd - m.tStart))) * (m.frames - 1));

test("rapid direction changes settle on the exact requested frame (no stale frame)", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(ROUTE);
  await waitForDirector(page);
  const m = await page.evaluate(async v => (await fetch(`/cinematic/pipeline/${v}/manifest.json`)).json(), variantOf(page));
  await scrollToProgress(page, 1.8);
  const canvas = page.getByTestId("cte-sequence");
  await expect(canvas).toHaveAttribute("data-frames", String(m.frames), { timeout: 30000 });
  for (const t of [2.9, 1.9, 3.4, 2.2, 3.1, 2.5]) await scrollToProgress(page, t);
  await expect(canvas).toHaveAttribute("data-frame", String(frameFor(m, 2.5)), { timeout: 20000 });
});

test("visible film canvases are never blank while scrubbing through all three films", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(ROUTE);
  await waitForDirector(page);
  await page.evaluate(() => {
    window.__blank = 0;
    const canvases = [...document.querySelectorAll("canvas.cte-sequence")];
    const tick = () => { for (const c of canvases) if (Number(c.style.opacity || 0) > 0.5 && c.dataset.frame === undefined) window.__blank++; window.__rafId = requestAnimationFrame(tick); };
    tick();
  });
  for (let t = 1.2; t <= 9.4; t += 0.15) { await scrollToProgress(page, t); }
  for (let t = 9.4; t >= 1.2; t -= 0.3) { await scrollToProgress(page, t); }
  const blank = await page.evaluate(() => { cancelAnimationFrame(window.__rafId); return window.__blank; });
  expect(blank).toBe(0);
});

test("a chapter URL survives refresh, and back/forward follow chapter links", async ({ page }) => {
  await page.goto(ROUTE + "#database");
  await waitForDirector(page);
  await expect(page.locator("#database")).toBeInViewport({ ratio: 0.2 });
  await page.reload();
  await waitForDirector(page);
  await expect(page.locator("#database")).toBeInViewport({ ratio: 0.2 });
  await page.goto(ROUTE + "#contact");
  await expect(page.locator("#contact")).toBeInViewport({ ratio: 0.2 });
  await page.goBack();
  await expect(page.locator("#database")).toBeInViewport({ ratio: 0.2 });
  await page.goForward();
  await expect(page.locator("#contact")).toBeInViewport({ ratio: 0.2 });
});

test("crossing the 800 px breakpoint switches the film variant and keeps playback in sync", async ({ page }) => {
  test.skip(page.viewportSize().width <= 800, "starts on the desktop variant");
  test.setTimeout(90000);
  await page.goto(ROUTE);
  await waitForDirector(page);
  await scrollToProgress(page, 2.4);
  const canvas = page.getByTestId("cte-sequence");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/, { timeout: 30000 });
  const mobileManifest = page.waitForResponse(r => r.url().includes("/cinematic/pipeline/mobile/manifest.json"));
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileManifest;
  const m = await page.evaluate(async () => (await fetch("/cinematic/pipeline/mobile/manifest.json")).json());
  const t = Number(await page.locator("[data-testid=code-to-experience]").getAttribute("data-progress"));
  await expect(canvas).toHaveAttribute("data-frame", String(frameFor(m, t)), { timeout: 20000 });
});

// ── Release hardening: accessibility (automated checks; not proof of full WCAG conformance) ─────────────────
test("one h1 and no skipped heading levels", async ({ page }) => {
  await page.goto(ROUTE);
  const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll(hs => hs.map(h => Number(h.tagName[1])));
  expect(levels.filter(l => l === 1)).toHaveLength(1);
  for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1);
});

test("controls meet the WCAG 2.2 minimum target size (24 × 24 CSS px, or the spacing exception)", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForDirector(page);
  // SC 2.5.8: a target smaller than 24 × 24 passes if a 24 px circle centred on it intersects no other target and no
  // other undersized target's circle. Inline links in sentences are exempt and not selected here.
  const failures = await page.locator(".cte-header a:visible, .cte-header button:visible, .cte-header select:visible, .cte-rail a:visible, .cte-actions a:visible, .cte-chips button, .cte-view-toggle button, .cte-project-actions a, .cte-contact-actions a, .cte-skip, .cte-footer button")
    .evaluateAll(els => {
      const rects = els.map(el => ({ el, r: el.getBoundingClientRect() })).filter(x => x.r.width > 0 && x.r.height > 0);
      const centre = r => [r.x + r.width / 2, r.y + r.height / 2];
      const distToRect = ([cx, cy], r) => Math.hypot(Math.max(r.x - cx, 0, cx - (r.x + r.width)), Math.max(r.y - cy, 0, cy - (r.y + r.height)));
      const small = rects.filter(x => x.r.width < 24 || x.r.height < 24);
      return small.filter(a => {
        const c = centre(a.r);
        return rects.some(b => b !== a && (distToRect(c, b.r) < 12 || (small.includes(b) && Math.hypot(c[0] - centre(b.r)[0], c[1] - centre(b.r)[1]) < 24)));
      }).map(x => ({ text: (x.el.textContent || "").trim().slice(0, 30), w: Math.round(x.r.width), h: Math.round(x.r.height) }));
    });
  expect(failures).toEqual([]);
});

test("keyboard: the skip link comes first and focus is visible", async ({ page, browserName }) => {
  // Safari/WebKit only moves Tab focus to links when the user enables it (Option+Tab otherwise): a platform default.
  test.skip(browserName === "webkit", "WebKit does not Tab to links by default");
  await page.goto(ROUTE);
  await waitForDirector(page);
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { cls: el.className, text: el.textContent.trim(), outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0, shadow: cs.boxShadow !== "none", visible: el.getBoundingClientRect().height > 0 };
  });
  expect(focused.text).toMatch(/Skip the film/i);
  expect(focused.visible).toBe(true);
  expect(focused.outline || focused.shadow).toBe(true);
});

test("keyboard (WebKit alternative): focus order, skip-link focus indicator and activation", async ({ page, browserName }) => {
  // The Tab test above is skipped on WebKit because Safari only Tabs to links when the user enables
  // "Press Tab to highlight each item"; Option+Tab is the platform's built-in way to reach links.
  test.skip(browserName !== "webkit", "Alternative verification for WebKit only");
  await page.goto(ROUTE);
  await waitForDirector(page);
  // 1. Sequential focus order: the skip link is the first focusable element and no positive tabindex reorders focus.
  const order = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]"))
      .filter(el => el.tabIndex >= 0 && !el.closest("[inert], [hidden]"));
    return { first: (els[0] && els[0].textContent || "").trim(), positive: els.filter(el => el.tabIndex > 0).length };
  });
  expect(order.first).toMatch(/Skip the film/i);
  expect(order.positive).toBe(0);
  // 2. Option+Tab reaches the skip link; if this WebKit build ignores the modifier, focus it after a key press instead.
  await page.keyboard.press("Alt+Tab");
  let method = "Option+Tab";
  if (!/Skip the film/i.test(await page.evaluate(() => document.activeElement.textContent.trim()))) {
    await page.keyboard.press("Shift");
    await page.locator(".cte-skip").focus();
    method = "focus() after a key press";
  }
  test.info().annotations.push({ type: "webkit-keyboard-method", description: method });
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim(), onScreen: r.bottom > 0 && r.top < innerHeight && r.height > 0, outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0, shadow: cs.boxShadow !== "none" };
  });
  expect(focused.text).toMatch(/Skip the film/i);
  expect(focused.onScreen).toBe(true);
  expect(focused.outline || focused.shadow).toBe(true);
  // 3. Activating the skip link with Enter moves the reader to the projects.
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#work");
});

test("a malformed URL fragment does not break the page", async ({ page }) => {
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(ROUTE + "#%E0%A4%A");
  await waitForDirector(page);
  await scrollToProgress(page, 1.2);
  expect(errors).toEqual([]);
  expect(Number(await page.locator("[data-testid=code-to-experience]").getAttribute("data-progress"))).toBeGreaterThan(0.5);
});
