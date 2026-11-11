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
