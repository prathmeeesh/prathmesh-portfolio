import { GraduationCap, ArrowUpRight } from "lucide-react";
import Section from "./ui/Section";
export default function Education() {
  return (
    <Section
      id="education"
      kicker="05 / Continuing the learning"
      title={
        <>
          A deeper <span className="serif-word">perspective.</span>
        </>
      }
    >
      <div className="education-grid">
        <article className="education-card">
          <GraduationCap size={28} />
          <span className="mono">2025 — 2026 / MSc STUDY</span>
          <h3>Advanced Computer Science</h3>
          <p>University of Leicester, United Kingdom</p>
          <p className="education-detail">
            Academic focus across software architecture, cloud and
            data-intensive systems, and AI-enabled applications.
          </p>
          <span className="academic-status">Award not yet confirmed</span>
        </article>
        <article className="education-card">
          <GraduationCap size={28} />
          <span className="mono">2020 — 2023 / BSc</span>
          <h3>Information Technology</h3>
          <p>Pillai College of Arts, Commerce and Science</p>
          <p className="education-detail">
            Specialisation in Data Science.
          </p>
          <a className="text-link" href="/Prathmesh_Pawar_CV.pdf" download>
            View full education in CV <ArrowUpRight size={15} />
          </a>
        </article>
      </div>
    </Section>
  );
}
