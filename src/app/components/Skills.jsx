import Section from "./ui/Section";

export default function Skills() {
  const groups = [
    { title: "Commercial background", items: ["C#/.NET", "ASP.NET MVC", "JavaScript", "SQL", "HTML/CSS", "Bootstrap"] },
    { title: "Backend project work", items: ["ASP.NET Core", "REST APIs", "EF Core", "JWT", "Swagger/OpenAPI"] },
    { title: "Databases & tools", items: ["SQL Server", "MySQL", "PostgreSQL (project)", "Git/GitHub", "Visual Studio"] },
    { title: "MSc & current focus", items: ["AI-enabled applications", "Cloud computing", "Data-intensive systems", "Software architecture"] },
  ];

  return (
    <Section
      id="skills"
      kicker="Skills"
      title="Technologies and engineering focus"
      subtitle="Commercial experience is distinguished from project work and current study."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {groups.map((g) => (
          <div
            key={g.title}
            className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-4
                       shadow-[0_18px_40px_rgba(0,0,0,0.35)] hover:-translate-y-1 transition"
          >
            <div className="text-sm font-semibold">{g.title}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-200">
              {g.items.map((it) => (
                <span key={it} className="px-3 py-1 rounded-full border border-slate-300/20 bg-slate-950/60">
                  {it}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
