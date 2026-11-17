"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Download } from "lucide-react";
import { useMotionPreference } from "../MotionProvider";
import useScrollDirector from "./useScrollDirector";
import { CHAPTERS } from "./story";
import WorldFallback from "./WorldFallback";
import styles from "./world.module.css";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });
class GraphicsBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function EngineeringWorld() {
  const root = useRef(null);
  const { paused, systemReduced } = useMotionPreference();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState("auto");
  const staticMode = systemReduced || failed;
  const { progress, invalidate, chapter, inJourney } = useScrollDirector(root, paused || failed);
  const onFailure = useCallback(() => setFailed(true), []);
  const onReady = useCallback(() => setReady(true), []);
  return <div ref={root} id="journey" className={`${styles.journey} ${staticMode ? styles.static : ""}`} data-testid="engineering-universe" data-mode={staticMode ? "static" : "3d"} data-chapter={chapter}>
    <div className={`${styles.backdrop} ${!inJourney ? styles.settled : ""}`} aria-hidden="true">
      <div className={styles.fallback}><WorldFallback /></div>
      {!staticMode && <GraphicsBoundary onFailure={onFailure}>
        <WorldCanvas progress={progress} invalidateRef={invalidate} paused={paused} active={inJourney} quality={quality} onFailure={onFailure} onReady={onReady}/>
      </GraphicsBoundary>}
      <div className={styles.shade}/>
    </div>
    <nav className={styles.rail} aria-label="Engineering journey chapters" hidden={!inJourney || staticMode}>
      {CHAPTERS.map((s,i)=><a key={s.id} href={i===0?"#top":`#chapter-${s.id}`} aria-label={`${String(i+1).padStart(2,"0")} ${s.name}`} aria-current={i===chapter?"step":undefined}>
        <span>{String(i+1).padStart(2,"0")}</span><b>{s.name}</b>
      </a>)}
    </nav>
    <div className={styles.status} hidden={!inJourney}>
      <span>{staticMode ? "MOTION-FREE EDITION" : "ENGINEERING OBSERVATORY / VOL. 02"}</span>
      {!staticMode && <button type="button" onClick={()=>setQuality(q=>q==="eco"?"auto":"eco")} aria-label={`Graphics quality: ${quality}. Switch to ${quality==="eco"?"auto":"eco"}`}>
        {quality === "eco" ? "ECO" : "AUTO"} <i/>
      </button>}
    </div>
    {CHAPTERS.map((s,i)=><section key={s.id} id={i===0?"top":`chapter-${s.id}`} className={`${styles.chapter} ${i===0?styles.hero:""}`} aria-labelledby={`story-title-${i}`} data-story-index={i}>
      <div className={styles.copy}>
        <p className={styles.kicker}>{i===0?"PRATHMESH PAWAR / SOFTWARE ENGINEER":`${String(i+1).padStart(2,"0")} / ${s.phase}`}</p>
        {i===0 ? <h1 id={`story-title-${i}`}>Engineering<br/>what comes <em>next.</em></h1> : <h2 id={`story-title-${i}`}>{s.title}</h2>}
        <p className={styles.body}>{i===0 ? "C#/.NET foundations. Applied AI curiosity. Follow an idea from the first line of code to an experience people can use." : s.body}</p>
        {i===0 ? <>
          <div className={styles.actions}><a className="button primary" href="#chapter-code">Explore the journey <ArrowDown size={16}/></a><a className="button quiet" href="#projects">View my work <ArrowUpRight size={16}/></a></div>
          <div className={styles.identity}><span>2.5+ years commercial development</span><a href="/Prathmesh_Pawar_CV.pdf" download><Download size={14}/> Download CV</a></div>
          <p className={styles.tech}>C# · ASP.NET CORE · SQL · JAVASCRIPT</p>
          <p className={styles.tagline}>FROM CODE TO EXPERIENCE<span>From how it’s built to how it’s shown.</span></p>
        </> : <>
          <p className={styles.detail}>{s.detail}</p>
          {s.code && <pre><code>{s.code}</code></pre>}
          {i===8 && <div className={styles.actions}><a className="button primary" href="https://prathmesh-library.runasp.net/" target="_blank" rel="noopener noreferrer">Explore the live Folio demonstration <ArrowUpRight size={16}/></a><a className="text-link" href="#projects">See the engineering <ArrowDown size={16}/></a></div>}
        </>}
      </div>
      <div className={styles.location} aria-hidden="true"><span>{String(i+1).padStart(2,"0")}</span>{s.location}</div>
    </section>)}
    <div className={styles.bottom} hidden={!inJourney || staticMode}>
      <span>{paused?"MOTION PAUSED":ready?"SCROLL TO TRAVEL · REVERSE TO REWIND":"PREPARING 3D · CONTENT READY"}</span><a href="#projects">Skip to projects ↗</a>
    </div>
    <p className={styles.disclaimer}>An illustrated engineering journey. Not live telemetry, CI status or a literal trace of Folio.</p>
  </div>;
}
