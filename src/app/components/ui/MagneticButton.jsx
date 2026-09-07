"use client";
import { useRef } from "react";

export default function MagneticButton({ href, children, variant = "primary", download }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.10}px, ${y * 0.18}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0px, 0px)";
  };

  const base =
    "inline-flex items-center justify-center text-xs px-5 py-3 rounded-full transition duration-200 select-none";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white shadow-[0_22px_48px_rgba(0,0,0,0.45)]"
      : "border border-slate-300/30 bg-slate-950/35 hover:bg-slate-950/70 text-gray-200";

  return (
    <a href={href} download={download} className={`${base} ${styles}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      <span ref={ref} className="inline-flex items-center gap-2 transition-transform duration-150">
        {children}
      </span>
    </a>
  );
}
