"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FloatingIsland, Cable, Box, C } from "./WorldPrimitives";
import { Workstation, GitEnvironment, BuildEnvironment, DeploymentEnvironment, BackendEnvironment, DatabaseEnvironment, BrowserEnvironment } from "./Environments";
import DeveloperCharacter from "./DeveloperCharacter";
import WorldCamera from "./WorldCamera";
import WorldFinish from "./WorldFinish";
import { LOCATIONS as L, segment, clamp } from "./story";

const PATHS = [
  {points:[[-23,.15,0],[-21,.15,-2],[-17,.15,-6],[-13,.15,-8]], color:C.gold},
  {points:[[-9,.15,-8],[-6,.15,-9],[-2,.15,-11],[3,.15,-12]],color:C.gold},
  {points:[[7,.15,-12],[11,.15,-12],[17,.15,-8],[21,.15,-6]],color:C.gold},
  {points:[[24,.15,-3],[26,.15,2],[27,.15,8],[27,.15,12]],color:C.gold},
  {points:[[25,.15,16],[22,.15,20],[13,.15,21],[7,.15,20]],color:C.cyan},
  {points:[[2,.15,20],[-2,.15,20],[-6,.15,18],[-10,.15,17]],color:C.cyan},
];
function FlowPackets({ progress }) {
  const source=useRef(null), request=useRef(null), response=useRef(null);
  const routes=useMemo(()=>{
    const curve=pts=>new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),false,"catmullrom",.2);
    return { source:curve([[-13,1.2,-8],[3,1.2,-12],[21,2.6,-6]]), request:curve([[27,2,12],[20,1.2,20],[10,1.2,20],[7,1.2,20],[-10,2,17]]), response:curve([[-10,2,17],[7,1.2,20],[20,1.2,20],[27,2.4,12]]) };
  },[]);
  useFrame(()=>{
    const p=progress.current;
    source.current.visible=p>=.29&&p<.57;routes.source.getPoint(segment(p,.29,.55),source.current.position);
    source.current.rotation.y=p*18;
    request.current.visible=p>=.625&&p<.84;routes.request.getPoint(segment(p,.625,.84),request.current.position);
    response.current.visible=p>=.84;routes.response.getPoint(segment(p,.84,.98),response.current.position);
  });
  return <>
    <group ref={source}><Box size={[.55,.55,.55]} color={C.gold} glow/><mesh><boxGeometry args={[.8,.8,.8]}/><meshBasicMaterial color={C.gold} wireframe/></mesh></group>
    <group ref={request}><mesh><octahedronGeometry args={[.35,0]}/><meshBasicMaterial color={C.cyan} toneMapped={false}/></mesh><mesh scale={1.6}><octahedronGeometry args={[.35,0]}/><meshBasicMaterial color={C.cyan} wireframe/></mesh></group>
    <group ref={response}><mesh><octahedronGeometry args={[.35,0]}/><meshBasicMaterial color={C.gold} toneMapped={false}/></mesh><mesh scale={1.6}><octahedronGeometry args={[.35,0]}/><meshBasicMaterial color={C.gold} wireframe/></mesh></group>
  </>;
}

const cloudVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const cloudFragment=`varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 p=vUv*22.;float n=.5*noise(p)+.25*noise(p*2.)+.125*noise(p*4.)+.0625*noise(p*8.);float edge=smoothstep(.0,.22,vUv.x)*smoothstep(0.,.22,1.-vUv.x)*smoothstep(0.,.22,vUv.y)*smoothstep(0.,.22,1.-vUv.y);vec3 col=mix(vec3(.035,.08,.15),vec3(.25,.4,.5),n);gl_FragColor=vec4(col,smoothstep(.25,.66,n)*edge*.7);}`;
function Atmosphere({ eco }) {
  const skyline=useRef(null);
  useEffect(()=>{
    if(!skyline.current)return;
    const dummy=new THREE.Object3D();
    for(let i=0;i<40;i++){const x=Math.sin(i*8.7)*110,z=-40-Math.abs(Math.cos(i*9.2))*90,height=3+(i%7)*2.3;dummy.position.set(x,-11+height/2,z);dummy.scale.set(1.4+(i%3),height,1.4+(i%4));dummy.updateMatrix();skyline.current.setMatrixAt(i,dummy.matrix);}
    skyline.current.instanceMatrix.needsUpdate=true;
  },[]);
  return <>
    <instancedMesh ref={skyline} args={[null,null,40]}><boxGeometry/><meshStandardMaterial color="#244159" roughness={.7}/></instancedMesh>
    {(eco?[-8]:[-8,-12]).map((y,i)=><mesh key={y} position={[0,y,-20-i*7]} rotation={[-Math.PI/2,0,i*.5]}>
      <planeGeometry args={[260,240]}/><shaderMaterial vertexShader={cloudVertex} fragmentShader={cloudFragment} transparent depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>)}
    {Object.values(L).slice(0,eco?3:7).map(([x,,z],i)=><group key={i} position={[x+3,-5,z]}>
      <mesh><cylinderGeometry args={[.035,.3,9,6,1,true]}/><meshBasicMaterial color={i%3?C.blue:C.cyan} transparent opacity={.17} depthWrite={false} side={THREE.DoubleSide}/></mesh>
    </group>)}
  </>;
}

function Lifecycle({ invalidateRef, paused, active, eco, onFailure, onReady }) {
  const {gl,invalidate,setDpr}=useThree();
  const frame=useRef({previous:0,count:0,total:0,lowered:false});
  useFrame(({gl:renderer})=>{
    const now=performance.now();const state=frame.current;
    if(state.previous&&active&&!paused){const elapsed=now-state.previous;if(elapsed<200){state.total+=elapsed;state.count++;}}
    state.previous=now;
    if(state.count===90&&!state.lowered&&state.total/90>38){setDpr(1);state.lowered=true;}
    renderer.domElement.dataset.quality=eco||state.lowered?"eco":"auto";
    renderer.domElement.dataset.frame=String(Number(renderer.domElement.dataset.frame||0)+1);
  });
  useEffect(()=>{
    invalidateRef.current=invalidate;
    const canvas=gl.domElement;
    const lost=event=>{event.preventDefault();onFailure();};
    canvas.addEventListener("webglcontextlost",lost);
    onReady();invalidate();
    return()=>{invalidateRef.current=null;canvas.removeEventListener("webglcontextlost",lost);};
  },[gl,invalidate,invalidateRef,onFailure,onReady]);
  useEffect(()=>{
    let raf=0,last=0;
    const tick=(time)=>{if(time-last>=(eco?50:33)){invalidate();last=time;}raf=requestAnimationFrame(tick);};
    const visibility=()=>{cancelAnimationFrame(raf);if(!document.hidden&&active&&!paused)raf=requestAnimationFrame(tick);};
    visibility();document.addEventListener("visibilitychange",visibility);
    return()=>{cancelAnimationFrame(raf);document.removeEventListener("visibilitychange",visibility);};
  },[active,paused,eco,invalidate]);
  return null;
}
function Scene({progress,compact,eco}) {
  return <>
    <color attach="background" args={["#09182b"]}/><fog attach="fog" args={["#10263c",35,150]}/>
    <hemisphereLight color="#c3e2f5" groundColor="#101c31" intensity={2.4}/>
    <directionalLight position={[0,25,10]} color="#deecff" intensity={3}/>
    <directionalLight position={[-35,12,-25]} color="#3eb6e1" intensity={3.5}/>
    <directionalLight position={[35,10,-15]} color="#ffc18c" intensity={2}/>
    <Atmosphere eco={eco}/>
    <FloatingIsland position={L.studio} radius={5}><Workstation/></FloatingIsland>
    <FloatingIsland position={L.git} color={C.violet}><GitEnvironment/></FloatingIsland>
    <FloatingIsland position={L.build} radius={4.8} color={C.gold}><BuildEnvironment progress={progress}/></FloatingIsland>
    <FloatingIsland position={L.deploy} radius={5} color={C.gold}><DeploymentEnvironment progress={progress}/></FloatingIsland>
    <FloatingIsland position={L.browser} radius={5.8}><BrowserEnvironment progress={progress}/></FloatingIsland>
    <FloatingIsland position={L.backend} radius={5.6}><BackendEnvironment progress={progress}/></FloatingIsland>
    <FloatingIsland position={L.database}><DatabaseEnvironment progress={progress}/></FloatingIsland>
    {PATHS.map((props,i)=><Cable key={i} {...props} rail radius={.045}/>)}
    <DeveloperCharacter progress={progress}/><FlowPackets progress={progress}/><WorldCamera progress={progress} compact={compact}/>
    <WorldFinish eco={eco}/>
  </>;
}
export default function WorldCanvas({progress,invalidateRef,paused,active,quality,onFailure,onReady}) {
  const [capability,setCapability]=useState(null);
  useEffect(()=>{
    const media=window.matchMedia("(max-width:600px)");
    const inspect=()=>{
      const test=document.createElement("canvas");
      const gl=test.getContext("webgl2",{failIfMajorPerformanceCaveat:false});
      if(!gl){onFailure();return;}
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      setCapability({compact:media.matches,eco:media.matches||(navigator.hardwareConcurrency||8)<=4});
    };
    inspect();media.addEventListener("change",inspect);
    return()=>media.removeEventListener("change",inspect);
  },[onFailure]);
  const created=useCallback(({gl})=>{gl.setClearColor("#09182b");},[]);
  if(!capability)return null;
  const eco=quality==="eco"||capability.eco;
  return <div style={{position:"absolute",inset:0}} data-testid="universe-canvas">
    <Canvas frameloop="demand" dpr={eco?1:[1,1.5]} camera={{position:[-15,11,23],fov:44,near:.1,far:250}} gl={{antialias:!eco,alpha:false,powerPreference:"low-power"}} onCreated={created} fallback={null}>
      <Scene progress={progress} compact={capability.compact} eco={eco}/>
      <Lifecycle invalidateRef={invalidateRef} paused={paused} active={active} eco={eco} onFailure={onFailure} onReady={onReady}/>
    </Canvas>
  </div>;
}
