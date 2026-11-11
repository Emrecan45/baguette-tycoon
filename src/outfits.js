import * as THREE from 'three';
import { LitMaterial } from './lit.js';

const mats = new Map();
const mat = (hex, o = {}) => {
  const k = hex + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new LitMaterial({ color: hex, roughness: 0.6, ...o }));
  return mats.get(k);
};
const D = Math.PI / 180;
function mesh(geo, m, pos, rot = [0, 0, 0], scl = [1, 1, 1]) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(...pos);
  o.rotation.set(rot[0] * D, rot[1] * D, rot[2] * D);
  o.scale.set(...scl);
  o.castShadow = true;
  return o;
}
const SPH = new THREE.SphereGeometry(1, 20, 14);
const cyl = (rt, rb, h, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const tor = (r, t, rs = 8, ts = 24, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);

const SKIN = mat('#F0A868');
function skinned(o) { o.userData.skin = true; return o; }

function taper(points, r0, r1, m, seg = 10) {
  const g = new THREE.Group();
  const v = points.map((p) => new THREE.Vector3(...p));
  for (let i = 0; i < v.length - 1; i++) {
    const a = v[i], b = v[i + 1], len = a.distanceTo(b);
    const ra = r0 + (r1 - r0) * (i / (v.length - 1)), rb = r0 + (r1 - r0) * ((i + 1) / (v.length - 1));
    const c = new THREE.Mesh(cyl(rb, ra, len * 1.08, seg), m);
    c.position.copy(a).add(b).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    c.castShadow = true;
    g.add(c);
    if (i < v.length - 2) { const j = new THREE.Mesh(SPH, m); j.position.copy(b); j.scale.setScalar(rb); g.add(j); }
  }
  const tip = new THREE.Mesh(SPH, m); tip.position.copy(v[v.length - 1]); tip.scale.setScalar(Math.max(r1, 0.006)); g.add(tip);
  return g;
}
function star5(R, r, depth) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r : R; if (i) sh.lineTo(Math.cos(a) * k, Math.sin(a) * k); else sh.moveTo(Math.cos(a) * k, Math.sin(a) * k); }
  return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
}
const GOLD = () => mat('#FFC21A', { metalness: 0.55, roughness: 0.3 });
const STEEL = () => mat('#B7C0C9', { metalness: 0.6, roughness: 0.3 });

const eyes = (y, z, spread = 0.1) => [-1, 1].flatMap((sx) => [
  mesh(SPH, mat('#FFFFFF'), [sx * spread, y, z], [0, 0, 0], [0.05, 0.045, 0.02]),
  mesh(SPH, mat('#1A1A1F'), [sx * spread, y, z + 0.012], [0, 0, 0], [0.026, 0.03, 0.015]),
]);

const ACC = {
  beret: () => ({ head: [
    mesh(SPH, mat('#1E1E24'), [0.04, 0.53, -0.02], [0, 0, -14], [0.27, 0.09, 0.27]),
    mesh(cyl(0.015, 0.02, 0.06, 8), mat('#1E1E24'), [0.06, 0.62, -0.02], [0, 0, -14]),
  ] }),
  scarf: () => ({ head: [mesh(tor(0.17, 0.055, 10, 22), mat('#E53935'), [0, -0.03, 0.02], [90, 0, 0]),
    mesh(box(0.08, 0.2, 0.05), mat('#E53935'), [0.1, -0.12, 0.16], [10, 0, -15])] }),

  tricorne: () => {
    const black = mat('#1F1F27'), bone = mat('#F4F1E8');
    return { head: [
      mesh(cyl(0.44, 0.44, 0.07, 3), black, [0, 0.52, 0], [0, 60, 0]),
      mesh(cyl(0.22, 0.27, 0.24, 18), black, [0, 0.64, 0]),
      mesh(tor(0.255, 0.02, 6, 24), GOLD(), [0, 0.54, 0], [90, 0, 0]),

      mesh(SPH, bone, [0, 0.67, 0.245], [0, 0, 0], [0.075, 0.07, 0.03]),
      mesh(box(0.07, 0.04, 0.03), bone, [0, 0.615, 0.24]),
      mesh(SPH, black, [-0.027, 0.672, 0.27], [0, 0, 0], [0.018, 0.02, 0.01]),
      mesh(SPH, black, [0.027, 0.672, 0.27], [0, 0, 0], [0.018, 0.02, 0.01]),
      mesh(box(0.2, 0.025, 0.015), bone, [0, 0.6, 0.225], [0, 0, 32]),
      mesh(box(0.2, 0.025, 0.015), bone, [0, 0.6, 0.225], [0, 0, -32]),

      taper([[0.18, 0.62, -0.1], [0.3, 0.78, -0.18], [0.36, 0.95, -0.3]], 0.04, 0.01, mat('#D62E2E')),
    ] };
  },
  eyepatch: () => ({ head: [
    mesh(tor(0.312, 0.016, 6, 32), mat('#18181C'), [0, 0.29, 0.01], [72, 0, 18]),
    mesh(cyl(0.075, 0.075, 0.03, 16), mat('#18181C'), [-0.11, 0.31, 0.29], [80, 0, 0]),
  ] }),
  cutlass: () => {
    const g = new THREE.Group();
    g.position.set(0.25, -0.22, 0.04);
    g.rotation.set(0, 0, 18 * D);

    const bl = new THREE.Shape();
    bl.moveTo(-0.022, 0); bl.lineTo(0.022, 0);
    bl.quadraticCurveTo(0.04, -0.22, 0.12, -0.42);
    bl.quadraticCurveTo(0.0, -0.3, -0.022, 0);
    g.add(mesh(new THREE.ExtrudeGeometry(bl, { depth: 0.012, bevelEnabled: false }), STEEL(), [0, -0.06, -0.006]));
    g.add(mesh(cyl(0.025, 0.025, 0.12, 10), mat('#3A2416'), [0, 0.04, 0]));
    g.add(mesh(tor(0.06, 0.012, 6, 14, Math.PI), GOLD(), [0.0, -0.03, 0], [0, 0, 180]));
    g.add(mesh(box(0.14, 0.025, 0.04), GOLD(), [0, -0.04, 0]));
    return { spine: [g,
      mesh(cyl(0.255, 0.265, 0.09, 22), mat('#B71C1C'), [0, -0.2, 0]),
      mesh(SPH, mat('#B71C1C'), [-0.16, -0.22, 0.18], [0, 0, 0], [0.06, 0.05, 0.04]),
      mesh(box(0.06, 0.16, 0.02), mat('#B71C1C'), [-0.19, -0.31, 0.19], [0, 0, 12]),
    ] };
  },

  cowboy: () => {
    const felt = mat('#8B5A2B');
    return { head: [
      mesh(cyl(0.48, 0.48, 0.035, 28), felt, [0, 0.5, 0], [6, 0, 0]),
      mesh(tor(0.46, 0.035, 6, 28), felt, [0, 0.52, 0], [90, 0, 0], [1, 0.55, 1]),
      mesh(cyl(0.21, 0.25, 0.26, 20), felt, [0, 0.64, -0.01]),
      mesh(box(0.06, 0.08, 0.36), mat('#7A4E25'), [0, 0.76, -0.01]),
      mesh(cyl(0.252, 0.252, 0.05, 20), mat('#3A2416'), [0, 0.545, -0.01]),
    ] };
  },
  bandana: () => ({ head: [
    mesh(tor(0.2, 0.05, 8, 22), mat('#D32F2F'), [0, -0.04, 0.02], [90, 0, 0]),
    mesh(new THREE.ConeGeometry(0.17, 0.2, 3), mat('#D32F2F'), [0, -0.13, 0.17], [180 + 18, 0, 0], [1, 1, 0.35]),
    mesh(SPH, mat('#FFFFFF'), [0.05, -0.1, 0.215], [0, 0, 0], [0.018, 0.018, 0.008]),
    mesh(SPH, mat('#FFFFFF'), [-0.05, -0.13, 0.205], [0, 0, 0], [0.018, 0.018, 0.008]),
  ] }),
  vest: () => {
    const leather = mat('#6B4226'), dark = mat('#4A2C17');
    return { spine: [
      mesh(box(0.5, 0.5, 0.035), leather, [0, 0.03, -0.2]),
      mesh(box(0.17, 0.5, 0.035), leather, [-0.165, 0.03, 0.195]),
      mesh(box(0.17, 0.5, 0.035), leather, [0.165, 0.03, 0.195]),
      mesh(box(0.035, 0.5, 0.36), leather, [-0.255, 0.03, 0]),
      mesh(box(0.035, 0.5, 0.36), leather, [0.255, 0.03, 0]),
      mesh(box(0.02, 0.5, 0.01), dark, [-0.08, 0.03, 0.214]),
      mesh(box(0.02, 0.5, 0.01), dark, [0.08, 0.03, 0.214]),
      mesh(star5(0.07, 0.03, 0.015), GOLD(), [0.16, 0.1, 0.205]),
      mesh(cyl(0.262, 0.262, 0.06, 22), mat('#3A2416'), [0, -0.22, 0]),
      mesh(box(0.1, 0.08, 0.02), GOLD(), [0, -0.22, 0.26]),
    ] };
  },

  ninja: () => {
    const black = mat('#1B1C23'), red = mat('#D7262B');
    const hood = mesh(new THREE.SphereGeometry(0.335, 28, 18), black, [0, 0.27, 0.01]);

    const slit = skinned(mesh(new THREE.SphereGeometry(0.338, 24, 4, Math.PI / 2 - 0.75, 1.5, 1.28, 0.3), SKIN, [0, 0.27, 0.01]));
    const k = new THREE.Group();
    k.position.set(0, 0.08, -0.25);
    k.rotation.set(0, 0, 38 * D);
    k.add(mesh(box(0.06, 0.72, 0.035), black, [0, -0.05, 0]));
    k.add(mesh(box(0.065, 0.03, 0.04), GOLD(), [0, 0.32, 0]));
    k.add(mesh(cyl(0.065, 0.065, 0.02, 16), GOLD(), [0, 0.34, 0]));
    k.add(mesh(cyl(0.028, 0.028, 0.24, 10), mat('#2B2B33'), [0, 0.47, 0]));
    for (let i = 0; i < 4; i++) k.add(mesh(box(0.06, 0.018, 0.06), red, [0, 0.38 + i * 0.055, 0], [0, 45, 0]));
    k.add(mesh(SPH, GOLD(), [0, 0.6, 0], [0, 0, 0], [0.03, 0.02, 0.03]));
    return {
      head: [hood, slit, ...eyes(0.31, 0.318, 0.1),
        mesh(box(0.1, 0.025, 0.02), black, [-0.1, 0.38, 0.3], [0, 0, -14]),
        mesh(box(0.1, 0.025, 0.02), black, [0.1, 0.38, 0.3], [0, 0, 14]),
        mesh(tor(0.34, 0.035, 8, 32), red, [0, 0.44, 0.0], [96, 0, 0]),
        mesh(SPH, red, [0, 0.43, -0.34], [0, 0, 0], [0.06, 0.05, 0.04]),
        taper([[0.02, 0.42, -0.36], [0.1, 0.3, -0.48], [0.2, 0.12, -0.56], [0.26, -0.05, -0.6]], 0.03, 0.022, red, 6),
        taper([[-0.02, 0.42, -0.36], [-0.05, 0.27, -0.5], [-0.07, 0.08, -0.58], [-0.06, -0.12, -0.62]], 0.03, 0.022, red, 6),
      ],
      spine: [k,
        mesh(cyl(0.262, 0.262, 0.08, 22), red, [0, -0.2, 0]),
        mesh(SPH, red, [0.12, -0.2, 0.22], [0, 0, 0], [0.05, 0.045, 0.035]),
        mesh(box(0.05, 0.2, 0.02), red, [0.15, -0.31, 0.22], [0, 0, 16]),
        mesh(box(0.05, 0.18, 0.02), red, [0.09, -0.3, 0.23], [0, 0, -10]),
      ],
    };
  },

  viking: () => {
    const metal = mat('#9AA3AD', { metalness: 0.55, roughness: 0.35 });
    const ivory = mat('#F2E6C8'), ginger = mat('#D9661F'), gingerD = mat('#B9501A'), fur = mat('#8C7457');
    const horn = (sx) => taper([[sx * 0.28, 0.42, 0], [sx * 0.44, 0.5, 0.02], [sx * 0.55, 0.66, 0.03], [sx * 0.58, 0.84, 0.02], [sx * 0.53, 0.98, 0]], 0.085, 0.012, ivory, 12);
    const braid = (sx) => {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) g.add(mesh(SPH, i % 2 ? gingerD : ginger, [sx * 0.085, -0.04 - i * 0.075, 0.27 - i * 0.012], [0, 0, i % 2 ? 20 : -20], [0.045, 0.05, 0.045]));
      g.add(mesh(cyl(0.035, 0.035, 0.04, 12), GOLD(), [sx * 0.085, -0.5, 0.2]));
      g.add(mesh(new THREE.ConeGeometry(0.035, 0.08, 10), ginger, [sx * 0.085, -0.56, 0.2], [180, 0, 0]));
      return g;
    };
    const head = [
      mesh(new THREE.SphereGeometry(0.345, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2), metal, [0, 0.3, 0.01]),
      mesh(tor(0.34, 0.04, 8, 32), mat('#7C5A3A'), [0, 0.31, 0.01], [90, 0, 0]),
      mesh(box(0.05, 0.36, 0.03), mat('#C79A3A', { metalness: 0.5 }), [0, 0.47, 0.17], [-28, 0, 0]),
      mesh(box(0.05, 0.36, 0.03), mat('#C79A3A', { metalness: 0.5 }), [0, 0.5, 0.0], [0, 0, 90]),
      mesh(cyl(0.022, 0.04, 0.22, 8), metal, [0, 0.25, 0.345], [8, 0, 0]),
      horn(1), horn(-1),

      mesh(SPH, ginger, [0, 0.07, 0.17], [0, 0, 0], [0.27, 0.22, 0.2]),
      mesh(SPH, ginger, [0, -0.06, 0.2], [0, 0, 0], [0.2, 0.17, 0.14]),
      mesh(SPH, gingerD, [-0.08, 0.2, 0.29], [0, 0, 25], [0.1, 0.04, 0.04]),
      mesh(SPH, gingerD, [0.08, 0.2, 0.29], [0, 0, -25], [0.1, 0.04, 0.04]),
      braid(1), braid(-1),
    ];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; head.push(mesh(SPH, mat('#D9DEE2', { metalness: 0.5 }), [Math.sin(a) * 0.36, 0.31, Math.cos(a) * 0.36], [0, 0, 0], [0.025, 0.025, 0.025])); }

    const sh = new THREE.Group();
    sh.position.set(0, 0.05, -0.27);
    ['#A8713C', '#8F5C2E', '#B47C45', '#8F5C2E', '#A8713C'].forEach((c, i) => {
      const x = -0.232 + i * 0.116, half = Math.sqrt(Math.max(0.01, 0.29 * 0.29 - x * x));
      sh.add(mesh(box(0.112, 2 * half, 0.03), mat(c), [x, 0, 0]));
    });
    sh.add(mesh(new THREE.CircleGeometry(0.29, 28), mat('#C62828'), [0, 0, -0.017], [0, 180, 0]));
    sh.add(mesh(tor(0.3, 0.025, 8, 32), metal, [0, 0, 0]));
    sh.add(mesh(new THREE.SphereGeometry(0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal, [0, 0, -0.015], [-90, 0, 0]));
    return { head, spine: [sh,
      mesh(tor(0.24, 0.085, 10, 24), fur, [0, 0.3, 0], [90, 0, 0]),
      mesh(SPH, fur, [0.2, 0.3, 0.12], [0, 0, 0], [0.11, 0.1, 0.1]),
      mesh(SPH, fur, [-0.2, 0.3, 0.12], [0, 0, 0], [0.11, 0.1, 0.1]),
      mesh(cyl(0.262, 0.262, 0.07, 22), mat('#4A3020'), [0, -0.21, 0]),
      mesh(box(0.11, 0.09, 0.03), GOLD(), [0, -0.21, 0.26]),
    ] };
  },

  skull: () => {
    const black = mat('#1C1C22'), bone = mat('#F1EDE1');
    const glow = mat('#FF5A3C', { emissive: '#FF3A1A', emissiveIntensity: 0.9 });
    const teeth = [];
    for (let i = 0; i < 6; i++) teeth.push(mesh(box(0.028, 0.045, 0.02), bone, [-0.075 + i * 0.03, 0.115, 0.3], [-10, 0, 0]));
    const spine = [mesh(box(0.06, 0.4, 0.02), bone, [0, 0.03, 0.215])];
    for (let i = 0; i < 6; i++) spine.push(mesh(box(0.07, 0.045, 0.03), bone, [0, 0.25 - i * 0.075, -0.205]));
    return { head: [
      mesh(SPH, black, [0.11, 0.31, 0.27], [0, 0, 0], [0.085, 0.1, 0.05]),
      mesh(SPH, black, [-0.11, 0.31, 0.27], [0, 0, 0], [0.085, 0.1, 0.05]),
      mesh(SPH, glow, [0.11, 0.31, 0.31], [0, 0, 0], [0.022, 0.022, 0.012]),
      mesh(SPH, glow, [-0.11, 0.31, 0.31], [0, 0, 0], [0.022, 0.022, 0.012]),
      mesh(new THREE.ConeGeometry(0.04, 0.07, 3), black, [0, 0.21, 0.3], [180 - 20, 0, 0]),
      mesh(box(0.2, 0.06, 0.02), black, [0, 0.115, 0.285], [-10, 0, 0]),
      ...teeth,
    ], spine };
  },

  astronaut: () => {
    const white = mat('#E9EDF3'), grey = mat('#9AA3AD');
    return {
      head: [
        mesh(new THREE.SphereGeometry(0.43, 28, 18), mat('#BFE6FF', { transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.1, depthWrite: false }), [0, 0.27, 0.02]),
        mesh(new THREE.SphereGeometry(0.44, 28, 12, Math.PI / 2 - 0.95, 1.9, 0.75, 1.0), mat('#F2B630', { metalness: 0.85, roughness: 0.18 }), [0, 0.27, 0.02]),
        mesh(tor(0.25, 0.065, 10, 28), white, [0, -0.06, 0.01], [90, 0, 0]),
        mesh(cyl(0.04, 0.04, 0.08, 10), grey, [0.42, 0.3, 0.02], [0, 0, 90]),
        mesh(cyl(0.04, 0.04, 0.08, 10), grey, [-0.42, 0.3, 0.02], [0, 0, 90]),
        mesh(cyl(0.012, 0.012, 0.22, 6), grey, [-0.3, 0.6, -0.05], [0, 0, 20]),
        mesh(SPH, mat('#FF3B30', { emissive: '#FF2A1A', emissiveIntensity: 1 }), [-0.34, 0.71, -0.05], [0, 0, 0], [0.03, 0.03, 0.03]),
      ],
      spine: [
        mesh(box(0.46, 0.52, 0.22), white, [0, 0.08, -0.3]),
        mesh(box(0.36, 0.1, 0.03), grey, [0, -0.1, -0.42]),
        mesh(box(0.36, 0.1, 0.03), grey, [0, 0.04, -0.42]),
        mesh(cyl(0.06, 0.06, 0.16, 12), mat('#FF6B3D'), [0.12, 0.4, -0.3]),
        mesh(cyl(0.06, 0.06, 0.16, 12), mat('#3FA4F2'), [-0.12, 0.4, -0.3]),
        taper([[0.2, 0.2, -0.22], [0.3, 0.05, -0.05], [0.18, -0.05, 0.2]], 0.025, 0.025, grey, 8),
        mesh(box(0.24, 0.16, 0.05), white, [0, 0.0, 0.215]),
        mesh(box(0.05, 0.05, 0.02), mat('#FF3B30'), [-0.07, 0.02, 0.245]),
        mesh(box(0.05, 0.05, 0.02), mat('#34C759'), [0, 0.02, 0.245]),
        mesh(box(0.05, 0.05, 0.02), mat('#3FA4F2'), [0.07, 0.02, 0.245]),
        mesh(box(0.18, 0.03, 0.02), mat('#FFC21A'), [0, -0.045, 0.245]),
        mesh(cyl(0.06, 0.06, 0.015, 18), mat('#1E4FA8'), [-0.24, 0.2, 0.1], [0, 0, 90]),
      ],
    };
  },

  crown: () => {
    const g = GOLD();
    const parts = [mesh(cyl(0.22, 0.24, 0.13, 24, true), g, [0, 0.58, 0]), mesh(cyl(0.2, 0.2, 0.1, 20), mat('#B71C1C'), [0, 0.6, 0])];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push(mesh(new THREE.ConeGeometry(0.055, 0.15, 8), g, [Math.sin(a) * 0.21, 0.71, Math.cos(a) * 0.21]));
      parts.push(mesh(SPH, g, [Math.sin(a) * 0.21, 0.795, Math.cos(a) * 0.21], [0, 0, 0], [0.025, 0.025, 0.025]));
      parts.push(mesh(SPH, mat(i % 2 ? '#3FA4F2' : '#E53935', { roughness: 0.2 }), [Math.sin(a) * 0.235, 0.58, Math.cos(a) * 0.235], [0, 0, 0], [0.035, 0.035, 0.035]));
    }
    parts.push(mesh(SPH, g, [0, 0.69, 0], [0, 0, 0], [0.05, 0.05, 0.05]));
    const red = mat('#B71C1C', { side: THREE.DoubleSide }), ermine = mat('#FBFAF5'), spot = mat('#15151A');

    const OPEN = 1.1;
    const cape = mesh(new THREE.CylinderGeometry(0.3, 0.44, 0.95, 24, 1, true, OPEN / 2, Math.PI * 2 - OPEN), red, [0, -0.18, -0.04]);
    const spine = [cape];
    const hemR = 0.44;
    for (let i = 0; i <= 18; i++) {
      const a = OPEN / 2 + (i / 18) * (Math.PI * 2 - OPEN);
      const x = Math.sin(a) * hemR, z = -0.04 + Math.cos(a) * hemR;
      spine.push(mesh(SPH, ermine, [x, -0.65, z], [0, 0, 0], [0.07, 0.055, 0.07]));
      if (i % 2) spine.push(mesh(box(0.025, 0.05, 0.02), spot, [x * 1.13, -0.64, -0.04 + (z + 0.04) * 1.13], [0, a / D, 0]));
    }
    spine.push(mesh(tor(0.27, 0.075, 10, 26), ermine, [0, 0.31, -0.02], [90, 0, 0]));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      spine.push(mesh(box(0.025, 0.05, 0.02), spot, [Math.sin(a) * 0.335, 0.31, -0.02 + Math.cos(a) * 0.335], [0, a / D, 0]));
    }

    const sc = new THREE.Group();
    sc.position.set(0.02, 0.12, -0.16);
    sc.rotation.set(Math.PI + 0.25, 0, 0);
    sc.add(mesh(cyl(0.022, 0.022, 0.62, 10), g, [0, 0, 0]));
    sc.add(mesh(SPH, mat('#E53935', { roughness: 0.15 }), [0, 0.36, 0], [0, 0, 0], [0.08, 0.08, 0.08]));
    sc.add(mesh(tor(0.065, 0.015, 6, 16), g, [0, 0.36, 0], [90, 0, 0]));
    sc.add(mesh(new THREE.ConeGeometry(0.03, 0.08, 8), g, [0, 0.45, 0]));
    sc.add(mesh(SPH, g, [0, -0.32, 0], [0, 0, 0], [0.035, 0.035, 0.035]));
    return { head: parts, spine, forearmR: [sc] };
  },
};

export function buildAccessories(ids = []) {
  const out = { head: [], spine: [] };
  for (const id of ids) {
    const a = ACC[id] && ACC[id]();
    if (!a) continue;
    for (const [bone, list] of Object.entries(a)) (out[bone] ||= []).push(...list);
  }
  return out;
}

const striped = new Map();
export function stripedMaterial(base, c1, c2, freq = 14, ratio = 0.5) {
  const key = [base.name, c1, c2, freq, ratio].join('|');
  if (striped.has(key)) return striped.get(key);
  const m = base.clone();
  m.color.set('#FFFFFF');
  const A = new THREE.Color(c1), B = new THREE.Color(c2);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uA = { value: A }; sh.uniforms.uB = { value: B };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vSY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSY = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSY;\nuniform vec3 uA;\nuniform vec3 uB;')
      .replace('#include <color_fragment>', `#include <color_fragment>\nfloat st = step(${ratio.toFixed(3)}, fract(vSY * ${freq.toFixed(2)}));\ndiffuseColor.rgb *= mix(uA, uB, st);`);
  };
  m.customProgramCacheKey = () => key;
  striped.set(key, m);
  return m;
}

export const OUTFITS = [
  { id: 'classic', price: 0, shirt: '#FFFFFF', pants: '#34405E', hat: 'toque' },
  { id: 'paris', price: 500, shirt: '#FFFFFF', pants: '#22232B', stripes: ['#FFFFFF', '#23407A', 13, 0.5], acc: ['beret', 'scarf'] },
  { id: 'pirate', price: 1200, shirt: '#F4EFE6', pants: '#2B2B33', stripes: ['#F4EFE6', '#C62828', 9, 0.65], acc: ['tricorne', 'eyepatch', 'cutlass'] },
  { id: 'cowboy', price: 2000, shirt: '#C0392B', pants: '#3B5B8C', acc: ['cowboy', 'bandana', 'vest'] },
  { id: 'ninja', price: 3500, shirt: '#22232B', pants: '#22232B', shoes: '#22232B', acc: ['ninja'] },
  { id: 'viking', price: 5000, shirt: '#8D5A3B', pants: '#4A3B30', acc: ['viking'] },
  { id: 'skeleton', price: 8000, shirt: '#1C1C22', pants: '#1C1C22', skin: '#F1EDE1', shoes: '#1C1C22', stripes: ['#1C1C22', '#F1EDE1', 11, 0.72], acc: ['skull'] },
  { id: 'astronaut', price: 12000, shirt: '#F4F6FA', pants: '#E3E8EF', shoes: '#9AA3AD', acc: ['astronaut'] },
  { id: 'king', price: 20000, shirt: '#7B2FBE', pants: '#3A1F5C', shoes: '#C9A13A', acc: ['crown'] },
];
