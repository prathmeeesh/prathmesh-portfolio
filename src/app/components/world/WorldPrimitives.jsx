"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const C = { cyan: "#68e9ed", blue: "#669dff", gold: "#ffbd78", violet: "#b1a0f3", metal: "#263f56", dark: "#112337" };
export function Box({ size = [1,1,1], color = C.metal, glow = false, ...props }) {
  return <mesh {...props}><boxGeometry args={size}/>{glow ? <meshBasicMaterial color={color} toneMapped={false}/> : <meshStandardMaterial color={color} metalness={.58} roughness={.38}/>}</mesh>;
}
export function Ring({ radius=1, tube=.04, color=C.cyan, ...props }) {
  return <mesh {...props}><torusGeometry args={[radius,tube,6,64]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>;
}
export function Cable({ points, color=C.cyan, radius=.035, rail=false }) {
  const curve = useMemo(()=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),[points]);
  return <group>
    {rail && <mesh><tubeGeometry args={[curve,48,radius*5,8,false]}/><meshStandardMaterial color="#5d9bb6" metalness={.3} roughness={.2} transparent opacity={.18} depthWrite={false}/></mesh>}
    <mesh><tubeGeometry args={[curve,48,radius,5,false]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>
  </group>;
}

function panelTexture(kind) {
  const canvas=document.createElement("canvas"); canvas.width=1024; canvas.height=640;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#0a1a2c";ctx.fillRect(0,0,1024,640);
  ctx.fillStyle="#1e364c";ctx.fillRect(0,0,1024,45);
  ["#f3ac87","#ffcf7b","#83d5be"].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(22+i*20,22,5,0,Math.PI*2);ctx.fill();});
  ctx.font="18px monospace";ctx.fillStyle="#b5d1e0";ctx.fillText(kind==="code"?"Folio / Controllers / BooksController.cs":kind==="tree"?"SOURCE CONTROL / REVIEW":"folio.  /  catalogue",120,28);
  if(kind==="code" || kind==="tree") {
    ctx.fillStyle="#0e2237";ctx.fillRect(0,45,205,595);
    ctx.font="17px monospace";
    ["FOLIO/","  Controllers/","  Services/","  Models/","  Data/","  Pages/","  wwwroot/","  Tests/"].forEach((s,i)=>{ctx.fillStyle=i===1?C.cyan:"#7d9caf";ctx.fillText(s,18,90+i*37);});
    const lines=kind==="code"?[
      "// A small boundary. A useful result.","[ApiController]","[Route(\"api/books\")]","public class BooksController : ControllerBase","{","    [HttpGet]","    public async Task<IActionResult> Search(","        [FromQuery] string query,","        CancellationToken ct)","    {","        var books = await search.FindAsync(query, ct);","        return Ok(books);","    }","}","// Illustrative C# / not a source capture",
    ]:["feature/catalogue-search","","  change → commit → review","         ↘","          ↘","main  ─────●────────●─────","                    merge","","A traceable change.","Not a deployment."];
    ctx.font="18px monospace";
    lines.forEach((s,i)=>{ctx.fillStyle="#516c85";ctx.fillText(String(i+1).padStart(2,"0"),225,90+i*32);ctx.fillStyle=s.includes("//")?"#7499a1":s.includes("public")||s.includes("return")?C.violet:s.includes("[")?C.gold:"#a5e4e9";ctx.fillText(s,266,90+i*32);});
  } else {
    ctx.fillStyle="#e7edf0";ctx.font="48px Georgia";ctx.fillText("Find your next read.",48,125);
    ctx.font="20px sans-serif";ctx.fillStyle="#a0bbc9";ctx.fillText("A considered place for curious minds.",50,165);
    ctx.fillStyle="#20384c";ctx.fillRect(50,200,924,55);ctx.fillStyle="#b4d9df";ctx.fillText("Search the catalogue…",72,235);
    if(kind==="results") {
      const titles=["Patterns of Software","A Curious Mind","Designing Systems"];
      titles.forEach((title,i)=>{
        const x=50+i*316;ctx.fillStyle=["#264d67","#74604b","#3f5864"][i];ctx.fillRect(x,295,292,235);
        ctx.strokeStyle="#a4cec2";ctx.lineWidth=1;ctx.strokeRect(x+18,315,256,195);
        ctx.fillStyle="#d7e6de";ctx.font="25px Georgia";ctx.fillText(title,x+26,400,240);
        ctx.font="14px monospace";ctx.fillText("SYNTHETIC DEMO",x+26,483);
        ctx.fillStyle="#b7d3d9";ctx.font="18px sans-serif";ctx.fillText("Explore this book →",x,568);
      });
    } else { ctx.strokeStyle="#3c6479";ctx.setLineDash([7,8]);[0,1,2].forEach(i=>ctx.strokeRect(50+i*316,295,292,235));ctx.setLineDash([]); }
    ctx.font="14px monospace";ctx.fillStyle="#7c9baa";ctx.fillText("ILLUSTRATED FOLIO INTERFACE • PUBLIC DEMO IS READ-ONLY",50,615);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4; return texture;
}
export function Screen({ kind="code", width=5, height=3.125, ...props }) {
  const texture=useMemo(()=>panelTexture(kind),[kind]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <group {...props}>
    <Box size={[width+.2,height+.2,.18]} color="#223d54"/>
    <mesh position={[0,0,.1]}><planeGeometry args={[width,height]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>
    <Box position={[0,-height/2-.11,.05]} size={[width*.82,.025,.05]} color={C.cyan} glow/>
  </group>;
}
export function Plaque({ text, width=3, color=C.cyan, ...props }) {
  const texture=useMemo(()=>{
    const el=document.createElement("canvas");el.width=768;el.height=128;
    const ctx=el.getContext("2d");ctx.fillStyle="#112337";ctx.fillRect(0,0,768,128);
    ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(2,2,764,124);
    ctx.font="30px monospace";ctx.fillStyle="#dbeaf2";ctx.textAlign="center";ctx.fillText(text,384,76,716);
    const t=new THREE.CanvasTexture(el);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[text,color]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh {...props}><planeGeometry args={[width,width/6]}/><meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide}/></mesh>;
}

export function FloatingIsland({ position, radius=4.5, color=C.cyan, children }) {
  return <group position={position}>
    <mesh position={[0,-.4,0]}><cylinderGeometry args={[radius,radius*.95,.8,64]}/><meshStandardMaterial color="#233c50" metalness={.7} roughness={.32}/></mesh>
    <mesh position={[0,.015,0]}><cylinderGeometry args={[radius*.95,radius*.95,.06,64]}/><meshStandardMaterial color="#152c40" metalness={.55} roughness={.45}/></mesh>
    <Ring radius={radius*.97} position={[0,.06,0]} rotation={[-Math.PI/2,0,0]} color={color}/>
    <Ring radius={radius*.8} position={[0,.065,0]} rotation={[-Math.PI/2,0,0]} color="#385d73" tube={.018}/>
    <mesh position={[0,-1.65,0]} rotation={[0,.3,Math.PI]}><coneGeometry args={[radius*.88,3.1,9,2]}/><meshStandardMaterial color="#152535" roughness={.92} flatShading/></mesh>
    {Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return <group key={i} position={[Math.sin(a)*radius*.96,-.35,Math.cos(a)*radius*.96]} rotation={[0,a,0]}><Box size={[.28,.7,.12]} color="#416075"/><Box position={[0,.1,.07]} size={[.1,.13,.025]} color={i%3===0?C.gold:color} glow/></group>;})}
    {Array.from({length:7},(_,i)=>{const a=i*2.4;return <mesh key={i} position={[Math.sin(a)*radius*.65,-1.7-(i%3)*.6,Math.cos(a)*radius*.65]} rotation={[i*.4,.3,i*.2]}><dodecahedronGeometry args={[.65+(i%3)*.15,0]}/><meshStandardMaterial color={i%2?"#20364a":"#142c41"} roughness={.9}/></mesh>;})}
    {children}
  </group>;
}
