import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Experience from "./components/Experience";
import Education from "./components/Education";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import MotionProvider from "./components/MotionProvider";
import ScrollReveal from "./components/ScrollReveal";
export default function Page() {
  return (
    <MotionProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Projects />
        <About />
        <Skills />
        <Experience />
        <Education />
        <Contact />
      </main>
      <Footer />
      <ScrollReveal />
    </MotionProvider>
  );
}
