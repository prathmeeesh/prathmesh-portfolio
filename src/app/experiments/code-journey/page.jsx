import MotionProvider from "../../components/MotionProvider";
import CodeJourney from "../../components/CodeJourney";
import Link from "next/link";
export const metadata={title:"Code Journey prototype",robots:{index:false,follow:false}};
export default function Page(){return <MotionProvider><main><CodeJourney/><Link href="/#projects">Return to selected projects</Link></main></MotionProvider>;}
