# From Code to Experience — progress report

Preview route: `/code-to-experience` (noindex). `/`, `/luminous-world`, V2 and the CV are untouched.
Branch `feature/scroll-code-cinema`. Nothing has been committed, pushed or deployed.

## Milestone 1 — photo → laptop → IDE → code packet (stage 2 of the master prompt)

### What changed

| Area | Before (starter) | Now |
| --- | --- | --- |
| Screen tracking | "ENTER SOURCE" box at a guessed position, visibly off the laptop | Display polygon measured on the 1086 × 1448 source (`PHOTO_SCREEN_QUAD` in `journeyPath.js`); a crisp DOM IDE is mapped onto it with a per-frame `matrix3d` homography |
| Zoom | `scale(1 + 3.65·e)` plus a hand-tuned vw/vh pan; screen never filled the frame | Dolly about a solved fixed point, so the display centre lands on the viewport centre at exactly the scale where it fills the frame (≈ 8–14× depending on viewport); log-space scale |
| Hand-off | Photo cross-faded to WebGL while a separate editor card slid in | The IDE that replaced the photographed pixels straightens, fills the composition, then docks into the source chapter's editor slot. At t = 1 the fixed overlay swaps with the identical in-flow editor, so it scrolls natively with no lag |
| Code artifact | Gold marker in WebGL only | `service.SearchAsync(query)` lights up in the editor, lifts out as a DOM packet, travels to the WebGL signal's projected screen position, and becomes the 3D signal (`HANDOFF_START`–`HANDOFF_END`) |
| Camera | Camera math lived inside `World.jsx` | `cameraAt` / `signalAt` / `projectSignal` shared by DOM and WebGL — one deterministic function of scroll progress |
| Hero | Headline only; "Enter the code" primary | Kicker names Prathmesh Pawar · Software Engineer · C#/.NET; primary "View selected work", "Get my CV", scroll cue |
| Mobile hero | Copy overlapped the photo | Photo framed above the copy; actions before the description; the editor leads the source chapter |
| Hero length | 108svh | 200svh, so the zoom has room to breathe |

The source wall of the placeholder WebGL `SourceChamber` is angled off-axis so it no longer hides the packet's flight line. No other environment was touched; they remain procedural placeholders.

### Scroll timeline (chapter units, from `TIMELINE` in `PhotoJourney.jsx`)

| t | Beat |
| --- | --- |
| 0.00 | Untouched photograph, editorial right-hand composition |
| 0.04–0.22 | Crisp IDE fades in over the photographed display (cyan screen glow) |
| 0.02–0.56 | Dolly into the display |
| 0.30–0.56 | Display perspective straightens to face the viewer |
| 0.44–0.62 | Room dissolves into the dark engineering stage |
| 0.62–0.66 | Inside the screen: the IDE fills the composition |
| 0.66–0.97 | IDE docks beside the chapter copy (copy fades in 0.80–0.95) |
| 1.00 | Overlay → in-flow editor swap; token lights |
| 1.06–1.72 | Token lifts out as a packet and flies to the 3D signal |
| 1.70–1.80 | Packet becomes the WebGL signal |

### Verification

- `npm run lint` — pass.
- `npm run build` — pass (Next 16.4.6).
- `tests/code-to-experience.spec.cjs` — new transition contract test (overlay inside the photo frame at t = 0.2, ≥ 70 % viewport width inside the screen, dock swap, packet lifecycle, deterministic rewind) and hero recruiter test added. Results are in the session notes below.
- Screenshot QA: `node Scripts/capture-cte-transition.cjs <label>` captures t = 0 … 2 plus a rewind frame at 1440 × 900 and 390 × 844 into `artifacts/code-to-experience-transition/<label>/` (git-ignored). Rewound t = 0 matches the first t = 0 frame apart from sub-pixel resampling.

### Session results (2026-11-17)

- Focused spec, all projects: 17 passed, 2 skipped (transition geometry is asserted at desktop only), 2 failed (the starter rail test at tablet/mobile; see below).
- Full `playwright test`: 128 passed, 2 skipped, 2 failed (the same two). Run on port 3110 because port 3100 was already held by a separately started `next start`.
- Recordings: `artifacts/code-to-experience-transition/recording/{desktop-1440x900,mobile-390x844}.webm` (t = 0 → 2 → 0).
- An earlier headless run used SwiftShader software WebGL and showed a 6.6 s long task. It did **not** reproduce on the real GPU: zero long tasks in every run. See the real-GPU profile below.

### Real-GPU scroll profile (2026-11-17)

Tool: `node Scripts/profile-cte-scroll.cjs --summary` against the production build (`next-prod` on port 3300). It opens a headed Chromium on this machine's GPU and prints the WebGL renderer, so software rendering can't be mistaken for a GPU result. The test scrubs t = 0 → 3 → 0 with mouse-wheel input over about 8 s and records every rAF interval, long tasks and idle draw calls.

Hardware: **Intel UHD Graphics (integrated), D3D11, 120 Hz display**. "Mobile" means 390 × 844 at DPR 3 on the same GPU. It isn't a phone.

| | Frames > 33 ms per scrub | Worst frame | p95 | Long tasks | Idle draws (1.5 s) |
| --- | --- | --- | --- | --- | --- |
| Desktop, before | 14–25 | 175–266 ms | 16.8–24.8 ms | 0 | 0 |
| Desktop, after | 6–8 | 58–125 ms | 16.7–23.4 ms | 0 | 0 |
| Mobile, before | 1–2 | 42–142 ms | 8.5 ms | 0 | 0 |
| Mobile, after | 0–1 | 25–100 ms | 8.5 ms | 0 | 0 |
| Mobile, 4× CPU throttle, after | 5 | 50 ms | 16.5 ms | 0 | 0 |

The median is 8.3 ms everywhere, which is the 120 Hz vsync. The remaining desktop spikes happen on the first forward pass only, at about t = 0.04–0.27 and 0.56: first raster of the zoomed photo and first reveal of the world layer. All the rewind hitches are gone.

What fixed it. A trace showed GPU-side raster, not JavaScript: main-thread paint was 41 ms in total. CSS-variant A/B runs isolated three causes:

1. **Photo layer.** `will-change: transform` pinned Chrome's raster scale. Chrome then did a 150–230 ms catch-up re-raster when the zoom crossed about 2× in either direction. Switched to `will-change: opacity`. Its 130 px shadow moved to an unscaled `.cte-photo-shadow` twin that fades out as the zoom starts.
2. **Hidden-until-needed layers.** The overlay, the in-flow editor and the packet were toggled with `visibility` or opacity 0. Each first appearance mid-scroll cost a full first paint. They now hide with opacity only, so they're painted in advance.
3. **Token and packet.** A 250 ms CSS transition on the token repainted the whole editor layer, and the packet children had a transform hint while at scale 0. Both are removed.

The screen glow and sheen were also changed from per-frame box-shadow and custom-property repaints to opacity-only gradient layers. That made no measurable difference on its own, but it costs nothing.

### Known gaps (not done yet)

- Not yet profiled on a discrete GPU or a physical phone. A real mid-range phone has a slower GPU than this laptop, and the 4× CPU throttle doesn't model that.
- The starter test "single scroll director … returns to the original photo" fails on the tablet and mobile projects because the starter CSS hides `.cte-rail` at ≤ 800 px. This predates this milestone.
- Every WebGL environment after the hand-off is still the procedural placeholder. Stage 3 (GLB build/deployment/backend/database environments) has not started.
- A 10–20 s scroll recording has not been produced yet.
