"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Laboratory, { ARTIFACT_ANCHOR, Workstation } from "./environments/Laboratory";
import { CloudBanks, HORIZON, SkyDome } from "./Atmosphere";

const CODE_CUBE = new THREE.BoxGeometry(.37,.37,.37);

const SPACING = 13;
const STATIONS = 13;
const ACCENTS = ["#42cdd4", "#2bdfcd", "#b3a1e8", "#ffc078", "#ffbc7d", "#54cddd", "#9d8cea", "#42bddf", "#59d7d3", "#a9a2f1", "#ffc683", "#73b7df", "#5cd3c7"];
const ROCK = "#53677b";
const STONE = "#a9bdc5";
const STEEL = "#234760";

function Box({ at = [0, 0, 0], size = [1, 1, 1], color = STEEL, emissive, metalness = 0.45, roughness = 0.45, ...props }) {
  return <mesh position={at} {...props} castShadow={false} receiveShadow={false}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} emissive={emissive || "#000000"} emissiveIntensity={emissive ? 0.5 : 0} />
  </mesh>;
}

function Pillar({ x, z, height = 2.6 }) {
  return <group position={[x, 0, z]}>
    <Box at={[0, height / 2, 0]} size={[0.15, height, 0.15]} color="#6f8894" metalness={0.8}/>
    <mesh position={[0, height, 0]}><octahedronGeometry args={[0.18, 0]}/><meshBasicMaterial color="#6de9de" toneMapped={false}/></mesh>
  </group>;
}

function Island({ i, children, quality }) {
  const accent = ACCENTS[i];
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(4.6, 0.9, 4.65, quality === "low" ? 10 : 16, 5, false);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const irregular = 1 + 0.07 * Math.sin(x * 2.13 + i) * Math.cos(z * 1.92 - i) + 0.04 * Math.sin(k * 2.4);
      p.setXYZ(k, x * irregular, y + Math.sin(k * 0.83) * 0.07, z * irregular);
    }
    g.computeVertexNormals();
    return g;
  }, [i, quality]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <group position={[i * SPACING, 0, Math.sin(i * 0.64) * 1.5]}>
    <mesh geometry={geo} position={[0, -2.55, 0]}><meshStandardMaterial color={ROCK} roughness={0.96} flatShading /></mesh>
    <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[4.7, 4.7, 0.4, 48]}/><meshStandardMaterial color={STONE} roughness={0.75}/></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
      <torusGeometry args={[4.53, 0.068, 6, 64]}/>
      <meshBasicMaterial color={accent} toneMapped={false}/>
    </mesh>
    <mesh position={[0, -4.45, 0]} rotation={[0.3, i * 0.3, 0]}>
      <icosahedronGeometry args={[1.06, 1]}/><meshStandardMaterial color="#466477" roughness={1} flatShading/>
    </mesh>
    <Pillar x={-3.35} z={-2.3} height={1.6}/>
    <Pillar x={3.15} z={2.3} height={1.2}/>
    {children}
  </group>;
}

function Cable({ points, color = "#54cddd", radius = 0.07 }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 36, radius, 6, false), [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshBasicMaterial color={color} toneMapped={false}/></mesh>;
}

function GitSculpture() {
  const arcs=[[[ -3,.45,-.9],[-1,1.75,-.75],[.5,1.1,-.1],[2.9,1.9,0]], [[-3,.45,-.9],[-1,2.4,1],[.5,1.1,-.1],[2.9,1.9,0]]];
  return <group>
    {arcs.map((a,i)=><Cable key={i} points={a} color={i?"#9f8be8":"#45d2cf"} radius={0.11}/>)}
    {[[ -3,.45,-.9],[-1,1.75,-.75],[-1,2.4,1],[.5,1.1,-.1],[2.9,1.9,0]].map((p,j)=><mesh key={j} position={p}><icosahedronGeometry args={[.27,1]}/><meshStandardMaterial color={j%2?"#d6a3ff":"#72f6e8"} emissive="#2b7a82" emissiveIntensity={.6}/></mesh>)}
    <Box at={[0,.45,-2.2]} size={[5.4,.7,.65]} color="#447789"/>
  </group>;
}

function BuildFactory() {
  return <group>
    {Array.from({length:4},(_,j)=>{const x=-2.55+j*1.7;return <group key={j} position={[x,0,0]}>
      <Box at={[0,.85,0]} size={[1.4,1.7,1.85]} color={j===3?"#49697a":"#243d51"}/>
      <Box at={[0,1.8,.95]} size={[.92,.15,.08]} color={j===3?"#ffcb82":"#78e7e1"} emissive="#658f9c"/>
      <mesh position={[0,2.35,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.48,.12,6,16]}/><meshStandardMaterial color="#f5bc78" metalness={.55} roughness={.3}/></mesh>
    </group>})}
    <Cable points={[[-3,.15,2.0],[-1,.15,2.0],[1,.15,2.0],[3,.15,2.0]]} color="#ffa974" radius={.11}/>
  </group>;
}

function PortalAndServers() {
  return <group>
    {[-2.6,2.6].map(x=><group key={x} position={[x,0,-.9]}>
      <Box at={[0,1.4,0]} size={[1.4,2.8,1.45]} color="#1d3950"/>
      {Array.from({length:7},(_,j)=><Box key={j} at={[0,.32+j*.34,.75]} size={[.9,.065,.06]} color={j%2?"#ffa974":"#8aebe2"} emissive="#416982"/>)}
    </group>)}
    <mesh position={[0,2.35,-1]}><torusGeometry args={[2.12,.23,12,72]}/><meshStandardMaterial color="#85c0ca" emissive="#c96c2b" emissiveIntensity={.85} metalness={.75} roughness={.25}/></mesh>
    <mesh position={[0,2.35,-.97]}><torusGeometry args={[1.76,.064,8,72]}/><meshBasicMaterial color="#a8f8e9" toneMapped={false}/></mesh>
    <Box at={[0,.13,1.3]} size={[3.25,.13,2.5]} color="#2e627b"/>
  </group>;
}

function BrowserUI() {
  return <group>
    <Box at={[0,1.73,-1]} size={[7,4.05,.25]} color="#183951"/>
    <Box at={[0,1.74,-.84]} size={[6.63,3.67,.035]} color="#e9f6f6" metalness={.1} roughness={.6}/>
    <Box at={[0,3.33,-.79]} size={[6.6,.48,.032]} color="#30627a"/>
    <Box at={[-2.45,2.63,-.77]} size={[1.18,.26,.03]} color="#5cc7c5"/>
    {Array.from({length:3},(_,j)=><group key={j}>
      <Box at={[-2+j*2.02,1.28,-.77]} size={[1.66,1.55,.04]} color={j===1?"#e9c99d":"#9bc7d3"} metalness={.08}/>
      <Box at={[-2+j*2.02,.35,-.75]} size={[1.45,.09,.05]} color="#5c9da8"/>
    </group>)}
    <Box at={[0,-.24,-.9]} size={[1.8,.32,1.7]} color="#346982"/>
    <mesh position={[0,3.85,-.7]} rotation={[0,0,.03]}><boxGeometry args={[3.8,.23,.1]}/><meshBasicMaterial color="#65d4d0" toneMapped={false}/></mesh>
  </group>;
}

function BackendCore() {
  return <group>
    {[-2.4,0,2.4].map((x,j)=><group key={j}>
      <Box at={[x,1.15,-.4]} size={[1.65,2.35,1.7]} color={j===1?"#466f87":"#26475b"}/>
      <mesh position={[x,2.52,-.4]}><icosahedronGeometry args={[.49,1]}/><meshBasicMaterial color={j===1?"#ffc57d":"#93d8f0"} toneMapped={false}/></mesh>
      <Box at={[x,1.3,.48]} size={[1.1,.18,.06]} color="#7ee5d9"/>
    </group>)}
    <Cable points={[[-3,.27,1.65],[-1.2,.65,2.1],[.5,.25,1.6],[3,.7,1.1]]} color="#8df4e2"/>
  </group>;
}

function DatabaseCore() {
  return <group>
    {Array.from({length:5},(_,i)=><group key={i} position={[0,.38+i*.58,-.1]}>
      <mesh><cylinderGeometry args={[2.02,2.02,.36,46]}/><meshStandardMaterial color="#2f6882" metalness={.65} roughness={.26}/></mesh>
      <mesh position={[0,.18,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.92,.055,5,48]}/><meshBasicMaterial color={i%2?"#8df5e0":"#ffbc7a"} toneMapped={false}/></mesh>
    </group>)}
    <mesh position={[0,3.7,0]}><icosahedronGeometry args={[.71,1]}/><meshStandardMaterial color="#b5eaf0" emissive="#53b7b9" emissiveIntensity={.65}/></mesh>
  </group>;
}

function ProfileHub({ index }) {
  return <group>
    {Array.from({length:7},(_,j)=>{const a=j/7*Math.PI*2;return <group key={j} position={[Math.cos(a)*2.7,1.2+(j%3)*.45,Math.sin(a)*2.7]}>
      <mesh><icosahedronGeometry args={[.35,1]}/><meshStandardMaterial color={j%2?"#fae6b3":"#96ece4"} emissive="#207e86" emissiveIntensity={.35}/></mesh>
    </group>})}
    <mesh position={[0,1.88,0]}><icosahedronGeometry args={[1.1,index===12?2:1]}/><meshStandardMaterial color="#9bd9dc" metalness={.2} roughness={.3} transparent opacity={.72}/></mesh>
    <mesh position={[0,1.9,0]} rotation={[0,0,Math.PI/5]}><torusGeometry args={[1.8,.075,8,54]}/><meshBasicMaterial color="#4acfd0" toneMapped={false}/></mesh>
  </group>;
}

function Landmarks({ quality }) {
  return <group>
    <Laboratory quality={quality}/>
    {Array.from({length:STATIONS},(_,i)=>i===0?null:<Island i={i} quality={quality} key={i}>
      {i===1&&<group position={[-0.3,-0.18,-0.4]}><Workstation/></group>}
      {i===2&&<GitSculpture/>}
      {i===3&&<BuildFactory/>}
      {i===4&&<PortalAndServers/>}
      {(i===5||i===8)&&<BrowserUI/>}
      {i===6&&<BackendCore/>}
      {i===7&&<DatabaseCore/>}
      {i>=9&&<ProfileHub index={i}/>}
    </Island>)}
    {Array.from({length:STATIONS-1},(_,i)=>{
      const z1=Math.sin(i*.64)*1.5,z2=Math.sin((i+1)*.64)*1.5;
      return <Cable key={i} color={i>=5&&i<=8?"#85bbf2":"#67d5d0"} radius={.085} points={[[i*SPACING+4,.32,z1],[i*SPACING+6.5,1.15,z1+1],[(i+1)*SPACING-4,.45,z2]]}/>;
    })}
  </group>;
}

const COMPACT_CAMERA_OFFSET = new THREE.Vector3(1.5, 1.5, 4.2);
const WIDE_CAMERA_OFFSET = new THREE.Vector3(0, 0, -3);

/* Hand-composed keyframes override the generic rail where a chapter needs a specific shot. */
const CAMERA_KEYS = {
  0: { eye: [1.2, 8.4, 24], look: [0, 1.3, 0] },            // establishing: whole floating lab above the clouds
  1: { eye: [SPACING + 0.4, 3.9, 12.6], look: [SPACING - 0.4, 1.35, 0.2] }, // approach: over-the-shoulder on the IDE
};
const railEye = (i) => CAMERA_KEYS[i]?.eye ? new THREE.Vector3(...CAMERA_KEYS[i].eye) : new THREE.Vector3(i*SPACING+(i%3===0?2.1:3.2),6.3+(i%4===0?1.1:0),18+(i%3===2?1.5:0));
const railLook = (i) => CAMERA_KEYS[i]?.look ? new THREE.Vector3(...CAMERA_KEYS[i].look) : new THREE.Vector3(i*SPACING,1.45,Math.sin(i*.64)*1.5);

/*
 * Lens shift keeps the subject clear of the copy column without turning the camera:
 * wide screens push the world right (text sits left), narrow screens push it down (text sits on top).
 */
function applyLensShift(camera, width, height) {
  const key = `${width}x${height}`;
  if (camera.userData.lv3Lens === key) return;
  camera.userData.lv3Lens = key;
  if (width < 700) camera.setViewOffset(width, height, 0, -height * 0.17, width, height);
  else camera.setViewOffset(width, height, -width * 0.17, 0, width, height);
}

function CameraRail({ paused }) {
  const invalidate = useThree((state) => state.invalidate);
  const progressRef = useRef(0);
  const lastRef = useRef(-1);
  // Curves and per-frame scratch vectors live in one memoised object (same pattern as V2 WorldCamera)
  // so the frame loop never mutates values React considers render-time state.
  const rail = useMemo(() => ({
    positionPath: new THREE.CatmullRomCurve3(Array.from({length:STATIONS},(_,i)=>railEye(i)), false, "centripetal"),
    lookPath: new THREE.CatmullRomCurve3(Array.from({length:STATIONS},(_,i)=>railLook(i)),false,"centripetal"),
    look: new THREE.Vector3(),
  }),[]);
  const pausedRef=useRef(paused);
  useEffect(()=>{pausedRef.current=paused;invalidate();},[paused,invalidate]);
  useEffect(()=>{
    let queued=false;
    const update=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{
        queued=false;
        progressRef.current=Math.min(1,Math.max(0,window.scrollY/Math.max(1,document.documentElement.scrollHeight-window.innerHeight)));
        invalidate();
      });
    };
    update();window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);
    const vis=()=>{if(!document.hidden)invalidate();};document.addEventListener("visibilitychange",vis);
    return()=>{window.removeEventListener("scroll",update);window.removeEventListener("resize",update);document.removeEventListener("visibilitychange",vis)};
  },[invalidate]);
  useFrame(({camera,size,gl})=>{
    const t=progressRef.current;
    if(pausedRef.current&&lastRef.current>=0)return;
    applyLensShift(camera,size.width,size.height);
    rail.positionPath.getPoint(t,camera.position);rail.lookPath.getPoint(t,rail.look);
    camera.position.add(size.width<700?COMPACT_CAMERA_OFFSET:WIDE_CAMERA_OFFSET);
    camera.lookAt(rail.look);camera.userData.lv3Progress=t;
    // Deterministic, inspectable camera state (same contract as the V2 universe tests).
    const ds=gl.domElement.dataset;
    ds.progress=t.toFixed(3);
    ds.camera=camera.position.toArray().map(v=>v.toFixed(3)).join(",");
    lastRef.current=t;
  });
  return null;
}

function TravellingArtifacts() {
  const code = useRef(null);
  const request = useRef(null);
  const response = useRef(null);
  useFrame(({camera}) => {
    const stage = (camera.userData.lv3Progress || 0) * (STATIONS-1);
    if (code.current) {
      // Starts in the laboratory robot's gripper, then joins the travelling path by Chapter 02.
      const hold = 1 - THREE.MathUtils.smoothstep(stage, 0.15, 1);
      code.current.visible = stage <= 4.99;
      code.current.position.set(stage * SPACING, 1.9, Math.sin(stage * .64) * 1.5 + .8);
      code.current.position.lerp(ARTIFACT_ANCHOR, hold);
      code.current.rotation.set(0.35, stage * 1.4 + 0.6, 0.2);
    }
    if (request.current) {
      request.current.visible = stage >= 5 && stage < 7.15;
      request.current.position.set(stage * SPACING, 1.8, Math.sin(stage * .64) * 1.5 + .75);
    }
    if (response.current) {
      response.current.visible = stage >= 7.15 && stage <= 8.95;
      response.current.position.set(stage * SPACING, 1.9, Math.sin(stage * .64) * 1.5 + .7);
    }
  });
  return <group>
    <group ref={code}>
      <mesh><boxGeometry args={[.36,.36,.36]}/><meshStandardMaterial color="#7fe9f0" emissive="#1fb8c8" emissiveIntensity={1.1} metalness={.1} roughness={.15} transparent opacity={.88}/></mesh>
      <lineSegments><edgesGeometry args={[CODE_CUBE]}/><lineBasicMaterial color="#e9ffff" toneMapped={false}/></lineSegments>
    </group>
    <mesh ref={request}><icosahedronGeometry args={[.34, 1]}/><meshBasicMaterial color="#70dff0" toneMapped={false}/></mesh>
    <mesh ref={response}><icosahedronGeometry args={[.42, 1]}/><meshBasicMaterial color="#b4a2ff" toneMapped={false}/></mesh>
  </group>;
}

function Scene({ quality, paused }) {
  return <>
    <color attach="background" args={[HORIZON]}/>
    <fog attach="fog" args={[HORIZON,60,195]}/>
    <SkyDome/>
    <hemisphereLight args={["#f4fbff","#728a92",1.15]}/>
    <ambientLight intensity={0.25}/>
    <directionalLight position={[14,24,10]} intensity={2.1} color="#fff0d6"/>
    <directionalLight position={[-16,8,14]} intensity={0.6} color="#bfe6ff"/>
    <pointLight position={[39,13,2]} intensity={36} distance={30} color="#ffdc9b"/>
    <CloudBanks quality={quality} span={STATIONS*SPACING}/>
    <Landmarks quality={quality}/>
    <CameraRail paused={paused}/>
    <TravellingArtifacts/>
  </>;
}

function hasWebGL() {
  if (typeof document === "undefined") return true;
  try {
    const probe = document.createElement("canvas");
    const ctx = probe.getContext("webgl2") || probe.getContext("webgl");
    ctx?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(ctx);
  } catch {
    return false;
  }
}

export default function LuminousWorld({ paused = false, reduced = false, quality = "auto" }) {
  // Probe once before mounting <Canvas>: a renderer that cannot get a context throws inside R3F,
  // so unsupported browsers go straight to the static scene instead.
  const [webglFailed,setWebglFailed]=useState(()=>!hasWebGL());
  const low=quality==="low"|| (quality==="auto"&&typeof navigator!=="undefined"&&navigator.hardwareConcurrency<=4);
  if(reduced||webglFailed)return <div className="lv3-static-scene" role="img" aria-label="Illustrated bright engineering world static fallback"/>;
  return <div className="lv3-canvas" aria-hidden="true" data-testid="luminous-webgl">
    <Canvas key={quality} frameloop="demand" dpr={low?[0.75,1.15]:[1,1.5]}
      camera={{fov:42,near:0.15,far:260,position:[2,7.3,18]}}
      gl={{antialias:!low,alpha:false,powerPreference:"high-performance"}}
      onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;
        const canvas=gl.domElement;canvas.addEventListener("webglcontextlost",()=>setWebglFailed(true),{once:true});}}
      onError={()=>setWebglFailed(true)}>
      <Scene quality={low?"low":"high"} paused={paused}/>
    </Canvas>
  </div>;
}
