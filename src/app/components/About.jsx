import { Code2, Database, Network } from "lucide-react";
import Section from "./ui/Section";
export default function About() {
  return (
    <Section
      id="about"
      kicker="02 / The person behind the code"
      title={
        <>
          Curious by nature.
          <br />
          Practical by <span className="serif-word">experience.</span>
        </>
      }
    >
      <div className="about-grid">
        <div className="about-copy">
          <p className="lead">
            I’m Prathmesh, a software developer based in Leicester. I like
            turning complicated requirements into software people can actually
            use.
          </p>
          <p>
            At Acssel Infotech, I worked on C# and ASP.NET MVC applications,
            SQL-backed business logic, reports and JavaScript interfaces. That
            commercial foundation shapes how I approach modern backend and
            full-stack projects.
          </p>
          <p>
            My MSc study and personal work explore AI-enabled applications,
            cloud computing and software architecture. I’m particularly
            interested in where dependable backend engineering meets useful
            AI-assisted applications.
          </p>
          <a className="text-link" href="#experience">
            Follow my journey <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="principles">
          <div>
            <Code2 size={22} />
            <h3>Clear boundaries</h3>
            <p>
              Understandable code, explicit contracts and focused
              responsibilities.
            </p>
          </div>
          <div>
            <Database size={22} />
            <h3>Data with integrity</h3>
            <p>Validation, relational modelling and careful state changes.</p>
          </div>
          <div>
            <Network size={22} />
            <h3>Evidence before claims</h3>
            <p>Show what works, how it was verified and what comes next.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
