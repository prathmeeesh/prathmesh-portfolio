import {
  ArrowUpRight,
  Download,
  Github,
  Linkedin,
  Mail,
  Phone,
} from "lucide-react";
export default function Contact() {
  return (
    <section
      id="contact"
      className="contact-section shell"
      aria-labelledby="contact-title"
    >
      <div className="contact-orbit" aria-hidden="true" />
      <p className="eyebrow">06 / Start a conversation</p>
      <h2 id="contact-title">
        Good software starts
        <br />
        with a <span className="serif-word">conversation.</span>
      </h2>
      <p className="contact-description">
        Exploring UK software engineering, .NET, backend and relevant
        AI-integrated application opportunities.
      </p>
      <a className="contact-email" href="mailto:prathmeshwork01@gmail.com">
        prathmeshwork01@gmail.com <ArrowUpRight />
      </a>
      <div className="contact-actions">
        <a className="button primary" href="/Prathmesh_Pawar_CV.pdf" download>
          <Download size={17} /> Download my CV
        </a>
        <a
          className="button quiet"
          href="https://linkedin.com/in/prathmesh-pawar-29b5a7228"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Linkedin size={17} /> LinkedIn
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <a
          className="button quiet"
          href="https://github.com/prathmeeesh"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github size={17} /> GitHub
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <div className="contact-bottom">
        <span>
          <Mail size={14} /> Based in Leicester. Open to UK opportunities.
        </span>
        <a href="tel:+447727091049">
          <Phone size={14} /> +44 7727 091049
        </a>
      </div>
    </section>
  );
}
