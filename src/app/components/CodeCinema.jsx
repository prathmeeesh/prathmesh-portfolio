"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useMotionPreference } from "./MotionProvider";
import styles from "./CodeCinema.module.css";

/**
 * A purely illustrative software-delivery and request/response journey.
 * No backend calls are made by this animation; code and data are examples.
 * Scroll position is the animation clock: reverse scrolling rewinds the story.
 */
const CHAPTERS = [
  {
    label: "01 / IDE",
    title: "An idea becomes code.",
    explanation: "A developer turns a product requirement into readable source files, components and services.",
    snippet: ["// BookSearchService.cs", "public Task<List<Book>> SearchAsync(", "    string query) => repository.Find(query);"],
    packet: "SOURCE",
  },
  {
    label: "02 / GIT",
    title: "The change gets a history.",
    explanation: "Changes are reviewed and committed to a repository. A commit records which source version is being built.",
    snippet: ["git status", "git add src tests", "git commit -m \"feat: book search\""],
    packet: "COMMIT",
  },
  {
    label: "03 / CI",
    title: "Machines check the work.",
    explanation: "Automated checks build the application and run tests. A failed check blocks the release.",
    snippet: ["dotnet restore", "dotnet test", "dotnet publish -c Release"],
    packet: "BUILD",
  },
  {
    label: "04 / DEPLOY",
    title: "The application goes live.",
    explanation: "Reviewed build outputs are deployed to hosting. The running application is ready to accept requests.",
    snippet: ["RELEASE: verified", "HOST: application server", "HEALTH: ready"],
    packet: "RELEASE",
  },
  {
    label: "05 / FRONTEND",
    title: "A real person makes a request.",
    explanation: "An accessible search interface captures the query. The browser sends it to the server over HTTPS.",
    snippet: ["User searches: 'architecture'", "GET /api/books?q=architecture", "Accept: application/json"],
    packet: "REQUEST",
  },
  {
    label: "06 / BACKEND",
    title: "The .NET API receives it.",
    explanation: "The controller validates the request, applies authorisation and asks a service to perform the work.",
    snippet: ["GET /api/books", "BooksController -> SearchService", "SearchService -> Repository"],
    packet: "QUERY",
  },
  {
    label: "07 / DATABASE",
    title: "Data becomes a response.",
    explanation: "The repository queries the database. The server shapes the results into an HTTP response.",
    snippet: ["SELECT ... FROM Books", "WHERE Title LIKE @query", "200 OK  |  application/json"],
    packet: "JSON",
  },
  {
    label: "08 / EXPERIENCE",
    title: "The user sees the result.",
    explanation: "The frontend renders understandable results. All the engineering disappears behind a useful interface.",
    snippet: ["Response received: 3 books", "Render accessible result cards", "User experience: complete"],
    packet: "UI",
  },
];

const clamp = (v) => Math.min(1, Math.max(0, v));

function Ink({ children, local, className = "" }) {
  const reveal = useTransform(local, [0, 0.85], [0.12, 1]);
  const y = useTransform(local, [0, 1], [22, 0]);
  return (
    <motion.g className={className} style={{ opacity: reveal, y }}>
      {children}
    </motion.g>
  );
}

function Screen({ x, y, width = 240, height = 145, children }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="15" fill="#112333" stroke="#5ad7dc" strokeWidth="2" />
      <rect x={x + 10} y={y + 12} width={width - 20} height={height - 25} rx="8" fill="#071521" />
      <circle cx={x + 25} cy={y + 27} r="4" fill="#ee9fa8" />
      <circle cx={x + 38} cy={y + 27} r="4" fill="#e8c67b" />
      <circle cx={x + 51} cy={y + 27} r="4" fill="#77d9bd" />
      {children}
    </g>
  );
}

function Drawing({ index, local }) {
  const lineProgress = useTransform(local, [0, 1], [0, 1]);
  const glow = useTransform(local, [0, 0.55, 1], [0.28, 0.7, 1]);
  const movement = useTransform(local, [0, 1], [-46, 40]);
  return (
    <svg viewBox="0 0 720 470" className={styles.illustration} role="img" aria-label={CHAPTERS[index].title}>
      <defs>
        <linearGradient id={`floor-${index}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0c2736" />
          <stop offset="1" stopColor="#142137" />
        </linearGradient>
      </defs>
      <ellipse cx="355" cy="399" rx="295" ry="37" fill="#3d7b95" opacity="0.18" />
      <path d="M64 361 L358 256 L661 360 L362 453Z" fill={`url(#floor-${index})`} stroke="#44788d" strokeOpacity="0.48" />
      <path d="M67 361 L360 450 L660 360" fill="none" stroke="#87e6e6" strokeOpacity=".21" strokeDasharray="6 8" />

      {index === 0 && (
        <>
          <Ink local={local}>
            <rect x="250" y="286" width="325" height="24" rx="8" fill="#36546c" />
            <path d="M277 302 V387 M544 302 V384" stroke="#52677b" strokeWidth="11" />
            <Screen x={303} y={111} width={244} height={171}>
              <path d="M330 167 H479" stroke="#7ce6df" strokeWidth="8" strokeLinecap="round" />
              <path d="M330 190 H435 M330 213 H493 M330 236 H405" stroke="#a89ded" strokeWidth="7" strokeLinecap="round" strokeOpacity=".6" />
            </Screen>
            <path d="M415 284 V298 H436" stroke="#9dbcc8" strokeWidth="9" />
            <rect x="337" y="297" width="175" height="10" rx="5" fill="#9ab5cb" />
          </Ink>
          <Ink local={local}>
            <ellipse cx="162" cy="360" rx="78" ry="18" fill="#1a394a" />
            <path d="M111 276 Q165 246 219 280 L237 377 H100Z" fill="#2f8095" stroke="#7bd2db" strokeWidth="3" />
            <circle cx="164" cy="211" r="47" fill="#e5b99c" />
            <path d="M120 202 Q120 149 166 152 Q214 154 211 198 L189 177 L152 181Z" fill="#1e293e" />
            <path d="M145 219 h16 m15 0 h16" stroke="#233143" strokeWidth="3" strokeLinecap="round" />
            <path d="M219 300 Q263 309 293 294" fill="none" stroke="#e5b99c" strokeWidth="18" strokeLinecap="round" />
            <circle cx="296" cy="291" r="10" fill="#e5b99c" />
          </Ink>
          <motion.g style={{ opacity: glow }}>
            <rect x="487" y="46" width="150" height="63" rx="11" fill="#0b283b" stroke="#7ce6df" />
            <text x="508" y="71" fontSize="14" fill="#95f6e6" fontFamily="monospace">BookService.cs</text>
            <text x="508" y="90" fontSize="10" fill="#abb9e6" fontFamily="monospace">search(query)</text>
          </motion.g>
        </>
      )}
      {index === 1 && (
        <>
          <Ink local={local}>
            <path d="M145 282 V138 H442 L491 179 V330 H145Z" fill="#19364b" stroke="#8bdfeb" strokeWidth="3" />
            <path d="M145 139 H235 L256 160 H442" fill="none" stroke="#8bdfeb" strokeWidth="5" />
            <text x="186" y="205" fill="#dcf8f6" fontFamily="monospace" fontSize="25">repo/</text>
            <text x="186" y="245" fill="#91b3ca" fontFamily="monospace" fontSize="18">src/</text>
            <text x="186" y="279" fill="#91b3ca" fontFamily="monospace" fontSize="18">tests/</text>
          </Ink>
          <motion.path d="M421 276 C489 269 486 185 545 183 S623 198 629 144" stroke="#a9f7e7" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 11" fill="none" style={{ pathLength: lineProgress }} />
          <g fill="#a3eedf" stroke="#102c3b" strokeWidth="4">
            <circle cx="420" cy="276" r="13" /><circle cx="547" cy="183" r="13" /><circle cx="629" cy="144" r="13" />
          </g>
          <Ink local={local}>
            <rect x="458" y="292" width="178" height="55" rx="10" fill="#14263a" stroke="#c0a6ff" />
            <text x="475" y="325" fill="#e9deff" fontSize="17" fontFamily="monospace">commit a1b2c3</text>
          </Ink>
        </>
      )}
      {index === 2 && (
        <>
          <Ink local={local}>
            <rect x="91" y="137" width="515" height="210" rx="19" fill="#0d2232" stroke="#4f829c" strokeWidth="3" />
            <rect x="103" y="145" width="490" height="32" rx="7" fill="#223b53" />
            <text x="125" y="168" fill="#b7e4ef" fontSize="18" fontFamily="monospace">CI / PIPELINE</text>
          </Ink>
          {["RESTORE", "TEST", "PUBLISH"].map((t, i) => (
            <g key={t}>
              <rect x={130 + i * 154} y="212" width="119" height="86" rx="13" fill="#142b3e" stroke="#83d6de" strokeOpacity=".85" />
              <text x={150 + i * 154} y="247" fill="#e6f8f8" fontSize="14" fontFamily="monospace">{t}</text>
              <motion.path d={`M${153 + i * 154} 265 l13 13 l24 -27`} fill="none" stroke="#85e8bd" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: lineProgress }} />
            </g>
          ))}
          <motion.path d="M226 256 H278 M380 256 H433" stroke="#c7abff" strokeWidth="4" fill="none" style={{ pathLength: lineProgress }} />
          <Ink local={local}>
            <rect x="211" y="367" width="281" height="28" rx="12" fill="#154d47" />
            <text x="257" y="386" fontSize="13" fill="#9af8cd" fontFamily="monospace">ALL CHECKS PASSED</text>
          </Ink>
        </>
      )}
      {index === 3 && (
        <>
          <Ink local={local}>
            <path d="M184 208 Q158 163 213 142 Q248 98 306 137 Q370 105 408 168 Q477 175 471 229 Q471 275 416 281 H208 Q155 271 184 208Z" fill="#21364c" stroke="#80dfe6" strokeWidth="4" />
            <text x="246" y="215" fill="#d1eff5" fontFamily="monospace" fontSize="22">RELEASE</text>
          </Ink>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="455" y={175 + i * 58} width="154" height="48" rx="9" fill="#182c40" stroke="#8db5cd" />
              <rect x="476" y={194 + i * 58} width="67" height="8" rx="4" fill="#829bb2" />
              <circle cx="573" cy={199 + i * 58} r="7" fill="#8cf5c8" />
            </g>
          ))}
          <motion.path d="M381 247 H455" stroke="#8bf3dd" strokeWidth="6" strokeDasharray="9 8" style={{ pathLength: lineProgress }} />
          <Ink local={local}>
            <rect x="190" y="335" width="330" height="43" rx="11" fill="#103a38" stroke="#6fc9bb" />
            <text x="228" y="361" fill="#99f8d5" fontSize="15" fontFamily="monospace">https://app.example.test</text>
          </Ink>
        </>
      )}
      {index === 4 && (
        <>
          <Ink local={local}>
            <Screen x={117} y={107} width={406} height={256}>
              <rect x="140" y="160" width="351" height="37" rx="8" fill="#1b3447" />
              <text x="158" y="185" fill="#bcd4e5" fontFamily="monospace" fontSize="16">Search books...</text>
              <rect x="141" y="224" width="167" height="79" rx="10" fill="#24374c" />
              <rect x="328" y="224" width="163" height="79" rx="10" fill="#24374c" />
              <rect x="155" y="237" width="48" height="53" rx="5" fill="#9a8ec8" />
              <rect x="341" y="237" width="48" height="53" rx="5" fill="#81c3a9" />
            </Screen>
            <path d="M319 363 l-35 41 h180 l-35 -41" fill="#345169" />
          </Ink>
          <motion.g style={{ x: movement }}>
            <path d="M510 169 l29 76 -20 -12 -13 29 -18 -8 13 -27 -21 0Z" fill="#f5e6b7" stroke="#4b596a" strokeWidth="5" />
          </motion.g>
          <motion.circle cx="505" cy="205" r="25" fill="none" stroke="#a9f7df" strokeWidth="4" style={{ opacity: glow }} />
          <Ink local={local}>
            <rect x="211" y="48" width="229" height="45" rx="12" fill="#13293b" stroke="#a6e5e7" />
            <text x="227" y="77" fill="#d7f4f4" fontFamily="monospace" fontSize="16">GET /api/books</text>
          </Ink>
        </>
      )}
      {index === 5 && (
        <>
          <Ink local={local}>
            <rect x="137" y="98" width="448" height="286" rx="18" fill="#0e2234" stroke="#72cddc" strokeWidth="3" />
            <rect x="137" y="98" width="448" height="42" rx="18" fill="#25465a" />
            <text x="169" y="125" fill="#d8f6f1" fontFamily="monospace" fontSize="20">ASP.NET Core API</text>
          </Ink>
          {["Controller", "Service", "Repository"].map((t, i) => (
            <g key={t}>
              <rect x={174 + i * 138} y="207" width="118" height="95" rx="13" fill="#22364d" stroke="#a0d8e7" />
              <text x={183 + i * 138} y="246" fontSize="13" fill="#dce9fc" fontFamily="monospace">{t}</text>
              <circle cx={233 + i * 138} cy="272" r="9" fill="#99f2df" />
            </g>
          ))}
          <motion.path d="M292 255 H312 M432 255 H448" stroke="#ccafff" strokeWidth="5" strokeLinecap="round" style={{ pathLength: lineProgress }} />
          <Ink local={local}>
            <rect x="229" y="326" width="273" height="37" rx="12" fill="#173f3b" />
            <text x="243" y="350" fill="#aff7dc" fontFamily="monospace" fontSize="15">authorise → validate → execute</text>
          </Ink>
        </>
      )}
      {index === 6 && (
        <>
          <Ink local={local}>
            <ellipse cx="350" cy="166" rx="171" ry="43" fill="#3f7a9a" stroke="#96e3ef" strokeWidth="3" />
            <path d="M179 166 V340 Q180 399 351 394 Q521 393 521 340 V166" fill="#19425a" stroke="#96e3ef" strokeWidth="3" />
            <ellipse cx="350" cy="253" rx="171" ry="40" fill="none" stroke="#69bdd1" strokeWidth="3" />
            <ellipse cx="350" cy="338" rx="171" ry="40" fill="none" stroke="#69bdd1" strokeWidth="3" />
            <text x="276" y="177" fill="#e6fbf8" fontSize="24" fontFamily="monospace">SQL DATA</text>
          </Ink>
          <motion.path d="M350 72 V125" stroke="#b1ffe8" strokeWidth="6" strokeDasharray="9 9" style={{ pathLength: lineProgress }} />
          <Ink local={local}>
            <rect x="523" y="232" width="146" height="84" rx="12" fill="#17283f" stroke="#bfaeff" />
            <text x="545" y="262" fontFamily="monospace" fontSize="18" fill="#dfd8ff">200 OK</text>
            <text x="545" y="292" fontFamily="monospace" fontSize="15" fill="#b6aeea">{"{ books: 3 }"}</text>
          </Ink>
        </>
      )}
      {index === 7 && (
        <>
          <Ink local={local}>
            <Screen x={97} y={76} width={535} height={313}>
              <rect x="128" y="124" width="474" height="47" rx="11" fill="#1c3447" />
              <text x="155" y="154" fontFamily="monospace" fill="#c8f6ee" fontSize="21">Books matching your search</text>
              {[0,1,2].map((i) => (
                <g key={i}>
                  <rect x={128 + i * 161} y="194" width="149" height="150" rx="12" fill="#1e394d" stroke="#4d7e92" />
                  <rect x={145 + i * 161} y="210" width="64" height="89" rx="5" fill={["#7ed7c2", "#b8a6db", "#d2b38e"][i]} />
                  <path d={`M${145 + i * 161} 303 h114`} stroke="#83a6b7" strokeWidth="5" />
                  <path d={`M${145 + i * 161} 316 h84`} stroke="#637d92" strokeWidth="5" />
                </g>
              ))}
            </Screen>
            <path d="M280 389 L256 415 H460 L429 389" fill="#3a5e77" />
          </Ink>
          <motion.g style={{ opacity: glow }}>
            <circle cx="614" cy="102" r="38" fill="#18483e" stroke="#8ef4d2" strokeWidth="4" />
            <path d="M594 104 l16 17 28 -34" stroke="#b3f9dc" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        </>
      )}
    </svg>
  );
}

function Frame({ item, index, progress, isActive, paused }) {
  // Smooth, scroll-linked sub-animation within each chapter; no autoplay timer.
  const local = useTransform(progress, (p) => {
    const position = p * (CHAPTERS.length - 1);
    return clamp(position - index + 0.5);
  });
  const codeReveal = useTransform(local, [0, 1], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  return (
    <article className={styles.frame} aria-hidden={!paused && !isActive} aria-label={`${item.label}: ${item.title}`}>
      <div className={styles.frameContent}>
        <div className={styles.sceneArt}><Drawing index={index} local={local} /></div>
        <div className={styles.sceneText}>
          <p className={styles.eyebrow}>{item.label}</p>
          <h3>{item.title}</h3>
          <p>{item.explanation}</p>
          <div className={styles.terminal} aria-label="Illustrative code">
            <div className={styles.terminalTop}><span/><span/><span/><b>illustrative / not live telemetry</b></div>
            <motion.pre style={{ clipPath: codeReveal }}>{item.snippet.join("\n")}</motion.pre>
          </div>
        </div>
      </div>
      <div className={styles.stageNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
    </article>
  );
}

export default function CodeCinema() {
  const sectionRef = useRef(null);
  const { paused } = useMotionPreference();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const cameraX = useTransform(scrollYProgress, [0, 1], ["0vw", `-${(CHAPTERS.length - 1) * 100}vw`]);
  const orbX = useTransform(scrollYProgress, [0, 1], ["6vw", `${(CHAPTERS.length - 1) * 100 + 88}vw`]);
  const barScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  // The cartoon courier's walking pose is also scrubbed by scroll position.
  const stride = useTransform(scrollYProgress, (p) => Math.sin(p * Math.PI * 58) * 15);
  const oppositeStride = useTransform(stride, (v) => -v);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(CHAPTERS.length - 1, Math.max(0, Math.round(p * (CHAPTERS.length - 1))));
    setActive((previous) => (previous === next ? previous : next));
  });

  const goTo = (index) => {
    const section = sectionRef.current;
    if (!section) return;
    if (paused) {
      section.querySelector(`#code-cinema-${index}`)?.scrollIntoView({ behavior: "auto", block: "start" });
      return;
    }
    const top = section.getBoundingClientRect().top + window.scrollY;
    const travel = section.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (index / (CHAPTERS.length - 1)) * travel, behavior: "smooth" });
  };

  return (
    <section ref={sectionRef} id="code-cinema" className={styles.story} data-static={paused ? "true" : "false"} aria-label="From code to experience animated story">
      <div className={styles.sticky}>
        <header className={styles.storyHeader}>
          <div><p className={styles.small}>{paused ? "THE ENGINEERING STORY / STATIC MODE" : "THE ENGINEERING STORY / SCROLL TO PLAY"}</p><h2>From code to <em>experience.</em></h2></div>
          <a href="#projects" className={styles.skip}>Skip story → Projects</a>
        </header>
        <div className={styles.viewport}>
          <motion.div className={styles.world} style={{ x: paused ? "0vw" : cameraX }}>
            {CHAPTERS.map((item, index) => (
              <div id={`code-cinema-${index}`} className={styles.frameAnchor} key={item.label}>
                <Frame item={item} index={index} progress={scrollYProgress} isActive={active === index} paused={paused} />
              </div>
            ))}
            {!paused && (
              <motion.div
                className={active < 4 ? styles.courier : styles.packet}
                style={{ x: orbX }}
                aria-hidden="true"
              >
                {active < 4 ? (
                  <svg viewBox="0 0 100 115" width="100" height="115" role="presentation">
                    <ellipse cx="48" cy="105" rx="34" ry="6" fill="#7df9e8" opacity=".22" />
                    <motion.path d="M42 74 L30 101" stroke="#a4d9e0" strokeWidth="10" strokeLinecap="round"
                      style={{ rotate: stride, transformOrigin: "43px 76px" }} />
                    <motion.path d="M58 74 L72 101" stroke="#a4d9e0" strokeWidth="10" strokeLinecap="round"
                      style={{ rotate: oppositeStride, transformOrigin: "57px 76px" }} />
                    <path d="M25 48 Q50 35 76 49 L70 81 L32 81Z" fill="#367d94" stroke="#88e3e1" strokeWidth="3" />
                    <circle cx="50" cy="25" r="21" fill="#e4bda0" />
                    <path d="M29 22 Q30 0 53 3 Q72 5 70 24 L57 13 L38 15Z" fill="#202b43" />
                    <path d="M42 28 h5 m10 0 h5" stroke="#26364a" strokeWidth="3" strokeLinecap="round" />
                    <path d="M68 52 L82 66" stroke="#e4bda0" strokeWidth="9" strokeLinecap="round" />
                    <rect x="65" y="59" width="30" height="32" rx="5" fill="#b9fff0" stroke="#2d8088" strokeWidth="3" />
                    <text x="71" y="80" fill="#153a45" fontFamily="monospace" fontSize="12" fontWeight="bold">C#</text>
                  </svg>
                ) : (
                  <span className={styles.packetCore}>{"{}"}</span>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
        <footer className={styles.footer}>
          <div className={styles.chapterNav} aria-label="Jump to animation chapter">
            {CHAPTERS.map((chapter, index) => (
              <button type="button" key={chapter.label} onClick={() => goTo(index)} aria-label={`Go to ${chapter.label}`} aria-current={active === index ? "step" : undefined} className={active === index ? styles.current : ""} title={chapter.title}>
                <span />
              </button>
            ))}
          </div>
          <div className={styles.status}>
            <span data-testid="cinema-stage">{CHAPTERS[active].packet}</span>
            <span>SCROLL {String(active + 1).padStart(2, "0")} / {CHAPTERS.length}</span>
          </div>
          <div className={styles.progress}><motion.div className={styles.progressFill} style={{ scaleX: paused ? 1 : barScale }} /></div>
        </footer>
      </div>
      <p className={styles.disclaimer}>Conceptual illustration of development and a sample ASP.NET Core request flow; no live system traces or data are exposed.</p>
    </section>
  );
}
