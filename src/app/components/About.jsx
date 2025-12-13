import Section from "./ui/Section";

export default function About() {
  return (
    <Section
      id="about"
      kicker="About"
      title="Full Stack Developer with a data-driven mindset"
      subtitle="I build production-ready systems with clean data models, APIs, and modern, responsive UI."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <p className="text-sm text-gray-300 leading-7">
            I am a Full Stack .NET Developer and MSc Advanced Computer Science student at the University of Leicester.
            I have 2+ years of experience building secure, scalable healthcare and enterprise applications using
            ASP.NET MVC, C#, SQL Server, JavaScript and AngularJS.
          </p>
          <p className="mt-4 text-sm text-gray-300 leading-7">
            I’m actively developing cloud-ready backend skills (Azure fundamentals, deployment patterns, CI/CD)
            and expanding into data engineering workflows (ETL, analytics, reporting).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <div className="text-sm font-semibold">Quick facts</div>
          <div className="mt-3 space-y-2 text-xs text-gray-300">
            <div><span className="text-gray-400">Location:</span> Leicester, UK</div>
            <div><span className="text-gray-400">Primary stack:</span> ASP.NET MVC, C#, SQL</div>
            <div><span className="text-gray-400">Focus:</span> Cloud + Data + Scalable APIs</div>
            <div><span className="text-gray-400">Availability:</span> Open to UK roles</div>
          </div>
        </div>
      </div>
    </Section>
  );
}
