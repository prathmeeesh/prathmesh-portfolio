"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Ring, Screen, Plaque, Cable, C } from "./WorldPrimitives";
import { segment, smooth } from "./story";

export function Workstation() {
  return <group>
    <Box position={[0,1.25,0]} size={[5.6,.18,2.3]} color="#40566a"/>
    {[-2.3,2.3].map(x=><group key={x}><Box position={[x,.6,0]} size={[.14,1.2,1.9]}/><Box position={[x,.08,0]} size={[.8,.12,2.3]}/></group>)}
    <Screen kind="code" position={[-.55,3,-.5]} width={4.4} height={2.75}/>
    <Box position={[-.55,1.6,-.6]} size={[.2,.7,.2]}/>
    <Box position={[0,1.37,.55]} size={[2.6,.06,.72]} color="#14283b"/>
    {Array.from({length:4},(_,i)=><Box key={i} position={[0,1.41,.31+i*.15]} size={[2.35,.02,.035]} color="#76a9b5"/>)}
    <Box position={[1.65,1.4,.6]} size={[.27,.1,.4]} color="#78919a"/>
    <group position={[2.3,1.35,-.3]}><Box position={[0,.9,0]} size={[.75,1.8,1.4]} color="#132738"/>{[0,1].map(i=><Ring key={i} radius={.22} position={[0,.5+i*.7,.71]} color={C.cyan}/>)}</group>
    <Screen kind="tree" position={[-3.2,2.7,-.2]} rotation={[0,.38,0]} width={1.6} height={2.5}/>
    <Box position={[0,.65,2.15]} size={[1.1,.15,1]} color="#263b54"/>
    <Box position={[0,1.3,2.6]} size={[1.1,1.3,.18]} color="#263b54"/>
    <Box position={[0,.3,2.15]} size={[.15,.6,.15]}/><Box position={[0,.08,2.15]} size={[1.2,.08,.9]}/>
    <Plaque text="01 / DEVELOPMENT STUDIO" position={[0,.36,3.6]} width={4}/>
    {[-3.8,3.8].map(x=><group key={x} position={[x,0,-1.6]}><Box position={[0,1.9,0]} size={[.09,3.8,.09]}/><Box position={[0,3.7,0]} size={[.35,.06,.6]} color={C.gold} glow/></group>)}
  </group>;
}
export function GitEnvironment() {
  const points=[[-3,.5,1],[0,.5,1],[3,.5,1]];
  const branch=[[-2,.5,1],[-1,2,-.9],[1,2,-.9],[2,.5,1]];
  return <group>
    <Cable points={points} color={C.violet} radius={.065} rail/>
    <Cable points={branch} color={C.cyan} radius={.065} rail/>
    {[[-2,.5,1],[-1,2,-.9],[1,2,-.9],[2,.5,1]].map((p,i)=><group position={p} key={i}>
      <mesh><octahedronGeometry args={[.26,0]}/><meshStandardMaterial color={C.violet} emissive={C.violet} emissiveIntensity={.5} metalness={.7}/></mesh>
      <Ring radius={.42} rotation={[Math.PI/2,0,0]} color={i===3?C.gold:C.cyan}/>
      <Box position={[0,-p[1]/2,0]} size={[.08,p[1],.08]}/>
    </group>)}
    <Screen kind="tree" position={[0,3.5,-1.5]} width={4} height={2.5}/>
    <Plaque text="FEATURE → REVIEW → MAIN" position={[0,.4,3]} width={4}/>
  </group>;
}
export function BuildEnvironment({ progress }) {
  const indicators=useRef([]);
  useFrame(()=>{const p=segment(progress.current,.31,.48);indicators.current.forEach((m,i)=>{if(m)m.material.color.set(p>=i/5?C.gold:"#294457");});});
  return <group>
    <Box position={[0,.35,0]} size={[7.4,.6,2.6]} color="#223d4d"/>
    <Box position={[0,.67,0]} size={[7.4,.05,1.6]} color="#0b1b2d"/>
    {Array.from({length:15},(_,i)=><Box key={i} position={[-3.5+i*.5,.72,0]} size={[.07,.06,1.5]} color="#536f81"/>)}
    {["CHECKOUT","RESTORE","BUILD","TEST","PUBLISH"].map((s,i)=><group key={s} position={[-3+i*1.5,0,0]}>
      {[-1,1].map(z=><Box key={z} position={[0,1.7,z]} size={[.16,3.4,.2]} color="#3c4e5c"/>)}
      <Box position={[0,3.4,0]} size={[.2,.2,2.2]} color="#586370"/>
      <mesh ref={el=>{indicators.current[i]=el;}} position={[0,3.43,.5]}><boxGeometry args={[.23,.23,.9]}/><meshBasicMaterial color="#294457"/></mesh>
      <Plaque text={s} width={1.3} position={[0,2.8,1.15]} color={C.gold}/>
    </group>)}
    <Plaque text="ILLUSTRATIVE PIPELINE / NOT CI TELEMETRY" position={[0,.3,2.3]} width={5.2} color={C.gold}/>
  </group>;
}
export function ServerRack({ position, color=C.cyan }) {
  return <group position={position}>
    <Box position={[0,2,0]} size={[1.25,4,1.4]} color="#1b3044"/>
    <Box position={[0,2,.72]} size={[1.06,3.7,.06]} color="#0b1828"/>
    {Array.from({length:6},(_,i)=><group key={i} position={[0,.5+i*.56,.78]}>
      <Box size={[.91,.37,.06]} color="#344a60"/>
      <Box position={[-.2,.02,.04]} size={[.4,.045,.02]} color="#6c8192"/>
      <Box position={[.32,0,.05]} size={[.045,.08,.03]} color={color} glow/>
    </group>)}
    <Box position={[-.58,2,.75]} size={[.025,3.7,.03]} color={color} glow/>
  </group>;
}
export function DeploymentEnvironment({ progress }) {
  const gate=useRef(null);
  useFrame(()=>{if(gate.current)gate.current.rotation.z=smooth(segment(progress.current,.39,.53))*Math.PI/3;});
  return <group>
    <ServerRack position={[-2.8,0,-1.3]}/><ServerRack position={[2.8,0,-1.3]}/>
    <group position={[0,2.6,0]}>
      <mesh><torusGeometry args={[2.3,.24,12,80]}/><meshStandardMaterial color="#486176" metalness={.8} roughness={.3}/></mesh>
      <Ring radius={2.12} tube={.07} color={C.gold}/><Ring radius={2.53} tube={.025} color={C.cyan}/>
      <group ref={gate}>{Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <Box key={i} position={[Math.cos(a)*2.3,Math.sin(a)*2.3,0]} rotation={[0,0,a]} size={[.6,.25,.65]} color="#71838c"/>;})}</group>
    </group>
    <Box position={[0,.2,1]} size={[3,.3,3]}/><Plaque text="PUBLISH ARTIFACT → HOST" position={[0,5.8,0]} width={4} color={C.gold}/>
  </group>;
}
export function BackendEnvironment({ progress }) {
  const lights=useRef([]);
  useFrame(()=>{const p=segment(progress.current,.65,.8);lights.current.forEach((m,i)=>{if(m)m.material.color.set(p>=i/4?C.cyan:"#315063");});});
  return <group>
    {["ROUTING","CONTROLLER","APP LOGIC","EF CORE"].map((s,i)=><group key={s} position={[-3.3+i*2.2,0,0]}>
      <ServerRack position={[0,0,0]} color={i===2?C.violet:C.cyan}/>
      <mesh ref={el=>{lights.current[i]=el;}} position={[0,4.3,0]}><octahedronGeometry args={[.3,0]}/><meshBasicMaterial color="#315063"/></mesh>
      <Plaque text={s} position={[0,1.8,1.6]} width={1.95}/>
    </group>)}
    <Cable points={[[-4.2,.2,1],[-1.7,.2,1],[1.7,.2,1],[4.2,.2,1]]} radius={.05}/>
    <Plaque text="ASP.NET CORE / APPLICATION BOUNDARIES" position={[0,5.3,-.6]} width={5.5}/>
  </group>;
}
export function DatabaseEnvironment({ progress }) {
  const core=useRef(null);
  useFrame(()=>{if(core.current)core.current.scale.setScalar(.65+.25*smooth(segment(progress.current,.75,.88)));});
  return <group>
    {[0,1,2,3].map(i=><group key={i} position={[0,.55+i*.85,0]}>
      <mesh><cylinderGeometry args={[1.8,1.8,.65,64]}/><meshStandardMaterial color="#33516b" metalness={.8} roughness={.23}/></mesh>
      <Ring position={[0,.34,0]} radius={1.79} rotation={[-Math.PI/2,0,0]} color={C.cyan}/>
    </group>)}
    <mesh ref={core} position={[0,4.4,0]}><octahedronGeometry args={[.7,0]}/><meshStandardMaterial color="#d3fbff" emissive={C.cyan} emissiveIntensity={1}/></mesh>
    {[-1,1].map(x=><group key={x} position={[x*2.7,0,0]}><Box position={[0,2.5,0]} size={[.12,5,.12]}/><Box position={[0,4.9,0]} size={[.08,.4,.08]} color={C.gold} glow/></group>)}
    <Ring position={[0,4.4,0]} radius={1.25} rotation={[.7,0,.3]} color={C.gold}/>
    <Plaque text="SQL SERVER / PARAMETERISED QUERY" position={[0,.4,3]} width={4.4}/>
  </group>;
}
export function BrowserEnvironment({ progress }) {
  const results=useRef(null);const modules=useRef([]);
  useFrame(()=>{
    const p=smooth(segment(progress.current,.88,1));
    if(results.current)results.current.visible=p>.7;
    modules.current.forEach((m,i)=>{if(m){m.position.y=(i%2?1:-1)*(1-p)*3;m.position.x=(i-1)*(1-p)*3;m.scale.setScalar(.9+.1*p);m.visible=p<=.7;}});
  });
  return <group>
    <Box position={[0,1.1,-.3]} size={[.35,2.2,.35]}/><Box position={[0,.12,0]} size={[3.5,.2,1.8]}/>
    <Screen kind="browser" position={[0,3.5,0]} width={7.8} height={4.875}/>
    <group ref={results} position={[0,3.5,.08]}><Screen kind="results" width={7.8} height={4.875}/></group>
    {[0,1,2].map(i=><group key={i} position={[(i-1)*2.4,2.4,.17]}><group ref={el=>{modules.current[i]=el;}}>
      <Box size={[2.1,1.8,.04]} color={["#254e69","#6c5947","#3c5960"][i]}/>
      <Plaque text={["HTML / RAZOR","CSS / LAYOUT","JS / DATA"][i]} width={1.9} position={[0,0,.035]}/>
    </group></group>)}
    <Plaque text="FOLIO / READ-ONLY CATALOGUE" position={[0,6.5,0]} width={4.6}/>
  </group>;
}
