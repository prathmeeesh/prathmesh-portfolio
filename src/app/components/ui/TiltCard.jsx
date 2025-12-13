"use client";
import { useRef } from "react";

export default function TiltCard({ children }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   // 0..1
    const py = (e.clientY - r.top) / r.height;   // 0..1

    const rotY = (px - 0.5) * 10;
    const rotX = (0.5 - py) * 10;

    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5
                 shadow-[0_18px_45px_rgba(0,0,0,0.40)] transition-transform duration-150 will-change-transform overflow-hidden"
    >
      <div
        className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%)" }}
      />
      {children}
    </div>
  );
}
