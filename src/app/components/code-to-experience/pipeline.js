// Scroll-synced image-sequence players for the Blender-rendered environments.
// Three sequences share the scroll director: pipeline (source → Git → CI → data hall), runtime (request →
// ASP.NET Core → EF Core → SQL Server → JSON) and library (the Folio screen → the reader in a library).
// frame = round(local × (n − 1)) where local is chapter progress inside [tStart, tEnd] from each manifest.
// Frames are fetched as compressed blobs (keyframes first), decoded on demand into a small LRU of
// ImageBitmaps, and drawn with object-fit: cover onto one canvas per sequence. Nothing is drawn when idle.

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };

// The pipeline fades in once the rendered camera is already past the colour filter (frame 13, t ≈ 1.535), so
// the live editor and the rendered code panel are never superimposed at different scales.
export const SEQUENCE_FADE_IN = [1.53, 1.62];
// Each sequence hands over to the next with a short cross-fade; after the library pull-back the film ends and
// the portfolio chapters sit on the page's own background (no held backdrop, no placeholder geometry).
export const SEQUENCES = [
  { scene: "pipeline", fadeIn: SEQUENCE_FADE_IN, fadeOut: [3.93, 4.03], load: 0.5 },
  { scene: "runtime", fadeIn: [3.93, 4.03], fadeOut: [7.42, 7.52], load: 3.0 },
  { scene: "library", fadeIn: [7.42, 7.52], fadeOut: [8.72, 9.05], load: 6.4 },
];

const NEAR = 24; // frames around the playhead that are fetched immediately

export class SequencePlayer {
  // Three films share one page: each keeps at most 10 decoded frames (~37 MB at 1280×720) and fetches 4 at a time.
  constructor(canvas, { base = "/cinematic/pipeline", decodeWindow = 4, cacheSize = 10, concurrency = 4 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.base = base;
    this.decodeWindow = decodeWindow;
    this.cacheSize = cacheSize;
    this.concurrency = concurrency;
    this.manifest = null;
    this.variant = null;
    this.blobs = [];
    this.bitmaps = new Map(); // frame -> ImageBitmap (LRU via insertion order)
    this.decoding = new Set();
    this.wanted = -1;
    this.drawn = -1;
    this.size = { w: 0, h: 0, dpr: 1 };
    this.disposed = false;
    this.onReady = null;
  }

  get ready() { return Boolean(this.manifest); }

  // True once a frame is on the canvas (resizing or releasing clears it): a film is never shown blank.
  get hasPicture() { return this.drawn >= 0; }

  async load(variant) {
    if (this.variant === variant || this.disposed) return;
    this.variant = variant;
    this.reset();
    const res = await fetch(`${this.base}/${variant}/manifest.json`);
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const manifest = await res.json();
    if (this.disposed || this.variant !== variant) return;
    this.manifest = manifest;
    this.blobs = new Array(manifest.frames).fill(null);
    this.canvas.dataset.frames = String(manifest.frames);
    this.onReady?.();
    this.fetchAll(variant);
  }

  reset() {
    for (const bmp of this.bitmaps.values()) bmp.close?.();
    this.bitmaps.clear();
    this.blobs = [];
    this.manifest = null;
    this.drawn = -1;
  }

  // Keyframes first (every 32, 16, 8 … frames) so any scroll position has a nearby frame quickly.
  order(n) {
    const seen = new Set();
    const list = [];
    for (let step = 32; step >= 1; step = step / 2) {
      for (let f = 0; f < n; f += step) if (!seen.has(f)) { seen.add(f); list.push(f); }
      if (!seen.has(n - 1)) { seen.add(n - 1); list.push(n - 1); }
    }
    return list;
  }

  async fetchAll(variant) {
    const { frames, pad = 4, pattern = "{frame}.webp" } = this.manifest;
    const queue = this.order(frames);
    // Frames near the playhead first; everything further away is fetched in idle time, so a cold first scrub does not
    // compete with decoding and drawing (diagnosis: stalls overlapped GPU-process and decode work while ~700
    // responses arrived during one scrub).
    const idle = () => new Promise(r => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 700 }) : setTimeout(r, 60)));
    const next = async () => {
      if (this.wanted >= 0) {
        let best = -1;
        for (let i = 0; i < queue.length; i++) if (Math.abs(queue[i] - this.wanted) <= NEAR && (best < 0 || Math.abs(queue[i] - this.wanted) < Math.abs(queue[best] - this.wanted))) best = i;
        if (best >= 0) return queue.splice(best, 1)[0];
      }
      await idle();
      return queue.shift();
    };
    const worker = async () => {
      while (queue.length && !this.disposed && this.variant === variant) {
        const f = await next();
        if (f === undefined) break;
        this.inflight = (this.inflight || 0) + 1;
        this.canvas.dataset.inflight = String(this.inflight);
        try {
          const name = pattern.replace("{frame}", String(f).padStart(pad, "0"));
          const res = await fetch(`${this.base}/${variant}/${name}`);
          if (!res.ok) continue;
          this.blobs[f] = await res.blob();
          if (this.variant !== variant) return;
          // A newly arrived frame may be closer to the wanted one than what is on screen.
          if (Math.abs(f - this.wanted) < Math.abs(this.drawn - this.wanted)) this.request(this.wanted);
        } catch { /* network hiccup: the nearest available frame keeps showing */ }
        finally { this.inflight -= 1; this.canvas.dataset.inflight = String(this.inflight); }
      }
    };
    await Promise.all(Array.from({ length: this.concurrency }, worker));
    if (!this.disposed && this.variant === variant) this.canvas.dataset.loaded = "true";
  }

  frameFor(t) {
    const m = this.manifest;
    return Math.round(clamp01((t - m.tStart) / (m.tEnd - m.tStart)) * (m.frames - 1));
  }

  nearest(target, have) {
    for (let d = 0; d < this.manifest.frames; d++) {
      if (have(target - d)) return target - d;
      if (have(target + d)) return target + d;
    }
    return -1;
  }

  resize(vw, vh) {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    if (this.size.w === vw && this.size.h === vh && this.size.dpr === dpr) return;
    this.size = { w: vw, h: vh, dpr };
    this.canvas.width = Math.round(vw * dpr);
    this.canvas.height = Math.round(vh * dpr);
    this.drawn = -1;
  }

  // object-fit: cover mapping from frame pixels to viewport pixels.
  fit() {
    const { width: iw, height: ih } = this.manifest;
    const { w, h } = this.size;
    const scale = Math.max(w / iw, h / ih);
    return { scale, ox: (w - iw * scale) / 2, oy: (h - ih * scale) / 2, iw, ih };
  }

  // Rendered artifact on screen (from the Blender camera projection) at progress t: centre and radius in px.
  packetAt(t) {
    if (!this.manifest) return null;
    const row = this.manifest.packet[this.frameFor(t)];
    if (!row || !row[3]) return null;
    const { scale, ox, oy, iw, ih } = this.fit();
    return { x: ox + row[0] * iw * scale, y: oy + row[1] * ih * scale, r: (row[4] ?? 0) * ih * scale };
  }

  seek(t) {
    if (!this.manifest) return;
    this.request(this.frameFor(t));
  }

  request(frame) {
    if (!this.manifest || frame < 0) return;
    this.wanted = frame;
    if (this.bitmaps.has(frame)) { this.draw(frame); }
    else {
      const fallback = this.nearest(frame, f => this.bitmaps.has(f));
      if (fallback >= 0 && fallback !== this.drawn) this.draw(fallback);
      this.decode(frame);
    }
    // Pre-decode a small window around the wanted frame for smooth scrubbing in either direction.
    for (let d = 1; d <= this.decodeWindow; d++) { this.decode(frame + d); this.decode(frame - d); }
  }

  async decode(frame) {
    if (!this.manifest || frame < 0 || frame >= this.manifest.frames) return;
    if (this.bitmaps.has(frame) || this.decoding.has(frame)) return;
    let blob = this.blobs[frame];
    if (!blob) {
      // Not downloaded yet: decode the nearest downloaded frame instead (keeps the picture close).
      const alt = this.nearest(frame, f => f >= 0 && f < this.blobs.length && this.blobs[f] && !this.bitmaps.has(f) && !this.decoding.has(f));
      if (alt < 0 || Math.abs(alt - frame) > 32) return;
      frame = alt;
      blob = this.blobs[alt];
    }
    this.decoding.add(frame);
    try {
      const bmp = await createImageBitmap(blob);
      if (this.disposed || !this.manifest) { bmp.close?.(); return; }
      this.bitmaps.set(frame, bmp);
      while (this.bitmaps.size > this.cacheSize) {
        // Evict the decoded frame furthest from the one we want.
        let worst = -1, worstDist = -1;
        for (const f of this.bitmaps.keys()) { const dd = Math.abs(f - this.wanted); if (dd > worstDist) { worst = f; worstDist = dd; } }
        this.bitmaps.get(worst)?.close?.();
        this.bitmaps.delete(worst);
      }
      if (frame === this.wanted || Math.abs(frame - this.wanted) < Math.abs(this.drawn - this.wanted)) this.draw(frame);
    } finally {
      this.decoding.delete(frame);
    }
  }

  draw(frame) {
    const bmp = this.bitmaps.get(frame);
    if (!bmp || frame === this.drawn) return;
    const { scale, ox, oy, iw, ih } = this.fit();
    const dpr = this.size.dpr;
    this.ctx.drawImage(bmp, ox * dpr, oy * dpr, iw * scale * dpr, ih * scale * dpr);
    const first = this.drawn < 0;
    this.drawn = frame;
    if (first) this.onFirstPicture?.();
    this.canvas.dataset.frame = String(frame);
    this.canvas.dataset.decoded = String(this.bitmaps.size);
    this.canvas.dataset.wanted = String(this.wanted);
  }

  // Frees decoded frames while the film is off screen; the canvas keeps its last picture until the next draw.
  release() {
    if (!this.bitmaps.size) return;
    for (const bmp of this.bitmaps.values()) bmp.close?.();
    this.bitmaps.clear();
    this.drawn = -1;
  }

  dispose() {
    this.disposed = true;
    this.reset();
  }
}

export function sequenceOpacity(t, seq = SEQUENCES[0]) {
  return smooth(...seq.fadeIn, t) * (1 - smooth(...seq.fadeOut, t));
}

// Whether a sequence should be drawing (visible, or about to be, so its first visible frame is already on canvas).
export function sequenceActive(t, seq) {
  return t > seq.fadeIn[0] - 0.25 && t < seq.fadeOut[1] + 0.05;
}
