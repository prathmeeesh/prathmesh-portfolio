// Evidence carried forward from the existing portfolio, not newly claimed outcomes.
export const caseStudies = {
  folio: {
    title: "Folio — Library Management System", category: "FULL-STACK .NET / PERSONAL PROJECT",
    introduction: "A library application connecting a considered catalogue with account, lending and administration workflows. Its public demonstration is deliberately read-only.",
    stack: ["ASP.NET Core 10", "C#", "Razor", "JavaScript", "EF Core", "SQL Server"],
    links: [{label:"Explore the read-only catalogue",url:"https://prathmesh-library.runasp.net/"},{label:"Original API source",url:"https://github.com/prathmeeesh/library-api"}],
    sections: [
      ["Context & users", "Readers need to find books and understand availability. Library administration introduces a separate set of permissions, inventory rules and lending responsibilities."],
      ["My responsibilities", "Personal project development across the ASP.NET Core backend, Razor and JavaScript interface, database workflows, verification and setup documentation."],
      ["Constraints & discovery", "The public hosting demonstration uses synthetic catalogue data. Accounts, borrowing, returns and administration are disabled for visitors. No user-research study or customer adoption metric is claimed."],
      ["Flow & architecture", "Razor / JavaScript → same-origin controllers → validated DTOs and application services → EF Core → SQL Server. Public browsing and search are distinct from authenticated and administrative workflows."],
      ["Interface decisions", "The catalogue gives prominence to books, search and availability. Clear scope notes distinguish the full local application from the publicly available catalogue. The portfolio screenshot is labelled as a local full-mode capture."],
      ["Implementation considerations", "Browser sessions use secure cookies and CSRF protection; API clients use JWT. Current database roles govern admin access. Borrowing and return operations use transactions and conditional inventory updates; each book record represents one physical copy."],
      ["Testing & iteration", "The existing project record dated 15 November 2026 reports 100 backend tests, including seven SQL Server tests, and eight browser scenarios passing with no failures or skips. These historical local runs are not a claim about current hosted CI."],
      ["Outcome & lessons", "The public catalogue provides an accessible demonstration of browsing and search. The main engineering lesson is to keep authorisation, transactional consistency and public-demo restrictions explicit at the server boundary. No performance or commercial impact metric is asserted."],
      ["Source availability", "The linked public library-api main project still targets .NET 8 when checked on 17 November 2026. It is labelled original API source; it must not be presented as proof of publication of the full .NET 10 implementation."],
    ],
  },
  observatory: {
    title: "Engineering Observatory", category: "CREATIVE ENGINEERING / PERSONAL PORTFOLIO",
    introduction: "A continuous 3D software-delivery journey layered behind a readable, navigable engineering portfolio.",
    stack: ["Next.js", "React", "Three.js", "React Three Fiber", "GSAP", "Playwright"],
    links: [{label:"Explore the journey",url:"/#journey"},{label:"Portfolio repository",url:"https://github.com/prathmeeesh/prathmesh-portfolio"}],
    sections: [
      ["Context & users", "Recruiters need fast access to credible work, while visitors interested in engineering can explore the process behind it. The journey therefore includes direct links to projects and a CV at the start."],
      ["My responsibilities", "Portfolio content, visual direction, frontend implementation and verification. The V2 environments and articulated character are original procedural geometry rather than third-party models."],
      ["Constraints & discovery", "Existing factual content, CV bytes and uncommitted prototypes must survive the redesign. Saurabh Sawant’s reference informed the persistent-stage approach; its source, layout and assets were not copied. No formal user study is claimed."],
      ["Architecture & flow", "One native-scroll director writes normalised progress to a ref. A persistent React Three Fiber canvas derives camera, character and packet positions from it. Semantic HTML carries all professional information independently of WebGL."],
      ["Visual exploration", "Earlier DOM/SVG, illustration and 3D prototypes remain available on isolated preview routes. V2 uses connected islands, a source courier, a build forge and a separate HTTP request/response animation."],
      ["Interface decisions", "An unobtrusive chapter rail, skip links and normal document navigation keep the portfolio usable without completing the journey. Reduced motion and WebGL failure show the complete story without a moving camera."],
      ["Testing & limitations", "Browser checks exercise camera reversal, canvas persistence, pause, context loss, responsive layouts and accessibility. Executed results belong in the repository’s verification record. The animation is conceptual, not application telemetry or a representation of a live CI run."],
      ["Outcome & lessons", "The source separates content, camera paths, environments and rendering lifecycle so each can evolve independently. V2 is a local release candidate until explicitly reviewed and published; no universal frame-rate or production-performance guarantee is claimed."],
    ],
  },
};
