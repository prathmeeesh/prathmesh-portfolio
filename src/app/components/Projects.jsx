"use client";

import { ExternalLink, Github } from "lucide-react";
import Section from "./ui/Section";
import TiltCard from "./ui/TiltCard";

const projects = [
  {
    title: "Issue Tracker API",
    tag: "Personal API project",
    description: "ASP.NET Core API for issue creation and assignment, projects and comments, with a defined Open-to-Closed status workflow.",
    status: "Public prototype. Authentication hardening and automated tests are local and not yet published.",
    technologies: ["C#", "ASP.NET Core 8", "EF Core", "SQL Server", "JWT", "Swagger"],
    url: "https://github.com/prathmeeesh/IssueTrackerApi",
  },
  {
    title: "Folio — Library Management System",
    tag: "Deployed .NET portfolio demo",
    description: "ASP.NET Core 10 and SQL Server library system with catalogue discovery, borrowing workflows and admin tools in the full local application. The public demo presents 15 synthetic books in read-only mode.",
    status: "Live read-only portfolio demo. Login, registration, borrowing and administration are disabled publicly. The linked GitHub repository still shows the earlier API version until the reviewed full-stack source is published.",
    technologies: ["C#", "ASP.NET Core 10", "EF Core", "SQL Server", "JWT", "Playwright"],
    url: "https://github.com/prathmeeesh/library-api",
    demoUrl: "https://prathmesh-library.runasp.net/",
  },
  {
    title: "Developer Portfolio",
    tag: "Frontend project",
    description: "This Next.js and React portfolio presents my software development background, public project evidence and current CV.",
    status: "Public source for this website.",
    technologies: ["JavaScript", "Next.js", "React", "Tailwind CSS", "Framer Motion"],
    url: "https://github.com/prathmeeesh/prathmesh-portfolio",
  },
];

export default function Projects() {
  return (
    <Section
      id="projects"
      kicker="Projects"
      title="Selected engineering projects"
      subtitle="Hands-on projects with clear links to live demos, public source and verified implementation scope."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {projects.map((project) => (
          <TiltCard key={project.title}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-sm font-semibold">{project.title}</h3>
              <span className="text-[10px] px-3 py-1 rounded-full border border-slate-300/20 bg-slate-950/60 text-gray-300">
                {project.tag}
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-300 leading-6">{project.description}</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {project.technologies.map((technology) => (
                <li key={technology} className="px-3 py-1 rounded-full border border-slate-300/20 bg-slate-950/60 text-gray-200">
                  {technology}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-400 leading-6">{project.status}</p>
            <div className="mt-4 flex flex-wrap gap-4">
              {project.demoUrl && (
                <a
                  className="inline-flex items-center gap-2 text-xs text-emerald-200 underline decoration-dotted hover:text-emerald-100"
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${project.title} live demo (opens in a new tab)`}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  View live demo
                </a>
              )}
              <a
                className="inline-flex items-center gap-2 text-xs text-blue-200 underline decoration-dotted hover:text-blue-100"
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${project.title} source on GitHub (opens in a new tab)`}
              >
                <Github size={16} aria-hidden="true" />
                View source on GitHub
              </a>
            </div>
          </TiltCard>
        ))}
      </div>
    </Section>
  );
}
