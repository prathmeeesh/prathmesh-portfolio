# Prathmesh Pawar - Developer Portfolio

Next.js and React portfolio for my C#/.NET software development background, public projects and current CV.

[Live portfolio](https://prathmesh-portfolio.vercel.app)

## Local Development

Use Node.js 20.9 or newer and npm.

```bash
npm ci
npm run lint
npm run build
npm run dev
```

The development server defaults to [localhost:3000](http://localhost:3000). If that port is occupied, use `npm run dev -- --port 3001`.

This repository uses JavaScript and JSX. There is no standalone TypeScript typecheck or automated test suite; lint and build results must not be described as TypeScript or test coverage.

## Content and Evidence

- Page metadata is in `src/app/layout.js`; page sections are in `src/app/components/`.
- Project cards link to public repositories, and Folio also links to its [live read-only demonstration](https://prathmesh-library.runasp.net/). Issue Tracker API is labelled a prototype: its local authentication hardening and automated tests have not yet been published. Folio's public demo is deployed with 15 synthetic books, while its repository still shows the earlier API-era source until a separate reviewed source publication.
- No employer source code or private university repository is published or linked here.
- `public/Prathmesh_Pawar_CV.pdf` is the existing Software Engineer CV updated on 5 September 2026, copied unchanged from `Prathmesh_Pawar_AI_Software_Engineer_CV.pdf`. Its established download URL is retained.
- Contact links use email, telephone and public profiles. There is no message-submission backend.

Before changing project claims, check source code and public repository visibility. Confirm CV provenance before replacing the download. A successful local build does not establish that a deployment has succeeded.
