import PhotoJourney from "../components/code-to-experience/PhotoJourney";

export const metadata = {
  title: "From Code to Experience | Prathmesh Pawar",
  description:
    "An interactive, scroll-driven software engineering journey from a developer's laptop to backend systems, data, and the final interface.",
  robots: { index: false, follow: false },
};

export default function CodeToExperiencePreview() {
  return <PhotoJourney />;
}
