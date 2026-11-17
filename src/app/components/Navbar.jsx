"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, Pause, Play, X } from "lucide-react";
import { useMotionPreference } from "./MotionProvider";
const links = [
  ["journey", "Journey"],
  ["projects", "Work"],
  ["about", "About"],
  ["skills", "Expertise"],
  ["experience", "Experience"],
  ["contact", "Contact"],
];
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const { paused, systemReduced, toggle } = useMotionPreference();
  useEffect(() => {
    const key = (event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  return (
    <header className="site-header">
      <div className="nav-inner shell">
        <a
          href="#top"
          className="brand"
          aria-label="Prathmesh Pawar, back to top"
        >
          <span className="brand-mark">
            p<span>.</span>
          </span>
          <span>
            PRATHMESH
            <br />
            <b>PAWAR</b>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([id, label]) => (
            <a href={"#" + id} key={id}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-tools">
          <button
            className="icon-button motion-button"
            type="button"
            onClick={toggle}
            disabled={systemReduced}
            aria-label={
              systemReduced
                ? "Motion reduced by device preference"
                : paused
                  ? "Enable animations"
                  : "Pause animations"
            }
            title={
              systemReduced
                ? "Reduced motion follows your device"
                : paused
                  ? "Enable animations"
                  : "Pause animations"
            }
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <a className="nav-contact" href="mailto:prathmeshwork01@gmail.com">
            Let’s talk <ArrowUpRight size={15} />
          </a>
          <button
            ref={menuButton}
            type="button"
            className="icon-button menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav
          id="mobile-menu"
          className="mobile-menu"
          aria-label="Mobile navigation"
          hidden={!open}
        >
          {links.map(([id, label]) => (
            <a key={id} href={"#" + id} onClick={() => setOpen(false)}>
              {label}
              <ArrowUpRight size={16} />
            </a>
          ))}
          <a
            href="/Prathmesh_Pawar_CV.pdf"
            download
            onClick={() => setOpen(false)}
          >
            Download CV <ArrowUpRight size={16} />
          </a>
        </nav>
      </div>
    </header>
  );
}
