import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { toLit } from './lit.js';

const BASE = import.meta.env.BASE_URL;

export const CHARACTERS = ['hero'];
const PROPS = ['props', 'nature'];

const SFX = ['pickup1', 'pickup2', 'drop1', 'drop2', 'drop3', 'bill1', 'bill2', 'bill3', 'bill4', 'place1', 'place2', 'place3',
  'sale', 'make', 'serve1', 'serve2', 'serve3', 'clean1', 'clean2', 'door', 'unlock', 'upgrade', 'levelup', 'click', 'mission'];
const SOUNDS = [...SFX, 'music3'];

const EXTRA_MUSIC = ['music1', 'music2', 'music4'];
export async function loadExtraMusic(audioCtx) {
  for (const n of EXTRA_MUSIC) {
    try { sounds[n] = await audioCtx.decodeAudioData(await (await fetch(`${BASE}sfx/${n}.mp3`)).arrayBuffer()); } catch (e) {  }
  }
}

const gltfs = {};
export const sounds = {};

function litify(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const fix = (m) => toLit(m);
    o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
  });
}

export async function loadAssets(audioCtx, onProgress) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const names = [...CHARACTERS, ...PROPS];
  let done = 0;
  const total = names.length + SOUNDS.length;
  const tick = () => onProgress && onProgress(++done / total);

  const models = names.map(async (n) => {
    const g = await loader.loadAsync(`${BASE}models/${n}.glb`);
    litify(g.scene);
    gltfs[n] = g;
    tick();
  });
  const audio = SOUNDS.map(async (n) => {
    try {
      const buf = await (await fetch(`${BASE}sfx/${n}.mp3`)).arrayBuffer();
      sounds[n] = await audioCtx.decodeAudioData(buf);
    } catch (e) {  }
    tick();
  });
  await Promise.all([...models, ...audio]);
}

export function prop(name, scale = 1) {
  const src = gltfs.props.scene.getObjectByName('P_' + name);
  if (!src) throw new Error('prop manquant : ' + name);

  const obj = src.clone(true);
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(scale);
  inner.add(obj);
  g.add(inner);
  return g;
}

const natureH = {};
let natureLit = false;
export function nature(name, height) {
  if (!natureLit) {

    natureLit = true;
    const seen = new Set();
    gltfs.nature.scene.traverse((o) => {
      if (!o.isMesh || seen.has(o.material)) return;
      const m = o.material; seen.add(m);
      m.color.multiplyScalar(1.12);
      if (m.map) { m.emissive = new THREE.Color('#FFFFFF'); m.emissiveMap = m.map; m.emissiveIntensity = 0.28; }
      m.roughness = 0.9;
    });
  }
  const src = gltfs.nature.scene.getObjectByName('N_' + name);
  if (!src) throw new Error('végétation manquante : ' + name);
  if (!natureH[name]) { src.updateMatrixWorld(true); natureH[name] = new THREE.Box3().setFromObject(src).getSize(new THREE.Vector3()).y; }
  const obj = src.clone(true);
  obj.position.set(0, 0, 0);
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(height / natureH[name]);
  inner.add(obj);
  g.add(inner);
  return g;
}

export function propMeshes(name) {
  const src = gltfs.props.scene.getObjectByName('P_' + name);
  src.updateMatrixWorld(true);

  const base = new THREE.Matrix4().copy(src.parent.matrixWorld).invert();
  const list = [];
  src.traverse((o) => { if (o.isMesh) list.push({ geometry: o.geometry, material: o.material, matrix: new THREE.Matrix4().multiplyMatrices(base, o.matrixWorld) }); });
  return list;
}

export function character(name) {
  const g = gltfs[name];
  return { scene: cloneSkinned(g.scene), animations: g.animations };
}
