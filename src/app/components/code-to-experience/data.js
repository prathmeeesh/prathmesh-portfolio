// The source, deployment, and application-runtime paths are distinct on purpose.
export const CHAPTERS = [
  {
    id: "studio", index: "01", label: "The developer", kicker: "PRATHMESH PAWAR · SOFTWARE ENGINEER · C# / .NET",
    heading: "Software starts with", emphasis: "a human idea.",
    description: "From source code to the systems, services and interfaces people use. Commercial C#/.NET engineering, backend systems and MSc-level applied AI — follow one line of code from this laptop to the screen in front of you.",
    note: "A real photograph opens a conceptual engineering visualisation.",
  },
  {
    id: "source", index: "02", label: "Source code", kicker: "THE SCREEN BECOMES THE WORLD",
    heading: "Zoom into", emphasis: "the source.",
    description: "The journey starts inside an IDE: a controller receives a request, validates its inputs, and delegates the work to application services.",
    note: "Illustrative C# snippet—not a claim that the pictured code is the Folio production source.",
  },
  {
    id: "build", index: "03", label: "Build & test", kicker: "SOURCE CONTROL → CONTINUOUS INTEGRATION",
    heading: "Build confidence", emphasis: "before release.",
    description: "Working changes become commits on a feature branch, pass review and merge into main. The build pipeline then restores dependencies, compiles, runs automated tests and packages a release.",
    note: "Git records changes; CI builds and checks them.",
  },
  {
    id: "deploy", index: "04", label: "Deployment", kicker: "PUBLISH → HOST → HEALTH CHECKS",
    heading: "Code becomes", emphasis: "a running service.",
    description: "The packaged release travels into a data hall, is deployed to its configured host, started, and checked before users can interact with it.",
    note: "Deployment and runtime requests are different phases.",
  },
  {
    id: "request", index: "05", label: "HTTP request", kicker: "A REAL PERSON USES THE INTERFACE",
    heading: "Now a user", emphasis: "asks a question.",
    description: "A visitor searches the Folio catalogue. The browser sends GET /api/catalogue?search=reliable to the deployed application, and the request arrives at a server's network port.",
    note: "Route and response shape match the public read-only Folio demo. This is an explanatory request, not live telemetry.",
  },
  {
    id: "backend", index: "06", label: "Application logic", kicker: "MIDDLEWARE → ROUTING → CONTROLLER → SERVICE",
    heading: "The backend", emphasis: "does the work.",
    description: "ASP.NET Core passes the request through its middleware pipeline, routing matches the catalogue endpoint, the controller validates the query, and an application service applies the catalogue rules.",
    note: "Middleware stage names are illustrative. Services and data access remain server-side.",
  },
  {
    id: "database", index: "07", label: "Database", kicker: "EF CORE → SQL SERVER → RECORDS",
    heading: "The right records", emphasis: "are retrieved.",
    description: "EF Core translates the search into a parameterised SQL query. SQL Server walks its index to the matching rows and returns records, not the application's source code.",
    note: "The vault, index and SQL text are conceptual. The records are the demo's synthetic catalogue.",
  },
  {
    id: "output", index: "08", label: "The result", kicker: "JSON → FRONTEND → RENDER",
    heading: "And the interface", emphasis: "makes sense of it.",
    description: "The API answers with JSON — items, total, page and page size. The browser turns that structure into a readable, searchable catalogue with clear availability.",
    note: "The panel runs on the sample records in your browser. The real Folio demo opens separately.",
  },
  {
    id: "experience", index: "09", label: "The experience", kicker: "THE PERSON AT THE END OF THE SYSTEM",
    heading: "From a line of code", emphasis: "to a real experience.",
    description: "Somewhere, someone looks for a book and finds it. That quiet moment is the point of every commit, build, request and query that came before it.",
    note: "Conceptual illustration: an anonymous, stylised figure in an invented library. The screen shows a local capture of Folio.",
  },
  {
    id: "work", index: "10", label: "Selected engineering", kicker: "THE WORK BEHIND THE STORY",
    heading: "Evidence over", emphasis: "decoration.",
    description: "The animation is an invitation. The real value is in the applications, architectural decisions, constraints, and testing behind them.",
    note: "Project descriptions distinguish deployed demos from academic and source-only work.",
  },
  {
    id: "about", index: "11", label: "Experience & skills", kicker: "BEHIND THE IMPLEMENTATION",
    heading: "Built on", emphasis: "practical experience.",
    description: "Approximately 2.5 years of commercial development, including an internship, combined with an MSc in Advanced Computer Science (University of Leicester, award pending) and research into useful AI-powered software.",
    note: "Commercial .NET experience and academic AI work are deliberately distinguished.",
  },
  {
    id: "contact", index: "12", label: "Get in touch", kicker: "WHAT WE CAN ENGINEER NEXT",
    heading: "Let's make", emphasis: "something useful.",
    description: "I build and maintain backend systems, full-stack applications, and research-driven AI integrations. Explore my work or connect about engineering opportunities.",
    note: "From code to experience. From a laptop to a real product.",
  },
];

export const PROJECTS = [
  {
    title: "Folio",
    subtitle: "Library management · ASP.NET Core / C# / EF Core / SQL Server",
    body: "Full-stack library application with a deployed, read-only public catalogue demonstration.",
    href: "/work/folio", linkText: "Read case study",
    secondary: "https://prathmesh-library.runasp.net/", secondaryText: "Open demonstration",
  },
  {
    title: "Smart AI Research Assistant",
    subtitle: "MSc research · .NET / PostgreSQL / LLM integration",
    body: "Academic research discovery, collections, feeds, summaries, and evidence-aware question answering. No public production deployment is claimed.",
    href: "/#projects", linkText: "View research overview",
  },
  {
    title: "Issue Tracker API",
    subtitle: "Backend API · C# / JWT / database workflows",
    body: "Role-aware issue workflows, authentication, and relational data access.",
    href: "https://github.com/prathmeeesh/IssueTrackerApi", linkText: "View source",
  },
  {
    title: "Engineering Observatory",
    subtitle: "Creative engineering · Next.js / Blender / GSAP",
    body: "This page: one scroll director, Blender-rendered environments scrubbed frame by frame, and a portfolio that stays readable without the film.",
    href: "/work/observatory", linkText: "Read case study",
  },
];

// Synthetic catalogue published by the read-only Folio demonstration (GET /api/catalogue, checked 19 November
// 2026). The demo labels every title and description as synthetic demonstration content.
export const FOLIO_API = { search: "/api/catalogue", categories: "/api/catalogue/categories", page: "/catalogue", detail: "/book/{id}" };
export const FOLIO_BOOKS = [
  { id: 2, title: "Beneath the Paper Moon", author: "Alden Rowan", category: "Fiction" },
  { id: 7, title: "Building Reliable Web Services", author: "Rhea Calder", category: "Technology" },
  { id: 12, title: "Cities Built on Stories", author: "Hugo Merrin", category: "History" },
  { id: 11, title: "Journeys Through Deep Time", author: "Lena Thorne", category: "Science" },
  { id: 5, title: "Practical Patterns in Software", author: "Elena Marlow", category: "Technology" },
  { id: 6, title: "Signals and Systems Made Clear", author: "Ishan Merrow", category: "Technology" },
  { id: 9, title: "Small Worlds, Big Questions", author: "Nadia Solen", category: "Science" },
  { id: 15, title: "Teams That Learn", author: "Dorian Saye", category: "Business" },
  { id: 13, title: "The Atlas of Ancient Routes", author: "Amara Quill", category: "History" },
  { id: 1, title: "The Clockwork Orchard", author: "Mira Bellweather", category: "Fiction" },
  { id: 8, title: "The Curious Database", author: "Owen Halden", category: "Technology" },
  { id: 10, title: "The Geometry of Clouds", author: "Felix Norwyn", category: "Science" },
  { id: 4, title: "The Glass River", author: "Noah Ellery", category: "Fiction" },
  { id: 3, title: "The Lighthouse Archive", author: "Tessa Vale", category: "Fiction" },
  { id: 14, title: "The Thoughtful Startup", author: "Priya Fenwick", category: "Business" },
];
export const FOLIO_CATEGORIES = ["Business", "Fiction", "History", "Science", "Technology"];

// Client-side stand-in for GET /api/catalogue: the demo's parameter names and response shape
// ({ items, total, page, pageSize }); the matching rule here (title or author contains the text) is a simple approximation.
export function searchCatalogue({ search = "", category = "", page = 1, pageSize = 12 } = {}) {
  const q = search.trim().toLowerCase();
  const all = FOLIO_BOOKS.filter(book => (!q || book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q))
    && (!category || book.category === category));
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize).map(book => ({ ...book, isBorrowed: false })), total: all.length, page, pageSize };
}
