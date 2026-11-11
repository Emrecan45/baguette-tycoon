import * as THREE from 'three';
import { Character } from './character.js';

let cache = null;
export function outfitPreviews(outfits) {
  if (cache) return cache;
  cache = new Map();
  const W = 180, H = 220;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(W, H);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#E0C29A', 1.9));
  const key = new THREE.DirectionalLight('#FFF1DC', 2.2);
  key.position.set(1.5, 3, 3);
  scene.add(key);
  const holder = new THREE.Group();
  scene.add(holder);
  const ch = new Character(holder, [0, 0, 0], outfits[0]);
  ch.root.rotation.y = -0.35;
  const cam = new THREE.PerspectiveCamera(26, W / H, 0.1, 20);
  cam.position.set(0, 1.0, 3.6);
  cam.lookAt(0, 0.68, 0);
  for (const o of outfits) {
    ch.setLook(o);
    ch.animate(0, 0, 0.016, 0.8);
    r.render(scene, cam);
    cache.set(o.id, r.domElement.toDataURL('image/png'));
  }
  holder.remove(ch.root);
  r.dispose();
  r.forceContextLoss();
  return cache;
}
