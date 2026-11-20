"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAPTERS, FOLIO_API, FOLIO_CATEGORIES, PROJECTS, searchCatalogue } from "./data";
import { OPENING_SCENES, clamp, measureOpening } from "./opening";
import { SEQUENCES, SequencePlayer, sequenceActive, sequenceOpacity } from "./pipeline";
import "./journey.css";

const World = dynamic(() => import("./World"), { ssr: false });

// Illustrative C# — kept short so it stays readable at every size.
const CODE = [
  [["p", "["], ["t", "ApiController"], ["p", "]"]],
  [["p", "["], ["t", "Route"], ["p", "("], ["s", "\"api/catalogue\""], ["p", ")]"]],
  [["k", "public class "], ["t", "BooksController"], ["p", "("], ["t", "IBookService"], ["n", " service"], ["p", ")"]],
  [["p", "    : "], ["t", "ControllerBase"]],
  [["p", "{"]],
  [["n", "    "], ["p", "["], ["t", "HttpGet"], ["p", "]"]],
  [["k", "    public async "], ["t", "Task"], ["p", "<"], ["t", "IActionResult"], ["p", "> "], ["m", "Search"], ["p", "("]],
  [["n", "        "], ["p", "["], ["t", "FromQuery"], ["p", "] "], ["k", "string"], ["n", " query"], ["p", ")"]],
  [["p", "    {"]],
  [["k", "        var"], ["n", " books = "], ["k", "await "], ["token", "service.SearchAsync(query)"], ["p", ";"]],
  [["k", "        return "], ["m", "Ok"], ["p", "("], ["n", "books"], ["p", ");"]],
  [["p", "    }"]],
  [["p", "}"]],
];
const TOKEN_TEXT = "service.SearchAsync(query)";

function CodeEditor({ decorative = false }) {
  return <div className="cte-editor" aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "Illustrative ASP.NET Core controller code"} role={decorative ? undefined : "figure"}>
    <div className="cte-window-header">
      <span className="cte-window-dots" aria-hidden="true"><i/><i/><i/></span>
      <span className="cte-editor-path">Folio.Api — BooksController.cs</span>
      <span className="cte-editor-lang">C# · illustration</span>
    </div>
    <div className="cte-ide">
      <div className="cte-ide-explorer" aria-hidden="true">
        <span className="cte-ide-heading">EXPLORER</span>
        <span>▾ Folio.Api</span>
        <span className="cte-ide-indent">▾ Controllers</span>
        <span className="cte-ide-indent2 cte-ide-active">BooksController.cs</span>
        <span className="cte-ide-indent">▾ Services</span>
        <span className="cte-ide-indent2">IBookService.cs</span>
        <span className="cte-ide-indent2">BookService.cs</span>
        <span className="cte-ide-indent">▸ Data</span>
        <span className="cte-ide-indent">Program.cs</span>
      </div>
      <div className="cte-ide-main">
        <div className="cte-ide-tabs" aria-hidden="true"><span className="cte-ide-tab-active">BooksController.cs</span><span>BookService.cs</span></div>
        <div className="cte-editor-body">
          <div className="cte-gutter" aria-hidden="true">{CODE.map((_, i) => <span key={i}>{String(i + 1).padStart(2, "0")}</span>)}</div>
          <pre><code>{CODE.map((line, i) => <span className="cte-line" key={i}>{line.map(([kind, text], j) => kind === "token"
            ? <span key={j} className="cte-token">{text}</span>
            : <span key={j} className={`cte-c-${kind}`}>{text}</span>)}{"\n"}</span>)}</code></pre>
        </div>
      </div>
    </div>
    <div className="cte-editor-footer"><span><i className="cte-online"/> main · Editor connected</span><span>Conceptual code · not live source</span></div>
  </div>;
}

function Pipeline({ active }) {
  const phase = ["Commit", "Restore", "Build", "Test", "Publish"];
  return <div className="cte-pipeline" aria-label="Conceptual development pipeline">
    {phase.map((step, i) => <div key={step} className="cte-pipeline-phase">
      <span className="cte-pipeline-index">0{i + 1}</span>
      <strong>{step}</strong>
      <span className="cte-pipeline-indicator" aria-hidden="true">{active ? "✓" : "·"}</span>
    </div>)}
  </div>;
}

function NetworkDiagram() {
  return <div className="cte-network" aria-label="Conceptual ASP.NET Core request flow">
    {[
      ["HTTP", "GET /api/catalogue?search="],
      ["Middleware", "ASP.NET Core pipeline"],
      ["Routing", "catalogue endpoint"],
      ["Controller", "validates the query"],
      ["Service", "catalogue rules"],
      ["EF Core", "parameterised SQL"],
      ["SQL Server", "synthetic records"],
    ].map(([title, sub], i) => <div className="cte-network-node" key={title}>
      <span>{String(i + 1).padStart(2, "0")}</span>
      <strong>{title}</strong>
      <small>{sub}</small>
    </div>)}
  </div>;
}

function Catalogue() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [view, setView] = useState("ui");
  const fieldRef = useRef(null);
  // Text typed before hydration (slow devices) is kept: React adopts whatever is already in the field.
  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (fieldRef.current?.value) setQuery(fieldRef.current.value); });
    return () => cancelAnimationFrame(frame);
  }, []);
  const result = useMemo(() => searchCatalogue({ search: query, category }), [query, category]);
  const request = `GET ${FOLIO_API.search}?${new URLSearchParams({ ...(query.trim() ? { search: query.trim() } : {}), ...(category ? { category } : {}), page: "1", pageSize: "12" })}`;
  return <div className="cte-catalogue" data-testid="cte-catalogue">
    <div className="cte-catalogue-header"><span className="cte-catalogue-mark">F<span>·</span></span><span>Folio / Public catalogue</span><span className="cte-demo-flag">SAMPLE DATA</span></div>
    <div className="cte-assembly" aria-hidden="true">
      <pre className="cte-assembly-json">{`{
  "items": [
    { "id": 7,
      "title": "Building Reliable Web Services",
      "author": "Rhea Calder",
      "category": "Technology" }
  ],
  "total": 1, "page": 1, "pageSize": 12
}`}</pre>
    </div>
    <div className="cte-catalogue-ui">
      <label htmlFor="cte-book-query">Try a catalogue search</label>
      <div className="cte-search-row">
        <input id="cte-book-query" ref={fieldRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles or authors" />
        <span aria-hidden="true">⌕</span>
      </div>
      <div className="cte-chips" role="group" aria-label="Filter by category">
        {["", ...FOLIO_CATEGORIES].map(name => <button type="button" key={name || "all"} aria-pressed={category === name} onClick={() => setCategory(name)}>{name || "All"}</button>)}
      </div>
      <div className="cte-view-toggle" role="group" aria-label="Show the interface or the JSON response">
        <button type="button" aria-pressed={view === "ui"} onClick={() => setView("ui")}>Interface</button>
        <button type="button" aria-pressed={view === "json"} onClick={() => setView("json")}>JSON response</button>
      </div>
      <p className="cte-request-line"><code>{request}</code></p>
      {view === "json"
        ? <pre className="cte-json" data-testid="cte-json" tabIndex={0} aria-label="JSON response">{JSON.stringify(result, null, 2)}</pre>
        : <div className="cte-results" aria-live="polite" tabIndex={0} aria-label="Search results">
          <p className="cte-result-count">{result.total} {result.total === 1 ? "book" : "books"}</p>
          {result.items.length ? result.items.map(book => <div className="cte-book" key={book.id}>
            <div className="cte-book-cover" aria-hidden="true" data-category={book.category}><span>{book.title.slice(0, 1)}</span></div>
            <div><strong>{book.title}</strong><small>{book.author}</small></div>
            <span className="cte-book-category">{book.category}</span>
            <span className="cte-book-status">Available</span>
          </div>) : <p className="cte-no-results">No matching sample titles. Try “reliable” or “Tessa”.</p>}
        </div>}
    </div>
    <div className="cte-catalogue-bottom"><span>Runs in your browser on the demo&apos;s synthetic records, with the same parameters and JSON shape as its API. Not connected to the live database.</span><a href="https://prathmesh-library.runasp.net/" target="_blank" rel="noopener noreferrer">Explore live Folio ↗</a></div>
  </div>;
}

function ProjectGrid() {
  return <div className="cte-projects">{PROJECTS.map((item, i) => <article className="cte-project" key={item.title}>
    <span className="cte-project-index">PROJECT 0{i + 1}</span>
    <h3>{item.title}</h3>
    <p className="cte-project-subtitle">{item.subtitle}</p>
    <p>{item.body}</p>
    <div className="cte-project-actions">
      <a href={item.href} aria-label={`${item.linkText}: ${item.title}`} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}>{item.linkText} ↗</a>
      {item.secondary && <a href={item.secondary} target="_blank" rel="noopener noreferrer">{item.secondaryText} ↗</a>}
    </div>
  </article>)}</div>;
}

function Experience() {
  return <div className="cte-experience-grid">
    <div className="cte-experience-item"><span>COMMERCIAL ENGINEERING</span><strong>Acssel Infotech Pvt. Ltd.</strong><p>Software application development and maintenance across ASP.NET MVC, C#, JavaScript and SQL Server.</p></div>
    <div className="cte-experience-item"><span>POSTGRADUATE STUDY</span><strong>MSc Advanced Computer Science</strong><p>University of Leicester · advanced software engineering, cloud computing and applied AI research.</p></div>
    <div className="cte-experience-item"><span>PRIMARY STACK</span><strong>C# · .NET · SQL · JavaScript</strong><p>Business applications, API design, relational data, full-stack workflows, testing and LLM integrations.</p></div>
  </div>;
}

// Chapter content is static: memoised so a chapter change (rail highlight, announcer) never re-renders
// the whole page. Measured: those re-renders caused 0.2–0.6 s long tasks at chapter boundaries.
const ChapterSections = memo(function ChapterSections({ heroCopyRef, sourceCopyRef }) {
  return <>
    {CHAPTERS.map((chapter, i) => <section key={chapter.id} id={chapter.id} data-cte-step className={`cte-section cte-section-${chapter.id}`} aria-labelledby={`cte-heading-${chapter.id}`}>
      <div className="cte-section-grid">
        <div className="cte-copy" ref={i === 0 ? heroCopyRef : i === 1 ? sourceCopyRef : undefined}>
          <div className="cte-kicker"><span>{chapter.index}</span><i/> {chapter.kicker}</div>
          {i === 0
            ? <h1 id={`cte-heading-${chapter.id}`}>{chapter.heading} <em>{chapter.emphasis}</em></h1>
            : <h2 id={`cte-heading-${chapter.id}`}>{chapter.heading} <em>{chapter.emphasis}</em></h2>}
          <p className="cte-description">{chapter.description}</p>
          {i === 0 && <div className="cte-hero-proof"><span>C# / .NET</span><span>Backend engineering</span><span>Applied AI</span></div>}
          {i === 0 && <div className="cte-actions">
            <a className="cte-button cte-primary" href="#source">Enter the code <span aria-hidden="true">↘</span></a>
            <a className="cte-button cte-secondary" href="#work">Explore my work <span aria-hidden="true">↗</span></a>
            <a className="cte-scroll-cue" href="#work">Skip the film — straight to projects, experience and contact <span aria-hidden="true">→</span></a>
          </div>}
          {i === 2 && <Pipeline active />}
          {i === 5 && <NetworkDiagram />}
          {i === 9 && <ProjectGrid />}
          {i === 10 && <Experience />}
          {i === 11 && <div className="cte-contact-actions"><a className="cte-button cte-primary" href="mailto:prathmeshwork01@gmail.com">Email me ↗</a><a className="cte-button cte-secondary" href="https://linkedin.com/in/prathmesh-pawar-29b5a7228" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a><a className="cte-button cte-secondary" href="https://github.com/prathmeeesh" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a className="cte-button cte-secondary" href="/Prathmesh_Pawar_CV.pdf" download>Download CV ↓</a></div>}
          <div className="cte-note">{chapter.note}</div>
        </div>
        <div className="cte-side">
          {i === 1 && <CodeEditor />}
          {i === 7 && <Catalogue />}
          {i > 1 && i !== 7 && <div className="cte-scene-title" aria-hidden="true"><span>SCENE / {chapter.index}</span><strong>{chapter.label}</strong><span>FROM CODE TO EXPERIENCE</span></div>}
        </div>
      </div>
    </section>)}
  </>;
});

// The WebGL world only depends on stable refs/settings; never re-render it for chapter changes.
const StageWorld = memo(World);
const StageEditor = memo(function StageEditor() { return <CodeEditor decorative />; });

export default function PhotoJourney() {
  const progressRef = useRef(0);
  const photoRef = useRef(null);
  const screenRef = useRef(null);
  const glowRef = useRef(null);
  const sheenRef = useRef(null);
  const packetRef = useRef(null);
  const heroCopyRef = useRef(null);
  const sourceCopyRef = useRef(null);
  const worldLayerRef = useRef(null);
  const sequenceRef = useRef(null);
  const runtimeRef = useRef(null);
  const libraryRef = useRef(null);
  const meterRef = useRef(null);
  const trackRef = useRef(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    const frame = requestAnimationFrame(update);
    mq.addEventListener?.("change", update);
    return () => { cancelAnimationFrame(frame); mq.removeEventListener?.("change", update); };
  }, []);

  // The one scroll director. A single GSAP ScrollTrigger (loaded on demand) reports scroll;
  // measured DOM anchors turn it into chapter progress t; OPENING_SCENES map t to every visual.
  useEffect(() => {
    let anchors = [];
    let lastWorldAlpha = 1;
    let geo = null;
    let trigger = null;
    let observer = null;
    let disposed = false;
    let fallback = null;
    const sections = Array.from(document.querySelectorAll("[data-cte-step]"));
    const siteEl = document.querySelector("[data-testid=code-to-experience]");
    const packet = packetRef.current;
    const refs = {
      photo: photoRef.current,
      img: photoRef.current?.querySelector("img"),
      photoCaption: photoRef.current?.querySelector(".cte-photo-caption"),
      screen: screenRef.current,
      token: screenRef.current?.querySelector(".cte-token"),
      glow: glowRef.current,
      pixels: document.querySelector(".cte-pixels"),
      sheen: sheenRef.current,
      glassBand: screenRef.current?.querySelector(".cte-glass i"),
      sequence: sequenceRef.current,
      catalogue: document.querySelector("[data-testid=cte-catalogue]"),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      dim: document.querySelector(".cte-dim"),
      chapterCopies: sections.map(section => section.querySelector(".cte-copy")),
      heroCopy: heroCopyRef.current,
      sourceCopy: sourceCopyRef.current,
      worldLayer: worldLayerRef.current,
      packet,
      packetLabel: packet?.querySelector(".cte-packet-label"),
      packetCore: packet?.querySelector(".cte-packet-core"),
      packetRing: packet?.querySelector(".cte-packet-ring"),
    };

    // Blender-rendered films: pipeline (Git → CI → data hall), runtime (request → ASP.NET Core → SQL Server → JSON)
    // and library (the Folio screen → the reader). Each loads shortly before it is needed and never under reduced
    // motion; the portrait variant has its own framing.
    const motionOK = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Data saver or a 2G-class connection: skip the films (the page and the lightweight world stay complete).
    const connection = navigator.connection;
    const lowData = Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType || "");
    siteEl?.setAttribute("data-films", !motionOK ? "off-reduced-motion" : lowData ? "off-low-data" : "on");
    const canvases = { pipeline: sequenceRef.current, runtime: runtimeRef.current, library: libraryRef.current };
    const films = motionOK && !lowData ? SEQUENCES.filter(seq => canvases[seq.scene]).map(seq => ({
      seq, canvas: canvases[seq.scene], wanted: false,
      player: new SequencePlayer(canvases[seq.scene], { base: `/cinematic/${seq.scene}` }),
    })) : [];
    const player = films.find(film => film.seq.scene === "pipeline")?.player ?? null;
    const sequenceVariant = () => (window.innerWidth <= 800 ? "mobile" : "desktop");
    const loadFilm = film => film.player.load(sequenceVariant()).catch(() => { /* the film is skipped; the page stays complete */ });
    for (const film of films) {
      film.player.onReady = () => render();
      film.player.onFirstPicture = () => requestAnimationFrame(render);   // reveal the film as soon as it has a frame
    }

    const measure = () => {
      const vh = window.innerHeight;
      anchors = sections.map(section => window.scrollY + section.getBoundingClientRect().top + vh * 0.35);
      geo = measureOpening(refs, window.innerWidth, vh);
      for (const film of films) if (film.wanted) loadFilm(film); // switches variant when crossing the 800 px breakpoint
    };

    const progressAt = (scrollY) => {
      const y = scrollY + window.innerHeight * 0.35;
      if (!anchors.length || y < anchors[0]) return 0;
      for (let i = 0; i < anchors.length - 1; i++) {
        if (y < anchors[i + 1]) return i + clamp((y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]));
      }
      return anchors.length - 1;
    };

    const render = () => {
      const t = progressAt(window.scrollY);
      progressRef.current = t;
      siteEl?.setAttribute("data-progress", t.toFixed(5)); // QA hook: the director's own progress
      const selected = Math.min(CHAPTERS.length - 1, Math.floor(t + 0.3));
      if (selected !== activeRef.current) { activeRef.current = selected; setActive(selected); }
      for (const film of films) {
        // Only the film the visitor stays in (or is about to enter) downloads. A short dwell means a jump, a smooth
        // deep-link scroll or a fast fling across a film's range fetches nothing; settling inside it starts the download.
        const inRange = t > film.seq.load && t < film.seq.fadeOut[1];
        if (!film.wanted && inRange && !film.dwell) {
          film.dwell = setTimeout(() => {
            film.dwell = 0;
            const now = progressRef.current;
            if (!film.wanted && now > film.seq.load && now < film.seq.fadeOut[1]) { film.wanted = true; loadFilm(film); render(); }
          }, 220);
        }
        film.player.resize(window.innerWidth, window.innerHeight);
        const alpha = film.player.ready && film.player.hasPicture ? sequenceOpacity(t, film.seq) : 0;
        film.canvas.style.opacity = alpha.toFixed(3);
        // Prewarm: draw (and decode around) the current frame while still invisible as a film approaches, so the
        // first visible frame is not also the first canvas draw (measured: a 79 ms long task at t 1.53 on mobile).
        if (sequenceActive(t, film.seq)) film.player.seek(t);
        else film.player.release(); // decoded frames are freed off screen; compressed frames stay for a quick return
      }
      const ctx = { refs, geo, vw: window.innerWidth, vh: window.innerHeight, state: {}, sequence: player?.ready ? player : null };
      for (const scene of OPENING_SCENES) scene.seek(t, ctx);
      meterRef.current?.setAttribute("aria-valuenow", String(Math.round((t / (CHAPTERS.length - 1)) * 100)));
      if (trackRef.current) trackRef.current.style.transform = `scaleX(${t / (CHAPTERS.length - 1)})`;
      // Only wake the WebGL world while it is (or was just) visible; hidden, it renders nothing.
      const worldAlpha = ctx.state.worldAlpha ?? 1;
      if (worldAlpha > 0 || lastWorldAlpha > 0) window.dispatchEvent(new Event("cte:progress"));
      lastWorldAlpha = worldAlpha;
    };

    measure();
    render();
    // Deep links (/code-to-experience#about) land on their chapter even though layout settles after hydration
    // (fonts, measured sections); a visitor who has already started scrolling is never moved.
    let userMoved = false;
    const markMoved = () => { userMoved = true; };
    for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(type, markMoved, { once: true, passive: true });
    const deepLink = (force = false) => {
      let id = "";
      try { id = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : ""; } catch { return; }   // malformed %-escape
      const el = id ? document.getElementById(id) : null;
      if (!el?.hasAttribute("data-cte-step") || (userMoved && !force)) return;
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";            // WebKit animates "instant" under a CSS smooth scroll-behavior
      window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top);
      root.style.scrollBehavior = previous;
    };
    deepLink();
    document.fonts?.ready.then(() => { if (!disposed) requestAnimationFrame(() => deepLink()); });
    // Back/forward between chapter URLs: the router does not restore the position, so jump to the chapter.
    const onPop = () => requestAnimationFrame(() => deepLink(true));
    window.addEventListener("popstate", onPop);
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, s]) => {
      if (disposed) return;
      const ScrollTrigger = s.ScrollTrigger;
      g.gsap.registerPlugin(ScrollTrigger);
      trigger = ScrollTrigger.create({
        id: "cte-director", start: 0, end: "max",
        onUpdate: render,
        onRefresh: () => { measure(); render(); },
      });
      document.querySelector("[data-testid=code-to-experience]")?.setAttribute("data-director", "scrolltrigger");
      observer = new ResizeObserver(() => ScrollTrigger.refresh());
      observer.observe(document.getElementById("cte-main"));
      document.fonts?.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    }).catch(() => {
      // GSAP failed to load: keep the page fully usable with a plain rAF-throttled listener.
      let frame = 0;
      fallback = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); }); };
      window.addEventListener("scroll", fallback, { passive: true });
      window.addEventListener("resize", () => { measure(); render(); });
      document.querySelector("[data-testid=code-to-experience]")?.setAttribute("data-director", "fallback");
    });
    return () => {
      disposed = true;
      for (const film of films) { clearTimeout(film.dwell); film.player.dispose(); }
      window.removeEventListener("popstate", onPop);
      trigger?.kill();
      observer?.disconnect();
      if (fallback) window.removeEventListener("scroll", fallback);
    };
  }, []);

  useEffect(() => { window.dispatchEvent(new Event("cte:progress")); }, [paused, quality, reduced]);
  const goTo = useCallback((id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
  }, [reduced]);

  return <div className="cte-site" data-testid="code-to-experience">
    <a className="cte-skip" href="#work">Skip the film — go to projects</a>
    <div className="cte-stage" aria-hidden="true">
      <div className="cte-atmosphere" />
      <canvas className="cte-sequence" ref={sequenceRef} data-testid="cte-sequence" />
      <canvas className="cte-sequence" ref={runtimeRef} data-testid="cte-sequence-runtime" />
      <canvas className="cte-sequence" ref={libraryRef} data-testid="cte-sequence-library" />
      <div className="cte-dim" />
      <div className="cte-world-layer" ref={worldLayerRef}>
        <StageWorld progressRef={progressRef} paused={paused} quality={quality} reduced={reduced} />
      </div>
      <div className="cte-stage-vignette" />
      <div className="cte-stage-grid" />
      <div className="cte-photo" ref={photoRef}>
        <Image src="/code-to-experience/workstation.webp" alt="" fill unoptimized loading="eager" fetchPriority="high" sizes="(max-width: 800px) 100vw, 54vw" className="cte-photo-image" />
        <div className="cte-photo-caption">THE REAL STARTING POINT · A DEVELOPER&apos;S DESK</div>
      </div>
      <div className="cte-screen" ref={screenRef}><span className="cte-screen-glow" ref={glowRef} /><StageEditor /><span className="cte-screen-sheen" ref={sheenRef} /><span className="cte-glass"><i /></span></div>
      <div className="cte-pixels" />
    </div>
    <div className="cte-packet" ref={packetRef} aria-hidden="true">
      <span className="cte-packet-ring" />
      <span className="cte-packet-label">{TOKEN_TEXT}</span>
      <span className="cte-packet-core" />
    </div>
    <header className="cte-header">
      <a href="#studio" className="cte-brand" onClick={event=>{event.preventDefault();goTo("studio");}} >
        <span className="cte-logo" aria-hidden="true">p<span>.</span></span><span>PRATHMESH<br/>PAWAR</span><span className="cte-sr"> — back to beginning</span>
      </a>
      <nav id="cte-main-menu" aria-label="Main navigation" className={menuOpen ? "cte-nav cte-nav-open" : "cte-nav"}>
        <a href="#studio" onClick={()=>setMenuOpen(false)}>Home</a>
        <a href="#source" onClick={()=>setMenuOpen(false)}>The journey</a>
        <a href="#work" onClick={()=>setMenuOpen(false)}>Projects</a>
        <a href="#about" onClick={()=>setMenuOpen(false)}>About</a>
        <a href="#contact" onClick={()=>setMenuOpen(false)}>Contact</a>
        <a href="/Prathmesh_Pawar_CV.pdf" download aria-label="CV, curriculum vitae (PDF)" onClick={()=>setMenuOpen(false)}>CV ↓</a>
      </nav>
      <div className="cte-tools">
        <label className="cte-quality">Quality <select aria-label="3D rendering quality" value={quality} onChange={e=>setQuality(e.target.value)}><option value="auto">Auto</option><option value="low">Light</option><option value="high">High</option></select></label>
        <button type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused ? "Resume 3D" : "Pause 3D"}>{paused ? "Play" : "Pause"}</button>
        <button type="button" className="cte-menu-toggle" aria-expanded={menuOpen} aria-controls="cte-main-menu" onClick={()=>setMenuOpen(value=>!value)}>{menuOpen ? "Close" : "Menu"}</button>
      </div>
    </header>
    <div className="cte-progress" role="progressbar" aria-label="Engineering journey progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} ref={meterRef}><span ref={trackRef} /></div>
    <nav className="cte-rail" aria-label="Jump to a chapter">
      {/* Links, so chapter jumps work before hydration and without JavaScript; JS adds smooth scrolling. */}
      {CHAPTERS.map((chapter, i) => <a key={chapter.id} href={`#${chapter.id}`} className={active === i ? "cte-rail-active" : ""} aria-current={active === i ? "step" : undefined} onClick={event=>{event.preventDefault();goTo(chapter.id);}} aria-label={`Go to ${chapter.label}`} title={chapter.label}><span/></a>)}
    </nav>
    <main id="cte-main" className="cte-main">
      <ChapterSections heroCopyRef={heroCopyRef} sourceCopyRef={sourceCopyRef} />
    </main>
    <footer className="cte-footer"><span>© 2026 PRATHMESH PAWAR</span><span>ENGINEERING OBSERVATORY / CONCEPT STUDY</span><button type="button" onClick={()=>goTo("studio")}>Back to top ↑</button></footer>
    <div className="cte-bottom"><span>SCROLL TO TRAVEL · SCROLL UP TO REWIND</span><span>{reduced ? "REDUCED MOTION" : paused ? "3D PAUSED" : `CHAPTER ${CHAPTERS[active].index} / ${CHAPTERS.length}`}</span></div>
    <div className="cte-sr" aria-live="polite" aria-atomic="true" data-testid="cte-announcer">Chapter {chapterDisplay(active)} of {CHAPTERS.length}: {CHAPTERS[active].label}</div>
  </div>;
}

function chapterDisplay(index) { return String(index + 1).padStart(2, "0"); }
