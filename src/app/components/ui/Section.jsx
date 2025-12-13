"use client";
import { motion } from "framer-motion";

export default function Section({ id, kicker, title, subtitle, children }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.22 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="text-[11px] tracking-[0.18em] uppercase text-blue-400">{kicker}</div>
        <div className="mt-2 text-xl md:text-2xl font-semibold">{title}</div>
        {subtitle ? <div className="mt-2 text-sm text-gray-400 max-w-3xl">{subtitle}</div> : null}
        <div className="mt-6">{children}</div>
      </motion.div>
    </section>
  );
}
