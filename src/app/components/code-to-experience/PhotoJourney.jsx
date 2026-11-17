"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAPTERS, PROJECTS, SAMPLE_BOOKS } from "./data";
import { HANDOFF_END, HANDOFF_START, PHOTO_SCREEN_QUAD, projectSignal, quadToMatrix3d } from "./journeyPath";
import "./journey.css";

const World = dynamic(() => import("./World"), { ssr: false });
const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const lerpQuad = (qa, qb, t) => qa.map((p, i) => [lerp(p[0], qb[i][0], t), lerp(p[1], qb[i][1], t)]);
const rectQuad = ({ x, y, w, h }) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// Scroll timeline, in chapter units (0 = hero top, 1 = source chapter top).
const TIMELINE = {
  heroFade: [0.08, 0.3],
  heroFadeCompact: [0.02, 0.12], // photo sits directly above the copy on phones
  sourceCopy: [0.8, 0.95], // chapter copy waits until the IDE has left the centre
  screenOn: [0.04, 0.22], // crisp IDE replaces the photographed pixels
  zoom: [0.02, 0.56], // dolly toward the laptop display
  straighten: [0.3, 0.56], // display perspective flattens to face the viewer
  photoFade: [0.44, 0.62],
  dock: [0.66, 0.97], // IDE settles into the source-chapter editor slot
  world: [0.62, 1.3],
  tokenLit: [1.0, 1.1],
  packetIn: [1.06, 1.12],
  packetTravel: [1.14, HANDOFF_START + 0.02],
};

// Illustrative C# — kept short so it stays readable at every size.
const CODE = [
  [["p", "["], ["t", "ApiController"], ["p", "]"]],
  [["p", "["], ["t", "Route"], ["p", "("], ["s", "\"api/books\""], ["p", ")]"]],
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
      ["HTTP", "GET /api/books"],
      ["Routing", "ASP.NET Core"],
      ["Controller", "BooksController"],
      ["Service", "Business logic"],
      ["Database", "Relational records"],
    ].map(([title, sub], i) => <div className="cte-network-node" key={title}>
      <span>{String(i + 1).padStart(2, "0")}</span>
      <strong>{title}</strong>
      <small>{sub}</small>
    </div>)}
  </div>;
}

function Catalogue() {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => SAMPLE_BOOKS.filter(book =>
    [book.title, book.author, book.category].some(value => value.toLowerCase().includes(query.trim().toLowerCase()))
  ), [query]);
  return <div className="cte-catalogue">
    <div className="cte-catalogue-header"><span className="cte-catalogue-mark">F<span>·</span></span><span>Folio / Library catalogue</span><span className="cte-demo-flag">SAMPLE DATA</span></div>
    <label htmlFor="cte-book-query">Try a catalogue search</label>
    <div className="cte-search-row">
      <input id="cte-book-query" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search books or authors" />
      <span aria-hidden="true">⌕</span>
    </div>
    <div className="cte-results" aria-live="polite">
      {matches.length ? matches.map((book) => <div className="cte-book" key={book.title}>
        <div className="cte-book-cover" aria-hidden="true"><span>{book.title.slice(0, 1)}</span></div>
        <div><strong>{book.title}</strong><small>{book.author} · {book.year}</small></div>
        <span className="cte-book-category">{book.category}</span>
      </div>) : <p className="cte-no-results">No matching sample titles. Try “Jane” or “Time”.</p>}
    </div>
    <div className="cte-catalogue-bottom"><span>This UI demonstrates browser rendering; it is not connected to the live Folio database.</span><a href="https://prathmesh-library.runasp.net/" target="_blank" rel="noopener noreferrer">Explore live Folio ↗</a></div>
  </div>;
}

function ProjectGrid() {
  return <div className="cte-projects">{PROJECTS.map((item, i) => <article className="cte-project" key={item.title}>
    <span className="cte-project-index">PROJECT 0{i + 1}</span>
    <h3>{item.title}</h3>
    <p className="cte-project-subtitle">{item.subtitle}</p>
    <p>{item.body}</p>
    <div className="cte-project-actions">
      <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}>{item.linkText} ↗</a>
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

export default function PhotoJourney() {
  const progressRef = useRef(0);
  const photoRef = useRef(null);
  const photoShadowRef = useRef(null);
  const screenRef = useRef(null);
  const glowRef = useRef(null);
  const sheenRef = useRef(null);
  const packetRef = useRef(null);
  const heroCopyRef = useRef(null);
  const sourceCopyRef = useRef(null);
  const slotRef = useRef(null);
  const worldLayerRef = useRef(null);
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

  // The one scroll director: DOM anchors → chapter progress → every visual.
  useEffect(() => {
    let frame = 0;
    let anchors = [];
    let geo = null;
    const sections = Array.from(document.querySelectorAll("[data-cte-step]"));
    const slotToken = () => slotRef.current?.querySelector(".cte-token");

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      anchors = sections.map(section => window.scrollY + section.getBoundingClientRect().top + vh * 0.35);
      const photo = photoRef.current;
      const slot = slotRef.current?.querySelector(".cte-editor");
      if (photo && slot && sections[1]) {
        // Untransformed photo frame (offset* ignores CSS transforms).
        const frameBox = { x: photo.offsetLeft, y: photo.offsetTop, w: photo.offsetWidth, h: photo.offsetHeight };
        if (photoShadowRef.current) {
          Object.assign(photoShadowRef.current.style, { left: `${frameBox.x}px`, top: `${frameBox.y}px`, width: `${frameBox.w}px`, height: `${frameBox.h}px`, borderRadius: getComputedStyle(photo).borderRadius });
        }
        const quad = PHOTO_SCREEN_QUAD.map(([u, v]) => [frameBox.x + u * frameBox.w, frameBox.y + v * frameBox.h]);
        const screenW = ((quad[1][0] - quad[0][0]) + (quad[2][0] - quad[3][0])) / 2;
        const screenH = ((quad[3][1] - quad[0][1]) + (quad[2][1] - quad[1][1])) / 2;
        const center = quad.reduce((acc, p) => [acc[0] + p[0] / 4, acc[1] + p[1] / 4], [0, 0]);
        // "Inside the screen" frame: largest display-shaped rect between header and status bar.
        const compact = vw <= 800;
        const top = compact ? 76 : 80;
        const bottom = compact ? 44 : 40;
        const availW = vw * (compact ? 1 : 0.94);
        const availH = (vh - top - bottom) * 0.97;
        const aspect = screenW / screenH;
        const fullW = Math.min(availW, availH * aspect);
        const fullH = fullW / aspect;
        const full = { x: (vw - fullW) / 2, y: top + (vh - top - bottom - fullH) / 2, w: fullW, h: fullH };
        const S = fullW / screenW;
        const target = [full.x + fullW / 2, full.y + fullH / 2];
        // Dolly toward a fixed point F: centre(s) = F + s·(centre − F) lands on target at s = S.
        const focus = [(target[0] - S * center[0]) / (1 - S), (target[1] - S * center[1]) / (1 - S)];
        // Editor slot as it sits when the source chapter reaches the top (t = 1).
        const slotBox = slot.getBoundingClientRect();
        const sectionTop = sections[1].getBoundingClientRect().top;
        const dock = { x: slotBox.left, y: slotBox.top - sectionTop, w: slotBox.width, h: slotBox.height };
        geo = { frameBox, quad, S, focus, full, dock };
        if (screenRef.current) {
          screenRef.current.style.width = `${dock.w}px`;
          screenRef.current.style.height = `${dock.h}px`;
        }
        const token = slotToken();
        if (token && packetRef.current) packetRef.current.style.fontSize = getComputedStyle(token).fontSize;
      }
      schedule();
    };

    const paint = () => {
      frame = 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const y = window.scrollY + vh * 0.35;
      let t = 0;
      if (anchors.length) {
        if (y >= anchors[anchors.length - 1]) t = anchors.length - 1;
        else {
          for (let i = 0; i < anchors.length - 1; i++) {
            if (y >= anchors[i] && y < anchors[i + 1]) {
              t = i + clamp((y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]));
              break;
            }
          }
        }
      }
      progressRef.current = t;
      const selected = Math.min(CHAPTERS.length - 1, Math.floor(t + 0.3));
      if (selected !== activeRef.current) { activeRef.current = selected; setActive(selected); }
      const T = TIMELINE;

      // Read layout before writing styles.
      const token = slotToken();
      const tokenBox = t >= 1 && t < HANDOFF_END + 0.05 && token ? token.getBoundingClientRect() : null;

      const compact = vw <= 800;
      if (heroCopyRef.current) heroCopyRef.current.style.opacity = String(1 - smooth(...(compact ? T.heroFadeCompact : T.heroFade), t));
      if (sourceCopyRef.current) sourceCopyRef.current.style.opacity = String(smooth(...T.sourceCopy, t));

      if (geo) {
        const zoom = smooth(...T.zoom, t);
        const s = Math.pow(geo.S, zoom);
        const { frameBox, focus } = geo;
        const photoAlpha = 1 - smooth(...T.photoFade, t);
        if (photoRef.current) {
          const photo = photoRef.current;
          photo.style.transformOrigin = `${focus[0] - frameBox.x}px ${focus[1] - frameBox.y}px`;
          photo.style.transform = `scale(${s})`;
          photo.style.opacity = String(photoAlpha);
          photo.style.visibility = photoAlpha < 0.001 ? "hidden" : "visible";
        }
        if (photoShadowRef.current) photoShadowRef.current.style.opacity = (1 - smooth(0, 0.1, t)).toFixed(3);
        // Crisp IDE surface: glued to the photographed display, then straightened, then docked.
        if (screenRef.current) {
          const el = screenRef.current;
          const docked = t >= 1;
          const tracked = geo.quad.map(([x, yy]) => [focus[0] + s * (x - focus[0]), focus[1] + s * (yy - focus[1])]);
          const straight = lerpQuad(tracked, rectQuad(geo.full), smooth(...T.straighten, t));
          const dest = lerpQuad(straight, rectQuad(geo.dock), smooth(...T.dock, t));
          const on = smooth(...T.screenOn, t);
          el.style.transform = quadToMatrix3d(geo.dock.w, geo.dock.h, dest);
          el.style.opacity = String(docked ? 0 : on);
          // Display glow peaks while the screen is the light source of the scene.
          if (sheenRef.current) sheenRef.current.style.opacity = (1 - smooth(...T.straighten, t)).toFixed(3);
          if (glowRef.current) glowRef.current.style.opacity = (smooth(0.04, 0.3, t) * (1 - smooth(0.5, 0.9, t))).toFixed(3);
          const slotEditor = slotRef.current?.querySelector(".cte-editor");
          if (slotEditor) slotEditor.style.opacity = docked ? "1" : "0";
        }
      }

      // The code artifact: a token lifts out of the editor and becomes the 3D signal.
      if (token) {
        const lifted = t >= T.packetIn[0] && t < HANDOFF_END + 0.05;
        token.dataset.state = lifted ? "lifted" : t >= T.tokenLit[0] && t < HANDOFF_END + 0.05 ? "lit" : "";
      }
      if (packetRef.current) {
        const el = packetRef.current;
        const alpha = smooth(...T.packetIn, t) * (1 - smooth(HANDOFF_START, HANDOFF_END, t));
        if (tokenBox && alpha > 0.001) {
          const u = smooth(...T.packetTravel, t);
          const start = [tokenBox.left + tokenBox.width / 2, tokenBox.top + tokenBox.height / 2];
          const target = projectSignal(Math.min(t, HANDOFF_END), vw, vh) ?? { x: vw / 2, y: vh / 2 };
          const end = [target.x, target.y];
          const ctrl = [lerp(start[0], end[0], 0.15), Math.min(start[1], end[1]) - vh * 0.16];
          const x = (1 - u) ** 2 * start[0] + 2 * (1 - u) * u * ctrl[0] + u * u * end[0];
          const yy = (1 - u) ** 2 * start[1] + 2 * (1 - u) * u * ctrl[1] + u * u * end[1];
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, 0)`;
          el.style.opacity = alpha.toFixed(3);
          el.style.setProperty("--cte-label", (1 - smooth(1.26, 1.46, t)).toFixed(3));
          el.style.setProperty("--cte-core", smooth(1.2, 1.42, t).toFixed(3));
        } else {
          el.style.opacity = "0";
        }
      }

      if (worldLayerRef.current) worldLayerRef.current.style.opacity = String(smooth(...T.world, t));
      if (meterRef.current) meterRef.current.setAttribute("aria-valuenow", String(Math.round((t / (CHAPTERS.length - 1)) * 100)));
      if (trackRef.current) trackRef.current.style.transform = `scaleX(${t / (CHAPTERS.length - 1)})`;
      window.dispatchEvent(new Event("cte:progress"));
    };
    const schedule = () => { if (frame) return; frame = requestAnimationFrame(paint); };
    measure();
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.getElementById("cte-main"));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => { window.dispatchEvent(new Event("cte:progress")); }, [paused, quality, reduced]);
  const goTo = useCallback((id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
  }, [reduced]);

  return <div className="cte-site" data-testid="code-to-experience">
    <a className="cte-skip" href="#studio">Skip to content</a>
    <div className="cte-stage" aria-hidden="true">
      <div className="cte-atmosphere" />
      <div className="cte-world-layer" ref={worldLayerRef}>
        <World progressRef={progressRef} paused={paused} quality={quality} reduced={reduced} />
      </div>
      <div className="cte-stage-vignette" />
      <div className="cte-stage-grid" />
      <span className="cte-photo-shadow" ref={photoShadowRef} />
      <div className="cte-photo" ref={photoRef}>
        <Image src="/code-to-experience/workstation.webp" alt="" fill unoptimized loading="eager" fetchPriority="high" sizes="(max-width: 800px) 70vw, 40vw" className="cte-photo-image" />
        <div className="cte-photo-caption">THE REAL STARTING POINT · A DEVELOPER&apos;S DESK</div>
      </div>
      <div className="cte-screen" ref={screenRef}><span className="cte-screen-glow" ref={glowRef} /><CodeEditor decorative /><span className="cte-screen-sheen" ref={sheenRef} /></div>
    </div>
    <div className="cte-packet" ref={packetRef} aria-hidden="true">
      <span className="cte-packet-label">{TOKEN_TEXT}</span>
      <span className="cte-packet-core" />
    </div>
    <header className="cte-header">
      <a href="#studio" className="cte-brand" onClick={event=>{event.preventDefault();goTo("studio");}} aria-label="Prathmesh Pawar — back to beginning">
        <span className="cte-logo">p<span>.</span></span><span>PRATHMESH<br/>PAWAR</span>
      </a>
      <nav id="cte-main-menu" aria-label="Main navigation" className={menuOpen ? "cte-nav cte-nav-open" : "cte-nav"}>
        <a href="#studio" onClick={()=>setMenuOpen(false)}>Home</a>
        <a href="#source" onClick={()=>setMenuOpen(false)}>The journey</a>
        <a href="#work" onClick={()=>setMenuOpen(false)}>Projects</a>
        <a href="#about" onClick={()=>setMenuOpen(false)}>About</a>
        <a href="#contact" onClick={()=>setMenuOpen(false)}>Contact</a>
      </nav>
      <div className="cte-tools">
        <label className="cte-quality">Quality <select aria-label="3D rendering quality" value={quality} onChange={e=>setQuality(e.target.value)}><option value="auto">Auto</option><option value="low">Light</option><option value="high">High</option></select></label>
        <button type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused ? "Resume 3D" : "Pause 3D"}>{paused ? "Play" : "Pause"}</button>
        <button type="button" className="cte-menu-toggle" aria-expanded={menuOpen} aria-controls="cte-main-menu" onClick={()=>setMenuOpen(value=>!value)}>{menuOpen ? "Close" : "Menu"}</button>
      </div>
    </header>
    <div className="cte-progress" role="progressbar" aria-label="Engineering journey progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} ref={meterRef}><span ref={trackRef} /></div>
    <div className="cte-rail" aria-label="Jump to a chapter">
      {CHAPTERS.map((chapter, i) => <button type="button" key={chapter.id} className={active === i ? "cte-rail-active" : ""} onClick={()=>goTo(chapter.id)} aria-label={`Go to ${chapter.label}`} title={chapter.label}><span/></button>)}
    </div>
    <main id="cte-main" className="cte-main">
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
              <a className="cte-button cte-primary" href="#work">View selected work <span aria-hidden="true">↘</span></a>
              <a className="cte-button cte-secondary" href="/Prathmesh_Pawar_CV.pdf" download>Get my CV ↓</a>
              <a className="cte-scroll-cue" href="#source">Or scroll to enter the code <span aria-hidden="true">↓</span></a>
            </div>}
            {i === 2 && <Pipeline active />}
            {i === 5 && <NetworkDiagram />}
            {i === 8 && <ProjectGrid />}
            {i === 9 && <Experience />}
            {i === 10 && <div className="cte-contact-actions"><a className="cte-button cte-primary" href="mailto:prathmeshwork01@gmail.com">Email me ↗</a><a className="cte-button cte-secondary" href="https://linkedin.com/in/prathmesh-pawar-29b5a7228" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a><a className="cte-button cte-secondary" href="https://github.com/prathmeeesh" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a className="cte-button cte-secondary" href="/Prathmesh_Pawar_CV.pdf" download>Download CV ↓</a></div>}
            <div className="cte-note">{chapter.note}</div>
          </div>
          <div className="cte-side" ref={i === 1 ? slotRef : undefined}>
            {i === 1 && <CodeEditor />}
            {i === 7 && <Catalogue />}
            {i > 1 && i !== 7 && <div className="cte-scene-title" aria-hidden="true"><span>SCENE / {chapter.index}</span><strong>{chapter.label}</strong><span>FROM CODE TO EXPERIENCE</span></div>}
          </div>
        </div>
      </section>)}
    </main>
    <footer className="cte-footer"><span>© 2026 PRATHMESH PAWAR</span><span>ENGINEERING OBSERVATORY / CONCEPT STUDY</span><button type="button" onClick={()=>goTo("studio")}>Back to top ↑</button></footer>
    <div className="cte-bottom"><span>SCROLL TO TRAVEL · SCROLL UP TO REWIND</span><span>{reduced ? "REDUCED MOTION" : paused ? "3D PAUSED" : `CHAPTER ${CHAPTERS[active].index} / ${CHAPTERS.length}`}</span></div>
    <div className="cte-sr" aria-live="polite" aria-atomic="true" data-testid="cte-announcer">Chapter {chapterDisplay(active)} of {CHAPTERS.length}: {CHAPTERS[active].label}</div>
  </div>;
}

function chapterDisplay(index) { return String(index + 1).padStart(2, "0"); }
