import MotionProvider from "../../components/MotionProvider";
import CodeCinema from "../../components/CodeCinema";
import Link from "next/link";
export const metadata={title:"Code Cinema prototype",robots:{index:false,follow:false}};
export default function Page(){return <MotionProvider><main><CodeCinema/><section id="projects"><Link href="/#projects">Return to selected projects</Link></section></main></MotionProvider>;}
