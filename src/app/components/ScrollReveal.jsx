"use client";
import { useEffect } from "react";
import { useMotionPreference } from "./MotionProvider";
export default function ScrollReveal() {
  const { paused } = useMotionPreference();
  useEffect(() => {
    if (paused) return;
    const animations = [];
    const magneticCleanups = [];
    if (window.matchMedia("(pointer: fine)").matches) {
      document
        .querySelectorAll(".hero-actions .primary, .contact-actions .primary")
        .forEach((button) => {
          const move = (event) => {
            const bounds = button.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 7;
            const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 7;
            button.style.transform = "translate(" + x + "px, " + y + "px)";
          };
          const leave = () => {
            button.style.transform = "";
          };
          button.addEventListener("pointermove", move);
          button.addEventListener("pointerleave", leave);
          magneticCleanups.push(() => {
            button.removeEventListener("pointermove", move);
            button.removeEventListener("pointerleave", leave);
            leave();
          });
        });
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animations.push(
            entry.target.animate(
              [
                { opacity: 0.7, transform: "translateY(16px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 650, easing: "cubic-bezier(.2,.65,.3,1)" },
            ),
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 },
    );
    document
      .querySelectorAll(
        ".section-heading,.project-panel,.timeline-entry,.education-card",
      )
      .forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      magneticCleanups.forEach((cleanup) => cleanup());
    };
  }, [paused]);
  return null;
}
