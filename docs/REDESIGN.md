# Portfolio observatory — local redesign

## Scope and preservation

Continue the existing Next.js 16 / React 19 portfolio. Original checkout and production remain untouched. This managed worktree starts at bcadc1ac705d27fce37a9700ae20072ce9d9f4c9; preserve the Folio content and public/source distinction from draft PR #1 at 41d92effe037b51c5743b6482ab83e560e90dc9f. No merge, push or deployment is authorised.

## Audit

- Existing site: App Router, JavaScript/JSX, Tailwind 4, Framer Motion, GSAP, Lenis and Lucide. Scripts: dev, lint, build and start. No standalone typecheck or automated tests.
- Existing hero updates React state on pointer movement and runs multiple animation systems. Smooth scrolling ignores reduced-motion preferences. Section animation initially hides server-rendered content.
- Cards are dense and small; education is mixed into experience. No dedicated case-study disclosure or social preview exists.
- Preserve public/Prathmesh_Pawar_CV.pdf byte for byte and its download URL. The CV confirms BSc Information Technology / Data Science, Pillai College, 2020–2023. MSc award remains unconfirmed by the owner; do not claim graduation.

## Design system and implementation plan

Engineering observatory: charcoal #080c12, ivory text, cyan #7df9e8, restrained violet #b4a1ff. Original isometric network scene provides direct links to project, experience, skills and contact sections; all remain available as conventional navigation. No borrowed branding, fake telemetry or loading screen.

1. Hero, navigation, motion preferences and a lightweight canvas scene. Static/server content remains readable before hydration. Native scrolling; no per-frame React state updates.
2. Folio feature, expandable case studies, commercial/project/study skill groups, career timeline, education and CV/contact sections.
3. Responsive styling, keyboard/focus states, reduced motion, image optimisation and metadata.
4. Lint/build and actual desktop/mobile browser checks. Record executed results separately; never infer success from an earlier build.

Planned files: existing page/layout/styles and section components; new Observatory, MotionProvider, Education and case-study components; local screenshot asset; social preview route; verification documentation. Preserve existing utility files unless a removal is justified.

## Content boundaries

Folio is an owner-confirmed live read-only catalogue. Account, loan and administrator workflows are local application capabilities, not public visitor features. Public source is the older prototype pending reviewed publication. Folio's local 100 backend / 8 browser test results are dated evidence, not a test run of this portfolio. Research Assistant is private academic work; no private source or fabricated live link. Issue Tracker stays a public API prototype with no new publication/test claims.
