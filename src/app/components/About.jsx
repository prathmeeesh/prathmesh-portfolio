import Section from "./ui/Section";

export default function About() {
  return (
    <Section
      id="about"
      kicker="About"
      title="Software development grounded in C# and .NET"
      subtitle="Commercial ASP.NET MVC experience, modern backend project work and ongoing postgraduate study."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <p className="text-sm text-gray-300 leading-7">
            My commercial background includes trainee and junior software developer roles at Acssel Infotech Pvt. Ltd.
            I worked on C#/ASP.NET MVC applications, SQL-backed business logic, reports and JavaScript interfaces.
            Employer-owned application source code is not published in this portfolio.
          </p>
          <p className="mt-4 text-sm text-gray-300 leading-7">
            Alongside my MSc Advanced Computer Science at the University of Leicester, I am developing
            ASP.NET Core and REST API projects and exploring AI-enabled applications, cloud computing,
            data-intensive systems and software architecture.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <div className="text-sm font-semibold">Quick facts</div>
          <div className="mt-3 space-y-2 text-xs text-gray-300">
            <div><span className="text-gray-400">Location:</span> Leicester, UK</div>
            <div><span className="text-gray-400">Primary stack:</span> C#/.NET, ASP.NET MVC/Core, SQL</div>
            <div><span className="text-gray-400">Focus:</span> Backend APIs and AI-enabled applications</div>
            <div><span className="text-gray-400">Availability:</span> Open to UK roles</div>
          </div>
        </div>
      </div>
    </Section>
  );
}
