"use client";
import { useEffect, useRef, useState } from "react";
import { CHAPTERS, clamp } from "./story";

export default function useScrollDirector(root, paused) {
  const progress = useRef(0);
  const invalidate = useRef(null);
  const [chapter, setChapter] = useState(0);
  const [inJourney, setInJourney] = useState(true);
  useEffect(() => {
    let disposed = false;
    let trigger;
    let observer;
    // One scroll controller; no Lenis, timers, or individual section timelines.
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, s]) => {
      if (disposed || !root.current) return;
      const gsap = g.gsap;
      const ScrollTrigger = s.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      const update = (self) => {
        const p = clamp(self.progress);
        const i = Math.min(CHAPTERS.length - 1, Math.round(p * (CHAPTERS.length - 1)));
        setChapter((old) => old === i ? old : i);
        setInJourney(self.progress < 1);
        if (!paused) {
          progress.current = p;
          invalidate.current?.();
        }
        root.current?.style.setProperty("--journey-progress", String(p));
        if (root.current) root.current.dataset.progress = p.toFixed(4);
      };
      trigger = ScrollTrigger.create({
        id: "observatory-director", trigger: root.current, start: "top top+=87",
        end: "bottom bottom", onUpdate: update, onRefresh: update,
        invalidateOnRefresh: true,
      });
      observer = new ResizeObserver(() => trigger?.refresh());
      observer.observe(root.current);
      update(trigger);
    });
    return () => { disposed = true; observer?.disconnect(); trigger?.kill(); };
  }, [root, paused]);
  return { progress, invalidate, chapter, inJourney };
}
