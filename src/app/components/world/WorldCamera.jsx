"use client";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SHOTS, clamp } from "./story";

export default function WorldCamera({ progress, compact }) {
  const paths=useMemo(()=>{
    const eyes=SHOTS.map(s=>new THREE.Vector3(...s.eye));
    const targets=SHOTS.map(s=>new THREE.Vector3(...s.at));
    if(compact)eyes.forEach((v,i)=>{
      // Portrait composition: camera looks above the landmark so it sits below copy.
      v.sub(targets[i]).multiplyScalar(1.22).add(targets[i]);
      targets[i].x+=3.1;targets[i].y+=7.3;
    });
    return {eyes:new THREE.CatmullRomCurve3(eyes,false,"catmullrom",.25),targets:new THREE.CatmullRomCurve3(targets,false,"catmullrom",.25),look:new THREE.Vector3()};
  },[compact]);
  useFrame(({camera,gl})=>{
    const p=clamp(progress.current);const knot=p*(SHOTS.length-1);const a=Math.min(SHOTS.length-2,Math.floor(knot));
    paths.eyes.getPoint(p,camera.position);paths.targets.getPoint(p,paths.look);
    camera.lookAt(paths.look);const fov=SHOTS[a].fov+(SHOTS[a+1].fov-SHOTS[a].fov)*(knot-a)+(compact?4:0);
    if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    // Inspectable actual rendered state for browser regression checks, no React state per frame.
    gl.domElement.dataset.camera=camera.position.toArray().map(v=>v.toFixed(3)).join(",");
    gl.domElement.dataset.progress=p.toFixed(4);
  });
  return null;
}
