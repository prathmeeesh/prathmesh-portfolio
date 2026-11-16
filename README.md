# Prathmesh Pawar — Engineering Portfolio

A personal software engineering portfolio built with Next.js, React and an original interactive isometric observatory. It presents commercial C#/.NET experience, personal projects and postgraduate study as distinct evidence.

[Existing live portfolio](https://prathmesh-portfolio.vercel.app) · [Folio read-only catalogue](https://prathmesh-library.runasp.net/)

This redesign is a local candidate. It has not been merged, pushed or deployed. The live portfolio can therefore show the previous design.

## Experience

- A responsive observatory with real, keyboard-accessible links to work, skills and experience. The illustration is Canvas 2D, not a WebGL scene or live infrastructure monitor.
- Folio feature with an actual local application screenshot, expandable architecture/security/testing notes, live demo and accurately labelled original API source.
- Keyboard-operated skill tabs distinguishing commercial, project and academic experience.
- Professional timeline, separate education, CV download and direct contact links.
- Motion pause, automatic reduced-motion support, skip link and mobile navigation with Escape/focus handling.
- Social preview, canonical metadata, favicon, robots and sitemap routes.

## Architecture and performance choices

Next.js App Router server components deliver headings, descriptions, project links and native case-study disclosure. Small client components handle navigation, skill selection, motion preferences and the illustration. Native scrolling replaces the previous always-running Lenis loop; unused legacy utilities/packages remain preserved for later review.

Canvas drawing is capped at roughly 30 frames per second with device-pixel ratio capped at 1.8. Animation stops when off-screen, hidden, paused or reduced motion is requested. Pointer coordinates stay in refs, not per-frame React state. IntersectionObserver and native Web Animations animate sections without hiding the initial server content. These are implementation choices, not measured performance scores.

The screenshot is an optimised 79 KB WebP served with next/image and explicit responsive sizes. It is labelled as the local full application: the hosted Folio catalogue disables accounts, borrowing, returns and administration.

## Local development

Use Node.js 20.9+ (verified here with Node 24) and npm. See package.json/package-lock.json for exact installed versions.

```powershell
npm ci
npm run lint
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3100
```

For a production-mode preview after building:

```powershell
npm run start -- --hostname 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100. The existing /Prathmesh_Pawar_CV.pdf URL remains unchanged. No environment variables or API credentials are required. next/font downloads the existing Geist fonts during an uncached build; browsers receive self-hosted fonts.

## Verification

```powershell
npx playwright install chromium
npm run build
npm run test:e2e
npm audit
```

Playwright starts and stops its own production server on 127.0.0.1:3100; stop a manually started server on that port first. Desktop Chromium and mobile Chromium emulation cover navigation, disclosures, keyboard tabs, evidence boundaries, CV bytes, reduced motion, responsive overflow, sampled axe checks and metadata routes. Mobile emulation is not physical-device Safari verification. Retries are disabled. Screenshots and JSON results are generated in ignored test-results/.

This is JavaScript/JSX; no separate TypeScript typecheck or unit coverage percentage is claimed. Read docs/VERIFICATION.md for executed results and limitations.

## Content provenance

The owner confirms Folio is live at MonsterASP.NET as a synthetic read-only catalogue. Public library-api source remains the earlier prototype pending separate reviewed publication. The local Folio 100-backend/eight-browser results are dated 15 November 2026 and are not portfolio test counts or hosted CI results.

MSc award status is explicitly unconfirmed. BSc details come from the existing CV. Smart Research Assistant remains private academic work with no fabricated repository or demo. No employer code or private assessment materials are included.

The original CV is preserved byte for byte, as are email, telephone and LinkedIn destinations. No contact form database, fake chatbot, testimonials, live telemetry or fabricated project metrics are present. See docs/CONTENT_EVIDENCE.md and docs/REDESIGN.md.

## Publication boundary

The Folio content from draft portfolio PR #1 (41d92effe037b51c5743b6482ab83e560e90dc9f) is preserved semantically, including demo restrictions and public-source status. This local branch starts from main bcadc1a; it does not silently merge, amend or replace the draft PR. Reconcile the two branches during an explicitly approved publication review. No Vercel configuration or external deployment was changed.