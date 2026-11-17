import Navbar from "../components/Navbar";
import EngineeringWorld from "../components/world/EngineeringWorld";
import About from "../components/About";
import Skills from "../components/Skills";
import Projects from "../components/Projects";
import Experience from "../components/Experience";
import Education from "../components/Education";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import MotionProvider from "../components/MotionProvider";
import ScrollReveal from "../components/ScrollReveal";

// Archived copy of the V2 homepage; noindex so it never competes with `/` as duplicate content.
export const metadata = {
  title: "Engineering Observatory V2 | Archived Preview",
  description: "Archived preview of the V2 scroll-driven engineering observatory portfolio.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

export default function Page() {
  return (
    <MotionProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <EngineeringWorld />
        <div className="portfolio-content">
          <Projects />
          <About />
          <Skills />
          <Experience />
          <Education />
          <Contact />
        </div>
      </main>
      <Footer />
      <ScrollReveal />
    </MotionProvider>
  );
}
