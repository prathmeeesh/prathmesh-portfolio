"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Code2, GitBranch, MousePointer2 } from "lucide-react";
import { useMotionPreference } from "./MotionProvider";
import styles from "./CodeJourney.module.css";

/**
 * A conceptual, scroll-driven software engineering story.
 * The examples are explanatory and do NOT execute real API or database requests.
 */
const FLOWS = {
  build: {
    label: "Build & delivery",
    eyebrow: "01 / From source to software",
    headline: "An idea becomes something people can use.",
    summary: "Follow an engineering change from the workstation to a usable browser interface.",
    steps: [
      {
        title: "Design",
        subtitle: "Developer workstation",
        description: "A feature starts with a user problem, a design decision and a small implementation plan.",
        code: "Feature: help readers find books faster\nGoal: clear search + accessible results",
        evidence: "Design decision / UX objective",
      },
      {
        title: "Implement",
        subtitle: "Source directory",
        description: "Components, services and tests are written as maintainable source code, each with a distinct responsibility.",
        code: "src/app/components/Search.jsx\nsrc/Services/BookSearchService.cs",
        evidence: "Source files and boundaries",
      },
      {
        title: "Version",
        subtitle: "Git repository",
        description: "A reviewed commit records the change and makes it possible to compare, reproduce and safely revert it.",
        code: 'git add .\ngit commit -m "feat: improve search"',
        evidence: "Traceable code revision",
      },
      {
        title: "Verify",
        subtitle: "Continuous integration",
        description: "Automated checks exercise the implementation before it is considered suitable for release.",
        code: "npm run lint && npm run build\ndotnet test",
        evidence: "Build + test evidence",
      },
      {
        title: "Compile",
        subtitle: "Build artefacts",
        description: "The frontend is bundled; server-side code is published. The outputs—not raw editor text—are prepared for hosting.",
        code: "npm run build\ndotnet publish -c Release",
        evidence: "Release-ready artefacts",
      },
      {
        title: "Deliver",
        subtitle: "Hosting environment",
        description: "Deployment places the built application behind an accessible address, with configuration and rollback controls.",
        code: "Frontend → Vercel\n.NET application → application host",
        evidence: "Published application",
      },
      {
        title: "Experience",
        subtitle: "Real user interface",
        description: "People experience the result as a simple interface, not as the tools and infrastructure used to create it.",
        code: "<SearchResults query={search} />\n// accessible, responsive, useful",
        evidence: "Value delivered to a user",
      },
    ],
  },
  runtime: {
    label: "Request journey",
    eyebrow: "02 / From action to response",
    headline: "One click activates an entire system.",
    summary: "Trace the request and response through a conceptual Folio-style .NET architecture.",
    steps: [
      {
        title: "Interact",
        subtitle: "Person using software",
        description: "A visitor types a book title and presses Search. The interaction starts at the browser.",
        code: 'Search input: "clean code"\nUser action: submit',
        evidence: "Accessible user interaction",
      },
      {
        title: "Frontend",
        subtitle: "React interface",
        description: "The interface validates user input and sends a request, showing a sensible loading state.",
        code: 'const q = "clean code";\nfetch(`/api/books?query=${encodeURIComponent(q)}`);',
        evidence: "Request + loading state",
      },
      {
        title: "Controller",
        subtitle: "ASP.NET Core API",
        description: "The server receives the HTTP request and applies the required routing, validation and authorisation boundaries.",
        code: "[HttpGet]\npublic Task<IActionResult> Search(string query)",
        evidence: "Validated HTTP boundary",
      },
      {
        title: "Service",
        subtitle: "Business logic",
        description: "Application services apply domain rules and coordinate access to the data layer.",
        code: "var books = await searchService.FindAsync(query);",
        evidence: "Maintainable domain behaviour",
      },
      {
        title: "Database",
        subtitle: "SQL Server + EF Core",
        description: "A parameterised query reads the matching records under the application's data-access rules.",
        code: "SELECT Title, Author\nFROM Books WHERE Title LIKE @term;",
        evidence: "Structured persistent data",
      },
      {
        title: "Respond",
        subtitle: "HTTP response",
        description: "The server serialises a controlled response, without exposing database credentials or internal implementation details.",
        code: '{ "items": [{ "title": "Clean Code" }] }',
        evidence: "Structured response contract",
      },
      {
        title: "Render",
        subtitle: "Useful product UI",
        description: "The browser converts the response into readable, actionable results with appropriate feedback.",
        code: "<BookCard title=\"Clean Code\" />\n// result is announced to the user",
        evidence: "A human-friendly result",
      },
    ],
  },
};

const STOPS = [
  { x: 76, y: 141 },
  { x: 236, y: 106 },
  { x: 396, y: 145 },
  { x: 556, y: 103 },
  { x: 716, y: 145 },
  { x: 876, y: 110 },
  { x: 1036, y: 141 },
];

const TRACK = "M76 141 C140 141 177 106 236 106 S337 145 396 145 S497 103 556 103 S657 145 716 145 S817 110 876 110 S977 141 1036 141";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function positionAt(progress) {
  const scaled = clamp(progress, 0, 1) * (STOPS.length - 1);
  const index = Math.min(Math.floor(scaled), STOPS.length - 2);
  const fraction = scaled - index;
  // Smooth interpolation between stations keeps the packet on a gentle path.
  const t = fraction * fraction * (3 - 2 * fraction);
  const a = STOPS[index];
  const b = STOPS[index + 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export default function CodeJourney() {
  const sectionRef = useRef(null);
  const frameRef = useRef(0);
  const [mode, setMode] = useState("build");
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const { paused } = useMotionPreference();
  const flow = FLOWS[mode];
  const step = flow.steps[active];
  const packet = positionAt(progress);

  useEffect(() => {
    const sync = () => {
      frameRef.current = 0;
      const el = sectionRef.current;
      if (!el || window.matchMedia("(max-width: 860px)").matches) return;
      const bounds = el.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - window.innerHeight);
      const next = clamp(-bounds.top / travel, 0, 1);
      setProgress((old) => (Math.abs(old - next) > 0.003 ? next : old));
      setActive(Math.round(next * (STOPS.length - 1)));
    };
    const schedule = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(sync);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const goTo = useCallback((index) => {
    const next = clamp(index, 0, STOPS.length - 1);
    setActive(next);
    setProgress(next / (STOPS.length - 1));
    const el = sectionRef.current;
    if (!el || paused || window.matchMedia("(max-width: 860px)").matches) return;
    const bounds = el.getBoundingClientRect();
    const top = window.scrollY + bounds.top;
    const travel = Math.max(0, bounds.height - window.innerHeight);
    window.scrollTo({top: top + (travel * next) / (STOPS.length - 1),behavior: "instant",
});
  }, [paused]);

  return (
    <section id="code-journey" ref={sectionRef} className={styles.section} aria-labelledby="code-journey-title">
      <div className={styles.sticky}>
        <div className={`shell ${styles.inner}`}>
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>ENGINEERING / AN INTERACTIVE STORY</p>
              <h2 id="code-journey-title" className={styles.heading}>
                From <em>code</em> to experience.
              </h2>
              <p className={styles.lead}>See how thoughtful engineering becomes software people actually use.</p>
            </div>
            <div className={styles.modeSwitch} aria-label="Choose a software journey">
              <button type="button" aria-pressed={mode === "build"} onClick={() => setMode("build")}>
                <GitBranch size={16} aria-hidden="true" /> Build & ship
              </button>
              <button type="button" aria-pressed={mode === "runtime"} onClick={() => setMode("runtime")}>
                <MousePointer2 size={16} aria-hidden="true" /> Click to response
              </button>
            </div>
          </div>

          <div className={styles.stage}>
            <div className={styles.stageTop}>
              <span>{flow.eyebrow}</span>
              <span>STAGE {String(active + 1).padStart(2, "0")} / 07</span>
            </div>
            <div className={styles.map}>
              <svg viewBox="0 0 1112 230" className={styles.svg} aria-hidden="true" focusable="false">
                <defs>
                  <linearGradient id="code-journey-track" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7df9e8" />
                    <stop offset="100%" stopColor="#b4a1ff" />
                  </linearGradient>
                  <filter id="code-journey-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="5" />
                  </filter>
                </defs>
                <path d={TRACK} className={styles.track} />
                <path d={TRACK} className={styles.completedTrack} pathLength="100" style={{ strokeDasharray: `${progress * 100} 100` }} />
                {STOPS.map((stop, index) => (
                  <g key={index}>
                    <circle cx={stop.x} cy={stop.y} r="22" className={styles.nodeHalo} />
                    <circle cx={stop.x} cy={stop.y} r="13" className={index <= active ? styles.nodeActive : styles.node} />
                    <text x={stop.x} y={stop.y + 4} textAnchor="middle" className={styles.nodeNumber}>{index + 1}</text>
                  </g>
                ))}
                <circle cx={packet.x} cy={packet.y} r="14" fill="#7df9e8" opacity={paused ? 0 : 0.3} filter="url(#code-journey-glow)" />
                <circle cx={packet.x} cy={packet.y} r="5" fill="#e5fffa" />
              </svg>
              <div className={styles.stepNav} aria-label={`Stages of ${flow.label}`}>
                {flow.steps.map((item, index) => (
                  <button key={item.title} type="button" aria-current={active === index ? "step" : undefined} onClick={() => goTo(index)}>
                    <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.details}>
              <div className={styles.explanation} aria-live="polite" aria-atomic="true">
                <p className={styles.detailEyebrow}>{step.subtitle}</p>
                <h3>{flow.headline}</h3>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
                <span className={styles.evidence}><Code2 size={14} aria-hidden="true" /> {step.evidence}</span>
              </div>
              <div className={styles.terminal} aria-label="Illustrative source or system event">
                <div className={styles.terminalBar}>
                  <span className={styles.terminalDots} aria-hidden="true"><i /><i /><i /></span>
                  <span>{mode === "build" ? "engineering / pipeline" : "request / execution"}</span>
                  <span>EXAMPLE</span>
                </div>
                {active === flow.steps.length - 1 ? (
                  <div className={styles.mockBrowser}>
                    <div className={styles.browserBar}>
                      <span className={styles.dot} /> folio / catalogue <span>● ONLINE</span>
                    </div>
                    <div className={styles.browserBody}>
                      <p className={styles.browserTag}>PRODUCT INTERFACE</p>
                      <h5>Find your next read.</h5>
                      <div className={styles.searchPreview}>clean code <span>Search</span></div>
                      <div className={styles.bookPreview}>
                        <span className={styles.bookCover} aria-hidden="true" />
                        <div><strong>Clean Code</strong><small>Example catalogue result</small></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <pre><code>{step.code}</code></pre>
                )}
              </div>
            </div>
            <div className={styles.controls}>
              <p>Conceptual animation · not a live request trace</p>
              <div>
                <button type="button" aria-label="Previous engineering stage" onClick={() => goTo(active - 1)} disabled={active === 0}><ArrowLeft size={17} /></button>
                <span>{active + 1} / {flow.steps.length}</span>
                <button type="button" aria-label="Next engineering stage" onClick={() => goTo(active + 1)} disabled={active === flow.steps.length - 1}><ArrowRight size={17} /></button>
              </div>
            </div>
          </div>
          <p className={styles.scrollHint}>{paused ? "Use the stage controls to explore." : "Scroll to follow the journey · or select any stage"}</p>
        </div>
      </div>
    </section>
  );
}
