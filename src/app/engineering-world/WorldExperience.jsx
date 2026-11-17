"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { STAGES } from "./worldData";
import styles from "./world.module.css";

const WorldCanvas = dynamic(() => import("./WorldScene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Preparing the 3D world…</div>,
});

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const motionSubscribe = (notify) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionServerSnapshot = () => true;

export default function WorldExperience() {
  const section = useRef(null);
  const progress = useRef(0);
  const [stage, setStage] = useState(0);
  const reduced = useSyncExternalStore(motionSubscribe, motionSnapshot, motionServerSnapshot);
  const [webglFailed, setWebglFailed] = useState(false);
  const [quality, setQuality] = useState("high");

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    function measure() {
      const el = section.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const distance = Math.max(1, rect.height - window.innerHeight);
      const next = clamp(-rect.top / distance, 0, 1);
      progress.current = next;
      const chapter = Math.min(STAGES.length - 1, Math.floor(next * STAGES.length));
      setStage((old) => old === chapter ? old : chapter);
    }
    const scroll = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); });
    };
    measure();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
    };
  }, [reduced]);

  const moveTo = useCallback((index) => {
    const el = section.current;
    if (!el) return;
    const i = clamp(index, 0, STAGES.length - 1);
    const available = Math.max(1, el.offsetHeight - window.innerHeight);
    const destination = el.getBoundingClientRect().top + window.scrollY + available * Math.min(.999, (i + .25) / STAGES.length);
    window.scrollTo({ top: destination, behavior: reduced ? "instant" : "smooth" });
  }, [reduced]);

  const current = STAGES[stage];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/">p<span>.</span> / engineering world</Link>
        <nav aria-label="Engineering world navigation" className={styles.navigation}>
          <Link href="/">Portfolio</Link>
          <a href="https://prathmesh-library.runasp.net/" target="_blank" rel="noreferrer">Folio demo ↗</a>
          <a href="/Prathmesh_Pawar_CV.pdf">CV ↗</a>
        </nav>
      </header>

      <section className={styles.intro} aria-labelledby="world-title">
        <div className={styles.introBody}>
          <p className={styles.eyebrow}>AN INTERACTIVE ENGINEERING FILM · 3D</p>
          <h1 id="world-title">From <i>code</i> to<br/>experience.</h1>
          <p>Follow one idea through a floating world of development, source control, CI, deployment, APIs, data and the finished interface.</p>
          <a className={styles.primary} href="#journey">Enter the world <span>↓</span></a>
          <small>Scroll to play · Scroll backwards to rewind · Built with actual 3D geometry</small>
        </div>
        <div className={styles.orbit} aria-hidden="true"><span/><span/><span/></div>
      </section>

      <section id="journey" ref={section} className={`${styles.scrollSection} ${reduced || webglFailed ? styles.noMotion : ""}`} aria-label="The software engineering journey" data-testid="world-scroll">
        <div className={styles.sticky}>
          {reduced || webglFailed ? (
            <div className={styles.fallback}>
              <h2>{reduced ? "Engineering journey" : "3D scene unavailable"}</h2>
              <p>{reduced ? "A motion-free version of the entire process." : "Your browser may not support WebGL. The engineering story remains accessible below."}</p>
              <div className={styles.fallbackGrid}>
                {STAGES.map((s) => <article key={s.id}><small>{s.marker}</small><h3>{s.heading}</h3><p>{s.description}</p></article>)}
              </div>
            </div>
          ) : (
            <WorldCanvas progress={progress} quality={quality} onContextFailure={() => setWebglFailed(true)} />
          )}

          {!reduced && !webglFailed && <>
            <div className={styles.vignette} aria-hidden="true" />
            <div className={styles.hud} aria-hidden="true">
              <span>PP / SOFTWARE UNIVERSE</span><span>SCENE {String(stage+1).padStart(2,"0")} / {String(STAGES.length).padStart(2,"0")}</span>
            </div>
            <div className={`${styles.story} ${stage > 3 ? styles.right : ""}`} key={current.id}>
              <p className={styles.eyebrow}>{current.marker}</p>
              <h2>{current.heading}</h2>
              <p>{current.description}</p>
              <div className={styles.evidence}>{current.evidence}</div>
              <pre><code>{current.snippet}</code></pre>
            </div>
            <div className={styles.controls}>
              <button onClick={() => moveTo(stage-1)} disabled={stage===0} aria-label="Previous chapter">←</button>
              <span>{String(stage+1).padStart(2,"0")} <span className={styles.divider}>/</span> {STAGES.length}</span>
              <button onClick={() => moveTo(stage+1)} disabled={stage===STAGES.length-1} aria-label="Next chapter">→</button>
              <button className={styles.quality} onClick={() => setQuality((v)=>v==="high"?"low":"high")}>3D {quality === "high"?"HQ":"ECO"}</button>
            </div>
            <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={STAGES.length} aria-valuenow={stage+1} aria-label="Story chapter">
              {STAGES.map((item,i)=><button key={item.id} type="button" onClick={()=>moveTo(i)} aria-label={`Jump to ${item.marker}`} aria-current={stage===i?"step":undefined} className={stage>=i?styles.active:""}/>) }
            </div>
            <p className={styles.disclaimer}>Illustrated engineering example · Not live request telemetry</p>
          </>}
        </div>
      </section>

      <section className={styles.end}>
        <p className={styles.eyebrow}>THE RESULT</p>
        <h2>Good software doesn&apos;t stop at code.<br/><i>It reaches people.</i></h2>
        <p>This journey is the story behind my approach to building reliable, useful applications—from C#/.NET foundations to AI-enabled user experiences.</p>
        <div className={styles.actions}>
          <a className={styles.primary} href="https://prathmesh-library.runasp.net/" target="_blank" rel="noreferrer">Explore Folio ↗</a>
          <Link className={styles.secondary} href="/">Back to my portfolio ↗</Link>
        </div>
      </section>
    </main>
  );
}
