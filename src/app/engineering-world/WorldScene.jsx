"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { NODES, SHOTS } from "./worldData";
import styles from "./world.module.css";

const CYAN = "#63f4e6";
const BLUE = "#43b8ff";
const VIOLET = "#b59cff";
const GOLD = "#ffbc73";
const islandNames = [
  ["idea", "01 / DEVELOPMENT"], ["git", "02 / GIT"],
  ["build", "03 / CI & TESTS"], ["deploy", "04 / CLOUD"],
  ["frontend", "05 / FRONTEND"], ["api", "06 / .NET API"],
  ["database", "07 / SQL DATABASE"],
];

const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
const smooth = t => t*t*(3-2*t);

function CameraRig({ progress }) {
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({camera},dt) => {
    const p = clamp(progress.current,0,1) * (SHOTS.length - 1);
    const a = Math.min(SHOTS.length - 2, Math.floor(p));
    const k = smooth(p-a);
    position.set(...SHOTS[a].pos).lerp(new THREE.Vector3(...SHOTS[a+1].pos),k);
    target.set(...SHOTS[a].target).lerp(new THREE.Vector3(...SHOTS[a+1].target),k);
    const ease = 1 - Math.exp(-Math.min(.06,dt)*4.5);
    camera.position.lerp(position,ease);
    look.lerp(target,ease);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  });
  return null;
}

function Starfield({ count=500 }) {
  const geometry=useMemo(()=>{
    const points=new Float32Array(count*3);
    let seed=5817;
    const random=()=>{ seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<count;i++){
      points[i*3]=(random()-.5)*185;
      points[i*3+1]=12+random()*68;
      points[i*3+2]=(random()-.5)*150;
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.BufferAttribute(points,3));
    return g;
  },[count]);
  return <points geometry={geometry}><pointsMaterial color="#afdbff" size={.18} sizeAttenuation transparent opacity={.7} depthWrite={false}/></points>;
}

function Cloud({position,scale=1}){
  return <group position={position} scale={scale}>
    {[[-1.6,0,0],[0,.22,.1],[1.5,-.1,0],[.4,-.13,-.8]].map((p,i)=><mesh key={i} position={p}>
      <sphereGeometry args={[1.5,10,8]}/><meshStandardMaterial color="#9aafcf" transparent opacity={.12} depthWrite={false}/>
    </mesh>)}
  </group>;
}

function Island({position,radius=4,accent=CYAN,children}){
  return <group position={position}>
    <mesh receiveShadow position={[0,-.42,0]}>
      <cylinderGeometry args={[radius,radius*.9,1.1,11]}/>
      <meshStandardMaterial color="#335458" roughness={.94} flatShading/>
    </mesh>
    <mesh castShadow position={[0,-2.3,0]} rotation={[0,.35,0]}>
      <coneGeometry args={[radius*.88,4.2,9,1]}/>
      <meshStandardMaterial color="#21363d" roughness={.96} flatShading/>
    </mesh>
    {[[-1,-3.5,1.3],[1.8,-2.8,-1],[.8,-3.9,1.8]].map((v,i)=><mesh key={i} position={v} rotation={[.2,i*.8,.25]}>
      <dodecahedronGeometry args={[.84,0]}/><meshStandardMaterial color={i%2?"#1e3239":"#294149"} flatShading/>
    </mesh>)}
    <mesh position={[0,.21,0]} receiveShadow>
      <cylinderGeometry args={[radius*.99,radius, .29,13]}/>
      <meshStandardMaterial color="#2e6662" roughness={.87} flatShading/>
    </mesh>
    <mesh position={[0,.36,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[radius*.92,radius*.96,40]}/>
      <meshBasicMaterial color={accent} transparent opacity={.45} side={THREE.DoubleSide}/>
    </mesh>
    <mesh position={[0,-2.15,radius*.79]}>
      <planeGeometry args={[1.75,4.3]}/>
      <meshBasicMaterial color={BLUE} transparent opacity={.28} side={THREE.DoubleSide} depthWrite={false}/>
    </mesh>
    {children}
  </group>;
}

function LaserTube({ start,end,color=CYAN,opacity=.58,thickness=.085}) {
  const curve=useMemo(()=>new THREE.CatmullRomCurve3([
    new THREE.Vector3(...start),
    new THREE.Vector3(start[0]+(end[0]-start[0])*.3,Math.max(start[1],end[1])+1.25,start[2]+(end[2]-start[2])*.3),
    new THREE.Vector3(start[0]+(end[0]-start[0])*.7,Math.max(start[1],end[1])+1.15,start[2]+(end[2]-start[2])*.7),
    new THREE.Vector3(...end),
  ]),[start,end]);
  const geometry=useMemo(()=>new THREE.TubeGeometry(curve,64,thickness,6,false),[curve,thickness]);
  return <mesh geometry={geometry}>
    <meshBasicMaterial color={color} transparent opacity={opacity}/>
  </mesh>;
}

function SmallTree({position,scale=1}) {
  return <group position={position} scale={scale}>
    <mesh position={[0,.65,0]} castShadow><cylinderGeometry args={[.09,.18,1.3,5]}/><meshStandardMaterial color="#7e5540"/></mesh>
    <mesh position={[0,1.7,0]} castShadow><icosahedronGeometry args={[.95,0]}/><meshStandardMaterial color="#23554d" flatShading/></mesh>
    <mesh position={[.45,1.45,.2]} castShadow><icosahedronGeometry args={[.65,0]}/><meshStandardMaterial color="#3b7461" flatShading/></mesh>
  </group>;
}

function NeonPanel({position=[0,0,0],size=[3,2,.12],color=BLUE,children}){
  return <group position={position}>
    <mesh castShadow><boxGeometry args={size}/><meshStandardMaterial color="#071627" emissive="#06162c" emissiveIntensity={.4} metalness={.45} roughness={.35}/></mesh>
    <mesh position={[0,0,size[2]/2+.006]}>
      <planeGeometry args={[size[0]*.94,size[1]*.91]}/>
      <meshBasicMaterial color="#0a2534" side={THREE.DoubleSide}/>
    </mesh>
    <mesh position={[0,0,size[2]/2+.009]}><ringGeometry args={[.11,.16,4]}/><meshBasicMaterial color={color} transparent opacity={.7}/></mesh>
    {children}
  </group>;
}

function CodeStudio(){
  return <group>
    <mesh position={[0,.95,0]} castShadow><boxGeometry args={[3.6,.2,2]}/><meshStandardMaterial color="#544b5a"/></mesh>
    <mesh position={[-.45,2,.05]} rotation={[-.12,0,0]} castShadow>
      <boxGeometry args={[2.6,1.8,.14]}/><meshStandardMaterial color="#0d1826" metalness={.7} roughness={.3}/>
    </mesh>
    <mesh position={[-.45,2,.15]} rotation={[-.12,0,0]}><planeGeometry args={[2.4,1.55]}/><meshBasicMaterial color="#061a28"/></mesh>
    {Array.from({length:8},(_,i)=><mesh key={i} position={[-1.3+i%3*.2,2.55-i*.17,.23]} rotation={[-.12,0,0]}>
      <planeGeometry args={[1.25-(i%3)*.17,.045]}/><meshBasicMaterial color={i%3===1?VIOLET:CYAN}/>
    </mesh>)}
    <mesh position={[.3,1.07,1.1]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.95,.8]}/><meshStandardMaterial color="#171c25"/></mesh>
    <mesh position={[1.25,1.8,0]}><boxGeometry args={[.7,1.4,.8]}/><meshStandardMaterial color="#1c2c3b"/></mesh>
    <SmallTree position={[-2.8,.36,1.4]} scale={.65}/><SmallTree position={[2.65,.36,-1.5]} scale={.8}/>
    <pointLight position={[0,3,.5]} color={CYAN} intensity={9} distance={7}/>
  </group>;
}

function GitGrove(){
  return <group>
    {[[-2,1.5,0],[0,2.3,0],[2.2,1.5,0]].map((v,i)=><group key={i} position={v}>
      <mesh><icosahedronGeometry args={[.46,1]}/><meshStandardMaterial color="#172a43" emissive={VIOLET} emissiveIntensity={.7} metalness={.3}/></mesh>
      <mesh scale={1.5}><icosahedronGeometry args={[.46,1]}/><meshBasicMaterial color={VIOLET} wireframe transparent opacity={.34}/></mesh>
    </group>)}
    <LaserTube start={[-2,1.5,0]} end={[0,2.3,0]} color={VIOLET} thickness={.14}/>
    <LaserTube start={[0,2.3,0]} end={[2.2,1.5,0]} color={VIOLET} thickness={.14}/>
    <mesh position={[0,.9,1.4]}><boxGeometry args={[3,.24,1.5]}/><meshStandardMaterial color="#172c3a"/></mesh>
    <mesh position={[0,1.24,1.4]}><boxGeometry args={[2.4,.5,.9]}/><meshStandardMaterial color="#273c59" emissive="#152b45"/></mesh>
    <SmallTree position={[2.9,.4,-1.6]} scale={.7}/>
    <pointLight position={[0,2,1]} color={VIOLET} intensity={9} distance={8}/>
  </group>;
}

function BuildWorks({progress}) {
  const ring=useRef(null);
  useFrame(()=>{if(ring.current)ring.current.rotation.z=progress.current*17;});
  return <group>
    <mesh position={[0,1.1,0]} castShadow><boxGeometry args={[4,1.4,2.7]}/><meshStandardMaterial color="#1c3041" roughness={.5}/></mesh>
    <group ref={ring} position={[0,2.8,.5]}>
      <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.2,.22,10,32]}/><meshStandardMaterial color="#4a342e" metalness={.75} emissive={GOLD} emissiveIntensity={.65}/></mesh>
      {[0,Math.PI/2,Math.PI,Math.PI*1.5].map((a,i)=><mesh key={i} position={[Math.cos(a)*1.2,Math.sin(a)*1.2,0]}><boxGeometry args={[.5,.45,.5]}/><meshStandardMaterial color="#b87339"/></mesh>)}
    </group>
    {[[-1.3,.8,1.6],[0,.8,1.6],[1.3,.8,1.6]].map((p,i)=><mesh key={i} position={p}>
      <boxGeometry args={[.85,.3,.5]}/><meshStandardMaterial color={i===1?CYAN:BLUE} emissive={i===1?CYAN:BLUE} emissiveIntensity={1.3}/>
    </mesh>)}
    <mesh position={[0,3.7,-1.2]}><boxGeometry args={[3,.25,.3]}/><meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1}/></mesh>
    <pointLight position={[0,2,2]} intensity={12} color={GOLD} distance={8}/>
  </group>;
}

function CloudDock({progress}) {
  const circle = useRef(null);
  useFrame(()=>{if(circle.current)circle.current.rotation.z=progress.current*4;});
  return <group>
    {[-1.7,0,1.7].map((x,i)=><group key={i} position={[x,1,0]}>
      <mesh castShadow><boxGeometry args={[1.3,2.8,1.5]}/><meshStandardMaterial color="#162d40" metalness={.7}/></mesh>
      {Array.from({length:5},(_,j)=><mesh key={j} position={[0,-.9+j*.42,.78]}>
        <boxGeometry args={[.92,.11,.045]}/><meshBasicMaterial color={j%2?BLUE:CYAN}/>
      </mesh>)}
    </group>)}
    <group ref={circle} position={[0,3.3,.2]}><mesh><torusGeometry args={[1.6,.08,8,48]}/><meshBasicMaterial color={GOLD}/></mesh></group>
    <mesh position={[0,3.3,.2]}><sphereGeometry args={[.5,16,12]}/><meshStandardMaterial color="#ffdbb3" emissive={GOLD} emissiveIntensity={2}/></mesh>
    <pointLight position={[0,3,2]} color={GOLD} distance={10} intensity={15}/>
  </group>;
}

function BrowserWorld({progress}){
  const ref=useRef(null);
  useFrame(()=>{if(ref.current){const p=progress.current;ref.current.scale.setScalar(.82+.18*clamp((p-.43)*7,0,1));}});
  return <group ref={ref} position={[0,2.7,0]}>
    <NeonPanel size={[7,4.5,.32]} color={CYAN}/>
    <mesh position={[0,1.93,.2]}><planeGeometry args={[6.56,.35]}/><meshBasicMaterial color="#1c5265"/></mesh>
    {[[-2.86,1.94,.23],[-2.59,1.94,.23],[-2.32,1.94,.23]].map((p,i)=><mesh key={i} position={p}><sphereGeometry args={[.065,8,8]}/><meshBasicMaterial color={i===0?GOLD:CYAN}/></mesh>)}
    <mesh position={[-1.85,.65,.2]}><planeGeometry args={[2.55,1.65]}/><meshBasicMaterial color="#25486c"/></mesh>
    <mesh position={[-1.9,.6,.23]}><coneGeometry args={[.85,1.45,3]}/><meshBasicMaterial color={VIOLET}/></mesh>
    <mesh position={[-1.2,.6,.24]}><sphereGeometry args={[.22,12,12]}/><meshBasicMaterial color="#b1e8ff"/></mesh>
    {[0,1,2].map((i)=><group key={i} position={[1.05+i*.83,.76,.25]}>
      <mesh><planeGeometry args={[.66,1.32]}/><meshBasicMaterial color={i===1?"#20385e":"#244966"}/></mesh>
      <mesh position={[0,.3,.012]}><planeGeometry args={[.42,.15]}/><meshBasicMaterial color={i===1?VIOLET:CYAN}/></mesh>
      <mesh position={[0,-.25,.012]}><planeGeometry args={[.46,.08]}/><meshBasicMaterial color="#9ac7dd"/></mesh>
    </group>)}
    <mesh position={[0,-1.27,.2]}><planeGeometry args={[5.8,.62]}/><meshBasicMaterial color="#10314a"/></mesh>
    {Array.from({length:13},(_,i)=><mesh key={i} position={[-2.65+i*.44,-1.15+Math.sin(i*.7)*.2,.23]}>
      <sphereGeometry args={[.06,8,8]}/><meshBasicMaterial color={CYAN}/>
    </mesh>)}
    <mesh position={[0,-2.52,0]}><boxGeometry args={[.24,.65,.22]}/><meshStandardMaterial color="#395469"/></mesh>
    <mesh position={[0,-2.9,0]}><boxGeometry args={[2,.2,1.4]}/><meshStandardMaterial color="#334d62"/></mesh>
    <pointLight position={[0,0,2]} color={BLUE} intensity={14} distance={10}/>
  </group>;
}

function BackendCore(){
  return <group>
    {[-1.8,0,1.8].map((x,i)=><group key={i} position={[x,1.9,0]}>
      <mesh castShadow><boxGeometry args={[1.5,3.8,1.6]}/><meshStandardMaterial color="#142a3a" metalness={.55} roughness={.4}/></mesh>
      {Array.from({length:6},(_,j)=><mesh key={j} position={[0,1.3-j*.48,.83]}>
        <boxGeometry args={[1.05,.12,.035]}/><meshBasicMaterial color={i===1?VIOLET:CYAN}/>
      </mesh>)}
    </group>)}
    <mesh position={[0,4.8,0]}><octahedronGeometry args={[.8,0]}/><meshStandardMaterial color="#3a2c63" emissive={VIOLET} emissiveIntensity={1.4}/></mesh>
    <SmallTree position={[3.1,.3,1.7]} scale={.65}/>
    <pointLight position={[0,4,2]} intensity={13} color={VIOLET} distance={9}/>
  </group>;
}

function DatabaseChamber(){
  return <group>
    {[0,1,2].map((i)=><group key={i} position={[0,.8+i*1.05,0]}>
      <mesh><cylinderGeometry args={[1.9,1.9,.83,32]}/><meshStandardMaterial color="#1a4057" metalness={.62} roughness={.3}/></mesh>
      <mesh position={[0,.43,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.85,.085,7,40]}/><meshBasicMaterial color={CYAN}/></mesh>
    </group>)}
    <mesh position={[0,3.9,0]}><sphereGeometry args={[.6,16,16]}/><meshStandardMaterial color={CYAN} transparent opacity={.7} emissive={CYAN} emissiveIntensity={2}/></mesh>
    {[[-2.7,.5,-1.9],[2.4,.5,1.8]].map((p,i)=><mesh key={i} position={p}><boxGeometry args={[.5,.9,.5]}/><meshStandardMaterial color="#376b80"/></mesh>)}
    <pointLight position={[0,3,2]} color={CYAN} intensity={14} distance={9}/>
  </group>;
}

function Courier({progress}){
  const ref=useRef(null);
  const head=useRef(null);
  const route=useMemo(()=>new THREE.CatmullRomCurve3([
    new THREE.Vector3(-27,1.1,0),new THREE.Vector3(-17,1.1,4),
    new THREE.Vector3(-6,1.1,-2),new THREE.Vector3(6,1.1,4),
  ]),[]);
  useFrame(()=>{
    const p=progress.current;
    if(!ref.current)return;
    ref.current.visible=p<.54;
    const t=clamp(p/.52,0,1);
    const location=route.getPoint(t);
    const tangent=route.getTangent(t);
    ref.current.position.set(location.x,location.y+.16*Math.abs(Math.sin(t*58)),location.z);
    ref.current.rotation.y=Math.atan2(tangent.x,tangent.z);
    if(head.current)head.current.rotation.z=.12*Math.sin(t*47);
  });
  return <group ref={ref} scale={.9}>
    <mesh castShadow position={[0,.7,0]}><boxGeometry args={[.74,.95,.54]}/><meshStandardMaterial color="#ffd6a4" roughness={.7}/></mesh>
    <mesh ref={head} castShadow position={[0,1.6,0]}><sphereGeometry args={[.51,16,12]}/><meshStandardMaterial color="#ffd6ae" roughness={.9}/></mesh>
    <mesh position={[0,1.73,.46]}><boxGeometry args={[.5,.2,.07]}/><meshBasicMaterial color="#183446"/></mesh>
    {[-.27,.27].map((x,i)=><mesh key={i} position={[x,.03,0]} rotation={[.1,0,0]}>
      <boxGeometry args={[.23,.63,.25]}/><meshStandardMaterial color="#344d5e"/></mesh>)}
    <mesh position={[.62,1.04,.32]} rotation={[0,0,.28]}><boxGeometry args={[.33,.6,.3]}/><meshStandardMaterial color="#ffd6ae"/></mesh>
    <mesh position={[.85,1.14,.45]}><boxGeometry args={[.43,.43,.43]}/><meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.7}/></mesh>
    <pointLight position={[.85,1.2,.5]} color={GOLD} intensity={4} distance={4}/>
  </group>;
}

function RuntimePacket({progress}) {
  const ref=useRef(null);
  const curve=useMemo(()=>new THREE.CatmullRomCurve3([
    new THREE.Vector3(22,3,-2),
    new THREE.Vector3(10,3,17),
    new THREE.Vector3(-2,3,20),
    new THREE.Vector3(22,3,-2),
  ]),[]);
  useFrame(()=>{
    if(!ref.current)return;
    const p=progress.current;
    ref.current.visible=p>=.49;
    const position=curve.getPoint(clamp((p-.49)/.51,0,1));
    ref.current.position.copy(position);
    const s=.72+.27*Math.sin(p*65)**2;
    ref.current.scale.setScalar(s);
  });
  return <group ref={ref}>
    <mesh><icosahedronGeometry args={[.35,1]}/><meshStandardMaterial color="#e1fcff" emissive={BLUE} emissiveIntensity={2.9}/></mesh>
    <mesh scale={1.65}><icosahedronGeometry args={[.35,1]}/><meshBasicMaterial color={CYAN} transparent wireframe opacity={.55}/></mesh>
    <pointLight color={CYAN} distance={5} intensity={8}/>
  </group>;
}

function Stage({name,position,progress}){
  const item=islandNames.find(([id])=>id===name);
  return <Island position={position} radius={name==="frontend"?5.9:name==="idea"?4.7:4.4} accent={name==="deploy"||name==="build"?GOLD:name==="git"||name==="api"?VIOLET:CYAN}>
    {name==="idea"&&<CodeStudio/>}
    {name==="git"&&<GitGrove/>}
    {name==="build"&&<BuildWorks progress={progress}/>}
    {name==="deploy"&&<CloudDock progress={progress}/>}
    {name==="frontend"&&<BrowserWorld progress={progress}/>}
    {name==="api"&&<BackendCore/>}
    {name==="database"&&<DatabaseChamber/>}
    <Html position={[0,6.1,0]} center distanceFactor={15} zIndexRange={[5,0]} style={{pointerEvents:"none"}}>
      <div className={styles.stationLabel}>{item?.[1]}</div>
    </Html>
  </Island>;
}

function World({progress,quality}){
  const cablePairs=[
    ["idea","git"],["git","build"],["build","deploy"],
    ["deploy","frontend"],["frontend","api"],["api","database"],["database","frontend"],
  ];
  return <>
    <color attach="background" args={["#06111e"]}/>
    <fog attach="fog" args={["#06111e",38,120]}/>
    <ambientLight intensity={.82} color="#9fbedf"/>
    <directionalLight position={[-15,30,8]} intensity={3.3} color="#ffd1a7" castShadow={quality==="high"} shadow-mapSize={[1024,1024]}/>
    <pointLight position={[19,15,-24]} color="#ec824a" intensity={75} distance={75}/>
    <pointLight position={[-21,8,15]} color={BLUE} intensity={22} distance={34}/>
    <Starfield count={quality==="high"?760:300}/>
    <mesh position={[18,16,-65]}><sphereGeometry args={[6.1,24,16]}/><meshBasicMaterial color="#ffad83"/></mesh>
    <mesh position={[18,16,-65]} scale={1.6}><sphereGeometry args={[6.1,24,16]}/><meshBasicMaterial color={GOLD} transparent opacity={.055} depthWrite={false}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-16,0]}><planeGeometry args={[260,240]}/><meshStandardMaterial color="#081d2b" roughness={.42} metalness={.38}/></mesh>
    {Object.entries(NODES).filter(([key])=>key!=="result").map(([name,xyz])=><Stage key={name} name={name} position={xyz} progress={progress}/>)}
    {cablePairs.map(([from,to],i)=><LaserTube key={i}
      start={[NODES[from][0],.6,NODES[from][2]]}
      end={[NODES[to][0],.6,NODES[to][2]]}
      color={i<4?GOLD:CYAN} opacity={.61} thickness={.085}/>) }
    {[
      [-26,-4,5],[-17,-5,12],[-4,-5,5],[7,-5,10],[21,-6,5],[11,-5,23],[-3,-5,27]
    ].map((v,i)=><Cloud key={i} position={v} scale={1.6+(i%3)*.36}/>)}
    <Courier progress={progress}/><RuntimePacket progress={progress}/>
    <CameraRig progress={progress}/>
  </>;
}

export default function WorldScene({progress,quality,onContextFailure}){
  return <div className={styles.canvasFrame} aria-label="Real-time three-dimensional engineering world; use the text descriptions to understand each stage">
    <Canvas
      shadows={quality==="high"}
      dpr={quality==="high"?[1,1.6]:[1,1]}
      camera={{position:[-34,12,23],fov:46,near:.05,far:250}}
      gl={{alpha:false,antialias:quality==="high",powerPreference:"high-performance"}}
      onCreated={({gl})=>{const canvas=gl.domElement;canvas.addEventListener("webglcontextlost",onContextFailure,{once:true});}}
    >
      <World progress={progress} quality={quality}/>
    </Canvas>
  </div>;
}
