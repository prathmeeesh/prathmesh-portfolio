export default function WorldFallback() {
  return <svg viewBox="0 0 1000 700" aria-hidden="true" focusable="false">
    <defs><linearGradient id="fallback-flow"><stop stopColor="#5ae6ef"/><stop offset="1" stopColor="#f5b878"/></linearGradient></defs>
    <g fill="none" stroke="url(#fallback-flow)" strokeWidth="1.5" opacity=".65">
      <path d="M200 240 450 150 770 260 730 490 420 550 200 240M450 150 420 550M770 260 420 550"/>
      {[[200,240],[450,150],[770,260],[730,490],[420,550]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}>
        <path d="M-65 0 0-35 65 0 0 35Z M-65 0v25L0 60l65-35V0 M0 35v25"/>
        <path d="M-30-20v-60L0-95l30 15v60L0-5Z M0-5v-60L-30-80 M0-65l30-15"/>
      </g>)}
    </g>
  </svg>;
}
