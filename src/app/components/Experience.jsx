import Section from "./ui/Section";

export default function Experience() {
  return (
    <Section
      id="experience"
      kicker="Experience"
      title="Professional experience & education"
      subtitle="2.5+ years of commercial experience across trainee and junior developer roles, followed by MSc study."
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
          <h3 className="text-sm font-semibold">Internship Trainee</h3>
          <div className="text-xs text-gray-400">Acssel Infotech Pvt. Ltd. · Jan 2023 - Jul 2023</div>
          <ul className="mt-3 text-xs text-gray-300 space-y-2 list-disc pl-5">
            <li>Contributed to HealthCard application development through supervised modules.</li>
            <li>Built interfaces with HTML, CSS, JavaScript, Bootstrap and C#.</li>
            <li>Developed debugging, testing and project communication skills.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <h3 className="text-sm font-semibold">MSc Advanced Computer Science</h3>
          <div className="text-xs text-gray-400">University of Leicester · In progress</div>
          <ul className="mt-3 text-xs text-gray-300 space-y-2 list-disc pl-5">
            <li>Focus: advanced software engineering, cloud computing, data-intensive systems and AI.</li>
            <li>Current project interests include backend APIs and AI-enabled applications.</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}
