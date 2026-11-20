import PhotoJourney from "../components/code-to-experience/PhotoJourney";

export const metadata = {
  title: "From Code to Experience | Prathmesh Pawar",
  description:
    "An interactive, scroll-driven software engineering journey from a developer's laptop to backend systems, data, and the final interface.",
  // Preview route: kept out of search indexes until it is approved as the homepage (see docs/DEPLOYMENT_GUIDE.md).
  robots: { index: false, follow: false },
  alternates: { canonical: "/code-to-experience" },
  openGraph: {
    title: "From Code to Experience | Prathmesh Pawar",
    description: "Follow one line of C# from a developer's laptop through Git, CI, deployment, ASP.NET Core and SQL Server to a real interface.",
    url: "/code-to-experience",
    type: "website",
  },
};

// Structured data limited to verifiable facts (CV, November 2026).
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      name: "Prathmesh Pawar",
      jobTitle: "Software Developer",
      email: "mailto:prathmeshwork01@gmail.com",
      address: { "@type": "PostalAddress", addressLocality: "Leicester", addressCountry: "GB" },
      knowsAbout: ["C#", ".NET", "ASP.NET Core", "SQL Server", "Entity Framework Core", "JavaScript"],
      sameAs: ["https://github.com/prathmeeesh", "https://linkedin.com/in/prathmesh-pawar-29b5a7228"],
    },
    { "@type": "WebSite", name: "Prathmesh Pawar — Engineering Observatory", url: "https://prathmesh-portfolio.vercel.app" },
  ],
};

export default function CodeToExperiencePreview() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
    <PhotoJourney />
  </>;
}
