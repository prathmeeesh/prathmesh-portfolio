// Encodes Blender renders into web frames + manifest for the scroll-synced sequence player.
// Usage: node Scripts/encode-cinematic.cjs [scene=pipeline] [quality=70]
// Input:  blender/renders/<variant>/NNNN.png (scene "pipeline") or blender/renders/<scene>-<variant>/NNNN.png,
//         and public/cinematic/<scene>/<variant>/packet.json
// Output: public/cinematic/<scene>/<variant>/NNNN.webp, poster.webp, manifest.json
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const SCENE = process.argv[2] || "pipeline";
const QUALITY = Number(process.argv[3] || 70);
const VARIANTS = { desktop: { quality: QUALITY }, mobile: { quality: QUALITY, every: 1 } };

(async () => {
  for (const [variant, opts] of Object.entries(VARIANTS)) {
    const src = path.join(process.env.OBSERVATORY_RENDERS || path.resolve("blender", "renders"), SCENE === "pipeline" ? variant : `${SCENE}-${variant}`);
    const out = path.resolve("public", "cinematic", SCENE, variant);
    if (!fs.existsSync(src)) { console.log(`skip ${variant}: no renders`); continue; }
    const packetFile = path.join(out, "packet.json");
    if (!fs.existsSync(packetFile)) throw new Error(`Missing ${packetFile}; run the Blender script first.`);
    const meta = JSON.parse(fs.readFileSync(packetFile, "utf8"));
    const frames = fs.readdirSync(src).filter(f => /^\d{4}\.png$/.test(f)).sort();
    if (frames.length !== meta.frames) throw new Error(`${variant}: ${frames.length} renders but manifest expects ${meta.frames}`);
    // Version guard: every frame must have been rendered by the generator that wrote packet.json (frames.jsonl is
    // appended by the Blender script after each frame), so frames of an older film can never be mixed in.
    const logFile = path.join(src, "frames.jsonl");
    const rendered = new Map();
    if (fs.existsSync(logFile)) {
      for (const line of fs.readFileSync(logFile, "utf8").split(/\r?\n/)) {
        if (!line.trim()) continue;
        try { const e = JSON.parse(line); rendered.set(e.frame, e); } catch { /* ignore a torn line */ }
      }
    }
    const stale = frames.map(f => Number(f.slice(0, 4))).filter(n => rendered.get(n)?.generator !== meta.generator);
    if (stale.length) throw new Error(`${variant}: ${stale.length} frames not rendered by ${meta.generator} (e.g. ${stale.slice(0, 8).join(", ")})`);
    fs.mkdirSync(out, { recursive: true });
    let bytes = 0;
    for (const f of frames) {
      const target = path.join(out, f.replace(".png", ".webp"));
      const info = await sharp(path.join(src, f)).webp({ quality: opts.quality, effort: 5, smartSubsample: true }).toFile(target);
      bytes += info.size;
    }
    await sharp(path.join(src, frames[0])).webp({ quality: 80 }).toFile(path.join(out, "poster.webp"));
    const manifest = { ...meta, verifiedFrames: frames.length, pattern: "{frame}.webp", pad: 4, format: "webp", bytes, encodedQuality: opts.quality };
    fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest));
    console.log(`${variant}: ${frames.length} frames, ${(bytes / 1048576).toFixed(1)} MB (avg ${(bytes / frames.length / 1024).toFixed(0)} KB)`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
