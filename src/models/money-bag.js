import * as THREE from 'three';
import { Kit } from '../decor.js';
import { LitMaterial } from '../lit.js';

export function createMoneyBag() {
  const k = new Kit();
  const color = (hex) => { const c = new THREE.Color(hex); return () => c; };
  const profile = [[0, 0.025], [.23, .025], [.36, .09], [.43, .24], [.42, .39], [.34, .54], [.19, .66], [.12, .72], [.13, .77], [.23, .9], [.2, .95], [.1, .91], [0, .85]];
  const cloth = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const vertices = cloth.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const angle = Math.atan2(z, x);
    const folds = 1 + Math.cos(angle * 8) * (y > .58 ? .1 : .025);
    vertices.setXYZ(i, x * folds, y, z * folds * .84);
  }
  cloth.computeVertexNormals();
  const bottom = new THREE.Color('#B97B3E'), top = new THREE.Color('#F4D49A');
  k.add(cloth, new THREE.Matrix4(), p => bottom.clone().lerp(top, THREE.MathUtils.clamp(p.y / .9, 0, 1)));
  for (const y of [.717, .75]) k.add(new THREE.TorusGeometry(.132, .023, 8, 32), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, y, 0), color('#6E432A'));

  for (const side of [-1, 1]) {
    const loop = new THREE.TorusGeometry(.075, .018, 8, 18);
    loop.scale(1, .6, 1);
    k.add(loop, new THREE.Matrix4().makeRotationZ(side * .35).setPosition(side * .075, .73, .145), color('#805034'));
    const tail = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .73, .15), new THREE.Vector3(side * .07, .65, .2), new THREE.Vector3(side * .09, .58, .23)]);
    k.add(new THREE.TubeGeometry(tail, 8, .016, 6, false), new THREE.Matrix4(), color('#805034'));
  }
  k.add(new THREE.SphereGeometry(.035, 12, 8), new THREE.Matrix4().makeTranslation(0, .73, .17), color('#65402A'));
  const group = new THREE.Group();
  group.add(k.mesh(true));
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.font = 'bold 104px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#34724C'; c.fillText('$', 64, 70);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1;

  const print = new THREE.PlaneGeometry(.31, .31, 24, 24);
  const pp = print.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), y = pp.getY(i) + .34;
    const j = profile.findIndex(p => p[1] >= y);
    const [r0, y0] = profile[j - 1], [r1, y1] = profile[j];
    let r = THREE.MathUtils.lerp(r0, r1, (y - y0) / (y1 - y0));
    const angle = Math.acos(THREE.MathUtils.clamp(x / r, -1, 1));
    r *= 1 + Math.cos(angle * 8) * .025;
    pp.setXYZ(i, x, y, Math.sqrt(Math.max(0, r * r - x * x)) * .84 + .009);
  }
  print.computeVertexNormals();
  const mark = new THREE.Mesh(print, new LitMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  group.add(mark);
  return group;
}
