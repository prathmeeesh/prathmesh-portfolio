import Link from "next/link";
import { notFound } from "next/navigation";
import { caseStudies } from "../../data/caseStudies";
export function generateStaticParams(){return Object.keys(caseStudies).map(slug=>({slug}));}
export async function generateMetadata({params}){
  const {slug}=await params;const item=caseStudies[slug];
  return item?{title:`${item.title} | Prathmesh Pawar`,description:item.introduction,alternates:{canonical:`/work/${slug}`}}:{};
}
export default async function Page({params}){
  const {slug}=await params;const item=caseStudies[slug];if(!item)notFound();
  return <main className="study-page shell">
    <Link className="text-link" href="/#projects">← Back to selected work</Link>
    <header><p className="eyebrow">{item.category}</p><h1>{item.title}</h1><p className="study-intro">{item.introduction}</p><ul className="tags">{item.stack.map(s=><li key={s}>{s}</li>)}</ul>
      <div className="project-links">{item.links.map(link=>link.url.startsWith('/')?<Link key={link.url} className="text-link" href={link.url}>{link.label} ↗</Link>:<a key={link.url} className="text-link" href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div>
    </header>
    <div className="study-sections">{item.sections.map(([title,body],i)=><section key={title} aria-labelledby={`section-${i}`}><p className="eyebrow">{String(i+1).padStart(2,'0')}</p><div><h2 id={`section-${i}`}>{title}</h2><p>{body}</p></div></section>)}</div>
    <footer><Link className="button primary" href="/#contact">Discuss the engineering ↗</Link><a className="text-link" href="/Prathmesh_Pawar_CV.pdf" download>Download CV</a></footer>
  </main>;
}
