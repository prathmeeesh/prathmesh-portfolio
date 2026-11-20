"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CAMERA_FOV, HANDOFF_END, HANDOFF_START, MAX_PROGRESS, UNIT, cameraAt, signalAt } from "./journeyPath";

const ACCENT = "#5ce9df";
const GOLD = "#f5b46c";
const STEEL = "#173449";
const METAL = "#557b91";

function Slab({ position, scale, color = STEEL, emissive = "#000000", transparent = false, opacity = 1 }) {
  return (
    <mesh position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissive === "#000000" ? 0 : 0.55}
        metalness={0.64}
        roughness={0.28}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}

function Rail({ points, color = ACCENT, radius = 0.045 }) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))),
    [points]
  );
  return (
    <mesh>
      <tubeGeometry args={[curve, 48, radius, 6, false]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function EnergyRing({ position = [0, 0, 0], radius = 2.6, color = ACCENT, rotation = [0, 0, 0] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <torusGeometry args={[radius, 0.075, 10, 80]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Corridor() {
  const rails = useMemo(() => [
    [[-5, -2.7, 1], [-5, -2.7, -40], [-5, -2.7, -80], [-5, -2.7, -122]],
    [[5, -2.7, 1], [5, -2.7, -40], [5, -2.7, -80], [5, -2.7, -122]],
    [[-5, 3.6, 1], [-5, 3.6, -40], [-5, 3.6, -80], [-5, 3.6, -122]],
    [[5, 3.6, 1], [5, 3.6, -40], [5, 3.6, -80], [5, 3.6, -122]],
  ], []);
  return (
    <group>
      {rails.map((points, i) => <Rail key={i} points={points} color={i % 2 ? "#2789b3" : "#39788d"} radius={0.022} />)}
      {Array.from({ length: 11 }, (_, index) => (
        <group key={index} position={[0, 0, -(index + 1) * UNIT]}>
          <EnergyRing radius={5.2} color={index % 2 ? "#266379" : "#32687a"} />
          <Slab position={[0, -3.25, 0]} scale={[10.6, 0.12, 1.4]} color="#10293a" />
        </group>
      ))}
    </group>
  );
}

function SourceChamber() {
  return (
    // Angled off-axis so the code packet's flight line stays clear.
    <group position={[-4.4, 0.2, -UNIT]} rotation={[0, 0.62, 0]}>
      <Slab position={[0, 0, -1.2]} scale={[7, 4.5, 0.18]} color="#102b3b" />
      <Slab position={[0, 1.93, -1.04]} scale={[6.6, 0.13, 0.05]} color={ACCENT} emissive={ACCENT} />
      <Slab position={[-2.6, 0, -1.04]} scale={[1.1, 3.4, 0.04]} color="#28526a" />
      {Array.from({ length: 11 }, (_, i) => (
        <Slab key={i} position={[0.45, 1.3 - i * 0.29, -1.035]} scale={[i % 3 ? 3.8 : 2.1, 0.056, 0.025]} color={i % 4 ? "#52b2b9" : GOLD} emissive={i % 4 ? "#134f5b" : "#5c3815"} />
      ))}
      <EnergyRing position={[0, 0, -2.0]} radius={3.35} color="#226d82" />
    </group>
  );
}

function BuildChamber() {
  const phases = ["#58e2d8", "#7ccdbd", GOLD, "#76c5ef"];
  return (
    <group position={[0, 0, -2 * UNIT]}>
      <Slab position={[0, -2.6, 0]} scale={[11.4, 0.38, 6]} color="#17394d" />
      {phases.map((color, i) => {
        const x = (i - 1.5) * 2.55;
        return (
          <group key={color} position={[x, 0, 0]}>
            <Slab position={[0, -0.55, 0]} scale={[2, 3.4, 2.1]} color="#234356" />
            <Slab position={[0, -1.35, 1.09]} scale={[1.5, 0.13, 0.06]} color={color} emissive={color} />
            <EnergyRing position={[0, 1.6, 0]} radius={0.7} color={color} />
            <mesh position={[0, 1.6, 0]}>
              <icosahedronGeometry args={[0.32, 1]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} metalness={0.3} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
      <Rail points={[[-5, -2.35, 2.4], [-2, -2.35, 2.4], [2, -2.35, 2.4], [5, -2.35, 2.4]]} color={GOLD} radius={0.12} />
    </group>
  );
}

function DeploymentGate() {
  return (
    <group position={[0, 0, -3 * UNIT]}>
      <EnergyRing position={[0, 0, -1]} radius={3.6} color="#ffc78b" />
      <EnergyRing position={[0, 0, -0.92]} radius={3.28} color={ACCENT} />
      <EnergyRing position={[0, 0, -1.03]} radius={3.93} color="#21485a" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return <Slab key={i} position={[Math.cos(angle) * 3.8, Math.sin(angle) * 3.8, -1]} scale={[0.39, 0.4, 0.85]} color={METAL} />;
      })}
      {[-5.2, 5.2].map((x) => (
        <group key={x} position={[x, 0, -1.2]}>
          <Slab position={[0, 0, 0]} scale={[1.7, 5.9, 1.8]} color="#172e43" />
          {Array.from({ length: 9 }, (_, i) => <Slab key={i} position={[0, -2.4 + i * 0.58, 0.94]} scale={[1.12, 0.09, 0.07]} color={i % 3 ? ACCENT : GOLD} emissive={i % 3 ? ACCENT : GOLD} />)}
        </group>
      ))}
      <Slab position={[0, -3.4, 1.1]} scale={[9, 0.34, 4.1]} color="#274c60" />
    </group>
  );
}

function RequestGate() {
  return (
    <group position={[0, 0, -4 * UNIT]}>
      <EnergyRing radius={2.5} color="#6de5ff" />
      <EnergyRing position={[0, 0, -0.4]} radius={1.8} color="#a49aff" />
      <Slab position={[0, -2.8, -0.6]} scale={[9, 0.3, 4]} color="#203b50" />
      {[-3.9, 3.9].map((x) => <Slab key={x} position={[x, 0, -0.7]} scale={[0.55, 4.4, 0.7]} color="#406c82" />)}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <octahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1} metalness={0.35} roughness={0.14} />
      </mesh>
    </group>
  );
}

function BackendSystem() {
  const nodes = [
    [-3.3, 0.8, 0, "#4dd6d0"],
    [0, 0.8, -1, "#f9bf78"],
    [3.3, 0.8, 0, "#9d9cff"],
  ];
  return (
    <group position={[0, 0, -5 * UNIT]}>
      <Slab position={[0, -2.2, -0.4]} scale={[11, 0.3, 6]} color="#1b394d" />
      {nodes.map(([x, y, z, color], i) => <group key={i} position={[x, y, z]}>
        <mesh><cylinderGeometry args={[1.12, 1.35, 3.2, 8]} /><meshStandardMaterial color="#19435d" metalness={0.8} roughness={0.26} /></mesh>
        <EnergyRing position={[0, 1.75, 0]} radius={1.07} color={color} rotation={[Math.PI / 2, 0, 0]} />
        <Slab position={[0, 0, 1.2]} scale={[1.3, 0.13, 0.12]} color={color} emissive={color}/>
      </group>)}
      <Rail points={[[-3.3, 0.6, 0.8], [-1.7, 1.15, 1.2], [0, 0.6, 1.1], [1.6, 1.15, 1.2], [3.3, 0.6, 0.8]]} color={ACCENT} radius={0.11} />
    </group>
  );
}

function DatabaseChamber() {
  return (
    <group position={[0, 0, -6 * UNIT]}>
      <Slab position={[0, -2.65, -0.7]} scale={[10.8, 0.35, 7.2]} color="#213d51" />
      {[-2.8, 0, 2.8].map((x, column) => <group key={x} position={[x, 0, -0.7]}>
        {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0, -1.7 + i * 0.75, 0]}>
          <cylinderGeometry args={[1.1, 1.1, 0.55, 36]} />
          <meshStandardMaterial color={column === 1 ? "#2d7783" : "#36586b"} metalness={0.8} roughness={0.23} />
        </mesh>)}
        {Array.from({ length: 5 }, (_, i) => <EnergyRing key={i} position={[0, -1.4 + i * 0.75, 0]} radius={1.11} color={column === 1 ? GOLD : ACCENT} rotation={[Math.PI / 2, 0, 0]} />)}
      </group>)}
      <EnergyRing position={[0, 0, -2.5]} radius={4.8} color="#245b6a" />
    </group>
  );
}

function FrontendGallery() {
  return (
    <group position={[0, 0, -7 * UNIT]}>
      <Slab position={[0, 0.3, -0.6]} scale={[8.6, 5.1, 0.3]} color="#142b40" />
      <Slab position={[0, 2.52, -0.4]} scale={[8.2, 0.36, 0.07]} color="#2b596f" />
      <Slab position={[-2.85, 0.3, -0.4]} scale={[1.8, 3.6, 0.08]} color="#1f4055" />
      {[-0.7, 1.45, 3.5].map((x, i) => <group key={x} position={[x, 0, -0.33]}>
        <Slab position={[0, -0.1, 0]} scale={[1.56, 2.36, 0.08]} color={i === 1 ? "#55c6c1" : "#39758c"} />
        <Slab position={[0, -0.83, 0.06]} scale={[1.12, 0.14, 0.03]} color={GOLD} emissive="#66411d" />
      </group>)}
      <EnergyRing position={[0, 0, -2]} radius={4.65} color="#29657b" />
    </group>
  );
}

function FinalAtrium() {
  return <group position={[0, 0, -8 * UNIT]}>
    <EnergyRing radius={3.25} color={ACCENT} />
    <EnergyRing radius={4} color={GOLD} rotation={[0.4, 0.3, 0]} />
    <mesh><icosahedronGeometry args={[1.55, 3]} /><meshPhysicalMaterial color="#68ced9" metalness={0.25} roughness={0.08} transmission={0.42} thickness={1.8} /></mesh>
  </group>;
}

function ContactBeacon() {
  return <group position={[0, 0, -10 * UNIT]}>
    <EnergyRing radius={3.15} color="#50b8ca" rotation={[0.1, 0.2, 0]} />
    <EnergyRing radius={2.45} color={GOLD} rotation={[0.3, -0.25, 0]} />
    <mesh><icosahedronGeometry args={[1.3, 2]}/><meshPhysicalMaterial color="#8ad8e5" transmission={0.2} roughness={0.12} metalness={0.35}/></mesh>
  </group>;
}

function Convergence() {
  return <group position={[0, 0, -9 * UNIT]}>
    <EnergyRing radius={4.8} color="#285e79" />
    <EnergyRing radius={3.4} color="#59ddc7" />
    <EnergyRing radius={2.2} color={GOLD} />
    <mesh><sphereGeometry args={[1.25, 32, 32]}/><meshPhysicalMaterial color="#8acccf" metalness={0.32} roughness={0.13} transmission={0.2}/></mesh>
  </group>;
}

function Signal({ progressRef, paused }) {
  const marker = useRef(null);
  useFrame(() => {
    if (!marker.current || paused) return;
    const p = Math.max(0, Math.min(MAX_PROGRESS, progressRef.current));
    // The DOM packet hands off to this marker; before that it stays hidden.
    const reveal = THREE.MathUtils.smoothstep(p, HANDOFF_START, HANDOFF_END);
    marker.current.visible = reveal > 0.001;
    marker.current.scale.setScalar(Math.max(0.001, reveal));
    marker.current.position.set(...signalAt(p));
    marker.current.rotation.y = p * 2.2;
  });
  return <mesh ref={marker}>
    <octahedronGeometry args={[0.25, 1]} />
    <meshBasicMaterial color={GOLD} toneMapped={false} />
  </mesh>;
}

function FrameDirector({ progressRef, paused }) {
  const { invalidate, gl, scene, camera } = useThree();
  // Compile every material up front. Rendering is gated to when the world is visible, so lazily
  // compiled shaders would otherwise all land on its first visible frame (measured ~0.6 s stall).
  // One warm-up render with culling off also uploads every geometry buffer (compile() does not), so
  // meshes deep in the corridor are not uploaded on the world's first visible frame either.
  useEffect(() => {
    gl.compile(scene, camera);
    const culled = [];
    scene.traverse((object) => { if (object.frustumCulled) { culled.push(object); object.frustumCulled = false; } });
    gl.render(scene, camera);
    culled.forEach((object) => { object.frustumCulled = true; });
    invalidate();
  }, [gl, scene, camera, invalidate]);
  useEffect(() => {
    const update = () => invalidate();
    window.addEventListener("cte:progress", update);
    update();
    return () => window.removeEventListener("cte:progress", update);
  }, [invalidate]);

  useFrame(({ camera, gl }) => {
    if (paused) return;
    const p = Math.max(0, Math.min(MAX_PROGRESS, progressRef.current));
    const { position, target } = cameraAt(p);
    const [x, y, z] = position;
    camera.position.set(x, y, z);
    camera.lookAt(...target);
    const canvas = gl.domElement;
    canvas.dataset.progress = (p / 10).toFixed(3);
    canvas.dataset.camera = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  });
  return null;
}

function WorldScene({ progressRef, paused }) {
  return <>
    <fog attach="fog" args={["#071222", 18, 47]} />
    <hemisphereLight args={["#b7e9ff", "#101b35", 2.4]} />
    <directionalLight position={[-5, 11, 9]} color="#e1efff" intensity={2.8} />
    <pointLight position={[2, 1, -3 * UNIT]} color={GOLD} intensity={110} distance={21} />
    <pointLight position={[-4, 2, -6 * UNIT]} color={ACCENT} intensity={90} distance={20} />
    <Corridor />
    <SourceChamber />
    <BuildChamber />
    <DeploymentGate />
    <RequestGate />
    <BackendSystem />
    <DatabaseChamber />
    <FrontendGallery />
    <FinalAtrium />
    <Convergence />
    <ContactBeacon />
    <Signal progressRef={progressRef} paused={paused} />
    <FrameDirector progressRef={progressRef} paused={paused} />
  </>;
}

export default function World({ progressRef, paused, reduced, quality = "auto" }) {
  const [supported, setSupported] = useState(null);
  useEffect(() => {
    if (reduced) return;
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    const ready = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    const frame = requestAnimationFrame(() => setSupported(ready));
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  if (reduced || supported === false) {
    return <div className="cte-world-fallback" aria-hidden="true" data-testid="cte-fallback" />;
  }
  if (supported === null) return null;

  const dpr = quality === "low" ? 1 : quality === "high" ? Math.min(1.75, typeof window === "undefined" ? 1 : window.devicePixelRatio) : [1, 1.45];

  return <div className="cte-world" data-testid="cte-world">
    <Canvas
      frameloop="demand"
      dpr={dpr}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 110, position: [0, 1, 10.5] }}
      gl={{ antialias: quality !== "low", alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#071222", 0);
        gl.domElement.addEventListener("webglcontextlost", () => setSupported(false), { once: true });
      }}
    >
      <WorldScene progressRef={progressRef} paused={paused} />
    </Canvas>
  </div>;
}
