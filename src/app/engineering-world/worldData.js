export const STAGES = [
  {
    id: "idea", marker: "01 / DESIGN", heading: "Every great interface begins as an idea.",
    description: "A developer sketches the experience, writes C# and React components, and shapes a human problem into working source code.",
    evidence: "Source files · UI components · Requirements",
    snippet: "// The first version starts here\nconst experience = designForPeople();",
  },
  {
    id: "git", marker: "02 / SOURCE CONTROL", heading: "The idea becomes a tracked change.",
    description: "Our illustrated code courier carries the artifact into Git. A commit records the change; review and history make the work traceable.",
    evidence: "Git commit · Pull request · Code review",
    snippet: "git add .\ngit commit -m \"feat: improve UX\"",
  },
  {
    id: "build", marker: "03 / BUILD & TEST", heading: "The system proves that the code can run.",
    description: "CI restores dependencies, compiles the application, executes tests, and produces a deployable artifact when the checks pass.",
    evidence: "Build output · Automated tests · Artifact",
    snippet: "dotnet restore\ndotnet build --no-restore\ndotnet test --no-build",
  },
  {
    id: "deploy", marker: "04 / DEPLOYMENT", heading: "The artifact reaches its runtime home.",
    description: "A release pipeline configures the service and deploys the verified application. The server becomes ready to receive real requests.",
    evidence: "Environment · Application server · Health check",
    snippet: "POST /health  →  200 OK\nrelease: ready",
  },
  {
    id: "frontend", marker: "05 / USER INTERACTION", heading: "A person interacts with the interface.",
    description: "A visitor opens Folio and searches for a book. The browser creates an HTTP request to the application API.",
    evidence: "Browser · React state · HTTP request",
    snippet: "const res = await fetch('/api/books?q=clean');",
  },
  {
    id: "api", marker: "06 / BACKEND", heading: "The request reaches the business logic.",
    description: "ASP.NET Core accepts the request. A controller validates input, applies authorisation rules, and calls a service for the required operation.",
    evidence: "Controller · Service · Authorisation",
    snippet: "GET /api/books?q=clean\nBooksController → SearchAsync(query)",
  },
  {
    id: "database", marker: "07 / DATA", heading: "The backend retrieves the right records.",
    description: "The repository queries a relational database and returns structured results. The service shapes the data into a response model.",
    evidence: "EF Core · SQL query · Response DTO",
    snippet: "SELECT Title, Author\nFROM Books WHERE Title LIKE @query;",
  },
  {
    id: "result", marker: "08 / EXPERIENCE", heading: "The result becomes something people can use.",
    description: "JSON returns to the browser, the frontend updates its state, and the answer appears as an accessible, usable interface. That's the full engineering journey.",
    evidence: "JSON response · React rendering · Usable UI",
    snippet: "response.json() → state update → UI",
  },
];

// Story locations in a single connected three-dimensional world.
export const NODES = {
  idea: [-27, 0, 0], git: [-17, 0, 4], build: [-6, 0, -2],
  deploy: [6, 0, 4], frontend: [22, 0, -2], api: [10, 0, 17],
  database: [-2, 0, 20], result: [22, 0, -2],
};

// Explicit cinematic camera framing. Distinct camera movement and depth changes.
export const SHOTS = [
  { pos: [-34, 12, 23], target: [-27, 1, 0] },
  { pos: [-25, 12, 21], target: [-17, 1, 4] },
  { pos: [-14, 13, 16], target: [-6, 1, -2] },
  { pos: [0, 11, 24], target: [6, 2, 4] },
  { pos: [18, 10, 22], target: [22, 2, -2] },
  { pos: [17, 11, 35], target: [10, 1, 17] },
  { pos: [1, 11, 37], target: [-2, 2, 20] },
  { pos: [25, 7, 14], target: [22, 2, -2] },
];
