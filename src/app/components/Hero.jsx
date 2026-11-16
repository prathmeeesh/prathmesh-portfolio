import { ArrowDown, ArrowUpRight, Download } from "lucide-react";
import Observatory from "./Observatory";
export default function Hero() {
  return (
    <section id="top" className="hero shell" aria-labelledby="hero-title">
      <div className="hero-topline mono">
        <span>
          <i className="status-dot" /> Open to UK opportunities
        </span>
        <span>Leicester, United Kingdom / 52.63° N</span>
      </div>
      <div className="hero-layout">
        <div className="hero-copy">
          <p className="eyebrow">Software engineer · Prathmesh Pawar</p>
          <h1 id="hero-title">
            Engineering
            <br />
            what comes <span className="serif-word">next.</span>
          </h1>
          <p className="hero-description">
            A foundation in C# and .NET.
            <br />A curiosity for intelligent systems.
            <br />
            Software built with purpose.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#projects">
              Explore my work <ArrowUpRight size={18} />
            </a>
            <a className="button quiet" href="/Prathmesh_Pawar_CV.pdf" download>
              <Download size={16} /> Download CV
            </a>
          </div>
          <div className="hero-proof">
            <strong>
              2.5+ <span>years</span>
            </strong>
            <p>
              Commercial development
              <br />
              <span>C# · ASP.NET MVC · SQL</span>
            </p>
          </div>
        </div>
        <Observatory />
      </div>
      <div className="hero-bottom mono">
        <a href="#projects">
          <ArrowDown size={16} /> Scroll to explore
        </a>
        <span>Backend foundations. Applied curiosity.</span>
        <span className="hero-index">PORTFOLIO / 01</span>
      </div>
    </section>
  );
}
