# Luminous Engineering Universe V3 — Progress Log

## Milestone 1 — Stable baseline (verified 2026-11-17)

### Repository state at audit
- Branch: `feature/scroll-code-cinema`, HEAD `1dde037` (V2 checkpoint). Nothing staged.
- Modified: `package-lock.json` (npm added `"peer": true` to `@react-three/fiber`; metadata only, no version change).
- Untracked V3 work (preserved): `public/luminous-v3/` (3 reference images), `src/app/components/luminous-v3/`, `src/app/luminous-world/`, `src/app/observatory-v2/`, `tests/luminous-world.spec.cjs`.
- CV `public/Prathmesh_Pawar_CV.pdf` is byte-identical to `1dde037` (sha256 `b0278fe8…5b81f`). It was not modified.

### Homepage status
- `src/app/page.jsx` is byte-identical to `1dde037`, so `/` renders the tested V2 Engineering Observatory.
- The recovery script `Restore_V2_Home_Keep_V3_Preview.ps1` isn't in the repository. Its intended outcome is present anyway: V2 is at `/`, a V2 copy is at `/observatory-v2`, and V3 is isolated at `/luminous-world`. No restore was needed.
- The earlier 51 passed / 33 failed result matches the period when V3 had replaced `/`. The V2 portfolio and universe specs target `/` and expect V2's structure. With V2 restored, those failures are gone.

### Change made
- `src/app/components/luminous-v3/LuminousWorld.jsx` (`CameraRail`): `npm run lint` reported 4 errors, all from the React Compiler rules (`react-hooks/refs`, `react-hooks/immutability`). The fix adopts V2 `WorldCamera` patterns:
  - `camera` and `size` come from the `useFrame` state.
  - The curves and the look target live in one memoised object.
  - Camera offsets are module constants applied with `Vector3.add`.
  - `pausedRef` is synced in an effect rather than during render.
- Camera behaviour is unchanged: same path, same offsets for widths below and above 700 px. All 12 V3 tests still pass.

### Validation results
| Check | Result |
|---|---|
| `npm run lint` | Pass, 0 errors, 0 warnings (4 errors before the fix) |
| `npm run build` | Pass, 16 routes prerendered. The first attempt hit a transient Windows worker crash (`0xC0000409`) during page-data collection; the retry passed with no code change. |
| `npx playwright test tests/portfolio.spec.cjs tests/universe.spec.cjs` | 39 passed, 0 failed, 0 skipped |
| `npx playwright test tests/luminous-world.spec.cjs` | 12 passed, 0 failed, 0 skipped |
| `npm run test:e2e` | **84 passed**, 0 failed, 0 skipped (6.4 min) |
| `npm audit --omit=dev` | 0 vulnerabilities |

No tests were deleted or weakened.

### Known gaps carried forward (not regressions)
- V3 renders 13 `<h1>` elements, one per chapter. Milestone 5 needs a single H1.
- `LuminousExperience` calls `setProgress` on every scrolled frame, which re-renders the whole page tree. Milestone 6 will move the progress bar to a ref or CSS variable.
- V3 scenes are box, cylinder and torus primitives. Milestones 2 and 3 cover this.
- V3 holds only a condensed subset of the V2 professional content. Milestone 5 covers this.
- `/observatory-v2` lacks `robots: noindex` metadata, unlike `/luminous-world`.

## Milestone 2 checkpoint — laboratory scene, accessibility, archive route (2026-11-17)

### Changes
- **Chapter 01 laboratory.** Added `environments/Laboratory.jsx`: a floating island, glass dome, workstation with a developer, an inverse-kinematics robot arm holding the code artifact, server racks and a hologram. Added `Atmosphere.jsx` (gradient sky dome and instanced cloud banks) and `materials.js` (shared procedural canvas textures and palette). There are no external model or texture downloads. Hand-composed camera keyframes now drive stations 0–1, with a lens shift that keeps the subject clear of the text column.
- **Heading outline.** Origin is the page's single `<h1>`. Chapters 02–13 use `<h2>`. CSS now targets `.lv3-heading`, so all chapter headings look the same.
- **Live region.** The `aria-live` region now announces the active chapter ("Chapter NN of 13: Name"); it was previously empty.
- **Footer button.** The "Back to top" button now has `type="button"`.
- **`/observatory-v2`** now has `robots: noindex, nofollow` and points its canonical URL to `/`.
- **Tests.** Added two tests to `tests/luminous-world.spec.cjs`: one for the single H1, the twelve H2s and the chapter announcer; one for the `/observatory-v2` noindex.

### Validation
| Check | Result |
|---|---|
| `npm run lint` | Pass, 0 errors, 0 warnings |
| `npm run build` | Pass, 16 routes |
| `npx playwright test tests/luminous-world.spec.cjs` | 18 passed (6 tests × desktop, tablet, mobile), 0 failed |

The full suite was not re-run at this checkpoint. Only V3 files and `/observatory-v2` changed; `/` is unchanged and still renders V2.

### Open items
- **Homepage switch.** `/` still serves V2. The V3 homepage version is saved in `artifacts/v3-homepage-switch-backup/page.jsx`. Promoting V3 needs an explicit decision. The V2 `portfolio` and `universe` specs target `/` and would need to point at `/observatory-v2`.
- **Image provenance.** The three `public/luminous-v3/*-reference.webp` images have no recorded source or licence. Only `cloud-lab-reference.webp` is used, as the reduced-motion or WebGL-failure background. Confirm it is original or licensed before promoting V3, or replace it with a render of the procedural scene.
- **Scroll re-renders.** `setProgress` still runs on every scrolled frame. Values are rounded to whole percent, so React skips most re-renders, but the Milestone 6 plan to move progress to a ref or CSS variable still applies.
- **Content.** Stations 2–12 are still primitive placeholder geometry (Milestone 3). V3 still carries only condensed professional content (Milestone 5).

### Files to modify for Milestone 2 (Chapter 01 cinematic laboratory)
- `src/app/components/luminous-v3/LuminousWorld.jsx`: `DeskStudio`, `Dome`, `Island` (station 0), `CloudField`, the lighting and fog setup, and the `CameraRail` keyframes for stations 0–1.
- Likely split into `src/app/components/luminous-v3/environments/Laboratory.jsx` plus shared materials (`materials.js`) for reuse across environments.
- `src/app/components/luminous-v3/luminous.css`: `.lv3-sky` and `.lv3-wash` for the brighter atmosphere.
- `tests/luminous-world.spec.cjs`: add canvas-pixel and camera-retrace checks modelled on `tests/universe.spec.cjs`.
- Reference: `public/luminous-v3/cloud-lab-reference.webp`.
