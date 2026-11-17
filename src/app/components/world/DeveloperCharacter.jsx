"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box, C } from "./WorldPrimitives";
import { segment, smooth } from "./story";

// Original articulated figure. Joint poses are functions of scroll, not time.
export default function DeveloperCharacter({ progress }) {
  const body=useRef(null),leftLeg=useRef(null),rightLeg=useRef(null),leftArm=useRef(null),rightArm=useRef(null),artifact=useRef(null);
  const route=useMemo(()=>new THREE.CatmullRomCurve3([new THREE.Vector3(-27,0,1.6),new THREE.Vector3(-24,0,.5),new THREE.Vector3(-20,0,-3),new THREE.Vector3(-16,0,-6),new THREE.Vector3(-13,0,-6.5)]),[]);
  const at=useMemo(()=>new THREE.Vector3(),[]);const tangent=useMemo(()=>new THREE.Vector3(),[]);
  useFrame(()=>{
    const p=progress.current; if(!body.current)return;
    const stand=smooth(segment(p,.1,.17));const walk=segment(p,.17,.29);
    route.getPoint(walk,at);route.getTangent(walk,tangent);
    body.current.position.copy(at);body.current.position.y=.04-(1-stand)*.35;
    body.current.rotation.y=walk>0&&walk<1?Math.atan2(tangent.x,tangent.z):Math.PI;
    const stride=walk>0&&walk<1?Math.sin(walk*44)*.38:0;
    leftLeg.current.rotation.x=(1-stand)*-1.1+stride;
    rightLeg.current.rotation.x=(1-stand)*-1.1-stride;
    const typing=(1-stand)*Math.sin(p*230)*.07;
    leftArm.current.rotation.x=-.9+typing;rightArm.current.rotation.x=-.9-typing;
    artifact.current.visible=p>.135&&p<.29;
    body.current.visible=p<.4;
  });
  return <group ref={body} scale={.85}>
    <mesh position={[0,1.25,0]}><capsuleGeometry args={[.26,.52,6,12]}/><meshStandardMaterial color="#476375" roughness={.7}/></mesh>
    <mesh position={[0,2.04,0]}><capsuleGeometry args={[.22,.18,6,12]}/><meshStandardMaterial color="#cda686" roughness={.9}/></mesh>
    <mesh position={[0,2.19,-.04]}><sphereGeometry args={[.235,12,10,0,Math.PI*2,0,Math.PI*.58]}/><meshStandardMaterial color="#142332" roughness={.9}/></mesh>
    <Box position={[0,2.08,.205]} size={[.36,.08,.05]} color="#11283a"/>
    {[0,1].map(i=><group key={i} ref={el=>{if(i===0)leftArm.current=el;else rightArm.current=el;}} position={[i===0?-.36:.36,1.48,0]}>
      <mesh position={[0,-.22,0]}><capsuleGeometry args={[.095,.3,4,8]}/><meshStandardMaterial color="#476375"/></mesh>
      <mesh position={[0,-.5,0]}><capsuleGeometry args={[.08,.15,4,8]}/><meshStandardMaterial color="#cda686"/></mesh>
    </group>)}
    {[0,1].map(i=><group key={i} ref={el=>{if(i===0)leftLeg.current=el;else rightLeg.current=el;}} position={[i===0?-.16:.16,.91,0]}>
      <mesh position={[0,-.28,0]}><capsuleGeometry args={[.115,.37,4,8]}/><meshStandardMaterial color="#142c46"/></mesh>
      <Box position={[0,-.73,.12]} size={[.22,.15,.43]} color="#6f8593"/>
    </group>)}
    <group ref={artifact} position={[0,1.25,.65]}><Box size={[.55,.38,.35]} color={C.gold} glow/><mesh><boxGeometry args={[.61,.43,.39]}/><meshBasicMaterial color="#a68b67" wireframe/></mesh></group>
  </group>;
}
