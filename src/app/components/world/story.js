// This is an explanatory model, not Folio telemetry or a literal source-code trace.
export const CHAPTERS = [
  { id: "idea", name: "The idea", phase: "SOURCE", title: "Engineering what comes next.", body: "Prathmesh Pawar · Software Engineer. A foundation in C# and .NET. A curiosity for intelligent systems. Software built with purpose.", detail: "C# / ASP.NET Core / SQL / JavaScript / Applied AI", location: "THE DEVELOPMENT STUDIO" },
  { id: "code", name: "Writing code", phase: "SOURCE", title: "A thought becomes a working change.", body: "A clear boundary. A small implementation. The engineer turns a reader’s need into code that can be understood, tested and maintained.", detail: "Controller → application logic → data access", code: "// Illustrative C# endpoint\n[HttpGet]\npublic async Task<IActionResult> Search(\n    [FromQuery] string query, CancellationToken ct)\n    => Ok(await search.FindAsync(query, ct));", location: "SOURCE / C#" },
  { id: "git", name: "Version control", phase: "DELIVERY", title: "Give every change a history.", body: "The courier takes a source change along a feature branch. Review brings it back to the main line. A commit records work; it does not deploy an application.", detail: "Branch / commit / review / merge", code: "feature/catalogue-search\n        ↘ review → main", location: "THE REPOSITORY CROSSING" },
  { id: "build", name: "Build & test", phase: "DELIVERY", title: "From source to something runnable.", body: "Checkout, restore, compile and test. Only a successful set of checks should produce a publishable artifact. These lights illustrate a pipeline, not a live CI result.", detail: "Checkout → restore → build → test → publish", code: "dotnet restore\ndotnet build -c Release --no-restore\ndotnet test -c Release --no-build\ndotnet publish -c Release --no-build", location: "THE BUILD FORGE" },
  { id: "deploy", name: "Deployment", phase: "DELIVERY", title: "An artifact finds its runtime home.", body: "Published output and protected configuration reach an application host. The connected world comes into view: an interface, a running backend and a database.", detail: "Source ≠ published output ≠ hosted application", code: "Release artifact → application host\nHealth check → ready to serve", location: "THE RELEASE GATEWAY" },
  { id: "request", name: "User interaction", phase: "RUNTIME", title: "Now, a person asks for a book.", body: "The story changes from delivering code to handling data. A Folio reader searches the catalogue. Same-origin JavaScript sends an HTTP request; the source artifact stays on the server.", detail: "Folio uses Razor + JavaScript, not React", code: "Browser → HTTP GET → catalogue API\n// Cyan packet: request", location: "THE FOLIO INTERFACE" },
  { id: "backend", name: "Inside the API", phase: "RUNTIME", title: "Small boundaries. Clear responsibilities.", body: "Routing reaches a controller. Input and access rules are checked where required. Application logic coordinates data access. This is a simplified .NET architecture, not an exact execution trace.", detail: "Routing → controller → application logic → EF Core", code: "HTTP request\n  → validate and dispatch\n  → application logic\n  → parameterised database query", location: "THE APPLICATION ENGINE" },
  { id: "data", name: "Data & response", phase: "RUNTIME", title: "The answer takes the return path.", body: "SQL Server returns records through data access and application logic. A controller serialises the response. The amber packet carries JSON back to the browser—not source code.", detail: "Database → EF Core → logic → controller → JSON", code: "-- Illustrative parameterised SQL\nSELECT Title, Author FROM Books\nWHERE Title LIKE @query;", location: "THE DATABASE CHAMBER" },
  { id: "experience", name: "The experience", phase: "INTERFACE", title: "All that engineering. One useful experience.", body: "The browser renders the returned book data. Behind a simple search sits a connected system. Explore the real Folio catalogue, then the engineering decisions behind my work.", detail: "Public Folio demo: browsing and search, read-only", location: "BUILT FOR PEOPLE" },
];

export const LOCATIONS = {
  studio: [-27, 0, 0], git: [-13, 0, -8], build: [3, 0, -12],
  deploy: [21, 0, -6], browser: [27, 0, 12], backend: [7, 0, 20], database: [-10, 0, 17],
};

// Camera and target paths have matching knots. Progress has no time-based lag.
export const SHOTS = [
  { eye: [-15, 11, 23], at: [-30, 1.7, 0], fov: 44 },
  { eye: [-21, 6.6, 12], at: [-28.6, 2.2, 0], fov: 42 },
  { eye: [-4, 9, 10], at: [-16, 1.7, -8], fov: 44 },
  { eye: [13, 10, 7], at: [0, 2, -12], fov: 44 },
  { eye: [33, 19, 32], at: [8, 1, 2], fov: 48 },
  { eye: [35, 8, 29], at: [24, 2.8, 12], fov: 43 },
  { eye: [19, 10, 40], at: [3, 2, 20], fov: 44 },
  { eye: [0, 10, 35], at: [-13, 2, 17], fov: 43 },
  { eye: [31, 6.5, 27], at: [24, 2.7, 12], fov: 44 },
];
export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const smooth = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
export const segment = (p, start, end) => clamp((p - start) / (end - start));
