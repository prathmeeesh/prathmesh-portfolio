# Original world asset manifest

All V2 foreground objects are actual Three.js geometry built in this repository. No GLB downloads, stock photography, external fonts for scene text, remote HDRIs, reference-site code or licensed third-party models were imported. Texture canvases are authored by `WorldPrimitives.jsx` and `WorldFinish.jsx`. Existing `engineering-world.webp` belongs to the preserved illustration experiment and is not a V2 scene backdrop.

Units are arbitrary metres; Y is up, screens face local +Z. Each environment's origin is its platform centre; platform surface is Y=0. Positions come from `LOCATIONS` in `story.js`.

| Component | Approximate footprint / height | Materials / future replacement contract |
|---|---|---|
| Workstation | 8 × 6 × 5 | Metal desk, chair, keyboard, PC, two original code screens; replace with an original GLB with separate screen material |
| Character | 0.8 × 0.8 × 2 | Capsule joints, clothing, face/glasses; preserve named arm/leg pivots, carrying pose and scroll-based timings |
| Git | 7 × 6 × 5 | Branch tubes, commit nodes, screen; review/merge route must remain intelligible |
| Forge | 8 × 5 × 4 | Five build gates, conveyor, independently addressed indicators |
| Deployment | 9 × 7 × 6 | Mechanical gate and server racks; published-artifact path crosses the gate |
| Backend | 10 × 6 × 6 | Four distinct routing/controller/logic/data-access racks |
| Database | 7 × 6 × 6 | Stacked cylinders, query chamber and returned-record cue |
| Browser | 9 × 6 × 7 | Framed 3D screen, original 1024×640 texture, separate assembling panels and results surface |
| Platform | radius 4.5–5.8 | Metal deck, structural rim, lights and faceted underside; no physics simulation |
| Atmosphere | background extent 260×240 | Procedural noise shaders and instanced distant skyline; not true volumetric cloud raymarching |

Optional future custom-model targets: original/licensed GLB files below roughly 500 KB per environment, compressed textures and sensible shared materials. These are proposed budgets, not measured existing GLB sizes. Replacement models should retain their component origin, bounds, direction and animation controls. Record author, licence and source for each new external asset before importing it.

The current character is an original procedural articulated figure, not a motion-captured or anatomically rigged character. The scene is stylised procedural artwork; film-quality Blender art and detailed character animation remain possible refinements, not completed claims.
