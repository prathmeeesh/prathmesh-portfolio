import WorldExperience from "./WorldExperience";

export const metadata = {
  robots: { index: false, follow: false },
  title: "CodeWorld 3D | Prathmesh Pawar",
  description: "Travel through a real-time 3D visual story of how source code is built, deployed, executed, and rendered as a usable interface.",
};

export default function EngineeringWorldPage() {
  return <WorldExperience />;
}
