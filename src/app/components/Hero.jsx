"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import MagneticButton from "./ui/MagneticButton";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function Hero() {
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const yTitle = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const yCard = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const fade = useTransform(scrollYProgress, [0, 1], [1, 0.68]);

  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);

  useEffect(() => {
    const onMove = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const nx = (e.clientX / w) * 2 - 1;
      const ny = (e.clientY / h) * 2 - 1;
      setMx(clamp(nx, -1, 1));
      setMy(clamp(ny, -1, 1));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const orbA = useRef(null);
  const orbB = useRef(null);
  const orbC = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(orbA.current, { x: "+=40", y: "-=30", duration: 8, ease: "sine.inOut" }, 0)
      .to(orbB.current, { x: "-=35", y: "+=25", duration: 9, ease: "sine.inOut" }, 0)
      .to(orbC.current, { x: "+=25", y: "+=35", duration: 10, ease: "sine.inOut" }, 0);
    return () => tl.kill();
  }, []);

  const containerVariants = useMemo(
    () => ({
      hidden: {},
      show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
    }),
    []
  );

  const lineVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 14, filter: "blur(7px)" },
      show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease: "easeOut" } },
    }),
    []
  );

  return (
    <section id="top" ref={heroRef} className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* orbs */}
      <motion.div style={{ scale: orbScale, opacity: fade }} className="absolute inset-0 z-0">
        <div
          ref={orbA}
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-40 mix-blend-screen"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.95), transparent 70%)",
            transform: `translate(${mx * 18}px, ${my * 14}px)`,
          }}
        />
        <div
          ref={orbB}
          className="absolute top-[35%] -right-40 h-[380px] w-[380px] rounded-full blur-3xl opacity-35 mix-blend-screen"
          style={{
            background: "radial-gradient(circle, rgba(34,197,94,0.9), transparent 70%)",
            transform: `translate(${mx * -22}px, ${my * 16}px)`,
          }}
        />
        <div
          ref={orbC}
          className="absolute -bottom-44 left-[10%] h-[360px] w-[360px] rounded-full blur-3xl opacity-35 mix-blend-screen"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.95), transparent 70%)",
            transform: `translate(${mx * 16}px, ${my * -18}px)`,
          }}
        />
      </motion.div>

      <div className="relative z-[1] mx-auto max-w-6xl px-4 pt-20 pb-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <motion.div style={{ y: yTitle }} className="will-change-transform">
            <div className="text-[11px] tracking-[0.18em] uppercase text-blue-400">
              Leicester · United Kingdom
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="mt-4">
              <motion.h1 variants={lineVariants} className="text-4xl md:text-5xl font-bold leading-[1.12]">
                Building secure, scalable
              </motion.h1>
              <motion.h1 variants={lineVariants} className="text-4xl md:text-5xl font-bold leading-[1.12]">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-300 to-green-300">
                  .NET applications
                </span>{" "}
                for the real world.
              </motion.h1>

              <motion.p variants={lineVariants} className="mt-5 text-sm text-gray-300 max-w-xl leading-7">
                Full Stack .NET Developer and MSc Advanced Computer Science student with 2+ years of experience
                building healthcare and enterprise web applications using ASP.NET MVC, C#, SQL Server and JavaScript.
              </motion.p>

              <motion.div variants={lineVariants} className="mt-6 flex flex-wrap gap-2 text-[11px] text-gray-300">
                {["Open to UK roles", "ASP.NET MVC", "C#", "SQL Server", "REST APIs", "Cloud (Azure - learning)"].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full border border-slate-400/30 bg-slate-950/40 backdrop-blur">
                    {t}
                  </span>
                ))}
              </motion.div>

              <motion.div variants={lineVariants} className="mt-8 flex flex-wrap gap-3">
                <MagneticButton href="/Prathmesh_Pawar_CV.pdf" variant="primary">Download CV</MagneticButton>
                <MagneticButton href="#projects" variant="outline">View Projects</MagneticButton>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div style={{ y: yCard }} className="will-change-transform">
            <div
              className="rounded-3xl border border-cyan-200/20 bg-slate-950/55 backdrop-blur-xl p-5 shadow-[0_30px_70px_rgba(0,0,0,0.45)]"
              style={{
                transform: `perspective(900px) rotateX(${my * -4}deg) rotateY(${mx * 6}deg)`,
                transition: "transform 120ms ease-out",
              }}
            >
              <div className="flex items-center justify-between text-[11px] text-blue-100/90">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_0_6px_rgba(34,197,94,0.18)]" />
                  Actively seeking graduate & junior roles
                </div>
                <span className="px-3 py-1 rounded-full border border-blue-200/30 bg-slate-950/60">
                  MSc Advanced Computer Science
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-300/15 text-sm text-gray-200">
                <span className="font-semibold">Production modules</span> across healthcare workflows:
                Surrogacy, Pharmacy, Inventory, HR, and HealthCard systems—clean data models, APIs, and UI.
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                {["ASP.NET MVC", "AngularJS", "SQL", "Reporting", "Enterprise UI"].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full border border-slate-400/25 bg-slate-950/60">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black to-transparent z-[2]" />
    </section>
  );
}
