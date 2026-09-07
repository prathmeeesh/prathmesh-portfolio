import { Download, Github, Mail } from "lucide-react";
import Section from "./ui/Section";

export default function Contact() {
  return (
    <Section
      id="contact"
      kicker="Contact"
      title="Discuss a software engineering opportunity"
      subtitle="Open to UK software developer, .NET and backend engineering roles."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <h3 className="text-sm font-semibold">Get in touch</h3>
          <div className="mt-4 text-xs text-gray-200 space-y-4">
            <a className="flex items-center gap-2 text-blue-200 underline decoration-dotted break-all" href="mailto:prathmeshwork01@gmail.com">
              <Mail size={16} className="shrink-0" aria-hidden="true" />
              prathmeshwork01@gmail.com
            </a>
            <div>
              <span className="text-gray-400">Phone:</span>{" "}
              <a className="text-blue-200 underline decoration-dotted" href="tel:+447727091049">+44 7727 091049</a>
            </div>
            <a
              className="inline-block text-blue-200 underline decoration-dotted"
              href="https://linkedin.com/in/prathmesh-pawar-29b5a7228"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn profile
            </a>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <h3 className="text-sm font-semibold">CV and public work</h3>
          <p className="mt-3 text-xs text-gray-300 leading-6">
            My CV covers commercial .NET experience, personal projects and MSc study.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <a className="inline-flex items-center gap-2 text-xs text-blue-200 underline decoration-dotted" href="/Prathmesh_Pawar_CV.pdf" download>
              <Download size={16} aria-hidden="true" />
              Download CV
            </a>
            <a
              className="inline-flex items-center gap-2 text-xs text-blue-200 underline decoration-dotted"
              href="https://github.com/prathmeeesh"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={16} aria-hidden="true" />
              GitHub profile
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}
