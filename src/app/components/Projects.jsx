import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Braces,
  FlaskConical,
  Github,
  Layers3,
  Plus,
} from "lucide-react";
import Section from "./ui/Section";

export default function Projects() {
  return (
    <Section
      id="projects"
      kicker="01 / Selected work"
      title={
        <>
          Ideas, made <span className="serif-word">real.</span>
        </>
      }
      subtitle="Personal engineering projects. Built to solve a problem, documented to explain the decisions."
    >
      <article className="featured-project">
        <div className="project-story">
          <div className="project-topline">
            <span className="mono">FEATURED / FULL-STACK .NET</span>
            <span className="live-tag">
              <i className="status-dot" /> Live read-only demo
            </span>
          </div>
          <div className="folio-wordmark">
            <BookOpen size={25} /> folio<span>.</span>
          </div>
          <h3>A library, thoughtfully engineered.</h3>
          <p>
            A full-stack library management system connecting a considered
            reading experience with secure accounts, transactional lending and
            administration.
          </p>
          <ul className="tags" aria-label="Folio technologies">
            {[
              "ASP.NET Core 10",
              "C#",
              "EF Core",
              "SQL Server",
              "Razor",
              "Playwright",
            ].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="project-links">
            <a
              className="button primary"
              href="https://prathmesh-library.runasp.net/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Explore live catalogue <ArrowUpRight size={16} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a
              className="text-link"
              href="https://github.com/prathmeeesh/library-api"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={16} /> Original API source
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <p className="scope-note">
            Public demo: synthetic catalogue, browsing and search only. Login,
            registration, borrowing, returns and administration are disabled.
            The complete application source is local and awaits reviewed
            publication.
          </p>
        </div>
        <figure className="folio-visual">
          <div className="preview-chrome">
            <span />
            <span />
            <span />
            <b className="mono">FOLIO / LOCAL APPLICATION</b>
          </div>
          <div className="folio-image">
            <Image
              src="/projects/folio-overview.webp"
              alt="Folio local application with book catalogue, library navigation and synthetic book covers"
              width={1440}
              height={1273}
              sizes="(max-width: 900px) 90vw, 50vw"
            />
          </div>
          <figcaption>
            Actual local application capture · full mode, not the public demo
          </figcaption>
        </figure>
        <details className="case-study">
          <summary>
            Inside the engineering <Plus size={18} />
          </summary>
          <div className="case-body">
            <div>
              <span className="eyebrow">Architecture</span>
              <h4>One deployable application.</h4>
              <p>
                Razor and same-origin JavaScript call ASP.NET Core controllers.
                Validated DTOs reach the lending and user administration
                services, with EF Core persisting records in SQL Server.
              </p>
              <ol className="flow" aria-label="Folio request flow">
                <li>Razor / JS</li>
                <li>Controllers</li>
                <li>Services</li>
                <li>SQL Server</li>
              </ol>
            </div>
            <div>
              <span className="eyebrow">Correctness & security</span>
              <h4>Rules at the server boundary.</h4>
              <p>
                Secure cookies and CSRF for browser sessions; JWT for API
                clients. Admin checks use the current database role. Borrowing
                and returns use transactions and conditional inventory updates.
                Each book record represents one physical copy.
              </p>
            </div>
            <div>
              <span className="eyebrow">Executed local evidence</span>
              <h4>100 backend. 8 browser.</h4>
              <p>
                Recorded on 15 November 2026: 100 backend tests passed,
                including seven SQL Server tests; eight browser scenarios
                passed. Zero failures or skips in those runs. These are local
                results, not hosted CI or a production security certification.
              </p>
            </div>
          </div>
        </details>
      </article>
      <div className="supporting-projects">
        <article className="project-panel">
          <div className="project-panel-top">
            <Braces size={26} />
            <span className="mono">02 / BACKEND</span>
          </div>
          <h3>Issue Tracker API</h3>
          <p>
            Issue creation and assignment, projects and comments, with a defined
            Open → InProgress → Resolved → Closed workflow.
          </p>
          <ul className="tags">
            <li>ASP.NET Core</li>
            <li>EF Core</li>
            <li>SQL Server</li>
          </ul>
          <p className="scope-note">
            Public API prototype. No new test, deployment or publication claims
            are made here.
          </p>
          <a
            className="text-link"
            href="https://github.com/prathmeeesh/IssueTrackerApi"
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore repository <ArrowUpRight size={16} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </article>
        <article className="project-panel research-panel">
          <div className="project-panel-top">
            <FlaskConical size={26} />
            <span className="mono">03 / ACADEMIC</span>
          </div>
          <h3>Smart Research Assistant</h3>
          <p>
            Smart AI-driven Personal Research Assistant, developed as my
            University of Leicester MSc individual project.
          </p>
          <ul className="tags">
            <li>Research discovery</li>
            <li>AI-assisted applications</li>
          </ul>
          <p className="scope-note">
            Private academic work. Public source, demonstration and detailed
            technical claims are pending academic and privacy review.
          </p>
          <a className="text-link" href="#contact">
            Discuss the project <ArrowRight size={16} />
          </a>
        </article>
        <article className="project-panel portfolio-panel">
          <div className="project-panel-top">
            <Layers3 size={26} />
            <span className="mono">04 / FRONTEND</span>
          </div>
          <h3>This digital workspace</h3>
          <p>
            A Next.js portfolio combining server-rendered content with a
            lightweight interactive observatory, responsive layouts and
            accessible motion.
          </p>
          <ul className="tags">
            <li>Next.js</li>
            <li>React</li>
            <li>Canvas 2D</li>
          </ul>
          <p className="scope-note">
            The portfolio source is available on GitHub. Changes to the Engineering Observatory are tested and reviewed before production publication.
          </p>
          <a
            className="text-link"
            href="https://github.com/prathmeeesh/prathmesh-portfolio"
            target="_blank"
            rel="noopener noreferrer"
          >
            View portfolio source <ArrowUpRight size={16} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </article>
      </div>
    </Section>
  );
}
