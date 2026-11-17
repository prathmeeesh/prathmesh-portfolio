import MotionProvider from "../components/MotionProvider";
import IllustratedPortfolio from "./IllustratedPortfolio";

export const metadata = {
  title: "From Code to Experience | Prathmesh Pawar",
  description:
    "An illustrated, scroll-driven journey through software development, deployment, backend engineering, and the user experience.",
  robots: { index: false, follow: false },
};

export default function IllustrationPreviewPage() {
  return (
    <MotionProvider>
      <IllustratedPortfolio />
    </MotionProvider>
  );
}
