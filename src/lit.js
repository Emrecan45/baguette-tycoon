import * as THREE from 'three';

export class LitMaterial extends THREE.MeshLambertMaterial {
  constructor(params = {}) {

    const { roughness, metalness, envMapIntensity, ...rest } = params;
    super(rest);
  }
}

export function toLit(m) {
  if (!m || !(m.isMeshStandardMaterial || m.isMeshBasicMaterial)) return m;
  const l = new LitMaterial({
    name: m.name, color: m.color, map: m.map, vertexColors: m.vertexColors,
    transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side,
    depthWrite: m.depthWrite,
  });
  if (m.isMeshStandardMaterial) {
    l.emissive.copy(m.emissive); l.emissiveMap = m.emissiveMap; l.emissiveIntensity = m.emissiveIntensity;
  }
  return l;
}

export const vertexColorMaterial = new LitMaterial({ vertexColors: true });
const doubleSided = new LitMaterial({ vertexColors: true, side: THREE.DoubleSide });

const plain = (m) => m && m.isMeshLambertMaterial && !m.map && !m.emissiveMap && !m.transparent && m.opacity === 1 && !m.alphaTest
  && m.emissive.getHex() === 0 && m.side !== THREE.BackSide && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile;

export function bakeColors(parts) {
  const out = [], buckets = new Map();
  for (const p of parts) {
    if (!plain(p.material) || !p.geometry.attributes.normal) { out.push(p); continue; }
    const side = p.material.side;
    if (!buckets.has(side)) buckets.set(side, []);
    buckets.get(side).push(p);
  }
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const [side, list] of buckets) {
    let nv = 0, ni = 0;
    for (const p of list) { const n = p.geometry.attributes.position.count; nv += n; ni += p.geometry.index ? p.geometry.index.count : n; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let o = 0, oi = 0;
    for (const p of list) {
      const g = p.geometry, P = g.attributes.position, N = g.attributes.normal, C = p.material.vertexColors ? g.attributes.color : null, c = p.material.color;
      nm.getNormalMatrix(p.matrix);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(p.matrix).toArray(pos, (o + i) * 3);
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize().toArray(nor, (o + i) * 3);
        v.set(c.r, c.g, c.b);
        if (C) v.multiply(new THREE.Vector3(C.getX(i), C.getY(i), C.getZ(i)));
        v.toArray(col, (o + i) * 3);
      }
      const n = g.index ? g.index.count : P.count;
      for (let i = 0; i < n; i++) idx[oi + i] = (g.index ? g.index.getX(i) : i) + o;
      oi += n;
      o += P.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    out.push({ geometry: geo, material: side === THREE.DoubleSide ? doubleSided : vertexColorMaterial, matrix: new THREE.Matrix4() });
  }
  return out;
}
