"use client";
import { useRef, useState } from "react";
import { Code2, Database, Cpu, Terminal } from "lucide-react";
import Section from "./ui/Section";
const groups = [
  {
    name: "Commercial",
    icon: Code2,
    title: "The foundation I work from.",
    copy: "Technologies used across trainee and junior software development roles at Acssel Infotech.",
    items: [
      "C# / .NET",
      "ASP.NET MVC",
      "JavaScript",
      "SQL Server",
      "MySQL",
      "HTML & CSS",
      "Bootstrap",
    ],
    note: "Commercial experience · January 2023 – August 2025",
  },
  {
    name: "Project engineering",
    icon: Database,
    title: "Building complete applications.",
    copy: "Modern backend and full-stack tools demonstrated through personal projects, including Folio.",
    items: [
      "ASP.NET Core",
      "REST APIs",
      "Entity Framework Core",
      "SQL Server",
      "JWT & cookie auth",
      "Git / GitHub",
      "Playwright",
    ],
    note: "Personal projects · separate from employer-owned software",
  },
  {
    name: "Academic & AI",
    icon: Cpu,
    title: "Exploring the next layer.",
    copy: "Postgraduate study and academic project interests, with an emphasis on turning new ideas into useful software.",
    items: [
      "AI-enabled applications",
      "Cloud computing",
      "Data-intensive systems",
      "Software architecture",
      "API integration",
    ],
    note: "MSc Advanced Computer Science · award not yet confirmed",
  },
  {
    name: "This website",
    icon: Terminal,
    title: "Design expressed through code.",
    copy: "The frontend stack behind this portfolio: server-rendered content with small, purposeful interactive components.",
    items: [
      "Next.js 16",
      "React 19",
      "JavaScript / JSX",
      "Tailwind CSS 4",
      "Canvas 2D",
      "Responsive CSS",
    ],
    note: "Personal frontend project · design and implementation",
  },
];
export default function Skills() {
  const [active, setActive] = useState(0);
  const buttons = useRef([]);
  const group = groups[active];
  const Icon = group.icon;
  const keyDown = (event, index) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % groups.length;
    else if (event.key === "ArrowLeft")
      next = (index + groups.length - 1) % groups.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = groups.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };
  return (
    <Section
      id="skills"
      kicker="03 / Engineering toolkit"
      title={
        <>
          Depth where it <span className="serif-word">matters.</span>
        </>
      }
      subtitle="A clear view of what I’ve used commercially, built with and studied."
    >
      <div className="skills-workspace">
        <div
          className="skill-tabs"
          role="tablist"
          aria-label="Technology experience"
        >
          {groups.map((g, index) => (
            <button
              key={g.name}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              id={"skill-tab-" + index}
              role="tab"
              aria-selected={active === index}
              aria-controls="skill-panel"
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => keyDown(event, index)}
            >
              <span className="mono">0{index + 1}</span>
              {g.name}
            </button>
          ))}
        </div>
        <div
          className="skill-panel"
          role="tabpanel"
          id="skill-panel"
          aria-labelledby={"skill-tab-" + active}
          tabIndex={0}
        >
          <div className="skill-panel-copy">
            <Icon size={32} />
            <h3>{group.title}</h3>
            <p>{group.copy}</p>
            <span className="mono skill-note">{group.note}</span>
          </div>
          <ul className="skill-chips">
            {group.items.map((item, index) => (
              <li key={item}>
                <span className="mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item}
                <span aria-hidden="true">↗</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
