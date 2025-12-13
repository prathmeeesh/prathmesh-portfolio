"use client";

import Section from "./ui/Section";
import TiltCard from "./ui/TiltCard";

const data = [
  {
    title: "HealthCard Management System",
    tag: "Production · Healthcare",
    desc: "Enterprise healthcare platform modules with secure data flows, reporting and modular workflows.",
    tech: ["ASP.NET MVC", "C#", "SQL Server", "Bootstrap"],
    link: "#",
  },
  {
    title: "Library Management System",
    tag: "Academic",
    desc: "Web app to manage books, lending, members and library activity tracking.",
    tech: ["ASP.NET MVC", "C#", "HTML/CSS/JS"],
    link: "#",
  },
  {
    title: "POS Billing System",
    tag: "Academic",
    desc: "Desktop POS system for cart, transactions and basic reporting for small retail environments.",
    tech: ["Java", "MySQL", "JDBC", "JFrame"],
    link: "#",
  },
  {
    title: "Virtual Assistant (PLUTO)",
    tag: "Android · Java",
    desc: "Assistant handling predefined queries with API integration and Android UI.",
    tech: ["Java", "Android Studio", "API Integration"],
    link: "#",
  },
];

export default function Projects() {
  return (
    <Section
      id="projects"
      kicker="Projects"
      title="Selected work & technical projects"
      subtitle="Pin these repositories on GitHub and add screenshots for maximum recruiter impact."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.map((p) => (
          <TiltCard key={p.title}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold">{p.title}</div>
              <span className="text-[10px] px-3 py-1 rounded-full border border-slate-300/20 bg-slate-950/60 text-gray-300">
                {p.tag}
              </span>
            </div>

            <p className="mt-3 text-xs text-gray-300 leading-6">{p.desc}</p>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {p.tech.map((t) => (
                <span key={t} className="px-3 py-1 rounded-full border border-slate-300/20 bg-slate-950/60 text-gray-200">
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <a className="text-xs text-blue-200 underline decoration-dotted opacity-90 hover:opacity-100" href={p.link}>
                GitHub (add link)
              </a>
            </div>
          </TiltCard>
        ))}
      </div>
    </Section>
  );
}
