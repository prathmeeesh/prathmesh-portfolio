import Section from "./ui/Section";
export default function Experience() {
  return (
    <Section
      id="experience"
      kicker="04 / Professional journey"
      title={
        <>
          Built on real <span className="serif-word">experience.</span>
        </>
      }
      subtitle="Approximately 2.5 years of commercial development, including an internship."
    >
      <div className="timeline">
        <article className="timeline-entry">
          <div className="timeline-date mono">
            JUL 2023 — AUG 2025<span>Commercial / developer role</span>
          </div>
          <div className="timeline-content">
            <h3>Junior Software Developer</h3>
            <p className="employer">Acssel Infotech Pvt. Ltd.</p>
            <p>
              Worked on ASP.NET MVC and C# applications supporting HealthCard,
              Surrogacy, Pharmacy, Inventory and HR workflows.
            </p>
            <ul>
              <li>
                Implemented backend business logic and SQL Server integrations.
              </li>
              <li>
                Developed JavaScript interfaces, reports and SQL-backed
                application features.
              </li>
              <li>
                Investigated defects and worked on query and usability
                improvements.
              </li>
            </ul>
            <div className="tags">
              <span>C#</span>
              <span>ASP.NET MVC</span>
              <span>SQL Server</span>
              <span>JavaScript</span>
            </div>
          </div>
        </article>
        <article className="timeline-entry">
          <div className="timeline-date mono">
            JAN 2023 — JUL 2023<span>Commercial / internship</span>
          </div>
          <div className="timeline-content">
            <h3>Internship Trainee</h3>
            <p className="employer">Acssel Infotech Pvt. Ltd.</p>
            <p>
              Contributed to supervised HealthCard application modules and
              developed practical foundations in web application engineering.
            </p>
            <ul>
              <li>
                Built interfaces using HTML, CSS, JavaScript and Bootstrap.
              </li>
              <li>Supported C# development, debugging and testing tasks.</li>
              <li>
                Developed communication and collaboration skills within a
                software team.
              </li>
            </ul>
          </div>
        </article>
      </div>
      <p className="section-footnote">
        Commercial work is described at a responsibility level. Proprietary
        employer source code is not published.
      </p>
    </Section>
  );
}
