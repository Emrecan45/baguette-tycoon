import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './art.js';
import { LitMaterial } from './lit.js';

const DEG = Math.PI / 180;
let seed = 3;
export const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const C = (h) => new THREE.Color(h);
const lerpC = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));

const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx * DEG, ry * DEG, rz * DEG, 'YXZ'));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
};

const flat = (h) => { const c = C(h); return () => c; };
const vgrad = (h0, h1, y0, y1) => { const a = C(h0), b = C(h1); return (p) => lerpC(a, b, (p.y - y0) / (y1 - y0)); };

export class Kit {
  constructor() { this.geos = []; this.place = new THREE.Matrix4(); }
  at(x, z, rotDeg = 0, s = 1, y = 0) { this.place = M(x, y, z, 0, rotDeg, 0, s); return this; }
  add(geo, local, color) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(local);
    const pos = g.attributes.position, n = pos.count;
    const col = new Float32Array(n * 3);
    const p = new THREE.Vector3(), cen = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      cen.set(0, 0, 0);
      for (let k = 0; k < 3; k++) cen.add(p.fromBufferAttribute(pos, t + k));
      cen.multiplyScalar(1 / 3);
      for (let k = 0; k < 3; k++) {
        p.fromBufferAttribute(pos, t + k);
        const c = color(p, cen);
        col.set([c.r, c.g, c.b], (t + k) * 3);
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.applyMatrix4(this.place);
    this.geos.push(g);
    return this;
  }
  mesh(castShadow = true) {
    const m = new THREE.Mesh(mergeGeometries(this.geos, false), mat);
    this.geos.forEach((g) => g.dispose());
    this.geos = [];
    m.castShadow = castShadow;
    m.receiveShadow = true;
    return m;
  }
}

const SPH = new THREE.SphereGeometry(1, 20, 14);
const SPH_S = new THREE.SphereGeometry(1, 8, 6);
const CYL = (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
const RBOX = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2 - 0.001));
const lathe = (prof, seg = 20) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);

const LEAF_DARK = '#3E8A3C', LEAF_LIGHT = '#A6DC62';

export function tree(k, x, z, s = 1, variant = 0) {
  k.at(x, z, rnd() * 360, s);
  const tint = (rnd() - 0.5) * 0.06;
  const dark = C(LEAF_DARK).offsetHSL(tint, 0, 0), light = C(LEAF_LIGHT).offsetHSL(tint, 0, 0);
  const leaf = (p) => lerpC(dark, light, (p.y - 1.45) / 1.75);
  k.add(CYL(0.11, 0.17, 1.6, 10), M(0, 0.8, 0), vgrad('#5E3D2A', '#8A5E40', 0, 1.6));
  const blobs = variant === 1
    ? [[0, 2.35, 0, 0.95], [0.5, 2.0, 0.25, 0.62], [-0.45, 2.05, -0.2, 0.6], [0.05, 2.0, -0.55, 0.55], [0.1, 2.9, 0.1, 0.55]]
    : [[0, 2.25, 0, 1.0], [0.62, 1.95, 0.15, 0.62], [-0.55, 1.98, 0.25, 0.64], [0.05, 1.9, -0.6, 0.58], [-0.15, 2.8, -0.1, 0.62]];
  for (const [bx, by, bz, r] of blobs) k.add(SPH, M(bx, by, bz, 0, 0, 0, r, r * 0.92, r), leaf);
}

export function bush(k, x, z, s = 1) {
  k.at(x, z, rnd() * 360, s);
  const leaf = vgrad(LEAF_DARK, LEAF_LIGHT, 0, 0.9);
  for (const [bx, by, bz, r] of [[0, 0.38, 0, 0.48], [0.42, 0.28, 0.1, 0.34], [-0.38, 0.3, -0.05, 0.36]]) k.add(SPH, M(bx, by, bz, 0, 0, 0, r, r * 0.9, r), leaf);
}

export function hedge(k, x, z, len, rot = 0, h = 0.7) {
  k.at(x, z, rot);
  k.add(RBOX(len, h, 0.75, 0.3), M(0, h / 2, 0), vgrad('#3C813A', '#8FD15C', 0, h));
}

export function flowerBed(k, x, z, w, d, rot = 0, flowers = true) {
  k.at(x, z, rot);
  k.add(RBOX(w, 0.32, d, 0.08), M(0, 0.16, 0), vgrad('#D9CDB8', '#F4ECDD', 0, 0.32));
  k.add(RBOX(w - 0.22, 0.2, d - 0.22, 0.08), M(0, 0.27, 0), vgrad('#4D9640', '#79C255', 0.17, 0.37));
  if (!flowers) return;
  const cols = ['#FF6B7A', '#FFFFFF', '#FFB3C7', '#FFD45C', '#E8455A'];
  const n = Math.round(w * d * 14);
  for (let i = 0; i < n; i++) {
    const fx = (rnd() - 0.5) * (w - 0.4), fz = (rnd() - 0.5) * (d - 0.4);
    const r = 0.07 + rnd() * 0.05;
    k.add(SPH_S, M(fx, 0.4 + rnd() * 0.05, fz, 0, 0, 0, r), flat(cols[Math.floor(rnd() * cols.length)]));
  }
}

export function topiary(k, x, z, s = 1, ball = true) {
  k.at(x, z, 0, s);
  k.add(lathe([[0, 0], [0.26, 0], [0.32, 0.42], [0.36, 0.48], [0.3, 0.5], [0, 0.5]], 18), M(), vgrad('#B85C3A', '#E08A5E', 0, 0.5));
  if (ball) k.add(SPH, M(0, 0.95, 0, 0, 0, 0, 0.5), vgrad(LEAF_DARK, LEAF_LIGHT, 0.5, 1.45));
}

const IRON = '#2E4A3F', GOLD = '#D2AA52';

export function lamp(k, x, z, s = 1) {
  k.at(x, z, 0, s);
  k.add(lathe([[0, 0], [0.24, 0], [0.24, 0.12], [0.16, 0.22], [0.12, 0.6], [0.09, 0.66], [0, 0.66]], 16), M(), flat(IRON));
  k.add(CYL(0.05, 0.06, 2.6, 10), M(0, 1.95, 0), flat(IRON));
  k.add(CYL(0.09, 0.09, 0.08, 12), M(0, 1.0, 0), flat(GOLD));
  k.add(CYL(0.12, 0.08, 0.12, 12), M(0, 3.28, 0), flat(IRON));

  k.add(lathe([[0.07, 0], [0.2, 0.36], [0.2, 0.38], [0.07, 0.38]], 12), M(0, 3.3, 0), flat('#FFF1B8'));
  k.add(lathe([[0, 0.36], [0.27, 0.36], [0.26, 0.42], [0.1, 0.56], [0.03, 0.66], [0, 0.7]], 12), M(0, 3.3, 0), flat(IRON));
  k.add(SPH_S, M(0, 4.02, 0, 0, 0, 0, 0.05), flat(GOLD));
}

export function cafeTable(k, x, z, rot = 0, umbrella = true, stripe = '#E2463B') {
  k.at(x, z, rot);
  k.add(lathe([[0, 0], [0.22, 0], [0.2, 0.03], [0.04, 0.08], [0.035, 0.7], [0, 0.7]], 14), M(), flat('#33302E'));
  k.add(CYL(0.4, 0.4, 0.05, 22), M(0, 0.73, 0), flat('#F6F1E8'));
  for (const a of [0, 180]) {
    const r = a * DEG, cx = Math.sin(r) * 0.68, cz = Math.cos(r) * 0.68;

    k.add(CYL(0.21, 0.21, 0.06, 16), M(cx, 0.46, cz), flat('#C98B4E'));
    for (const [lx, lz] of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) k.add(CYL(0.018, 0.018, 0.46, 6), M(cx + lx, 0.23, cz + lz), flat('#2F2B28'));
    k.add(RBOX(0.38, 0.34, 0.06, 0.03), M(cx + Math.sin(r) * 0.19, 0.66, cz + Math.cos(r) * 0.19, -10, a, 0), flat('#B07539'));
  }
  if (umbrella) {
    k.add(CYL(0.025, 0.025, 2.3, 8), M(0, 1.2, 0), flat('#E9E2D6'));
    const a = C(stripe), b = C('#FFF6E6');
    const stripes = (p, cen) => ((Math.floor((Math.atan2(cen.z, cen.x) / Math.PI + 1) * 6) % 2) ? a : b);
    k.add(new THREE.ConeGeometry(1.0, 0.42, 24, 1, false), M(0, 2.25, 0), stripes);
    k.add(SPH_S, M(0, 2.58, 0, 0, 0, 0, 0.06), flat('#E9E2D6'));
  }
}

export function bench(k, x, z, rot = 0) {
  k.at(x, z, rot);
  for (const sx of [-0.62, 0.62]) {
    k.add(RBOX(0.07, 0.42, 0.42, 0.02), M(sx, 0.21, 0), flat(IRON));
    k.add(RBOX(0.07, 0.42, 0.06, 0.02), M(sx, 0.62, 0.2, -12, 0, 0), flat(IRON));
  }
  for (let i = 0; i < 3; i++) k.add(RBOX(1.45, 0.05, 0.12, 0.02), M(0, 0.44, -0.14 + i * 0.14), flat(i % 2 ? '#3E6B58' : '#46786A'));
  for (let i = 0; i < 2; i++) k.add(RBOX(1.45, 0.11, 0.04, 0.02), M(0, 0.6 + i * 0.16, 0.2 + i * 0.03, -12, 0, 0), flat('#46786A'));
}

function latticeTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.strokeStyle = '#fff';
  c.lineCap = 'square';
  c.lineWidth = 9; c.strokeRect(0, 0, 64, 64);
  c.lineWidth = 6;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(64, 64); c.moveTo(64, 0); c.lineTo(0, 64); c.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function loft(y0, y1, c0, c1, h0, h1, cell) {
  const pos = [], uv = [];
  const P = (sx, sz, top) => (top ? [c1[0] + sx * h1, y1, c1[1] + sz * h1] : [c0[0] + sx * h0, y0, c0[1] + sz * h0]);
  const sides = [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]];
  const nu = Math.max(1, Math.round((h0 * 2) / cell)), nv = Math.max(1, Math.round((y1 - y0) / cell));
  for (const [[ax, az], [bx, bz]] of sides) {
    const a0 = P(ax, az, false), b0 = P(bx, bz, false), a1 = P(ax, az, true), b1 = P(bx, bz, true);
    pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
    uv.push(0, 0, nu, 0, nu, nv, 0, 0, nu, nv, 0, nv);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export function eiffelTower(s = 1) {
  const g = new THREE.Group();
  const BRONZE = '#B9805A', BRONZE_D = '#8C5A3C';
  const lat = [];
  const cell = 0.3;

  const keys = [[0, 1.36], [0.42, 1.13], [0.84, 0.93], [1.24, 0.78], [1.85, 0.6], [2.5, 0.46], [3.4, 0.35], [4.3, 0.27], [5.2, 0.21], [6.0, 0.18]];
  const W = (y) => {
    for (let i = 1; i < keys.length; i++) if (y <= keys[i][0]) { const [ya, wa] = keys[i - 1], [yb, wb] = keys[i]; return wa + (wb - wa) * (y - ya) / (yb - ya); }
    return keys[keys.length - 1][1];
  };

  const wl = (y) => 0.34 - 0.11 * (y / 1.24);
  const ys = [0, 0.42, 0.84, 1.24];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let i = 0; i < ys.length - 1; i++) {
      const y0 = ys[i], y1 = ys[i + 1];
      const c0 = W(y0) - wl(y0), c1 = W(y1) - wl(y1);
      lat.push(loft(y0, y1, [sx * c0, sz * c0], [sx * c1, sz * c1], wl(y0), wl(y1), cell));
    }
  }

  const body = [1.4, 1.85, 2.5, 2.62, 3.4, 4.3, 5.2, 6.0];
  for (let i = 0; i < body.length - 1; i++) {
    if (body[i] === 2.5) continue;
    lat.push(loft(body[i], body[i + 1], [0, 0], [0, 0], W(body[i]) * 0.97, W(body[i + 1]) * 0.97, cell * 0.85));
  }

  lat.push(loft(1.4, 1.5, [0, 0], [0, 0], 0.83, 0.83, 0.1));
  lat.push(loft(2.6, 2.68, [0, 0], [0, 0], 0.5, 0.5, 0.08));
  const latGeo = mergeGeometries(lat, false);
  const latMat = new LitMaterial({ color: BRONZE, map: latticeTexture(), alphaTest: 0.32, side: THREE.DoubleSide, roughness: 0.75 });
  const latMesh = new THREE.Mesh(latGeo, latMat);
  latMesh.castShadow = true; latMesh.receiveShadow = true;
  latMesh.customDepthMaterial = undefined;
  latMesh.scale.setScalar(s);
  g.add(latMesh);

  const k = new Kit();
  k.at(0, 0, 0, s);
  const plat = vgrad(BRONZE_D, BRONZE, 0, 0.1);
  k.add(RBOX(1.72, 0.16, 1.72, 0.03), M(0, 1.32, 0), flat(BRONZE_D));
  k.add(RBOX(1.02, 0.12, 1.02, 0.03), M(0, 2.56, 0), flat(BRONZE_D));
  for (let i = 0; i < 4; i++) {
    const a = i * 90;
    const r = a * DEG;
    const d = W(0.75) - 0.05;
    k.add(new THREE.TorusGeometry(0.56, 0.045, 6, 22, Math.PI), M(Math.sin(r) * d, 0.62, Math.cos(r) * d, 0, a, 0), flat(BRONZE_D));
  }

  k.add(RBOX(0.46, 0.08, 0.46, 0.02), M(0, 6.04, 0), plat);
  k.add(CYL(0.13, 0.15, 0.3, 12), M(0, 6.22, 0), flat(BRONZE));
  k.add(new THREE.ConeGeometry(0.15, 0.24, 12), M(0, 6.49, 0), flat(BRONZE_D));
  k.add(CYL(0.025, 0.04, 0.6, 8), M(0, 6.9, 0), flat(BRONZE));
  k.add(SPH_S, M(0, 7.22, 0, 0, 0, 0, 0.045), flat(GOLD));
  g.add(k.mesh(true));
  return g;
}
