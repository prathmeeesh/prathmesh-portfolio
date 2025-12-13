"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useScroll } from "framer-motion";

const links = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
];

export default function Navbar() {
  const [active, setActive] = useState("about");
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();

  const observers = useMemo(() => ({ current: null }), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter(Boolean);

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // pick the most visible
          visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActive(visible[0].target.id);
        }
      },
      { root: null, threshold: [0.15, 0.25, 0.35, 0.5, 0.65] }
    );

    sections.forEach((s) => obs.observe(s));
    observers.current = obs;

    return () => {
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, [observers]);

  return (
    <header className="sticky top-0 z-[60]">
      {/* progress bar */}
      <motion.div
        className="h-[2px] bg-gradient-to-r from-blue-500 to-cyan-300 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <div
        className={[
          "transition-all duration-300",
          scrolled
            ? "backdrop-blur-xl bg-slate-950/70 border-b border-blue-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            : "backdrop-blur-md bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full p-[2px] bg-[conic-gradient(from_180deg,#22c55e,#06b6d4,#3b82f6,#22c55e)]">
              <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center text-xs font-semibold tracking-widest">
                PP
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Prathmesh Pawar</div>
              <div className="text-[11px] text-gray-400">Full Stack .NET Developer</div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-xs text-gray-300">
            {links.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className={[
                  "relative hover:text-white transition-colors",
                  active === l.id ? "text-white" : "",
                ].join(" ")}
              >
                {l.label}
                {active === l.id && (
                  <span className="absolute left-0 -bottom-2 h-[2px] w-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" />
                )}
              </a>
            ))}
          </nav>

          <a
            href="#contact"
            className="text-xs rounded-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 transition"
          >
            Hire Me
          </a>
        </div>
      </div>
    </header>
  );
}
