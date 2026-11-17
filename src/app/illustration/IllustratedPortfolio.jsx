"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useMotionPreference } from "../components/MotionProvider";
import styles from "./illustration.module.css";

// An authored story, not a live trace of the Folio server.
// Build time and request time are different engineering processes.
const SCENES = [
  {
    eyebrow: "01 / SOURCE CODE",
    phase: "BUILD TIME",
    title: "Every useful experience starts as an idea.",
    body: "A developer translates a real user need into C#, components, services and tests. The code is just a beginning—not yet an application anyone can use.",
    code: ["// SearchService.cs", "public Task<IReadOnlyList<Book>> SearchAsync(", "    string query, CancellationToken ct);"],
    place: "THE WORKSTATION",
  },
  {
    eyebrow: "02 / SOURCE CONTROL",
    phase: "BUILD TIME",
    title: "The code gains a history.",
    body: "Changes travel into Git. Branches, review and commits give the team a traceable version of what it intends to ship.",
    code: ["git switch -c feat/catalogue-search", "git add src tests", "git commit -m \"feat: catalogue search\""],
    place: "GIT CROSSING",
  },
  {
    eyebrow: "03 / INTEGRATION",
    phase: "BUILD TIME",
    title: "Machines challenge the change.",
    body: "An automated pipeline restores dependencies, builds the application and runs tests. A failing check must stop the release.",
    code: ["dotnet restore", "dotnet test --no-restore", "dotnet publish -c Release"],
    place: "THE BUILD FORGE",
  },
  {
    eyebrow: "04 / DEPLOYMENT",
    phase: "BUILD TIME",
    title: "A verified release reaches its destination.",
    body: "Published application files and configuration are deployed to hosting. A healthy service can now answer requests; source code itself is not sent to the user's browser.",
    code: ["Release: build-accepted", "Server: ASP.NET Core", "Health: Ready"],
    place: "THE CLOUD GATE",
  },
  {
    eyebrow: "05 / USER ACTION",
    phase: "RUN TIME",
    title: "A person asks the product for something.",
    body: "An accessible interface accepts a search, displays progress, and makes an HTTPS request. The request crosses from the frontend into the application API.",
    code: ["fetch('/api/books?q=architecture')", "// Browser sends an HTTP request", "// UI shows loading state"],
    place: "THE FRONTEND",
  },
  {
    eyebrow: "06 / APPLICATION API",
    phase: "RUN TIME",
    title: "The backend makes the decision.",
    body: "ASP.NET Core receives and validates the request. The controller invokes application logic; authentication and permissions are enforced where required.",
    code: ["GET /api/books?q=architecture", "BooksController → SearchService", "SearchService → Repository"],
    place: "THE SERVER CORE",
  },
  {
    eyebrow: "07 / DATA LAYER",
    phase: "RUN TIME",
    title: "Structured data becomes a safe answer.",
    body: "A repository queries the database. The service maps the result to a response, and the API returns JSON with an appropriate HTTP status.",
    code: ["SELECT Title FROM Books", "WHERE Title LIKE @pattern;", "HTTP 200 → JSON"],
    place: "THE DATA VAULT",
  },
  {
    eyebrow: "08 / EXPERIENCE",
    phase: "RUN TIME",
    title: "The engineering becomes invisible.",
    body: "The browser receives a response and renders understandable, keyboard-accessible results. What the user experiences is not the infrastructure—it is useful software.",
    code: ["const books = await response.json();", "renderAccessibleResults(books);", "// The interface is now useful"],
    place: "THE FINISHED PRODUCT",
  },
];

const STOPS = SCENES.map((_, i) => i / (SCENES.length - 1));

function Courier({ leftLeg, rightLeg }) {
  return (
    <svg viewBox="0 0 138 166" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id="courier-coat" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#52d6e8" />
          <stop offset="1" stopColor="#365eaa" />
        </linearGradient>
        <filter id="courier-glow"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <ellipse cx="67" cy="155" rx="50" ry="8" fill="#5affdf" opacity=".3" />
      <motion.path d="M61 111 L48 149" stroke="#9eacdd" strokeWidth="13" strokeLinecap="round" style={{ rotate: leftLeg, transformOrigin: "62px 113px" }} />
      <motion.path d="M82 111 L95 149" stroke="#9eacdd" strokeWidth="13" strokeLinecap="round" style={{ rotate: rightLeg, transformOrigin: "81px 113px" }} />
      <path d="M48 146 l-10 7 h22" stroke="#0d1829" strokeWidth="9" strokeLinecap="round" />
      <path d="M96 147 l-4 6 h24" stroke="#0d1829" strokeWidth="9" strokeLinecap="round" />
      <path d="M43 69 Q69 50 93 69 L94 120 L45 120Z" fill="url(#courier-coat)" stroke="#9ceaff" strokeWidth="2.5" />
      <path d="M43 76 L28 99 L47 108" fill="none" stroke="#eec6aa" strokeWidth="11" strokeLinecap="round" />
      <path d="M90 79 L106 94" fill="none" stroke="#eec6aa" strokeWidth="11" strokeLinecap="round" />
      <circle cx="69" cy="43" r="26" fill="#efc5a2" />
      <path d="M41 41 Q36 11 69 11 Q103 9 97 47 L86 30 Q65 35 52 25 Z" fill="#1d2641" />
      <path d="M58 47 h6 M77 47 h6" stroke="#223044" strokeWidth="3" strokeLinecap="round" />
      <path d="M63 57 q7 4 13 0" stroke="#a06d54" strokeWidth="2" fill="none" />
      <rect x="101" y="86" width="34" height="35" rx="6" fill="#9df9ec" stroke="#fff6d4" strokeWidth="3" />
      <text x="118" y="108" fill="#144052" fontFamily="monospace" fontSize="14" textAnchor="middle" fontWeight="bold">{"{}"}</text>
    </svg>
  );
}

function WorldStage({ progress, paused, active }) {
  // Pan toward the actual islands in the supplied reference image. The return
  // trip from browser to API and back to UI intentionally changes direction.
  const cameraX = useTransform(progress, STOPS, [
    "29vw", "19vw", "-17vw", "-26vw", "-32vw", "11vw", "-5vw", "-31vw",
  ]);
  const cameraScale = useTransform(progress, STOPS, [1.92, 1.95, 1.85, 1.77, 1.84, 1.9, 1.95, 1.72]);
  const cameraY = useTransform(progress, STOPS, ["4vh", "1vh", "-2vh", "4vh", "0vh", "-4vh", "1vh", "0vh"]);
  const courierX = useTransform(progress, [0, .13, .28, .43, .56], ["-35vw", "-12vw", "10vw", "26vw", "43vw"]);
  const courierOpacity = useTransform(progress, [0, .04, .43, .55], [1, 1, 1, 0]);
  const leftLeg = useTransform(progress, (v) => Math.sin(v * 115) * 14);
  const rightLeg = useTransform(leftLeg, (v) => -v);
  const packetX = useTransform(progress, [.53, .65, .78, .9, 1], ["49vw", "9vw", "-7vw", "11vw", "47vw"]);
  const packetY = useTransform(progress, [.53, .65, .78, .9, 1], ["13vh", "-2vh", "9vh", "-4vh", "8vh"]);
  const packetOpacity = useTransform(progress, [.5, .57, .98, 1], [0, 1, 1, 1]);
  return (
    <div className={styles.worldStage} aria-hidden="true" data-illustrated-world>
      <motion.div
        className={styles.worldImage}
        style={paused ? undefined : { x: cameraX, scale: cameraScale, y: cameraY }}
        data-testid="illustrated-camera"
      />
      <div className={styles.sceneAtmosphere} />
      <div className={styles.sceneVignette} />
      {!paused && (
        <>
          <motion.div className={styles.courier} style={{ x: courierX, opacity: courierOpacity }}>
            <Courier leftLeg={leftLeg} rightLeg={rightLeg} />
          </motion.div>
          <motion.div className={styles.livePacket} style={{ x: packetX, y: packetY, opacity: packetOpacity }}>
            <span className={styles.packetGlow} />
            <span className={styles.packetFace}>{"{}"}</span>
          </motion.div>
        </>
      )}
      <div className={styles.stageHud}>
        <span className={styles.systemLabel}>ENGINEERING WORLD / AN INTERACTIVE ILLUSTRATION</span>
        <span className={styles.stageCount}>{String(active + 1).padStart(2, "0")} / {SCENES.length}</span>
      </div>
      <div className={styles.phaseHud}>
        <span className={styles.pulse} />
        <span>{SCENES[active].phase}</span>
        <span className={styles.phaseDivider}>/</span>
        <span>{SCENES[active].place}</span>
      </div>
    </div>
  );
}

function StoryChapter({ scene, index }) {
  return (
    <section
      id={`illustrated-chapter-${index}`}
      className={`${styles.chapter} ${index % 2 ? styles.chapterRight : styles.chapterLeft}`}
      aria-labelledby={`illustrated-title-${index}`}
    >
      <div className={styles.storyCard}>
        <div className={styles.storyTopline}>
          <span>{scene.eyebrow}</span>
          <span>{scene.phase}</span>
        </div>
        <h2 id={`illustrated-title-${index}`}>{scene.title}</h2>
        <p>{scene.body}</p>
        <div className={styles.terminal}>
          <div className={styles.terminalBar}>
            <span /><span /><span />
            <small>illustrative snippet · not live telemetry</small>
          </div>
          <pre><code>{scene.code.join("\n")}</code></pre>
        </div>
        {index === 7 && (
          <a className={styles.folioLink} href="https://prathmesh-library.runasp.net/" target="_blank" rel="noopener noreferrer">
            Explore the Folio demo <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </section>
  );
}

const WORK = [
  { name: "Folio", type: "FULL-STACK ENGINEERING", note: "ASP.NET Core library system. The hosted catalogue is a read-only demo using synthetic books.", link: "https://prathmesh-library.runasp.net/", linkLabel: "Open read-only demo" },
  { name: "Smart AI Research Assistant", type: "APPLIED AI / ACADEMIC", note: "An MSc application exploring paper discovery, LLM summaries, retrieval and evidence-grounded Q&A.", link: "https://prathmesh-portfolio.vercel.app/#projects", linkLabel: "Read project case study" },
  { name: "Issue Tracker API", type: "C# / BACKEND", note: "REST API with JWT authentication, role checks and controlled issue lifecycle workflows.", link: "https://github.com/prathmeeesh/IssueTrackerApi", linkLabel: "View source" },
];

export default function IllustratedPortfolio() {
  const storyRef = useRef(null);
  const [active, setActive] = useState(0);
  const { paused, toggle, systemReduced } = useMotionPreference();
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ["start start", "end end"],
  });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const index = Math.max(0, Math.min(SCENES.length - 1, Math.round(value * (SCENES.length - 1))));
    setActive((previous) => (previous === index ? previous : index));
  });

  const goTo = (index) => {
    document.getElementById(`illustrated-chapter-${index}`)?.scrollIntoView({ behavior: paused ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className={styles.page} data-illustrated-portfolio data-scene={active} data-motion={paused ? "paused" : "active"}>
      <WorldStage progress={scrollYProgress} paused={paused} active={active} />
      <a href="#illustrated-main" className={styles.skipLink}>Skip to portfolio content</a>
      <header className={styles.header}>
        <a href="#illustrated-main" className={styles.brand} aria-label="Prathmesh Pawar, home">P<span>.</span><small>PRATHMESH PAWAR</small></a>
        <nav aria-label="Illustrated portfolio navigation" className={styles.nav}>
          <a href="#illustrated-main">The story</a>
          <a href="#illustrated-projects">Projects</a>
          <a href="#illustrated-about">About</a>
          <a href="#illustrated-contact">Contact</a>
        </nav>
        <div className={styles.headerActions}>
          <button type="button" className={styles.motionButton} onClick={toggle} disabled={systemReduced}>
            {systemReduced ? "Reduced motion" : paused ? "Enable motion" : "Pause motion"}
          </button>
          <Link href="/" className={styles.homeLink}>Original portfolio ↗</Link>
        </div>
      </header>
      <main id="illustrated-main" className={styles.main}>
        <div ref={storyRef} className={styles.story}>
          <section className={styles.intro} aria-labelledby="illustrated-hero-title">
            <p className={styles.eyebrow}>A PORTFOLIO BUILT AS A JOURNEY</p>
            <h1 id="illustrated-hero-title">From <em>code</em><br /> to <em>experience.</em></h1>
            <p>Follow an idea from a developer&apos;s screen, through Git and the cloud, into the backend—and back to the interface people actually use.</p>
            <div className={styles.heroActions}>
              <a href="#illustrated-chapter-0" className={styles.primaryButton}>Scroll to enter the world ↓</a>
              <a href="#illustrated-projects" className={styles.secondaryButton}>Skip to projects</a>
            </div>
            <div className={styles.heroMeta}>PRATHMESH PAWAR <span>·</span> C# / .NET <span>·</span> APPLIED AI</div>
          </section>
          {SCENES.map((scene, i) => <StoryChapter scene={scene} index={i} key={scene.eyebrow} />)}
        </div>
        <div className={styles.chapterDock} aria-label="Story chapter navigation">
          <span className={styles.dockTitle}>JOURNEY</span>
          {SCENES.map((scene, i) => (
            <button key={scene.eyebrow} type="button" className={active === i ? styles.dockActive : undefined} onClick={() => goTo(i)} aria-label={`Go to ${scene.place}`} aria-current={active === i ? "step" : undefined} title={scene.place}>
              <span />
            </button>
          ))}
          <motion.div className={styles.dockProgress} style={{ scaleX: paused ? 1 : progressScale }} />
        </div>
        <section id="illustrated-projects" className={`${styles.contentSection} ${styles.projectSection}`} aria-labelledby="illustrated-projects-title">
          <p className={styles.eyebrow}>REAL PROJECTS / VERIFIED BOUNDARIES</p>
          <h2 id="illustrated-projects-title">Behind the illustration:<br/><em>real engineering.</em></h2>
          <div className={styles.projectGrid}>
            {WORK.map((work, i) => (
              <article className={styles.projectCard} key={work.name}>
                <span className={styles.projectCounter}>0{i + 1} / SELECTED WORK</span>
                <span className={styles.projectType}>{work.type}</span>
                <h3>{work.name}</h3>
                <p>{work.note}</p>
                <a href={work.link} target="_blank" rel="noopener noreferrer">{work.linkLabel} ↗</a>
              </article>
            ))}
          </div>
        </section>
        <section id="illustrated-about" className={styles.contentSection} aria-labelledby="illustrated-about-title">
          <div className={styles.aboutPanel}>
            <p className={styles.eyebrow}>THE ENGINEER BEHIND THE SYSTEM</p>
            <h2 id="illustrated-about-title">The complexity is backstage.<br/><em>The experience is the point.</em></h2>
            <p>I&apos;m a software engineer with approximately 2.5 years of commercial C#/.NET development experience, including an internship. My work combines backend applications, relational data, modern web interfaces and growing applied-AI expertise.</p>
            <div className={styles.skillRow}><span>C# / ASP.NET</span><span>SQL SERVER</span><span>REST APIS</span><span>NEXT.JS</span><span>AI INTEGRATION</span></div>
          </div>
        </section>
        <section id="illustrated-contact" className={`${styles.contentSection} ${styles.contactSection}`} aria-labelledby="illustrated-contact-title">
          <p className={styles.eyebrow}>THE NEXT CHAPTER</p>
          <h2 id="illustrated-contact-title">Let&apos;s make something<br/><em>people love using.</em></h2>
          <p>Explore the projects, read the technical evidence or get in touch about a software engineering opportunity.</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="/Prathmesh_Pawar_CV.pdf" download>Download CV ↓</a>
            <a className={styles.secondaryButton} target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/prathmesh-pawar-29b5a7228/">LinkedIn ↗</a>
            <a className={styles.secondaryButton} target="_blank" rel="noopener noreferrer" href="https://github.com/prathmeeesh">GitHub ↗</a>
          </div>
          <small>Conceptual, scroll-driven engineering illustration. No live infrastructure, private data or production requests are displayed.</small>
        </section>
      </main>
    </div>
  );
}
