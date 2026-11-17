"use client";
import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export default function WorldFinish({ eco }) {
  const {gl,scene,camera,size}=useThree();
  const composer=useRef(null);
  const reflection=useMemo(()=>{
    // Authored studio reflection map; no remote HDRI or licensed image asset.
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d');const gradient=ctx.createLinearGradient(0,0,0,256);
    gradient.addColorStop(0,'#a4d8ee');gradient.addColorStop(.45,'#354e6c');gradient.addColorStop(.6,'#14283e');gradient.addColorStop(1,'#07101c');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);ctx.fillStyle='#bed8ed';ctx.fillRect(60,35,70,65);ctx.fillStyle='#f2c59a';ctx.fillRect(320,65,35,45);
    const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
    return texture;
  },[]);
  useEffect(()=>()=>reflection.dispose(),[reflection]);
  useEffect(()=>{
    if(eco)return;
    const c=new EffectComposer(gl);
    const render=new RenderPass(scene,camera);
    const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.38,.5,.55);
    const output=new OutputPass();c.addPass(render);c.addPass(bloom);c.addPass(output);composer.current=c;
    return()=>{composer.current=null;bloom.dispose();render.dispose();output.dispose();c.dispose();};
  },[gl,scene,camera,eco]);
  useEffect(()=>{composer.current?.setSize(size.width,size.height);},[size,eco]);
  // Positive render priority replaces the default draw: never two competing renders.
  useFrame(({gl:renderer,scene:world,camera:eye})=>{
    if(composer.current){if(composer.current._pixelRatio!==renderer.getPixelRatio())composer.current.setPixelRatio(renderer.getPixelRatio());composer.current.render();}
    else renderer.render(world,eye);
  },1);
  return <primitive object={reflection} attach="environment"/>;
}
