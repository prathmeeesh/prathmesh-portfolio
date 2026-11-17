import * as THREE from "three";

/*
 * Shared material and texture library for the Luminous world.
 * Everything is procedural (canvas-generated) so there are no third-party
 * licensing concerns, nothing extra to download, and every environment
 * draws from one consistent palette. Materials are created once per page
 * and reused across meshes to keep shader programs and uploads minimal.
 */

export const PALETTE = {
  cyan: "#3fd8dc",
  cyanDeep: "#0e8fa0",
  violet: "#9c8cf0",
  amber: "#ffbf73",
  glass: "#dff7ff",
  steel: "#c9d4da",
  graphite: "#26323d",
  ink: "#0d1d2b",
  stone: "#dde5e4",
  grass: "#7aaa64",
  earthTop: "#9a7759",
  earthDeep: "#56677a",
};

let cache = null;

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(c, { repeat } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  return t;
}

const SYNTAX = { kw: "#c792ea", type: "#7fdbca", str: "#ecc48d", fn: "#82aaff", plain: "#d6e6f0", dim: "#5f7e93", attr: "#ffcb6b", ok: "#7ee0a8" };

/** IDE-style panel: title bar, gutter and syntax-coloured tokens. */
function codeTexture(title, lines, { width = 640, height = 400, font = 19 } = {}) {
  const [c, g] = canvas(width, height);
  g.fillStyle = "#0b1a27";
  g.fillRect(0, 0, width, height);
  g.fillStyle = "#132b3f";
  g.fillRect(0, 0, width, 34);
  ["#ff7a6b", "#ffcb6b", "#7ee0a8"].forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(18 + i * 18, 17, 5, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = "#9cc3d8";
  g.font = `600 15px Consolas, "Courier New", monospace`;
  g.fillText(title, 78, 22);
  g.font = `${font}px Consolas, "Courier New", monospace`;
  const lh = font * 1.42;
  lines.forEach((tokens, row) => {
    const y = 58 + row * lh;
    g.fillStyle = SYNTAX.dim;
    g.fillText(String(row + 1).padStart(2, " "), 12, y);
    let x = 52;
    tokens.forEach(([text, kind]) => {
      g.fillStyle = SYNTAX[kind] || SYNTAX.plain;
      g.fillText(text, x, y);
      x += g.measureText(text).width;
    });
  });
  // Soft cursor highlight on the active line.
  g.fillStyle = "rgba(63,216,220,.08)";
  g.fillRect(44, 58 + 5 * lh - font, width - 50, lh);
  return toTexture(c);
}

function tileTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#e3eae9";
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = ((x * 7 + y * 13) % 5) * 3;
    g.fillStyle = `rgb(${222 + v},${231 + v},${230 + v})`;
    g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
  }
  g.strokeStyle = "rgba(60,150,170,.35)";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(256, 256, 120, 0, Math.PI * 2);
  g.moveTo(256, 96); g.lineTo(256, 416);
  g.moveTo(96, 256); g.lineTo(416, 256);
  g.stroke();
  return toTexture(c, { repeat: 2 });
}

function cloudTexture() {
  const [c, g] = canvas(256, 128);
  // Deterministic puffs: a soft cumulus silhouette with a cooler underside.
  const puffs = [[60, 80, 38], [100, 62, 46], [148, 58, 50], [192, 76, 38], [126, 88, 44], [84, 92, 30], [170, 92, 32]];
  puffs.forEach(([x, y, r]) => {
    const grad = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.55, "rgba(246,250,252,0.7)");
    grad.addColorStop(1, "rgba(220,233,242,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  });
  const shade = g.createLinearGradient(0, 60, 0, 128);
  shade.addColorStop(0, "rgba(160,190,210,0)");
  shade.addColorStop(1, "rgba(160,190,210,0.35)");
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = shade;
  g.fillRect(0, 0, 256, 128);
  return toTexture(c);
}

function waterfallTexture() {
  const [c, g] = canvas(64, 256);
  for (let x = 0; x < 64; x += 2) {
    const a = 0.25 + ((x * 37) % 11) / 22;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, `rgba(235,252,255,${a})`);
    grad.addColorStop(0.7, `rgba(205,240,250,${a * 0.6})`);
    grad.addColorStop(1, "rgba(205,240,250,0)");
    g.fillStyle = grad;
    g.fillRect(x, 0, 1.4, 256);
  }
  const edge = g.createLinearGradient(0, 0, 64, 0);
  edge.addColorStop(0, "rgba(0,0,0,1)");
  edge.addColorStop(0.25, "rgba(0,0,0,0)");
  edge.addColorStop(0.75, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = edge;
  g.fillRect(0, 0, 64, 256);
  return toTexture(c);
}

function rackTexture() {
  const [c, g] = canvas(128, 320);
  g.fillStyle = "#15232f";
  g.fillRect(0, 0, 128, 320);
  for (let i = 0; i < 14; i++) {
    const y = 10 + i * 22;
    g.fillStyle = "#1f3241";
    g.fillRect(8, y, 112, 17);
    g.fillStyle = "#0c1822";
    for (let v = 0; v < 9; v++) g.fillRect(40 + v * 8, y + 4, 5, 9);
    g.fillStyle = i % 4 === 1 ? PALETTE.amber : PALETTE.cyan;
    g.fillRect(14, y + 6, 6, 5);
    g.fillStyle = i % 3 ? "#7ee0a8" : "#2e4a5a";
    g.fillRect(24, y + 6, 6, 5);
  }
  return toTexture(c);
}

/** Transparent "whiteboard" annotation: the request path as a technical sketch. */
function architectureTexture() {
  const [c, g] = canvas(768, 256);
  g.strokeStyle = "rgba(120,240,240,.95)";
  g.fillStyle = "rgba(120,240,240,.95)";
  g.lineWidth = 3;
  g.font = `600 22px Consolas, "Courier New", monospace`;
  const boxes = [["Browser", 20], ["ASP.NET Core", 205], ["Services", 420], ["SQL", 610]];
  boxes.forEach(([label, x]) => {
    const w = label.length * 13 + 34;
    g.strokeRect(x, 96, w, 60);
    g.fillText(label, x + 17, 134);
  });
  g.setLineDash([10, 9]);
  [[150, 205], [390, 420], [560, 610]].forEach(([a, b]) => {
    g.beginPath(); g.moveTo(a, 126); g.lineTo(b - 8, 126); g.stroke();
    g.beginPath(); g.moveTo(b - 8, 118); g.lineTo(b, 126); g.lineTo(b - 8, 134); g.stroke();
  });
  g.setLineDash([]);
  g.font = `18px Consolas, "Courier New", monospace`;
  g.fillStyle = "rgba(200,190,255,.95)";
  g.fillText("GET /api/books?q=", 190, 70);
  g.fillText("200 OK · application/json", 300, 205);
  return toTexture(c);
}

const SOURCE = [
  [["using ", "kw"], ["Folio.Application", "type"], [";", "plain"]],
  [],
  [["[", "plain"], ["ApiController", "attr"], ["]", "plain"]],
  [["[", "plain"], ["Route", "attr"], ["(", "plain"], ["\"api/books\"", "str"], [")]", "plain"]],
  [["public sealed class ", "kw"], ["BooksController", "type"], [" : ", "plain"], ["ControllerBase", "type"]],
  [["{", "plain"]],
  [["  private readonly ", "kw"], ["IBookService", "type"], [" _books;", "plain"]],
  [],
  [["  [", "plain"], ["HttpGet", "attr"], ["]", "plain"]],
  [["  public async ", "kw"], ["Task", "type"], ["<", "plain"], ["IActionResult", "type"], ["> ", "plain"], ["Search", "fn"], ["(", "plain"], ["string", "kw"], [" q)", "plain"]],
  [["    => ", "plain"], ["Ok", "fn"], ["(", "plain"], ["await ", "kw"], ["_books.", "plain"], ["SearchAsync", "fn"], ["(q));", "plain"]],
  [["}", "plain"]],
];

const EXPLORER = [
  [["▾ Folio.sln", "plain"]],
  [["  ▾ Folio.Web", "type"]],
  [["      Controllers/", "plain"]],
  [["      Views/", "plain"]],
  [["  ▾ Folio.Application", "type"]],
  [["      Services/", "plain"]],
  [["  ▾ Folio.Data", "type"]],
  [["      Repositories/", "plain"]],
  [["      Migrations/", "plain"]],
  [["  ▸ Folio.Tests", "type"]],
];

const TERMINAL = [
  [["> ", "dim"], ["dotnet ", "fn"], ["restore", "plain"]],
  [["  Restored Folio.Web.csproj", "dim"]],
  [["> ", "dim"], ["dotnet ", "fn"], ["build ", "plain"], ["-c Release", "attr"]],
  [["  Folio.Web -> bin/Release/", "dim"]],
  [["  Build succeeded.", "ok"]],
  [["> ", "dim"], ["dotnet ", "fn"], ["test", "plain"]],
  [["  Running tests…", "dim"]],
  [["> ", "dim"], ["_", "plain"]],
];

/** Lazily builds the shared library (client only — called from inside the Canvas). */
export function getLibrary() {
  if (cache) return cache;
  const textures = {
    source: codeTexture("BooksController.cs", SOURCE),
    explorer: codeTexture("Solution Explorer", EXPLORER, { font: 18 }),
    terminal: codeTexture("Terminal — Folio", TERMINAL, { font: 18 }),
    tiles: tileTexture(),
    cloud: cloudTexture(),
    waterfall: waterfallTexture(),
    rack: rackTexture(),
    architecture: architectureTexture(),
  };
  const m = {
    steel: new THREE.MeshStandardMaterial({ color: PALETTE.steel, metalness: 0.85, roughness: 0.28 }),
    graphite: new THREE.MeshStandardMaterial({ color: PALETTE.graphite, metalness: 0.55, roughness: 0.42 }),
    deskTop: new THREE.MeshStandardMaterial({ color: "#eef3f4", metalness: 0.25, roughness: 0.3 }),
    bezel: new THREE.MeshStandardMaterial({ color: "#111d27", metalness: 0.6, roughness: 0.35 }),
    plaza: new THREE.MeshStandardMaterial({ map: textures.tiles, roughness: 0.55, metalness: 0.05 }),
    grass: new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1, flatShading: true }),
    foliage: new THREE.MeshStandardMaterial({ color: "#5f9a57", roughness: 0.95, flatShading: true }),
    rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
    glass: new THREE.MeshPhysicalMaterial({ color: PALETTE.glass, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.09, depthWrite: false }),
    glow: new THREE.MeshBasicMaterial({ color: PALETTE.cyan, toneMapped: false }),
    glowAmber: new THREE.MeshBasicMaterial({ color: PALETTE.amber, toneMapped: false }),
    glowViolet: new THREE.MeshBasicMaterial({ color: PALETTE.violet, toneMapped: false }),
    screenSource: new THREE.MeshBasicMaterial({ map: textures.source, toneMapped: false }),
    screenExplorer: new THREE.MeshBasicMaterial({ map: textures.explorer, toneMapped: false }),
    screenTerminal: new THREE.MeshBasicMaterial({ map: textures.terminal, toneMapped: false }),
    rackFace: new THREE.MeshBasicMaterial({ map: textures.rack, toneMapped: false }),
    hologram: new THREE.MeshBasicMaterial({ map: textures.architecture, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    hologramPane: new THREE.MeshBasicMaterial({ color: "#7fe9ef", transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    waterfall: new THREE.MeshBasicMaterial({ map: textures.waterfall, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    cloud: new THREE.MeshBasicMaterial({ map: textures.cloud, transparent: true, depthWrite: false, opacity: 0.92 }),
    fabric: new THREE.MeshStandardMaterial({ color: "#2f4e66", roughness: 0.9 }),
    trousers: new THREE.MeshStandardMaterial({ color: "#26313b", roughness: 0.9 }),
    skin: new THREE.MeshStandardMaterial({ color: "#c58f6e", roughness: 0.7 }),
    hair: new THREE.MeshStandardMaterial({ color: "#2a211c", roughness: 0.85 }),
    chair: new THREE.MeshStandardMaterial({ color: "#2b3a48", roughness: 0.6, metalness: 0.2 }),
    ceramic: new THREE.MeshStandardMaterial({ color: "#f2c58c", roughness: 0.4 }),
    keyboard: new THREE.MeshStandardMaterial({ color: "#cfd8dc", roughness: 0.5, metalness: 0.2 }),
  };
  cache = { textures, m };
  return cache;
}
