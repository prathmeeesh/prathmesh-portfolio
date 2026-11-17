"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getLibrary, PALETTE } from "../materials";

/*
 * Chapter 01 — The Developer Laboratory.
 * A floating island above the clouds carrying a glass-domed engineering
 * studio: workstation, developer, robot arm presenting the code artifact,
 * server racks and a holographic architecture sketch.
 * Local origin = centre of the plaza floor (world station 0).
 */

const FLOOR = 0.2;
const DOME_RADIUS = 4.55;
/** Where the robot arm presents the code artifact (local coordinates). Exported for the artifact path. */
export const ARTIFACT_ANCHOR = new THREE.Vector3(1.55, 2.0, 0.65);

function useLib() {
  return useMemo(() => getLibrary(), []);
}

/* ---------- island ---------- */

function useRockGeometry(detail) {
  const geometry = useMemo(() => {
    const profile = [[4.85, 0], [4.7, -0.45], [4.3, -1.1], [3.75, -1.9], [3.0, -2.8], [2.2, -3.8], [1.35, -4.8], [0.6, -5.7], [0.05, -6.4]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(profile, detail);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const top = new THREE.Color(PALETTE.earthTop);
    const deep = new THREE.Color(PALETTE.earthDeep);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      // Integer angular frequencies keep the lathe seam closed.
      const n = Math.sin(a * 5 + y * 1.7) * Math.cos(a * 3 - y * 2.3) * 0.14 + Math.sin(a * 11 + y * 4.1) * 0.05;
      const k = y > -0.05 ? 1 : 1 + n;
      p.setXYZ(i, x * k, y + (y < -0.3 ? Math.sin(a * 7) * 0.12 : 0), z * k);
      const t = THREE.MathUtils.clamp(-y / 6.4 + n * 0.6, 0, 1);
      c.copy(top).lerp(deep, Math.pow(t, 0.8));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [detail]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function Foliage({ lib, count }) {
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const placements = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + ((i * 0.37) % 0.3);
    const r = 4.35 + ((i * 0.53) % 0.45);
    const s = 0.22 + ((i * 0.71) % 0.28);
    return { position: [Math.cos(a) * r, FLOOR + s * 0.35, Math.sin(a) * r], scale: [s * 1.3, s, s * 1.2] };
  }), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <instancedMesh args={[geometry, lib.m.foliage, count]} ref={(mesh) => {
    if (!mesh) return;
    const o = new THREE.Object3D();
    placements.forEach((p, i) => { o.position.set(...p.position); o.scale.set(...p.scale); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
    mesh.instanceMatrix.needsUpdate = true;
  }} />;
}

function Island({ lib, detail }) {
  const rock = useRockGeometry(detail);
  return <group>
    <mesh geometry={rock} material={lib.m.rock} position={[0, -0.05, 0]} />
    {/* Hanging boulders under the island */}
    {[[1.4, -6.1, 0.6, 0.55], [-1.1, -5.5, -0.8, 0.45], [0.3, -6.9, -0.2, 0.32]].map(([x, y, z, s], i) =>
      <mesh key={i} position={[x, y, z]} scale={s} rotation={[i, i * 2, 0]} material={lib.m.rock} geometry={rock} />)}
    <mesh position={[0, -0.02, 0]} material={lib.m.grass}><cylinderGeometry args={[4.95, 4.85, 0.24, detail * 2]} /></mesh>
    <mesh position={[0, FLOOR - 0.04, 0]} material={lib.m.plaza} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3.85, detail * 2]} /></mesh>
    <mesh position={[0, FLOOR - 0.06, 0]} material={lib.m.steel}><cylinderGeometry args={[3.95, 3.95, 0.08, detail * 2]} /></mesh>
    <mesh position={[0, FLOOR - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lib.m.glow}><torusGeometry args={[3.9, 0.025, 6, detail * 3]} /></mesh>
    <Foliage lib={lib} count={detail > 20 ? 26 : 14} />
  </group>;
}

function Waterfall({ lib }) {
  const angle = -2.35; // front-left edge, toward the establishing camera
  const x = Math.cos(angle) * 4.45, z = -Math.sin(angle) * 4.45;
  return <group position={[x, 0, z]} rotation={[0, Math.atan2(x, z), 0]}>
    <mesh position={[0, -3.2, 0.12]} material={lib.m.waterfall}><planeGeometry args={[0.8, 6.6]} /></mesh>
    <mesh position={[0, -3.4, 0.2]} material={lib.m.waterfall}><planeGeometry args={[0.45, 7]} /></mesh>
    <mesh position={[0, -7.2, 0.5]} scale={[3.2, 1.4, 1]} material={lib.m.cloud}><planeGeometry /></mesh>
  </group>;
}

/* ---------- glass dome ---------- */

const FRESNEL_VERTEX = `
varying vec3 vNormal; varying vec3 vView;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRESNEL_FRAGMENT = `
uniform vec3 rim; varying vec3 vNormal; varying vec3 vView;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
  gl_FragColor = vec4(rim, f * 0.85);
}`;

function GlassDome({ lib, detail }) {
  const fresnel = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { rim: { value: new THREE.Color("#8ff3f6") } },
    vertexShader: FRESNEL_VERTEX, fragmentShader: FRESNEL_FRAGMENT,
    transparent: true, depthWrite: false, toneMapped: false,
  }), []);
  useEffect(() => () => fresnel.dispose(), [fresnel]);
  const ribs = 6;
  return <group position={[0, FLOOR - 0.02, 0]}>
    <mesh material={lib.m.glass} renderOrder={2}><sphereGeometry args={[DOME_RADIUS, detail * 2, detail, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    <mesh material={fresnel} renderOrder={3}><sphereGeometry args={[DOME_RADIUS + 0.02, detail * 2, detail, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    {Array.from({ length: ribs }, (_, i) =>
      <mesh key={i} rotation={[0, (i / ribs) * Math.PI, 0]} material={lib.m.steel}><torusGeometry args={[DOME_RADIUS + 0.01, 0.022, 5, detail * 2, Math.PI]} /></mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.6, 0]} material={lib.m.steel}><torusGeometry args={[Math.sqrt(DOME_RADIUS ** 2 - 2.6 ** 2), 0.02, 5, detail * 2]} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={lib.m.glow}><torusGeometry args={[DOME_RADIUS + 0.03, 0.075, 8, detail * 3]} /></mesh>
    <mesh position={[0, DOME_RADIUS - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lib.m.steel}><torusGeometry args={[0.32, 0.05, 6, 24]} /></mesh>
  </group>;
}

/* ---------- workstation ---------- */

function Monitor({ lib, screen, position, rotationY = 0, size = [1.12, 0.66] }) {
  const [w, h] = size;
  return <group position={position} rotation={[-0.06, rotationY, 0]}>
    <mesh material={lib.m.bezel}><boxGeometry args={[w + 0.06, h + 0.06, 0.04]} /></mesh>
    <mesh position={[0, 0, 0.022]} material={screen}><planeGeometry args={[w, h]} /></mesh>
    <mesh position={[0, -h / 2 - 0.22, -0.06]} material={lib.m.steel}><boxGeometry args={[0.05, 0.42, 0.04]} /></mesh>
  </group>;
}

function Developer({ lib }) {
  // Seated, facing the monitors (−z). Simple, proportioned, deliberately non-cartoon.
  return <group>
    <mesh position={[0, 1.18, 0.08]} rotation={[-0.12, 0, 0]} material={lib.m.fabric}><capsuleGeometry args={[0.2, 0.42, 6, 12]} /></mesh>
    <mesh position={[0, 1.68, -0.02]} material={lib.m.skin}><sphereGeometry args={[0.135, 16, 12]} /></mesh>
    <mesh position={[0, 1.72, 0.01]} scale={[1.04, 0.86, 1.06]} material={lib.m.hair}><sphereGeometry args={[0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} /></mesh>
    <mesh position={[0, 1.5, 0.04]} material={lib.m.skin}><cylinderGeometry args={[0.055, 0.06, 0.1, 10]} /></mesh>
    {[-1, 1].map((s) => <group key={s}>
      {/* upper arm, forearm toward keyboard */}
      <mesh position={[s * 0.25, 1.24, -0.02]} rotation={[0.55, 0, s * 0.12]} material={lib.m.fabric}><capsuleGeometry args={[0.06, 0.26, 4, 8]} /></mesh>
      <mesh position={[s * 0.2, 1.06, -0.3]} rotation={[1.45, 0, -s * 0.25]} material={lib.m.fabric}><capsuleGeometry args={[0.05, 0.26, 4, 8]} /></mesh>
      <mesh position={[s * 0.15, 1.02, -0.5]} material={lib.m.skin}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
      {/* thigh and shin */}
      <mesh position={[s * 0.11, 0.86, -0.12]} rotation={[Math.PI / 2, 0, 0]} material={lib.m.trousers}><capsuleGeometry args={[0.08, 0.32, 4, 8]} /></mesh>
      <mesh position={[s * 0.11, 0.5, -0.36]} material={lib.m.trousers}><capsuleGeometry args={[0.065, 0.38, 4, 8]} /></mesh>
    </group>)}
  </group>;
}

function Chair({ lib }) {
  return <group>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0, FLOOR + 0.06, 0]} rotation={[0, (i / 5) * Math.PI * 2, 0]} material={lib.m.graphite}>
      <boxGeometry args={[0.05, 0.04, 0.7]} />
    </mesh>)}
    <mesh position={[0, 0.52, 0]} material={lib.m.steel}><cylinderGeometry args={[0.035, 0.045, 0.6, 10]} /></mesh>
    <mesh position={[0, 0.82, 0]} material={lib.m.chair}><boxGeometry args={[0.56, 0.08, 0.52]} /></mesh>
    <mesh position={[0, 1.25, 0.3]} rotation={[0.12, 0, 0]} material={lib.m.chair}><boxGeometry args={[0.5, 0.72, 0.07]} /></mesh>
  </group>;
}

/** Desk, three monitors, peripherals, chair and developer. Reused for the Source chapter close-up. */
export function Workstation({ withDeveloper = true }) {
  const lib = useLib();
  const deskY = 0.8;
  return <group>
    <mesh position={[0, deskY, 0]} material={lib.m.deskTop}><boxGeometry args={[3.3, 0.06, 1.05]} /></mesh>
    <mesh position={[0, deskY - 0.035, 0.53]} material={lib.m.glow}><boxGeometry args={[3.3, 0.012, 0.012]} /></mesh>
    {[-1.5, 1.5].map((x) => <mesh key={x} position={[x, (deskY + FLOOR) / 2, 0]} material={lib.m.graphite}><boxGeometry args={[0.06, deskY - FLOOR, 0.92]} /></mesh>)}
    <mesh position={[0, 0.48, -0.42]} material={lib.m.graphite}><boxGeometry args={[2.9, 0.45, 0.03]} /></mesh>
    <Monitor lib={lib} screen={lib.m.screenSource} position={[0, 1.5, -0.32]} size={[1.24, 0.74]} />
    <Monitor lib={lib} screen={lib.m.screenExplorer} position={[-1.22, 1.46, -0.16]} rotationY={0.42} />
    <Monitor lib={lib} screen={lib.m.screenTerminal} position={[1.22, 1.46, -0.16]} rotationY={-0.42} />
    <mesh position={[0, deskY + 0.045, 0.18]} material={lib.m.keyboard}><boxGeometry args={[0.86, 0.025, 0.28]} /></mesh>
    <mesh position={[0.62, deskY + 0.045, 0.2]} material={lib.m.keyboard}><boxGeometry args={[0.09, 0.03, 0.14]} /></mesh>
    <mesh position={[-1.05, deskY + 0.1, 0.25]} material={lib.m.ceramic}><cylinderGeometry args={[0.06, 0.055, 0.14, 14]} /></mesh>
    {withDeveloper && <group position={[0, 0, 0.95]}>
      <Chair lib={lib} />
      <group position={[0, 0, -0.08]}><Developer lib={lib} /></group>
    </group>}
  </group>;
}

/* ---------- equipment ---------- */

function Link({ lib, length, radius }) {
  return <mesh position={[length / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={lib.m.steel}><capsuleGeometry args={[radius, length - radius * 2, 4, 12]} /></mesh>;
}

function Joint({ lib, r = 0.12 }) {
  return <mesh material={lib.m.graphite}><sphereGeometry args={[r, 14, 10]} /></mesh>;
}

function RobotArm({ lib }) {
  // Two-link inverse kinematics so the gripper genuinely reaches ARTIFACT_ANCHOR.
  const base = new THREE.Vector3(2.35, FLOOR, 0.15);
  const L1 = 1.0, L2 = 0.9, shoulderH = 0.62, gripLen = 0.28;
  const dx = Math.hypot(ARTIFACT_ANCHOR.x - base.x, ARTIFACT_ANCHOR.z - base.z);
  const dy = ARTIFACT_ANCHOR.y + gripLen - (base.y + shoulderH);
  const D = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01);
  const a1 = Math.atan2(dy, dx) + Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D));
  const elbow = Math.PI - Math.acos((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2));
  const a2 = a1 - elbow;
  const yaw = -Math.atan2(ARTIFACT_ANCHOR.z - base.z, ARTIFACT_ANCHOR.x - base.x);
  return <group position={base.toArray()}>
    <mesh position={[0, 0.12, 0]} material={lib.m.graphite}><cylinderGeometry args={[0.42, 0.48, 0.24, 28]} /></mesh>
    <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lib.m.glowAmber}><torusGeometry args={[0.36, 0.018, 6, 32]} /></mesh>
    <group rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.42, 0]} material={lib.m.steel}><cylinderGeometry args={[0.2, 0.26, 0.36, 20]} /></mesh>
      <group position={[0, shoulderH, 0]} rotation={[0, 0, a1]}>
        <Joint lib={lib} r={0.15} />
        <Link lib={lib} length={L1} radius={0.085} />
        <group position={[L1, 0, 0]} rotation={[0, 0, a2 - a1]}>
          <Joint lib={lib} />
          <Link lib={lib} length={L2} radius={0.07} />
          <group position={[L2, 0, 0]} rotation={[0, 0, -Math.PI / 2 - a2]}>
            <Joint lib={lib} r={0.09} />
            <mesh position={[gripLen * 0.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={lib.m.graphite}><cylinderGeometry args={[0.06, 0.08, gripLen * 0.5, 12]} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[gripLen * 0.85, 0, s * 0.13]} material={lib.m.steel}><boxGeometry args={[0.2, 0.04, 0.03]} /></mesh>)}
          </group>
        </group>
      </group>
    </group>
  </group>;
}

function ServerRack({ lib, position, rotationY }) {
  return <group position={position} rotation={[0, rotationY, 0]}>
    <mesh position={[0, 1.05, 0]} material={lib.m.graphite}><boxGeometry args={[0.72, 1.9, 0.68]} /></mesh>
    <mesh position={[0, 1.05, 0.345]} material={lib.m.rackFace}><planeGeometry args={[0.6, 1.76]} /></mesh>
    <mesh position={[0, 2.02, 0]} material={lib.m.glow}><boxGeometry args={[0.74, 0.02, 0.7]} /></mesh>
  </group>;
}

function Hologram({ lib }) {
  return <group position={[-0.1, 2.75, -1.25]}>
    <mesh material={lib.m.hologramPane}><planeGeometry args={[2.9, 0.98]} /></mesh>
    <mesh position={[0, 0, 0.01]} material={lib.m.hologram}><planeGeometry args={[2.9, 0.97]} /></mesh>
    {[-1.45, 1.45].map((x) => <mesh key={x} position={[x, 0, 0]} material={lib.m.glow}><boxGeometry args={[0.015, 1.0, 0.015]} /></mesh>)}
  </group>;
}

export default function Laboratory({ quality = "high" }) {
  const lib = useLib();
  const detail = quality === "low" ? 18 : 32;
  return <group>
    <Island lib={lib} detail={detail} />
    <Waterfall lib={lib} />
    <group position={[-0.4, 0, -1.05]}><Workstation /></group>
    <Hologram lib={lib} />
    <RobotArm lib={lib} />
    <ServerRack lib={lib} position={[2.55, FLOOR, -2.2]} rotationY={-0.75} />
    <ServerRack lib={lib} position={[-3.05, FLOOR, -1.7]} rotationY={0.85} />
    <pointLight position={[0, 3.2, 0.6]} intensity={9} distance={9} color="#bff6ff" />
    <GlassDome lib={lib} detail={detail} />
  </group>;
}
