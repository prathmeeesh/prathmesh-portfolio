// Opening sequence (Shots 1–6): photo dolly → display hand-off → full-bleed editor → pulse → packet.
// Every scene is a pure function of chapter progress `t` (0 = hero top, 1 = source chapter top),
// so scrolling fast, reversing, jumping or resizing always reconstructs the same frame.
import { HANDOFF_END, HANDOFF_START, mapPoint, photoScreenQuad, projectSignal, quadToMatrix3d, quadToQuad } from "./journeyPath";

export const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
export const smooth = (a, b, value) => {
  const x = clamp((value - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, x) => a + (b - a) * x;
const lerpQuad = (qa, qb, x) => qa.map((p, i) => [lerp(p[0], qb[i][0], x), lerp(p[1], qb[i][1], x)]);
const rectQuad = ({ x, y, w, h }) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const scaleAbout = (r, k, [ax, ay]) => ({ x: ax + (r.x - ax) * k, y: ay + (r.y - ay) * k, w: r.w * k, h: r.h * k });
const lerpRect = (a, b, x) => ({ x: lerp(a.x, b.x, x), y: lerp(a.y, b.y, x), w: lerp(a.w, b.w, x), h: lerp(a.h, b.h, x) });

export const TIMELINE = {
  heroFade: [0.06, 0.26],
  heroFadeCompact: [0.02, 0.12],
  zoom: [0.02, 0.56], // dolly toward the display about a solved fixed point
  screenOn: [0.06, 0.24], // live editor replaces the photographed pixels inside the corners
  straighten: [0.3, 0.56], // display perspective flattens as the camera arrives
  // The room stays until the screen has filled the frame (desktop); on portrait it dims around the editor.
  photoFade: [0.52, 0.59], // gone before the editor settles (the entry push already covers the frame)
  photoFadeCompact: [0.5, 0.6],
  pixels: [0.48, 0.64], // crossing the screen surface: the LCD sub-pixel grid rushes past
  glass: [0.42, 0.58], // a reflection sweeps across the cover glass as the camera reaches it
  entry: [0.5, 0.68], // the camera pushes through the glass (slight overshoot), then settles full-bleed
  glowIn: [0.06, 0.3],
  glowOut: [0.45, 0.6],
  pushIn: [0.56, 1.15], // slow push toward the request handler
  caption: [0.8, 0.95],
  captionOut: [1.12, 1.26], // the caption clears before it reaches the pulsing line
  tiltUp: [0.78, 1.0], // portrait only: the centred editor tilts up to make room for the caption
  photoCaptionOut: [0.02, 0.08],
  pulse: [0.95, 1.14], // light rings SearchAsync — the object we follow from here on
  tokenLit: 0.95,
  tokenLifted: 1.12,
  label: [1.08, 1.12],
  travel: [1.16, HANDOFF_START + 0.02],
  ideExit: [1.3, 1.58], // camera pushes through the editor as the packet leaves
  pixelsExit: [1.36, 1.6], // …and the editor dissolves into its sub-pixels, where the rendered dive takes over
  world: [1.2, 1.6],
  dim: [3.9, 4.2], // reading plate while the runtime and library films play behind chapter copy…
  dimOut: [8.72, 9.05], // …gone with the film: the portfolio chapters sit on the page's own background
  assembly: [6.8, 7.15], // the JSON response (runtime film frames ~180–200) assembles into the catalogue interface as the result chapter arrives
};

// Measures the layout once per resize. Returns null if the opening is not mounted.
export function measureOpening({ photo, img, screen, token, packetLabel }, vw, vh) {
  if (!photo || !screen) return null;
  const frame = { x: photo.offsetLeft, y: photo.offsetTop, w: photo.offsetWidth, h: photo.offsetHeight };
  const pos = (img ? getComputedStyle(img).objectPosition : "50% 50%").split(" ").map(v => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5));
  const quad = photoScreenQuad(frame, [pos[0] ?? 0.5, pos[1] ?? 0.5]);
  const screenW = ((quad[1][0] - quad[0][0]) + (quad[2][0] - quad[3][0])) / 2;
  const screenH = ((quad[3][1] - quad[0][1]) + (quad[2][1] - quad[1][1])) / 2;
  const aspect = screenW / screenH;
  const center = quad.reduce((acc, p) => [acc[0] + p[0] / 4, acc[1] + p[1] / 4], [0, 0]);
  const compact = vw <= 800;
  const BASE_W = 820;
  let full;
  let hold;
  if (compact) {
    // Dedicated portrait framing (a camera that came close to a landscape screen): the explorer is cropped off
    // the left edge and the scale is the largest at which the whole followed line still fits the width, so code
    // stays readable instead of shrinking the full IDE into a strip. The band sits at the top; the caption gets
    // its own reading area below it. Fractions are measured at the 820 px base (container units = scale-invariant).
    screen.style.width = `${BASE_W}px`;
    screen.style.height = `${BASE_W / aspect}px`;
    const sw = screen.offsetWidth || BASE_W;
    const explorer = screen.querySelector(".cte-ide-explorer");
    const codeLeft = explorer && explorer.offsetWidth ? explorer.offsetWidth / sw : 0.27;
    let tokenRight = 0.77;
    if (token) {
      let x = 0, el = token;
      while (el && el !== screen) { x += el.offsetLeft; el = el.offsetParent; }
      if (el === screen) tokenRight = (x + token.offsetWidth) / sw;
    }
    const top = vw <= 520 ? 84 : 92;
    // Height cap only keeps the code (not the empty editor area below it) above a caption-sized band, so short
    // viewports (e.g. a 390 × 664 phone browser) keep readable glyphs; the caption may overlap the empty area.
    const w = Math.min((vw - 16) / (tokenRight - codeLeft + 0.02), (vh - top - 120) * aspect);
    full = { x: -codeLeft * w + 6, y: top, w, h: w / aspect };
    hold = full;
  } else {
    // Landscape: the display covers everything below the header, edge to edge.
    const top = 80;
    const w = Math.max(vw, (vh - top) * aspect);
    full = { x: (vw - w) / 2, y: top + (vh - top - w / aspect) / 2, w, h: w / aspect };
  }
  // Lay the editor out at ~820 px and let the homography scale it up. Its layout is in container
  // units, so it looks identical at any base size, but Chrome rasterises a perspective-warped layer at
  // its base size each frame: a full-bleed base cost ~5x more raster during the zoom (measured).
  // 820 px keeps the base above the editor's 800 px container breakpoint, so desktop typography is unchanged.
  // Always the 820 px base (one typography for every viewport), scaled by the homography.
  const k = full.w / BASE_W;
  const base = { w: full.w / k, h: full.h / k };
  screen.style.width = `${base.w}px`;
  screen.style.height = `${base.h}px`;
  // Dolly about fixed point F: the display centre lands on the full-frame centre at scale S.
  const S = full.w / screenW;
  const target = [full.x + full.w / 2, full.y + full.h / 2];
  const focus = [(target[0] - S * center[0]) / (1 - S), (target[1] - S * center[1]) / (1 - S)];
  // Push-in anchor: the highlighted call, in base editor coordinates.
  let anchor = [0.5, 0.5];
  let tokenRect = null;
  if (token) {
    let x = 0, y = 0, el = token;
    while (el && el !== screen) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    if (el === screen) {
      tokenRect = { x, y, w: token.offsetWidth, h: token.offsetHeight };
      anchor = [(x + tokenRect.w / 2) / base.w, (y + tokenRect.h / 2) / base.h];
    }
    if (packetLabel) packetLabel.style.fontSize = getComputedStyle(token).fontSize;
  }
  return { frame, quad, S, focus, full, base, hold: hold ?? full, anchor, tokenRect, compact };
}

// Scene table. `start`/`end` document the active range; seek() always runs so state outside
// the range is reset deterministically (e.g. after a chapter jump).
export const OPENING_SCENES = [
  {
    id: "hero-copy", start: 0, end: 0.26,
    seek(t, { refs, geo }) {
      if (!refs.heroCopy) return;
      refs.heroCopy.style.opacity = String(1 - smooth(...(geo?.compact ? TIMELINE.heroFadeCompact : TIMELINE.heroFade), t));
    },
  },
  {
    id: "photo-dolly", start: 0, end: 0.6,
    seek(t, { refs, geo, state }) {
      const photo = refs.photo;
      if (!photo || !geo) return;
      const s = Math.pow(geo.S, smooth(...TIMELINE.zoom, t));
      state.scale = s;
      const alpha = 1 - smooth(...(geo.compact ? TIMELINE.photoFadeCompact : TIMELINE.photoFade), t);
      photo.style.transformOrigin = `${geo.focus[0] - geo.frame.x}px ${geo.focus[1] - geo.frame.y}px`;
      photo.style.transform = `scale(${s})`;
      photo.style.opacity = String(alpha);
      photo.style.visibility = alpha < 0.001 ? "hidden" : "visible";
      if (refs.photoCaption) refs.photoCaption.style.opacity = (1 - smooth(...TIMELINE.photoCaptionOut, t)).toFixed(3);
    },
  },
  {
    id: "display-handoff", start: 0.06, end: 1.62,
    seek(t, { refs, geo, state }) {
      const el = refs.screen;
      if (!el || !geo) return;
      // Once the camera has pushed through, the editor is fully hidden and no longer updated, so it costs
      // no raster or compositing while the rendered sequence plays (measured: ~10–25 extra slow frames).
      // (after the packet hand-off, because the packet starts from the token's projected position)
      // Sub-pixel layer: entering the glass (0.48–0.64) and dissolving into the rendered dive (1.36–1.6).
      // Updated before the early return below, so a jump past the hand-off never leaves it on screen.
      if (refs.pixels) {
        const k = smooth(...TIMELINE.pixels, t);
        const x = clamp((t - TIMELINE.pixelsExit[0]) / (TIMELINE.pixelsExit[1] - TIMELINE.pixelsExit[0]));
        const entryA = 0.3 * Math.sin(Math.PI * k);
        const exitA = 0.42 * Math.sin(Math.PI * x);
        refs.pixels.style.opacity = Math.max(entryA, exitA).toFixed(3);
        refs.pixels.style.transform = `scale(${(exitA > entryA ? 1.2 + 5 * x : 1.4 + 4 * k).toFixed(3)})`;
      }
      const gone = t > HANDOFF_END + 0.05;
      el.style.visibility = gone ? "hidden" : "visible";
      if (gone) { el.style.opacity = "0"; return; }
      const s = state.scale ?? 1;
      const tracked = geo.quad.map(([x, y]) => [geo.focus[0] + s * (x - geo.focus[0]), geo.focus[1] + s * (y - geo.focus[1])]);
      // Camera entry: a brief push past the glass (the bezel leaves the frame, the sub-pixels rush past), then the
      // editor settles exactly full-bleed. sin() of a clamped ramp: deterministic and zero outside the window.
      const entryK = clamp((t - TIMELINE.entry[0]) / (TIMELINE.entry[1] - TIMELINE.entry[0]));
      const push = 1 + 0.06 * smooth(...TIMELINE.pushIn, t) + 0.22 * smooth(...TIMELINE.ideExit, t) + 0.045 * Math.sin(Math.PI * entryK);
      const base = lerpRect(geo.full, geo.hold, smooth(...TIMELINE.tiltUp, t));
      const anchorPt = [base.x + geo.anchor[0] * base.w, base.y + geo.anchor[1] * base.h];
      const target = scaleAbout(base, push, anchorPt);
      const dest = lerpQuad(tracked, rectQuad(target), smooth(...TIMELINE.straighten, t));
      el.style.transform = quadToMatrix3d(geo.base.w, geo.base.h, dest);
      // One transform pipeline: the perspective correction applied to the screen is applied to the whole
      // photograph too, so the laptop body stays attached around the editor as the camera turns to face it.
      if (refs.photo && t < 0.62) {
        const f = geo.frame;
        const toDest = quadToQuad(tracked, dest);
        const corners = [[f.x, f.y], [f.x + f.w, f.y], [f.x + f.w, f.y + f.h], [f.x, f.y + f.h]]
          .map(([x, y]) => [geo.focus[0] + s * (x - geo.focus[0]), geo.focus[1] + s * (y - geo.focus[1])])
          .map(toDest);
        if (corners.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))) {
          refs.photo.style.transformOrigin = "0 0";
          refs.photo.style.transform = quadToMatrix3d(f.w, f.h, corners.map(([x, y]) => [x - f.x, y - f.y]));
        }
      }
      if (refs.glassBand) {
        const g = clamp((t - TIMELINE.glass[0]) / (TIMELINE.glass[1] - TIMELINE.glass[0]));
        refs.glassBand.style.opacity = Math.sin(Math.PI * g).toFixed(3);
        refs.glassBand.style.transform = `translateX(${(-60 + 320 * g).toFixed(1)}%) skewX(-18deg)`;
      }
      el.style.opacity = (smooth(...TIMELINE.screenOn, t) * (1 - smooth(...TIMELINE.ideExit, t))).toFixed(3);
      state.editorScale = (dest[1][0] - dest[0][0]) / geo.base.w;
      if (geo.tokenRect) {
        // Token box on screen, from the same homography as the editor (no layout read-back).
        const r = geo.tokenRect;
        const corners = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(([x, y]) => mapPoint(geo.base.w, geo.base.h, dest, x, y));
        const xs = corners.map(p => p[0]), ys = corners.map(p => p[1]);
        state.tokenBox = { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
      }
      if (refs.sheen) refs.sheen.style.opacity = (1 - smooth(...TIMELINE.straighten, t)).toFixed(3);
      if (refs.glow) refs.glow.style.opacity = (smooth(...TIMELINE.glowIn, t) * (1 - smooth(...TIMELINE.glowOut, t))).toFixed(3);
    },
  },
  {
    id: "source-caption", start: 0.8, end: 0.95,
    seek(t, { refs }) {
      if (refs.sourceCopy) refs.sourceCopy.style.opacity = (smooth(...TIMELINE.caption, t) * (1 - smooth(...TIMELINE.captionOut, t))).toFixed(3);
    },
  },
  {
    id: "pulse-and-packet", start: TIMELINE.pulse[0], end: HANDOFF_END,
    seek(t, { refs, state, vw, vh, sequence }) {
      const tokenBox = state.tokenBox;
      const { token, packet, packetLabel, packetCore, packetRing } = refs;
      if (token) token.dataset.state = t >= HANDOFF_END + 0.05 ? "" : t >= TIMELINE.tokenLifted ? "lifted" : t >= TIMELINE.tokenLit ? "lit" : "";
      if (!packet) return;
      const live = tokenBox && t >= TIMELINE.pulse[0] && t < HANDOFF_END;
      packet.style.opacity = live ? "1" : "0";
      if (!live) return;
      const start = [tokenBox.left + tokenBox.width / 2, tokenBox.top + tokenBox.height / 2];
      // Hand-off target: the rendered packet in the Blender sequence (exported per frame), else the WebGL signal.
      const target = sequence?.packetAt(Math.min(t, HANDOFF_END)) ?? projectSignal(Math.min(t, HANDOFF_END), vw, vh) ?? { x: vw / 2, y: vh / 2 };
      const u = smooth(...TIMELINE.travel, t);
      const ctrl = [lerp(start[0], target.x, 0.15), Math.min(start[1], target.y) - vh * 0.16];
      const x = (1 - u) ** 2 * start[0] + 2 * (1 - u) * u * ctrl[0] + u * u * target.x;
      const y = (1 - u) ** 2 * start[1] + 2 * (1 - u) * u * ctrl[1] + u * u * target.y;
      packet.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const zoom = state.editorScale ?? 1;
      // Pulse: a ring that sizes itself to the highlighted call, expands once and fades.
      const p = clamp((t - TIMELINE.pulse[0]) / (TIMELINE.pulse[1] - TIMELINE.pulse[0]));
      if (packetRing) {
        packetRing.style.opacity = (Math.sin(Math.PI * p) * (p < 1 ? 1 : 0)).toFixed(3);
        packetRing.style.transform = `translate(-50%,-50%) scale(${((tokenBox.width / 100) * (1 + 0.28 * p)).toFixed(3)}, ${((tokenBox.height / 24) * (1 + 0.9 * p)).toFixed(3)})`;
      }
      const labelAlpha = smooth(...TIMELINE.label, t) * (1 - smooth(1.26, 1.46, t));
      if (packetLabel) {
        packetLabel.style.opacity = labelAlpha.toFixed(3);
        packetLabel.style.transform = `translate(-50%,-50%) scale(${(zoom * (0.55 + 0.45 * (1 - smooth(1.26, 1.46, t)))).toFixed(3)})`;
      }
      if (packetCore) {
        const core = smooth(1.2, 1.42, t) * (1 - smooth(HANDOFF_START, HANDOFF_END, t));
        packetCore.style.opacity = core.toFixed(3);
        // Arrive at the rendered artifact's exported on-screen size (16 px square → ~22.6 px diagonal).
        const match = target.r ? (2 * target.r) / 22.6 : 1;
        const size = smooth(1.2, 1.42, t) * lerp(1, match, smooth(1.56, 1.72, t));
        packetCore.style.transform = `translate(-50%,-50%) rotate(45deg) scale(${Math.max(0.001, size).toFixed(3)})`;
      }
    },
  },
  {
    id: "world-reveal", start: TIMELINE.world[0], end: TIMELINE.world[1],
    seek(t, ctx) {
      const { refs, sequence } = ctx;
      // The rendered sequence carries the journey and then holds as the backdrop; the procedural WebGL world is
      // only the fallback when the sequence cannot load (it never shows its placeholder geometry otherwise).
      const alpha = sequence ? 0 : smooth(...TIMELINE.world, t);
      ctx.state.worldAlpha = alpha;
      if (refs.worldLayer) refs.worldLayer.style.opacity = String(alpha);
    },
  },
  {
    id: "reading-dim", start: TIMELINE.dim[0], end: TIMELINE.dimOut[1],
    seek(t, { refs, sequence }) {
      // A side-weighted plate (journey.css) keeps chapter copy legible over the films; the centre stays clear.
      if (refs.sequence) refs.sequence.style.transform = "";
      if (refs.dim) refs.dim.style.opacity = (sequence ? 0.5 * smooth(...TIMELINE.dim, t) * (1 - smooth(...TIMELINE.dimOut, t)) : 0).toFixed(3);
    },
  },
  {
    id: "frontend-assembly", start: TIMELINE.assembly[0], end: TIMELINE.assembly[1],
    seek(t, { refs }) {
      // JSON lines resolve into the catalogue UI (CSS reads --assembly); without motion it is simply assembled.
      const a = refs.reducedMotion ? 1 : smooth(...TIMELINE.assembly, t);
      if (refs.catalogue) {
        refs.catalogue.style.setProperty("--assembly", a.toFixed(3));
        refs.catalogue.dataset.assembled = a >= 0.999 ? "true" : "false";
      }
    },
  },
  {
    id: "chapter-copy", start: 2, end: 9,
    seek(t, { refs, geo }) {
      // Portrait: build/deploy copy sits in the lower reading band and fades before it scrolls over the
      // followed artifact (which the portrait camera keeps in the upper part of the frame).
      for (const [i, el] of (refs.chapterCopies ?? []).entries()) {
        if (!el || i < 2 || i > 8) continue;
        const local = t - i;
        // (journey.css pins the plate in the lower band for the first half of the chapter; it fades before it
        // would scroll up across the artifact.)
        el.style.opacity = geo?.compact ? (smooth(-0.3, -0.05, local) * (1 - smooth(0.42, 0.56, local))).toFixed(3) : "";
      }
    },
  },
];
