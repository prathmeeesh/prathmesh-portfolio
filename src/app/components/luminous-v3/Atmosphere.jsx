"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getLibrary } from "./materials";

export const HORIZON = "#e7f0ef";

const SKY_VERTEX = `
varying vec3 vDir;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const SKY_FRAGMENT = `
uniform vec3 zenith; uniform vec3 mid; uniform vec3 horizon; uniform vec3 below; uniform vec3 sunColor; uniform vec3 sunDir;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.0
    ? mix(mix(horizon, mid, smoothstep(0.0, 0.22, h)), zenith, smoothstep(0.22, 0.85, h))
    : mix(horizon, below, smoothstep(0.0, -0.35, h));
  float s = max(dot(d, normalize(sunDir)), 0.0);
  col += sunColor * (pow(s, 90.0) * 0.55 + pow(s, 7.0) * 0.22);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** Gradient sky sphere that travels with the camera: bright, warm-horizoned and cheap (one draw). */
export function SkyDome() {
  const ref = useRef(null);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      zenith: { value: new THREE.Color("#4f9fd0") },
      mid: { value: new THREE.Color("#a6d3e9") },
      horizon: { value: new THREE.Color(HORIZON) },
      below: { value: new THREE.Color("#d9e7ec") },
      sunColor: { value: new THREE.Color("#ffd79a") },
      sunDir: { value: new THREE.Vector3(0.55, 0.32, -0.75) },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera }) => { ref.current?.position.copy(camera.position); });
  return <mesh ref={ref} material={material} renderOrder={-10} frustumCulled={false}>
    <sphereGeometry args={[200, 32, 16]} />
  </mesh>;
}

/**
 * Cumulus banks as camera-facing instanced quads (the rail always looks roughly along −z,
 * so fixed +z-facing quads read as volumetric layers without per-frame billboarding).
 * Deterministic placement: no hydration or reload differences.
 */
export function CloudBanks({ quality, span }) {
  const lib = useMemo(() => getLibrary(), []);
  const count = quality === "low" ? 40 : 90;
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 0.5), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const setup = (mesh) => {
    if (!mesh) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const q = (i * 0.6180339887) % 1;
      const layer = i % 3; // 0: sea of clouds below, 1: distant banks, 2: near foreground wisps
      const w = layer === 2 ? 9 + ((i * 0.37) % 1) * 8 : 14 + ((i * 0.73) % 1) * 22;
      const x = -30 + q * (span + 60);
      const y = layer === 0 ? -7 - ((i * 0.29) % 1) * 4 : layer === 1 ? -2 + ((i * 0.41) % 1) * 9 : -9 - ((i * 0.53) % 1) * 3;
      const z = layer === 0 ? -8 - ((i * 1.77) % 1) * 40 : layer === 1 ? -55 - ((i * 0.91) % 1) * 45 : 4 + ((i * 0.83) % 1) * 8;
      o.position.set(x, y, z);
      o.rotation.set(0, 0, (((i * 0.21) % 1) - 0.5) * 0.12);
      o.scale.set(w * (((i * 0.13) % 1) > 0.5 ? 1 : -1), w, 1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return <instancedMesh key={count} ref={setup} args={[geometry, lib.m.cloud, count]} frustumCulled={false} renderOrder={1} />;
}
