import Section from "./ui/Section";

export default function Experience() {
  return (
    <Section
      id="experience"
      kicker="Experience"
      title="Professional experience & education"
      subtitle="Positioned for graduate/junior .NET roles in the UK."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <div className="text-sm font-semibold">Junior Software Developer</div>
          <div className="text-xs text-gray-400">Acssel Infotech Pvt. Ltd. · Jul 2023 – Aug 2025</div>
          <ul className="mt-3 text-xs text-gray-300 space-y-2 list-disc pl-5">
            <li>Built modules for HealthCard, Surrogacy, Pharmacy, Inventory, and HR workflows.</li>
            <li>Implemented backend logic in ASP.NET MVC / C# with SQL Server integrations.</li>
            <li>Improved usability and reliability via debugging and query optimisation.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <div className="text-sm font-semibold">MSc Advanced Computer Science</div>
          <div className="text-xs text-gray-400">University of Leicester · In progress</div>
          <ul className="mt-3 text-xs text-gray-300 space-y-2 list-disc pl-5">
            <li>Focus: advanced software engineering, cloud computing, data-intensive systems and AI.</li>
            <li>Building cloud-ready and data-driven engineering portfolio projects.</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}
