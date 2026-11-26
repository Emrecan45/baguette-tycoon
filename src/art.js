import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { propMeshes } from './assets.js';
import { LitMaterial, bakeColors, vertexColorMaterial } from './lit.js';

export const Pal = {
  floorA: '#F6E7C8', floorB: '#EDD3A6', grout: '#D8B98A',
  wall: '#A9DCCB', wallTrim: '#7FBFAE',
  wood: '#C07F4F', woodDark: '#8E5634', woodLight: '#DDA574',
  cream: '#FFF4DE', brick: '#D46A4C', brickDark: '#A94A36', soot: '#3A2A26',
  fire: '#FF9A3C', metal: '#5C5F66',
  grass: '#9DD472', sidewalk: '#E3DDD3', curb: '#C9C1B4',
  leaf: '#5DB65A', leafLight: '#7ACC63', pot: '#D9774E', sky: '#8FD3E8',
  crust: '#E3A457', crustDark: '#C98436', crumb: '#F7DFA6',
  bill: '#6CC56B', billDark: '#4FA352',
  skin: '#FAFAFA', eye: '#2B2B2B', apron: '#4F8FE0', apron2: '#F28C38',
  zone: '#FFFFFF', zoneInner: '#DDB985',
  padBorder: '#5A3A22', padFill: '#FFF4DE', padProgress: '#6CC56B',
  ink: '#5A3A22', red: '#FF5A4E', gold: '#FFC93C',
  bodies: ['#FF8A80', '#FFB74D', '#81C784', '#64B5F6', '#BA68C8', '#F06292', '#4DB6AC', '#FFD54F'],
  hair: ['#4E342E', '#212121', '#F9A825', '#BF360C', '#6D4C41'],
};

export const mat = vertexColorMaterial;

export const charMat = new LitMaterial({ vertexColors: true, roughness: 0.5, metalness: 0 });

const DEG = Math.PI / 180;

const cache = new Map();
function cached(key, make) {
  let g = cache.get(key);
  if (!g) { g = make(); cache.set(key, g); }
  return g;
}

function torsoGeometry() {
  const pts = [];
  const prof = [[0.0, 0.0], [0.16, 0.0], [0.185, 0.04], [0.19, 0.12], [0.182, 0.22], [0.2, 0.33], [0.212, 0.42], [0.2, 0.48], [0.165, 0.53], [0.1, 0.565], [0.0, 0.575]];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 28);
  return g;
}

export const G = {
  torso: () => cached('torso', torsoGeometry),
  sphere: () => cached('sphere', () => new THREE.SphereGeometry(0.5, 22, 16)),
  capsule: () => cached('capsule', () => new THREE.CapsuleGeometry(0.5, 1, 6, 16)),
  cylinder: () => cached('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 2, 22)),
  cube: () => cached('cube', () => new THREE.BoxGeometry(1, 1, 1)),
  box: (w, h, d, r) => cached(`box${w}_${h}_${d}_${r}`, () => {
    r = Math.max(0.004, Math.min(r, Math.min(w, h, d) / 2 - 0.001));
    return new RoundedBoxGeometry(w, h, d, 2, r);
  }),
};

const colorCache = new Map();
function colorize(geo, hex) {
  const key = geo.uuid + hex;
  let g = colorCache.get(key);
  if (g) return g;

  g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  colorCache.set(key, g);
  return g;
}

export function group(parent, pos = [0, 0, 0], rot = [0, 0, 0], name = '') {
  const g = new THREE.Group();
  g.name = name;
  g.rotation.order = 'YXZ';
  g.position.set(pos[0], pos[1], pos[2]);
  g.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG);
  if (parent) parent.add(g);
  return g;
}

export function part(parent, geo, hex, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(colorize(geo, hex), mat);
  m.rotation.order = 'YXZ';
  m.position.set(pos[0], pos[1], pos[2]);
  m.scale.set(scale[0], scale[1], scale[2]);
  m.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function box(parent, size, r, hex, pos, rot = [0, 0, 0], shadow = true) {
  return part(parent, G.box(size[0], size[1], size[2], r), hex, pos, [1, 1, 1], rot, shadow);
}

export function bake(root, castShadow = true, material = mat, directOnly = false) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const geos = [];
  const remove = [];
  const visit = (o) => {
    if (o.isMesh && o.material === mat) {
      const g = o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      geos.push(g);
      remove.push(o);
    }
  };
  if (directOnly) root.children.slice().forEach(visit); else root.traverse(visit);
  if (!geos.length) return null;
  for (const o of remove) o.parent.remove(o);
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const m = new THREE.Mesh(merged, material);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  root.add(m);
  return m;
}

const baked = new Map();
function fromProp(name, scale) {
  const g = new THREE.Group();
  const sm = new THREE.Matrix4().makeScale(scale, scale, scale);
  if (!baked.has(name)) baked.set(name, bakeColors(propMeshes(name)));
  for (const m of baked.get(name)) {
    const c = new THREE.Mesh(m.geometry, m.material);
    c.castShadow = true;
    c.receiveShadow = true;
    c.matrixAutoUpdate = true;
    new THREE.Matrix4().multiplyMatrices(sm, m.matrix).decompose(c.position, c.quaternion, c.scale);
    g.add(c);
  }
  g.rotation.order = 'YXZ';
  return g;
}
export function newBaguette() { return fromProp('baguette', 1.2); }
export function newBill() { return fromProp('bill', 1); }
export function newCroissant() { return fromProp('croissant', 1.05); }
export function newItem(kind) { const m = kind === 'croissant' ? newCroissant() : newBaguette(); m.userData.kind = kind; return m; }

export function floorTexture() {
  const tile = 64, size = tile * 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      ctx.fillStyle = Pal.grout;
      ctx.fillRect(tx * tile, ty * tile, tile, tile);
      ctx.fillStyle = (tx + ty) % 2 === 0 ? Pal.floorA : Pal.floorB;
      ctx.beginPath();
      ctx.roundRect(tx * tile + 2.5, ty * tile + 2.5, tile - 5, tile - 5, 5);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function glowMaterial(base, emissive, intensity = 1) {
  return new LitMaterial({ color: base, emissive, emissiveIntensity: intensity, roughness: 0.6 });
}

function toFloatGeometry(geo) {
  const g = new THREE.BufferGeometry();
  for (const [name, n] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
    const a = geo.getAttribute(name);
    if (!a) continue;
    const arr = new Float32Array(a.count * n);
    for (let i = 0; i < a.count; i++) { arr[i * n] = a.getX(i); arr[i * n + 1] = a.getY(i); if (n === 3) arr[i * n + 2] = a.getZ(i); }
    g.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  if (geo.index) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(geo.index.array), 1));
  else { const idx = new Uint32Array(g.attributes.position.count); for (let i = 0; i < idx.length; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); }
  return g;
}

export function mergeByMaterial(root, castShadow = true) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.isSprite) return;
    const g = toFloatGeometry(o.geometry);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
    remove.push(o);
  });
  remove.forEach((o) => o.removeFromParent());
  for (const [m, list] of buckets) {
    const merged = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}
