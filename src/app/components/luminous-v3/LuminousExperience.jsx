"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import "./luminous.css";

const LuminousWorld = dynamic(() => import("./LuminousWorld"), { ssr: false });

const CHAPTERS = [
  { id: "origin", no: "01", name: "Origin", tag: "THE ORIGIN", title: "Engineering what comes", accent: "next.", body: "From a first line of code to software people actually use. An illustrated journey through the decisions, systems and experiences behind my work.", code: "01 / THE DEVELOPMENT STUDIO" },
  { id: "source", no: "02", name: "Source", tag: "SOURCE CODE", title: "Every experience begins", accent: "with an idea.", body: "C# applications start as organised source files, deliberate architecture and clear business rules. The workstation is where a solution takes shape.", code: "02 / C# · ASP.NET CORE · SOURCE" },
  { id: "git", no: "03", name: "Git", tag: "VERSION CONTROL", title: "Ideas improve", accent: "together.", body: "Changes move through commits, branches and reviews. Version control records the work; it does not deploy a running application by itself.", code: "03 / COMMIT · REVIEW · MERGE" },
  { id: "build", no: "04", name: "Build", tag: "BUILD & TEST", title: "Reliability is", accent: "engineered.", body: "Restore dependencies, compile the application, run automated checks and publish the release artifact. A conceptual pipeline, grounded in real engineering practice.", code: "04 / RESTORE · BUILD · TEST · PUBLISH" },
  { id: "deploy", no: "05", name: "Deploy", tag: "APPLICATION DELIVERY", title: "Code finds its", accent: "runtime home.", body: "Published output reaches a configured host. The application starts, health checks run, and the frontend becomes available to users.", code: "05 / RELEASE ARTIFACT → HOST" },
  { id: "request", no: "06", name: "Request", tag: "THE USER INTERACTION", title: "Then a person", accent: "clicks.", body: "Someone searches for a book in Folio. The browser sends an HTTP request; this is a different journey from deploying the source code.", code: "06 / FRONTEND → HTTP REQUEST" },
  { id: "backend", no: "07", name: "Backend", tag: "THE .NET APPLICATION", title: "Logic moves", accent: "behind the interface.", body: "Routing, controllers, services and repository logic process the request. The server enforces business rules and accesses the data it needs.", code: "07 / ROUTE → CONTROLLER → SERVICE" },
  { id: "database", no: "08", name: "Database", tag: "DATA & RESPONSE", title: "Information travels", accent: "back to the browser.", body: "The database returns requested records. The backend produces a structured HTTP response, and the frontend uses that data—not server source code—to update the view.", code: "08 / SQL → JSON RESPONSE" },
  { id: "frontend", no: "09", name: "Frontend", tag: "THE EXPERIENCE", title: "Engineering becomes", accent: "something useful.", body: "The browser renders an interface people can understand. Explore Folio's public, read-only catalogue demonstration and the engineering decisions behind it.", code: "09 / RESPONSE → RENDERED UI" },
  { id: "work", no: "10", name: "Work", tag: "SELECTED SYSTEMS", title: "Not just a demo.", accent: "Real engineering.", body: "Projects built to solve distinct problems, each with technical decisions, architecture and verifiable boundaries.", code: "10 / SELECTED PROJECTS" },
  { id: "about", no: "11", name: "About", tag: "MY APPROACH", title: "Software should feel", accent: "effortless.", body: "I bring commercial C#/.NET development experience together with a growing focus on applied AI and user-centred software engineering.", code: "11 / ENGINEERING · AI · USABILITY" },
  { id: "experience", no: "12", name: "Experience", tag: "PROFESSIONAL FOUNDATIONS", title: "Built on practical", accent: "experience.", body: "Approximately 2.5 years of commercial software development, including an internship. Experience spanning application development, database workflows, debugging and maintenance.", code: "12 / COMMERCIAL .NET EXPERIENCE" },
  { id: "contact", no: "13", name: "Contact", tag: "WHAT COMES NEXT", title: "Ready to engineer", accent: "what comes next.", body: "Let's connect around backend software engineering, reliable applications and practical AI integration. The best ideas become valuable when people can use them.", code: "13 / LET'S CONNECT" },
];

const WORK = [
 { name: "Folio", focus: "FULL-STACK / ASP.NET CORE", description: "Library catalogue, authentication, lending rules and SQL-backed administration. The public demo intentionally enables browsing and search only.", href: "/work/folio", action: "Read engineering case study", secondary: { href: "https://prathmesh-library.runasp.net/", label: "Try read-only catalogue" } },
 { name: "Smart AI-driven Research Assistant", focus: "ACADEMIC / APPLIED AI", description: "MSc individual project: research discovery, evidence-aware summaries and paper organisation. Private academic work, with no public deployment claimed.", href: "#contact", action: "Discuss the research" },
 { name: "Issue Tracker API", focus: "BACKEND / REST API", description: "An API prototype for issue and project workflows using ASP.NET Core, SQL and authorisation. See the public source, not an invented live deployment.", href: "https://github.com/prathmeeesh/IssueTrackerApi", action: "Inspect API repository" },
 { name: "Engineering Observatory", focus: "CREATIVE ENGINEERING / NEXT.JS", description: "Scroll-directed 3D technical storytelling, accessible fallbacks and a documented implementation. This V3 scene is a visual experiment, not live telemetry.", href: "/work/observatory", action: "Read engineering case study" },
];

export default function LuminousExperience() {
 const [paused, setPaused] = useState(false);
 const [quality, setQuality] = useState("auto");
 const [reduced, setReduced] = useState(false);
 const [active, setActive] = useState(0);
 const activeRef = useRef(0);
 // Scroll progress changes every frame, so it is written straight to the DOM (compositor-only
 // transform + ARIA value) instead of React state; React re-renders only when the chapter changes.
 const progressRef = useRef(null);
 const progressFillRef = useRef(null);

 useEffect(() => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => setReduced(mq.matches);
  sync();mq.addEventListener?.("change", sync);
  return () => mq.removeEventListener?.("change", sync);
 }, []);

 useEffect(() => {
  let frame = 0;
  const sync = () => {
   if (frame) return;
   frame = requestAnimationFrame(() => {
    frame = 0;
    const sections = [...document.querySelectorAll("[data-lv3-chapter]")];
    const threshold = window.innerHeight * .48;
    let best = 0;
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= threshold) best = i;
    });
    if (best !== activeRef.current) {activeRef.current = best;setActive(best);}
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const nextProgress = Math.min(1, Math.max(0, window.scrollY / max));
    progressFillRef.current?.style.setProperty("transform", `scaleY(${nextProgress.toFixed(4)})`);
    progressRef.current?.setAttribute("aria-valuenow", String(Math.round(nextProgress * 100)));
   });
  };
  sync();window.addEventListener("scroll", sync, { passive:true });window.addEventListener("resize",sync);
  return () => {window.removeEventListener("scroll",sync);window.removeEventListener("resize",sync);cancelAnimationFrame(frame);};
 }, []);

 const goto = useCallback((id) => document.getElementById(id)?.scrollIntoView({behavior: reduced ? "instant":"smooth"}), [reduced]);
 return <div className="lv3-page" data-testid="luminous-experience">
   <div className="lv3-sky" aria-hidden="true"/>
   <LuminousWorld paused={paused} quality={quality} reduced={reduced}/>
   <div className="lv3-wash" aria-hidden="true"/>
   <svg className="lv3-doodle" viewBox="0 0 1100 650" preserveAspectRatio="none" aria-hidden="true">
     <path d="M590 90 Q690 25 840 125 T1120 110 M530 520 Q690 410 825 490 T1140 460" stroke="#4f9cbd" strokeWidth="1.2" fill="none" strokeDasharray="5 13" opacity=".32"/>
     <circle cx="900" cy="120" r="32" stroke="#48b2bd" strokeWidth="1" fill="none" opacity=".3"/>
     <path d="M875 120h50m-25-25v50" stroke="#48b2bd" strokeWidth="1" opacity=".4"/>
   </svg>
   <a className="lv3-skip" href="#origin">Skip to portfolio content</a>
   <header className="lv3-nav">
     <button className="lv3-wordmark" type="button" onClick={()=>goto("origin")} aria-label="Go to start"><strong>p<span>.</span></strong><span className="lv3-monogram">PRATHMESH<br/>PAWAR</span></button>
     <nav className="lv3-desktop-nav" aria-label="Main navigation"><a href="#origin">Journey</a><a href="#work">Work</a><a href="#about">About</a><a href="#experience">Experience</a><a href="#contact">Contact</a></nav>
     <details className="lv3-mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation"><a href="#origin">Journey</a><a href="#work">Work</a><a href="#about">About</a><a href="#experience">Experience</a><a href="#contact">Contact</a></nav></details>
     <div className="lv3-controls"><label className="lv3-select-label">Quality <select aria-label="Render quality" value={quality} onChange={e=>setQuality(e.target.value)}><option value="auto">Auto</option><option value="low">Light</option><option value="high">High</option></select></label><button type="button" onClick={()=>setPaused(s=>!s)} aria-label={paused?"Resume 3D world":"Pause 3D world"}>{paused?"Play":"Pause"}</button></div>
   </header>
   <div className="lv3-topline"><span>ENGINEERING OBSERVATORY / LUMINOUS STUDY</span><span>CONTINUOUS 3D JOURNEY</span></div>
   <aside className="lv3-chapter-nav" aria-label="Journey chapter navigation">{CHAPTERS.map((c,i)=><button type="button" key={c.id} className={active===i?"lv3-active":""} onClick={()=>goto(c.id)} aria-label={`Go to ${c.name}`} title={c.name}><span className="lv3-chapter-dot"/><span className="lv3-chapter-number">{c.no}</span></button>)}</aside>
   <div className="lv3-progress" role="progressbar" aria-label="Portfolio progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} ref={progressRef} data-testid="lv3-progress"><span ref={progressFillRef}/></div>
   <main className="lv3-main">
     {CHAPTERS.map((c,i)=><section id={c.id} data-lv3-chapter key={c.id} className={`lv3-chapter lv3-chapter-${c.id}`} aria-labelledby={`${c.id}-heading`}>
       <div className="lv3-content">
         <div className="lv3-kicker"><span className="lv3-kicker-line"/> {c.no} / {c.tag}</div>
         {/* One page-level H1; every later chapter is a second-level section heading. */}
         {i===0
           ?<h1 id={`${c.id}-heading`} className="lv3-heading">{c.title}<br/><em>{c.accent}</em></h1>
           :<h2 id={`${c.id}-heading`} className="lv3-heading">{c.title}<br/><em>{c.accent}</em></h2>}
         <p className="lv3-description">{c.body}</p>
         {i===0&&<><p className="lv3-intro">PRATHMESH PAWAR <span> / </span> SOFTWARE ENGINEER</p><p className="lv3-subintro">Commercial C#/.NET engineering · Backend systems · Applied AI projects</p></>}
         {i===8&&<div className="lv3-buttons"><a className="lv3-primary" href="https://prathmesh-library.runasp.net/" target="_blank" rel="noreferrer">Explore the Folio demo ↗</a><span className="lv3-note">Read-only public catalogue</span></div>}
         {i===9&&<div className="lv3-work-grid">{WORK.map(w=><article key={w.name} className="lv3-work"><span className="lv3-work-type">{w.focus}</span><h3>{w.name}</h3><p>{w.description}</p><div className="lv3-work-actions"><a href={w.href} target={w.href.startsWith("http")?"_blank":undefined} rel={w.href.startsWith("http")?"noopener noreferrer":undefined}>{w.action} ↗</a>{w.secondary&&<a href={w.secondary.href} target="_blank" rel="noopener noreferrer">{w.secondary.label} ↗</a>}</div></article>)}</div>}
         {i===10&&<div className="lv3-skills-evidence"><div><h3>Commercial experience</h3><p>C# · ASP.NET MVC · SQL Server · JavaScript · MySQL</p></div><div><h3>Personal engineering</h3><p>ASP.NET Core · EF Core · PostgreSQL · REST APIs · Next.js</p></div><div><h3>Academic and AI projects</h3><p>LLM integration · Research discovery · Data-intensive systems</p></div></div>}
         {i===11&&<div className="lv3-career" aria-label="Professional experience and education"><div><span>JUL 2023 — AUG 2025</span><h3>Junior Software Developer</h3><p>Acssel Infotech · C#, ASP.NET MVC, SQL Server and JavaScript application development.</p></div><div><span>JAN 2023 — JUL 2023</span><h3>Internship Trainee</h3><p>Acssel Infotech · Web interfaces, C# development support, debugging and testing.</p></div><div><span>2025 — 2026</span><h3>MSc Advanced Computer Science</h3><p>University of Leicester · Degree award not yet confirmed.</p></div><div><span>2020 — 2023</span><h3>BSc Information Technology</h3><p>Pillai College · Data Science specialisation.</p></div></div>}
         {i===12&&<div className="lv3-buttons lv3-contact-links"><a className="lv3-primary" href="mailto:prathmeshwork01@gmail.com">Email me ↗</a><a href="https://www.linkedin.com/in/prathmesh-pawar-29b5a7228/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a><a href="https://github.com/prathmeeesh" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="/Prathmesh_Pawar_CV.pdf" download>Download CV ↓</a></div>}
         {i===0&&<div className="lv3-buttons"><button type="button" className="lv3-primary" onClick={()=>goto("source")}>Explore the journey ↓</button><button type="button" className="lv3-secondary" onClick={()=>goto("work")}>View my work ↗</button></div>}
         <div className="lv3-tech-caption">{c.code}</div>
       </div>
       <div className="lv3-scene-label" aria-hidden="true"><span>{c.no}</span> {c.name.toUpperCase()}</div>
     </section>)}
   </main>
   <footer className="lv3-footer"><span>PRATHMESH PAWAR · 2026</span><span>FROM CODE TO EXPERIENCE · CONCEPTUAL SCENE, NOT LIVE TELEMETRY</span><button type="button" onClick={()=>goto("origin")}>Back to top ↑</button></footer>
   <div className="lv3-bottom"><span>SCROLL TO TRAVEL · REVERSE TO REWIND</span><span>{paused?"WORLD PAUSED":reduced?"REDUCED MOTION":"WORLD RENDERING ON DEMAND"}</span></div>
   <span className="lv3-sr" aria-live="polite" aria-atomic="true" data-testid="lv3-chapter-announcer">{`Chapter ${CHAPTERS[active].no} of ${CHAPTERS.length}: ${CHAPTERS[active].name}`}</span>
 </div>;
}
