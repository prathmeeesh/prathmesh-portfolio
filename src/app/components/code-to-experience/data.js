// The source, deployment, and application-runtime paths are distinct on purpose.
export const CHAPTERS = [
  {
    id: "studio", index: "01", label: "The developer", kicker: "PRATHMESH PAWAR · SOFTWARE ENGINEER · C# / .NET",
    heading: "Software starts with", emphasis: "a human idea.",
    description: "Commercial C#/.NET experience, applied AI projects, and an interest in making complex systems genuinely useful. Follow a line of code from this laptop to the interface people use.",
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
    description: "Changes are committed and reviewed. The build pipeline restores dependencies, compiles, runs automated tests, and publishes a release artifact.",
    note: "Git records changes; CI builds and checks them.",
  },
  {
    id: "deploy", index: "04", label: "Deployment", kicker: "PUBLISH → HOST → HEALTH CHECKS",
    heading: "Code becomes", emphasis: "a running service.",
    description: "A published application is deployed to its configured host, started, and checked before users can interact with it.",
    note: "Deployment and runtime requests are different phases.",
  },
  {
    id: "request", index: "05", label: "HTTP request", kicker: "A REAL PERSON USES THE INTERFACE",
    heading: "Now a user", emphasis: "asks a question.",
    description: "A visitor opens a library catalogue and searches for a book. The browser sends an HTTP request into the deployed application.",
    note: "This is an explanatory request, not live telemetry.",
  },
  {
    id: "backend", index: "06", label: "Application logic", kicker: "ROUTER → CONTROLLER → SERVICE",
    heading: "The backend", emphasis: "does the work.",
    description: "ASP.NET Core routes the request. Controllers and services enforce business rules, coordinate queries, and prepare the response.",
    note: "Services and data access remain server-side.",
  },
  {
    id: "database", index: "07", label: "Database", kicker: "DATA ACCESS → SQL → RECORDS",
    heading: "The right records", emphasis: "are retrieved.",
    description: "The data layer queries a relational database. The database returns records, not the application's source code.",
    note: "The schema and rows visualised here are conceptual.",
  },
  {
    id: "output", index: "08", label: "The result", kicker: "RESPONSE → FRONTEND → RENDER",
    heading: "And the interface", emphasis: "makes sense of it.",
    description: "The server returns structured data. The browser renders readable catalogue results with helpful actions—software becoming a real experience.",
    note: "Interactive sample catalogue below. Actual Folio demo opens separately.",
  },
  {
    id: "work", index: "09", label: "Selected engineering", kicker: "THE WORK BEHIND THE STORY",
    heading: "Evidence over", emphasis: "decoration.",
    description: "The animation is an invitation. The real value is in the applications, architectural decisions, constraints, and testing behind them.",
    note: "Project descriptions distinguish deployed demos from academic and source-only work.",
  },
  {
    id: "about", index: "10", label: "Experience & skills", kicker: "BEHIND THE IMPLEMENTATION",
    heading: "Built on", emphasis: "practical experience.",
    description: "Approximately 2.5 years of commercial development, including an internship, combined with an MSc in Advanced Computer Science and research into useful AI-powered software.",
    note: "Commercial .NET experience and academic AI work are deliberately distinguished.",
  },
  {
    id: "contact", index: "11", label: "Get in touch", kicker: "WHAT WE CAN ENGINEER NEXT",
    heading: "Let's make", emphasis: "something useful.",
    description: "I build and maintain backend systems, full-stack applications, and research-driven AI integrations. Explore my work or connect about engineering opportunities.",
    note: "From code to experience. From a laptop to a real product.",
  },
];

export const PROJECTS = [
  {
    title: "Folio",
    subtitle: "Library management · ASP.NET Core / C# / SQL",
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
];

export const SAMPLE_BOOKS = [
  { title: "Frankenstein", author: "Mary Shelley", year: "1818", category: "Literature" },
  { title: "Pride and Prejudice", author: "Jane Austen", year: "1813", category: "Classic fiction" },
  { title: "The Time Machine", author: "H. G. Wells", year: "1895", category: "Science fiction" },
];
