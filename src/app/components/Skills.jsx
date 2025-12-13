import Section from "./ui/Section";

export default function Skills() {
  const groups = [
    { title: "Backend & APIs", items: ["ASP.NET MVC", "C#", "REST APIs", "Core Java"] },
    { title: "Frontend", items: ["HTML", "CSS", "JavaScript", "AngularJS"] },
    { title: "Databases & Data", items: ["SQL Server", "MySQL", "Reporting", "Data Modelling"] },
    { title: "Tools & Practices", items: ["Git/GitHub", "Visual Studio", "Agile", "Azure (learning)"] },
  ];

  return (
    <Section
      id="skills"
      kicker="Skills"
      title="Tech stack & capabilities"
      subtitle="A full-stack toolkit aligned to .NET enterprise roles in the UK."
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
