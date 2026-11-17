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
export function quadToMatrix3d(w, h, quad) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-6;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(",")})`;
}
