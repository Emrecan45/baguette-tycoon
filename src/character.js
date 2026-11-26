import * as THREE from 'three';
import { group } from './art.js';
import { character, characterSource } from './assets.js';
import { inFlight } from './juice.js';
import { buildAccessories, stripedMaterial } from './outfits.js';
import { World } from './world.js';
import { LitMaterial } from './lit.js';


export class ItemStack {
  constructor(anchor, layout, capacity, rows = 2) {
    this.anchor = anchor;
    this.layout = layout;
    this.capacity = capacity;
    this.rows = rows;
    this.items = [];
    this.values = [];
    this.wobble = 0;
  }
  get count() { return this.items.length; }
  get full() { return this.items.length >= this.capacity; }
  get empty() { return this.items.length === 0; }

  slotPos(i, out = new THREE.Vector3()) {
    if (this.layout === 'carry') return out.set(0, 0.04 + i * 0.17, 0);
    if (this.layout === 'pile') {
      const row = i % this.rows, layer = Math.floor(i / this.rows);
      return out.set(layer % 2 === 0 ? 0.03 : -0.03, 0.09 + layer * 0.16, (row - (this.rows - 1) / 2) * 0.23);
    }
    const cell = i % 4, layer = Math.floor(i / 4);
    return out.set(((cell % 2) - 0.5) * 0.46, 0.03 + layer * 0.065, (Math.floor(cell / 2) - 0.5) * 0.28);
  }
  slotYaw(i) {
    if (this.layout === 'money') return 0;
    let j = Math.sin(i * 12.9898) * 43758.5453;
    j = (j - Math.floor(j)) * 2 - 1;
    return j * (this.layout === 'carry' ? 5 : 7) * Math.PI / 180;
  }

  addFlying(item, value, duration, height, fly, punch) {
    const index = this.items.length;
    this.items.push(item);
    this.values.push(value);
    fly(item, this.anchor, () => { const k = this.items.indexOf(item); return this.slotPos(k >= 0 ? k : index); },
      this.slotYaw(index), duration, height, () => punch(item, 0.25, 0.25));
  }
  addValueToTop(v) { if (this.values.length) this.values[this.values.length - 1] += v; }

  take() {
    const last = this.items.length - 1;
    if (last < 0 || inFlight.has(this.items[last])) return null;
    const item = this.items.pop();
    const value = this.values.pop();
    return { item, value };
  }


  takeWhere(pred) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (inFlight.has(it) || !pred(it)) continue;
      this.items.splice(i, 1);
      const value = this.values.splice(i, 1)[0];
      return { item: it, value };
    }
    return null;
  }


  update(dt, time) {
    if (this.layout !== 'carry') return;
    const p = _p;
    const k2 = 1 - Math.exp(-25 * dt);
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (inFlight.has(it)) continue;
      const k = i / 8;
      this.slotPos(i, p);
      p.x += Math.sin(time * 9 - i * 0.45) * 0.035 * k * this.wobble;
      p.z -= this.wobble * k * k * 0.12;
      it.position.lerp(p, k2);
    }
  }
}


const D = Math.PI / 180;
const _p = new THREE.Vector3();

export const CHAR_SCALE = 0.8;
const SIT_DROP = -0.12;
const matCache = new Map();
function tinted(base, color) {
  const key = base.name + color;
  let m = matCache.get(key);
  if (!m) { m = base.clone(); m.color.set(color); matCache.set(key, m); }
  return m;
}


const PARTS = ['Skin', 'Shirt', 'Pants', 'Shoes'];
const HAT_MESHES = { toque: 'Hat_Toque', cap: 'Hat_Cap', hair: 'Hat_Hair' };
let merged;

function mergeParts(pieces) {
  let nv = 0, ni = 0;
  for (const p of pieces) {
    nv += p.geo.attributes.position.count;
    ni += p.geo.index ? p.geo.index.count : p.geo.attributes.position.count;
  }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), part = new Float32Array(nv);
  const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let o = 0, oi = 0;
  for (const p of pieces) {
    const g = p.geo, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    nm.getNormalMatrix(p.m);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(p.m).toArray(pos, (o + i) * 3);
      if (N) v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize().toArray(nor, (o + i) * 3);
      if (p.bone !== undefined) { si[(o + i) * 4] = p.bone; sw[(o + i) * 4] = 1; } else {
        for (let k = 0; k < 4; k++) { si[(o + i) * 4 + k] = SI.getComponent(i, k); sw[(o + i) * 4 + k] = SW.getComponent(i, k); }
      }
      part[o + i] = p.part;
    }
    const n = g.index ? g.index.count : P.count;
    for (let i = 0; i < n; i++) idx[oi + i] = (g.index ? g.index.getX(i) : i) + o;
    oi += n;
    o += P.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  geo.setAttribute('part', new THREE.BufferAttribute(part, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

function mergedBody() {
  if (merged !== undefined) return merged;
  merged = null;
  const src = characterSource('hero');
  src.updateMatrixWorld(true);
  const meshes = [];
  src.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const body = PARTS.map((n) => meshes.find((o) => o.isSkinnedMesh && o.material.name === n));
  if (body.some((o) => !o || !o.geometry.attributes.normal)) return null;
  const bones = body[0].skeleton.bones;
  if (body.some((o) => o.skeleton.bones.length !== bones.length || o.skeleton.bones.some((b, i) => b !== bones[i]))) return null;
  const inv = body[0].bindMatrix.clone().invert();
  const pieces = body.map((o, i) => ({ geo: o.geometry, m: inv.clone().multiply(o.bindMatrix), part: i }));
  const geos = { none: mergeParts(pieces) };
  const colors = { Skin: body[0].material.color.clone() };
  for (const [hat, name] of Object.entries(HAT_MESHES)) {
    const h = meshes.find((o) => o.name === name);
    const bi = h ? bones.indexOf(h.parent) : -1;
    if (bi < 0 || !h.geometry.attributes.normal) continue;
    const m = inv.clone().multiply(body[0].skeleton.boneInverses[bi].clone().invert()).multiply(h.matrix);
    geos[hat] = mergeParts([...pieces, { geo: h.geometry, m, part: 4, bone: bi }]);
    colors[hat] = h.material.color.clone();
  }
  const box = new THREE.Box3().setFromBufferAttribute(geos.none.attributes.position);
  const sphere = new THREE.Sphere(box.getCenter(new THREE.Vector3()), box.getSize(new THREE.Vector3()).length() * 0.65);
  merged = { geos, colors, sphere };
  return merged;
}

function paletteMaterial() {
  const m = new LitMaterial({ side: THREE.DoubleSide });
  const pal = { value: [0, 1, 2, 3, 4].map(() => new THREE.Color()) };
  m.userData.pal = pal.value;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPal = pal;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float part;\nuniform vec3 uPal[5];\nvarying vec3 vPal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPal = uPal[int(part + 0.5)];');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPal;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vPal;');
  };
  m.customProgramCacheKey = () => 'palette5';
  return m;
}

export class Character {

  constructor(parent, pos, look, merged = false) {
    this.root = group(parent, pos, [0, 0, 0], 'Perso');
    this.merged = merged;
    this.speed = 5;
    this.accel = 30;
    this.collide = true;
    this.vel = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.walkPhase = Math.random() * 6;
    this.bob = 0;
    this.squash = 0;
    this.carryBlend = 0;
    this.wasMoving = false;
    this.seed = Math.random() * 10;
    this.scale = (look.scale || 1) * CHAR_SCALE;
    this.height = 1.62 * this.scale;
    this.build(look);
  }

  get pos() { return this.root.position; }


  setLook(L) {
    if (this.body) {
      const M = mergedBody(), pal = this.body.material.userData.pal;
      pal[0].set(L.skin || M.colors.Skin);
      pal[1].set(L.shirt || '#3D7DDB');
      pal[2].set(L.pants || '#2F3B55');
      pal[3].set(L.shoes || '#2B2B2B');
      pal[4].set(L.hat === 'toque' ? M.colors.toque : L.hatColor || (L.hat === 'cap' ? '#E53935' : '#4E342E'));
      this.body.geometry = M.geos[L.hat] || M.geos.none;
      return;
    }
    const colors = { Shirt: L.shirt || '#3D7DDB', Pants: L.pants || '#2F3B55', Shoes: L.shoes || '#2B2B2B', Cap: L.hatColor || '#E53935', Hair: L.hatColor || '#4E342E' };
    if (L.skin) colors.Skin = L.skin;
    const hatName = { toque: 'Hat_Toque', cap: 'Hat_Cap', hair: 'Hat_Hair' }[L.hat] || null;
    for (const [o, m] of this.origMats) {
      if (m.name === 'Shirt' && L.stripes) o.material = stripedMaterial(m, ...L.stripes);
      else o.material = colors[m.name] ? tinted(m, colors[m.name]) : m;
    }
    for (const h of ['Hat_Toque', 'Hat_Cap', 'Hat_Hair']) { const o = this.model.getObjectByName(h); if (o) o.visible = h === hatName; }

    if (this.acc) for (const o of this.acc) o.removeFromParent();
    this.acc = [];
    if (L.acc && this.bones) {
      const a = buildAccessories(L.acc);

      let skinMat = null;
      for (const [o, m] of this.origMats) if (m.name === 'Skin') skinMat = o.material;
      for (const [bone, list] of Object.entries(a)) {
        const B = this.bones[bone];
        if (!B) continue;
        for (const o of list) {
          if (skinMat) o.traverse((x) => { if (x.userData.skin) x.material = skinMat; });
          B.b.add(o);
          this.acc.push(o);
        }
      }
    }
  }

  build(L) {
    const v = this.visual = group(this.root, [0, 0, 0], [0, 0, 0], 'Visual');
    v.scale.setScalar(this.scale);
    const { scene } = character('hero');
    v.add(scene);
    this.model = scene;
    this.origMats = new Map();
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
        this.origMats.set(o, o.material);
      }
    });
    this.look = L;


    scene.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(scene.matrixWorld).invert();
    const modelQuat = (o) => { const q = new THREE.Quaternion(); new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
    this.bones = {};
    for (const n of ['hips', 'spine', 'head', 'upperarmL', 'forearmL', 'upperarmR', 'forearmR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR']) {
      const b = scene.getObjectByName(n);
      if (!b) continue;
      this.bones[n] = { b, q0: b.quaternion.clone(), P: modelQuat(b.parent), Pi: modelQuat(b.parent).invert(), p0: b.position.clone() };
    }

    if (this.merged && mergedBody()) this.mergeBody();

    this.stackAnchor = group(this.root, [0, 0.8 * this.scale, 0.42 * this.scale], [0, 0, 0], 'Stack');
    this.carry = new ItemStack(this.stackAnchor, 'carry', 6);
    this.setLook(L);
  }


  mergeBody() {
    const src = [...this.origMats.keys()].find((o) => o.isSkinnedMesh && o.material.name === 'Skin');
    const body = this.body = new THREE.SkinnedMesh(mergedBody().geos.none, paletteMaterial());
    body.name = 'Body';
    body.position.copy(src.position);
    body.quaternion.copy(src.quaternion);
    body.scale.copy(src.scale);
    src.parent.add(body);
    body.bind(src.skeleton, src.bindMatrix);
    body.boundingSphere = mergedBody().sphere;
    body.castShadow = true;
    body.receiveShadow = true;
    for (const o of this.origMats.keys()) o.removeFromParent();
    this.origMats.clear();
  }

  dispose() {
    this.root.removeFromParent();
    if (this.body) {
      this.body.material.dispose();
      this.body.skeleton.dispose();
    } else {
      for (const o of this.origMats.keys()) if (o.isSkinnedMesh) o.skeleton.dispose();
    }
  }

  pose(name, x, y = 0, z = 0) {
    const B = this.bones[name];
    if (!B) return;
    _e.set(x * D, y * D, z * D, 'YXZ');
    _q.setFromEuler(_e);
    B.b.quaternion.copy(B.Pi).multiply(_q).multiply(B.P).multiply(B.q0);
  }

  update(dt, time) {
    const d = _d.copy(this.desired);
    if (d.length() > 1) d.normalize();
    d.multiplyScalar(this.speed);
    const diff = d.sub(this.vel);
    const maxStep = this.accel * dt;
    if (diff.length() > maxStep) diff.setLength(maxStep);
    this.vel.add(diff);
    const p = this.root.position;
    p.addScaledVector(this.vel, dt);
    if (this.ghostT > 0) this.ghostT -= dt;
    if (this.collide) World.resolve(p, 0.32, this.ghostT > 0);

    const spd = this.vel.length();
    const moving = spd > 0.3;
    if (moving) {
      const target = Math.atan2(this.vel.x, this.vel.z);
      let dy = target - this.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.root.rotation.y += dy * (1 - Math.exp(-16 * dt));
    }
    if (moving !== this.wasMoving) this.squash = moving ? 0.07 : 0.1;
    this.wasMoving = moving;
    this.animate(Math.min(1, spd / 4.5), spd, dt, time);
  }

  animate(s, spd, dt, time) {
    this.walkPhase += dt * Math.min(15, 3.4 + spd * 2.2) * (s > 0.02 ? 1 : 0);
    const sin = Math.sin(this.walkPhase), cos = Math.cos(this.walkPhase);


    const hipA = 36 * s, kneeA = 58 * s;
    this.pose('thighL', -sin * hipA);
    this.pose('thighR', sin * hipA);
    const kL = Math.max(0, cos) * kneeA + 3, kR = Math.max(0, -cos) * kneeA + 3;

    const relax = Math.sin(time * 1.15 + this.seed * 3) * (1 - s);
    this.pose('shinL', kL + Math.max(0, relax) * 9);
    this.pose('shinR', kR + Math.max(0, -relax) * 9);
    this.pose('footL', -kL * 0.35 + sin * hipA * 0.3);
    this.pose('footR', -kR * 0.35 - sin * hipA * 0.3);


    const breathe = Math.sin(time * 2.2 + this.seed);
    this.bob += (Math.abs(sin) * 0.05 * s - this.bob) * (1 - Math.exp(-20 * dt));
    const H = this.bones.hips;
    if (H) H.b.position.copy(H.p0);

    const still = 1 - s;
    const sway = Math.sin(time * 1.15 + this.seed * 3);
    const look = Math.sin(time * 0.55 + this.seed) * 0.7 + Math.sin(time * 1.3 + this.seed * 2) * 0.3;
    this.visual.position.y = (this.bob - 0.015 * s + still * (0.5 + 0.5 * breathe) * 0.012) * this.scale;
    this.pose('hips', 0, sin * 8 * s + sway * 4 * still, sway * 2.5 * still);
    this.pose('spine', 6 * s + breathe * 2 * still, -sin * 6 * s - sway * 3 * still, sin * 2 * s - sway * 3 * still);
    this.pose('head', -3 * s + breathe * 1.5 * still, sin * 3 * s + look * 26 * still, sway * 4 * still);


    const tgt = this.carry.empty ? 0 : 1;
    this.carryBlend += Math.sign(tgt - this.carryBlend) * Math.min(Math.abs(tgt - this.carryBlend), dt * 7);
    const k = this.carryBlend;
    const mix = (a, b) => a + (b - a) * k;
    const swing = sin * 36 * s;
    const idle = (breathe * 4 + sway * 3) * (1 - s);
    this.pose('upperarmL', mix(swing + idle, -72), 0, mix(-4, 22));
    this.pose('upperarmR', mix(-swing + idle, -72), 0, mix(4, -22));
    this.pose('forearmL', mix(-12 - Math.max(0, sin) * 18 * s, -38), 0, mix(0, 10));
    this.pose('forearmR', mix(-12 - Math.max(0, -sin) * 18 * s, -38), 0, mix(0, -10));

    this.squash += (0 - this.squash) * (1 - Math.exp(-10 * dt));
    const sq = Math.sin(time * 30) * this.squash;
    this.visual.scale.set(this.scale * (1 + sq), this.scale * (1 - sq), this.scale * (1 + sq));


    this.sitBlend = (this.sitBlend || 0) + ((this.sitting ? 1 : 0) - (this.sitBlend || 0)) * (1 - Math.exp(-10 * dt));
    if (this.sitBlend > 0.01) {
      const b = this.sitBlend;
      this.pose('thighL', -86 * b, 0, 5 * b); this.pose('thighR', -86 * b, 0, -5 * b);
      this.pose('shinL', 84 * b); this.pose('shinR', 84 * b);
      this.pose('footL', 0); this.pose('footR', 0);
      this.visual.position.y += SIT_DROP * b * this.scale;
    }
    this.stackAnchor.position.set(0, (0.8 + this.bob * 0.6) * this.scale, 0.46 * this.scale);
    this.carry.wobble += (s - this.carry.wobble) * (1 - Math.exp(-6 * dt));
    this.carry.update(dt, time);
  }
}
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _d = new THREE.Vector3();
