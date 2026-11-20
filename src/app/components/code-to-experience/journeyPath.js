// Single source of truth for the scroll-driven camera and the code packet.
// Both the WebGL scene (World.jsx) and the DOM transition (PhotoJourney.jsx)
// read these pure functions, so the DOM packet can hand off to the 3D signal
// at exactly the projected screen position without reading back from WebGL.

export const UNIT = 12.5;
export const CAMERA_FOV = 43; // vertical, degrees
export const MAX_PROGRESS = 10;

// Laptop display polygon measured on the 1086 × 1448 source photograph
// (public/code-to-experience/workstation.webp), normalised to 0–1.
// Order: top-left, top-right, bottom-right, bottom-left.
export const PHOTO_SIZE = { width: 1086, height: 1448 };
export const PHOTO_SCREEN_QUAD = [
  [310 / 1086, 749 / 1448],
  [558 / 1086, 746.5 / 1448],
  [564.5 / 1086, 895 / 1448],
  [319.5 / 1086, 918.5 / 1448],
];

// Maps the measured display corners through `object-fit: cover` + `object-position`
// into page coordinates of the (untransformed) photo frame, so the photo can be
// cropped differently per viewport while the corners still land on the real screen.
export function photoScreenQuad(frame, position = [0.5, 0.5]) {
  const scale = Math.max(frame.w / PHOTO_SIZE.width, frame.h / PHOTO_SIZE.height);
  const drawnW = PHOTO_SIZE.width * scale;
  const drawnH = PHOTO_SIZE.height * scale;
  const offsetX = (frame.w - drawnW) * position[0];
  const offsetY = (frame.h - drawnH) * position[1];
  return PHOTO_SCREEN_QUAD.map(([u, v]) => [frame.x + offsetX + u * drawnW, frame.y + offsetY + v * drawnH]);
}

// When the DOM packet becomes the WebGL signal.
export const HANDOFF_START = 1.7;
export const HANDOFF_END = 1.8;

const clampP = (p) => Math.max(0, Math.min(MAX_PROGRESS, p));

export function cameraAt(progress) {
  const p = clampP(progress);
  const z = 10.5 - p * UNIT;
  return {
    position: [Math.sin(p * 0.64) * 0.75, 1.0 + Math.sin(p * 0.46) * 0.4, z],
    target: [0, 0.25, z - 11.5],
  };
}

export function signalAt(progress) {
  const p = clampP(progress);
  return [Math.sin(p * 2.2) * 1.4, -0.5 + Math.sin(p * 4) * 0.2, -p * UNIT];
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Projects the signal into viewport pixels using the same camera as three.js
// (PerspectiveCamera.lookAt with +Y up, full-viewport canvas).
export function projectSignal(progress, width, height) {
  const { position, target } = cameraAt(progress);
  const forward = normalize(sub(target, position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const d = sub(signalAt(progress), position);
  const depth = dot(d, forward);
  if (depth <= 0.01) return null;
  const tanHalf = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const ndcX = dot(d, right) / (depth * tanHalf * (width / height));
  const ndcY = dot(d, up) / (depth * tanHalf);
  return { x: (ndcX + 1) * 0.5 * width, y: (1 - ndcY) * 0.5 * height, depth };
}

// CSS matrix3d that maps a w × h element (transform-origin 0 0) onto an
// arbitrary quad [[x,y] TL, TR, BR, BL] — Heckbert's square-to-quad homography.
function squareToQuad(quad) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-6;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h };
}

export function quadToMatrix3d(w, h, quad) {
  const k = squareToQuad(quad);
  const m = [k.a / w, k.d / w, 0, k.g / w, k.b / h, k.e / h, 0, k.h / h, 0, 0, 1, 0, k.c, k.f, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(",")})`;
}

// 3 × 3 homography helpers (row-major) for quad → quad maps.
const s2qMatrix = (quad) => {
  const k = squareToQuad(quad);
  return [k.a, k.b, k.c, k.d, k.e, k.f, k.g, k.h, 1];
};
function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C || 1e-9;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
    C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
const mul3 = (p, q) => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => p[r * 3] * q[c] + p[r * 3 + 1] * q[3 + c] + p[r * 3 + 2] * q[6 + c]));

// Homography taking quad `from` onto quad `to`; returns a point-mapping function.
// Used to apply the screen's perspective correction to the whole photograph, so the laptop body
// stays attached around the editor while the camera turns to face the display.
export function quadToQuad(from, to) {
  const m = mul3(s2qMatrix(to), invert3(s2qMatrix(from)));
  return ([x, y]) => {
    const z = m[6] * x + m[7] * y + m[8];
    return [(m[0] * x + m[1] * y + m[2]) / z, (m[3] * x + m[4] * y + m[5]) / z];
  };
}

// Where a point (x, y) of the w × h element lands on screen under the same homography.
// Used instead of reading layout back, so dependent visuals never lag a frame behind.
export function mapPoint(w, h, quad, x, y) {
  const k = squareToQuad(quad);
  const u = x / w, v = y / h;
  const z = k.g * u + k.h * v + 1;
  return [(k.a * u + k.b * v + k.c) / z, (k.d * u + k.e * v + k.f) / z];
}
