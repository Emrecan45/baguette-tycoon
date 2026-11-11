import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Kit, cafeTable } from './decor.js';
import { group, mat, Pal, newItem } from './art.js';
import { Zone, croissantOvenModel } from './stations.js';
import { ItemStack } from './character.js';
import { World } from './world.js';
import { fly, flyAndVanish, punch, toRoot } from './juice.js';
import { LitMaterial } from './lit.js';
import { prop } from './assets.js';

const DEG = Math.PI / 180;
const C = (h) => new THREE.Color(h);
const flat = (h) => { const c = C(h); return () => c; };
const vgrad = (h0, h1, y0, y1) => { const a = C(h0), b = C(h1); return (p) => a.clone().lerp(b, Math.min(1, Math.max(0, (p.y - y0) / (y1 - y0)))); };
const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx * DEG, ry * DEG, rz * DEG, 'YXZ'));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
};
const RB = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 0.001));
const SPH = new THREE.SphereGeometry(1, 16, 12);
const CYL = (rt, rb, h, s = 18) => new THREE.CylinderGeometry(rt, rb, h, s);
const lathe = (prof, seg = 20) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);



export const PRODUCTS = {
  baguette: { price: 3, sell: true },
  croissant: { price: 12, sell: true, table: true },
  painchoc: { price: 15, sell: true, table: true },
  gateau: { price: 28, sell: true, table: true },
  cafe: { price: 8, table: true },
  pate: {},
  appareil: {},
};
export const SELL_KINDS = ['baguette', 'croissant', 'painchoc', 'gateau'];


const itemGeo = {};
function buildItem(kind) {
  const k = new Kit();
  k.at(0, 0);
  if (kind === 'pate') {

    k.add(SPH, M(0, 0.07, 0, 0, 0, 0, 0.15, 0.085, 0.13), vgrad('#E9D2A6', '#FBF1DD', 0, 0.15));
    k.add(SPH, M(0.02, 0.135, 0, 0, 0, 0, 0.07, 0.025, 0.05), flat('#FFFDF7'));
  } else if (kind === 'painchoc') {

    k.add(RB(.34, .05, .245, .023), M(0, .025, 0), flat('#BD752E'));
    k.add(RB(.34, .145, .245, .055), M(0, .09, 0), vgrad('#CC7E31', '#F2B65C', .02, .17));
    for (const z of [-.124, .124]) {
      for (const x of [-.085, .085]) {
        const points = [];
        for (let i = 0; i <= 32; i++) {
          const angle = i / 32 * Math.PI * 3.4, r = .012 + i / 32 * .035;
          points.push(new THREE.Vector3(x + Math.cos(angle) * r, .083 + Math.sin(angle) * r * .76, z));
        }
        k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .004, 5, false), M(), flat('#F6D28F'));
        k.add(RB(.041, .032, .016, .009), M(x, .078, z), flat('#4C281D'));
      }
    }
    for (const z of [-.07, -.025, .025, .07]) {
      const ridge = new THREE.CatmullRomCurve3([new THREE.Vector3(-.145, .134, z), new THREE.Vector3(-.09, .161, z + .008), new THREE.Vector3(.09, .161, z + .008), new THREE.Vector3(.145, .134, z)]);
      k.add(new THREE.TubeGeometry(ridge, 12, .004, 5, false), M(), flat('#D9943D'));
    }
  } else if (kind === 'cafe') {

    k.add(CYL(0.13, 0.12, 0.025, 20), M(0, 0.012, 0), flat('#FFFFFF'));
    k.add(lathe([[0, 0.02], [0.07, 0.02], [0.09, 0.05], [0.095, 0.13], [0.08, 0.13], [0.075, 0.05], [0, 0.05]], 18), M(), flat('#FFFFFF'));
    k.add(CYL(0.082, 0.082, 0.01, 18), M(0, 0.115, 0), flat('#6B3B1E'));
    k.add(new THREE.TorusGeometry(0.035, 0.012, 6, 12), M(0.1, 0.085, 0, 0, 0, 0), flat('#FFFFFF'));
  } else if (kind === 'appareil') {

    k.add(lathe([[0, 0], [0.09, 0], [0.15, 0.06], [0.16, 0.11], [0.14, 0.11], [0.13, 0.065], [0.08, 0.02], [0, 0.02]], 20), M(), vgrad('#8FC9E8', '#C9E7F6', 0, 0.11));
    k.add(CYL(0.135, 0.135, 0.02, 20), M(0, 0.09, 0), flat('#FFE27A'));
  } else if (kind === 'gateau') {
    k.add(CYL(0.15, 0.15, 0.13, 22), M(0, 0.065, 0), vgrad('#F3D3A6', '#FFF4E4', 0, 0.13));
    k.add(CYL(0.155, 0.155, 0.035, 22), M(0, 0.14, 0), flat('#FF8FB1'));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.add(SPH, M(Math.cos(a) * 0.11, 0.165, Math.sin(a) * 0.11, 0, 0, 0, 0.025), flat('#FFFFFF')); }
    k.add(SPH, M(0, 0.18, 0, 0, 0, 0, 0.035), flat('#E3263A'));
  }
  return k.mesh(true).geometry;
}
export function newProduct(kind) {
  if (kind === 'baguette' || kind === 'croissant') return newItem(kind);
  if (!itemGeo[kind]) itemGeo[kind] = buildItem(kind);
  const m = new THREE.Mesh(itemGeo[kind], mat);
  m.castShadow = true;
  m.receiveShadow = true;
  m.rotation.order = 'YXZ';
  m.userData.kind = kind;
  return m;
}


function petrinModel() {
  const g = new THREE.Group();
  const k = new Kit();
  k.at(0, 0);
  k.add(RB(1.15, 0.78, 0.95, 0.1), M(0, 0.39, 0), vgrad('#4C6C86', '#7FA3C0', 0, 0.78));
  k.add(RB(1.2, 0.08, 1.0, 0.04), M(0, 0.8, 0), flat('#C9A04A'));
  k.add(lathe([[0, 0.8], [0.3, 0.8], [0.46, 0.92], [0.5, 1.28], [0.44, 1.28], [0.41, 0.95], [0, 0.88]], 26), M(), vgrad('#AEB8C0', '#EEF2F4', 0.8, 1.28));
  k.add(SPH, M(0, 1.08, 0, 0, 0, 0, 0.36, 0.17, 0.36), vgrad('#E9D2A6', '#FBF1DD', 0.95, 1.25));

  k.add(RB(0.16, 1.15, 0.2, 0.05), M(0, 1.3, 0.48), flat('#4C6C86'));
  k.add(RB(0.2, 0.18, 0.62, 0.06), M(0, 1.85, 0.22), flat('#5D7F9B'));
  k.add(RB(0.36, 0.12, 0.05, 0.02), M(0, 0.45, -0.48), flat('#2C3E50'));
  for (const [x, c] of [[-0.09, '#5BC95B'], [0.09, '#FF5A4E']]) k.add(CYL(0.035, 0.035, 0.03, 10).rotateX(Math.PI / 2), M(x, 0.45, -0.51), flat(c));
  g.add(k.mesh(true));

  const hook = new THREE.Group();
  hook.position.set(0, 1.75, 0.0);
  const kh = new Kit();
  kh.at(0, 0);
  kh.add(CYL(0.035, 0.035, 0.5, 8), M(0, -0.25, 0), flat('#D9DEE2'));
  kh.add(new THREE.TorusGeometry(0.12, 0.03, 6, 14, Math.PI * 1.3), M(0.06, -0.55, 0, 90, 0, 0), flat('#D9DEE2'));
  hook.add(kh.mesh(false));
  g.add(hook);
  return { group: g, animate(t, work) { hook.rotation.y += work ? 0.25 : 0.02; } };
}

function coffeeModel() {
  const g = new THREE.Group();
  const k = new Kit();
  k.at(0, 0);

  k.add(RB(1.4, 0.9, 0.8, 0.06), M(0, 0.45, 0), vgrad('#6E3F22', '#9A5B32', 0, 0.9));
  k.add(RB(1.48, 0.07, 0.88, 0.03), M(0, 0.93, 0), flat('#F2EDE6'));

  k.add(RB(0.95, 0.55, 0.5, 0.08), M(0, 1.25, 0.1), vgrad('#B9C2C9', '#F1F4F6', 0.97, 1.52));
  k.add(RB(0.98, 0.12, 0.52, 0.05), M(0, 1.57, 0.1), flat('#C62828'));
  k.add(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0, 1.62, 0.1), flat('#D8A94A'));
  k.add(SPH, M(0, 1.84, 0.1, 0, 0, 0, 0.05), flat('#D8A94A'));
  for (const x of [-0.24, 0.24]) {
    k.add(CYL(0.06, 0.05, 0.12, 12), M(x, 1.05, -0.18), flat('#2E3236'));
    k.add(RB(0.05, 0.05, 0.22, 0.02), M(x, 1.03, -0.32), flat('#2E3236'));
  }

  k.add(CYL(0.08, 0.08, 0.03, 16).rotateX(Math.PI / 2), M(0, 1.33, -0.16), flat('#FFFFFF'));

  for (const x of [-0.3, -0.12, 0.3]) k.add(lathe([[0, 0], [0.05, 0], [0.065, 0.08], [0, 0.08]], 12), M(x, 1.63, 0.25), flat('#FFFFFF'));
  g.add(k.mesh(true));
  const steam = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new LitMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.0, depthWrite: false }));
  steam.position.set(0, 1.0, -0.2);
  g.add(steam);
  let ph = 0;
  return { group: g, animate(t, work) { ph = work ? (ph + 0.04) % 1 : Math.max(0, ph - 0.02); steam.position.y = 1.0 + ph * 0.6; steam.scale.setScalar(0.6 + ph * 1.4); steam.material.opacity = work ? 0.55 * (1 - ph) : 0; } };
}

function mixerModel() {
  const g = new THREE.Group();
  const k = new Kit();
  k.at(0, 0);

  k.add(RB(1.4, 0.88, 0.85, 0.06), M(0, 0.44, 0), vgrad('#D9CFC1', '#F6F1E8', 0, 0.88));
  k.add(RB(1.46, 0.06, 0.9, 0.03), M(0, 0.91, 0), flat('#B07539'));

  const P0 = '#F48FB1', P1 = '#FFC1D6';
  k.add(RB(0.5, 0.12, 0.62, 0.05), M(0, 1.0, 0.05), vgrad(P0, P1, 0.94, 1.06));
  k.add(RB(0.22, 0.75, 0.22, 0.08), M(0, 1.4, 0.28), vgrad(P0, P1, 1.0, 1.8));
  k.add(RB(0.32, 0.26, 0.72, 0.12), M(0, 1.8, 0.05), vgrad(P0, P1, 1.67, 1.93));
  k.add(lathe([[0, 0.0], [0.12, 0.0], [0.24, 0.12], [0.26, 0.32], [0.23, 0.32], [0.21, 0.13], [0.1, 0.03], [0, 0.03]], 22), M(0, 1.06, -0.08), vgrad('#B9C2C9', '#F1F4F6', 1.06, 1.38));
  k.add(CYL(0.22, 0.22, 0.04, 20), M(0, 1.3, -0.08), flat('#FFE27A'));

  for (const x of [-0.5, 0.5]) k.add(lathe([[0, 0], [0.08, 0], [0.13, 0.08], [0.11, 0.08], [0, 0.02]], 14), M(x, 0.94, 0.25), flat('#8FC9E8'));
  g.add(k.mesh(true));
  const whisk = new THREE.Group();
  whisk.position.set(0, 1.62, -0.08);
  const kw = new Kit(); kw.at(0, 0);
  kw.add(CYL(0.02, 0.02, 0.3, 6), M(0, -0.15, 0), flat('#D9DEE2'));
  kw.add(SPH, M(0, -0.3, 0, 0, 0, 0, 0.07, 0.1, 0.07), flat('#D9DEE2'));
  whisk.add(kw.mesh(false));
  g.add(whisk);
  return { group: g, animate(t, work) { whisk.rotation.y += work ? 0.45 : 0; whisk.position.x = work ? Math.sin(t * 9) * 0.03 : 0; } };
}


function steelOvenModel(glow, accent) {
  const g = croissantOvenModel(glow);
  if (accent) {

    const band = new THREE.Mesh(RB(1.44, 0.16, 0.92, 0.05), new LitMaterial({ color: accent }));
    band.position.set(0, 1.62, 0);
    band.castShadow = true;
    g.add(band);
  }
  return g;
}


const tmp = new THREE.Vector3();

function local(x, z, rot, lx, lz) {
  const r = rot * DEG, c = Math.cos(r), s = Math.sin(r);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}
const ICON_COLORS = { pate: '#94673C', croissant: '#94673C', painchoc: '#7A4A22', gateau: '#C2577E', appareil: '#3E86B5', cafe: '#6B3B1E', baguette: '#94673C' };


export const MACHINES = {
  petrin: { out: 'pate', interval: 1.0, cap: 12 },
  croissant: { out: 'croissant', input: 'pate', interval: 2.0, cap: 12, yield: 2 },
  painchoc: { out: 'painchoc', input: 'pate', interval: 2.3, cap: 12, yield: 2 },
  coffee: { out: 'cafe', interval: 1.6, cap: 10 },
  mixer: { out: 'appareil', interval: 1.6, cap: 10 },
  cake: { out: 'gateau', input: 'appareil', interval: 3.0, cap: 8, yield: 2 },
};

export class Machine {

  constructor(parent, worldRoot, type, x, z, rot = 0) {
    const def = MACHINES[type];
    this.type = type;
    this.kind = def.out;
    this.input = def.input || null;
    this.interval = def.interval;
    this.yield = def.yield || 1;
    this.charge = 0;
    this.timer = 0;
    this.worldRoot = worldRoot;
    this.working = false;
    const r = this.root = group(parent, [x, 0, z], [0, rot, 0], 'Machine');
    this.glow = new LitMaterial({ color: '#FFB060', emissive: '#FF8A2A', emissiveIntensity: 1.1 });
    let model;
    if (type === 'petrin') model = petrinModel();
    else if (type === 'coffee') model = coffeeModel();
    else if (type === 'mixer') model = mixerModel();
    else model = { group: steelOvenModel(this.glow, type === 'painchoc' ? '#6B3B1E' : type === 'cake' ? '#F48FB1' : null), animate: () => {} };
    this.model = model;
    r.add(model.group);
    this.mouth = group(r, [0, 1.0, -0.4]);

    const tx = this.input ? 0.4 : 0;
    const table = group(r, [tx, 0, -1.25]);
    const tm = prop('table', 1);
    tm.rotation.y = Math.PI;
    table.add(tm);
    this.tray = new ItemStack(group(table, [0, 0.86, 0], [0, 0, 0], 'Plateau'), 'pile', def.cap, 3);
    const swap = Math.abs(rot) === 90;
    const Z = (lx, lz, w, d, icon) => { const [wx, wz] = local(x, z, rot, lx, lz); return new Zone(parent, wx, wz, swap ? d : w, swap ? w : d, Pal.zone, Pal.zoneInner, icon, ICON_COLORS[icon] || '#94673C'); };
    this.pickup = Z(tx, -2.3, this.input ? 1.25 : 1.8, 1.0, this.kind);

    const [bx, bz] = local(x, z, rot, 0, 0.05);
    World.addBlocker(bx, bz, swap ? 0.55 : 0.75, swap ? 0.75 : 0.55);
    const [tbx, tbz] = local(x, z, rot, tx, -1.25);
    World.addBlocker(tbx, tbz, swap ? 0.32 : 0.8, swap ? 0.8 : 0.32);
    if (this.input) {

      const bin = group(r, [-0.95, 0, -1.2]);
      const kb = new Kit(); kb.at(0, 0);
      kb.add(RB(0.72, 0.62, 0.6, 0.06), M(0, 0.31, 0), vgrad('#8A5A34', '#B07A48', 0, 0.62));
      kb.add(RB(0.62, 0.05, 0.5, 0.02), M(0, 0.63, 0), flat('#E9DCC4'));
      bin.add(kb.mesh(true));
      this.inStack = new ItemStack(group(bin, [0, 0.64, 0]), 'pile', 10, 2);
      this.drop = Z(-0.95, -2.3, 1.05, 1.0, this.input);
      const [ibx, ibz] = local(x, z, rot, -0.95, -1.2);
      World.addBlocker(ibx, ibz, swap ? 0.3 : 0.36, swap ? 0.36 : 0.3);
    }
  }

  get center() { return this.root.position; }

  get inputNeed() { return this.input ? this.inStack.capacity - this.inStack.count : 0; }

  tick(dt, time, speed = 1) {
    this.working = false;
    if (!this.tray.full && (!this.input || this.charge > 0 || !this.inStack.empty)) {
      this.working = true;
      this.timer += dt * speed;
      if (this.timer >= this.interval) {
        this.timer = 0;
        if (this.input && this.charge <= 0) {
          const t = this.inStack.take();
          if (!t) { this.working = false; return; }
          this.charge = this.yield;

          const end = toRoot(this.mouth, tmp.set(0, 0, 0), new THREE.Vector3());
          flyAndVanish(t.item, () => end, 0.3, 0.35);
        }
        if (this.input) this.charge--;
        const b = newProduct(this.kind);
        toRoot(this.mouth, tmp.set(0, 0, -0.1), b.position);
        this.worldRoot.add(b);
        this.tray.addFlying(b, 1, 0.35, 0.8, fly, punch);
        punch(this.root, 0.05, 0.3);
        if (this.onMake) this.onMake();
      }
    }
    const g = 0.75 + Math.sin(time * 3.1 + this.root.position.x) * 0.2 + (this.working ? (this.timer / this.interval) * 0.6 : 0);
    this.glow.emissiveIntensity = g;
    this.model.animate(time, this.working);
  }
}


export function machineGhost(type, x, z, rot, material) {
  const g = new THREE.Group();
  const holder = group(g, [x, 0, z], [0, rot, 0]);
  const def = MACHINES[type];
  let model;
  if (type === 'petrin') model = petrinModel().group;
  else if (type === 'coffee') model = coffeeModel().group;
  else if (type === 'mixer') model = mixerModel().group;
  else model = steelOvenModel(material, null);
  holder.add(model);
  const tb = prop('table', 1);
  tb.position.set(def.input ? 0.4 : 0, 0, -1.25);
  tb.rotation.y = Math.PI;
  holder.add(tb);
  g.traverse((m) => { if (m.isMesh) { m.material = material; m.castShadow = false; m.receiveShadow = false; } });
  return g;
}


export class CafeTable {
  constructor(parent, x, z, stripe = '#E2463B') {
    this.x = x; this.z = z;
    const r = this.root = group(parent, [x, 0, z], [0, 0, 0], 'Table');
    const k = new Kit();
    cafeTable(k, 0, 0, 90, false, stripe);

    k.add(new THREE.CylinderGeometry(0.43, 0.43, 0.012, 24), M(0, 0.757, 0), flat(stripe));
    r.add(k.mesh(true));

    this.seat = new THREE.Vector3(x + 0.68, 0, z);
    this.zone = new Zone(parent, x - 1.5, z, 1.0, 1.3, Pal.zone, Pal.zoneInner, 'table', '#94673C');
    this.served = new ItemStack(group(r, [-0.1, 0.77, 0]), 'pile', 6, 2);
    this.money = new ItemStack(group(r, [0.12, 0.77, 0.12]), 'money', 16);

    const kd = new Kit(); kd.at(0, 0);
    for (const [dx, dz] of [[-0.15, 0.12], [0.12, -0.14]]) {
      kd.add(CYL(0.11, 0.1, 0.02, 16), M(dx, 0.77, dz), flat('#FFFFFF'));
      kd.add(lathe([[0, 0], [0.06, 0], [0.075, 0.08], [0, 0.08]], 12), M(dx, 0.78, dz), flat('#F4F1EC'));
    }
    for (let i = 0; i < 7; i++) kd.add(SPH, M(-0.25 + Math.sin(i * 7.1) * 0.22, 0.765, Math.cos(i * 3.3) * 0.22, 0, 0, 0, 0.022), flat('#D9A35A'));
    this.dirt = kd.mesh(false);
    this.dirt.visible = false;
    r.add(this.dirt);
    World.addBlocker(x, z, 0.42, 0.42);
    World.addBlocker(x + 0.68, z, 0.22, 0.22);
    World.addBlocker(x - 0.68, z, 0.22, 0.22);
    this.state = 'free';
    this.order = [];
    this.customer = null;
    this.cooldown = 0.1;
    this.eatT = 0;
    this.clean = 0;
  }

  missing(kind) { const o = this.order.find((x) => x.kind === kind); return o ? o.n - o.got : 0; }
  get complete() { return this.order.length > 0 && this.order.every((o) => o.got >= o.n); }
}


export function warmupModels() {
  const g = new THREE.Group();
  for (const m of [petrinModel(), coffeeModel(), mixerModel()]) g.add(m.group);
  g.add(steelOvenModel(new LitMaterial({ color: '#FFB060', emissive: '#FF8A2A', emissiveIntensity: 1 }), '#F48FB1'));
  const k = new Kit(); cafeTable(k, 0, 0, 90, false, '#2E6FB7'); g.add(k.mesh(true));
  g.position.set(0, -50, 0);
  return g;
}
