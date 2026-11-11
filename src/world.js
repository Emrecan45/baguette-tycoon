import * as THREE from 'three';
import { Pal, box, group, bake, glowMaterial, G, mergeByMaterial } from './art.js';
import { prop, nature } from './assets.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Kit, hedge, flowerBed, lamp, bench, eiffelTower } from './decor.js';
import { LitMaterial } from './lit.js';
import { SPACE, at } from './layout.js';

const blockers = [];
const DEG = Math.PI / 180;

const AREAS = {
  boutique: { x0: -5.9, x1: 5.9, z0: -4.7, z1: 6.9, open: true },
  fournil: { x0: -5.9, x1: 10.1, z0: 7.55, z1: 13.1, open: false },
  terrace: { x0: 6.6, x1: 13.6, z0: -5.4, z1: 3.3, open: false },
};
const DOORS = {
  fournil: { x0: -2.45, x1: -1.15, z0: 6.0, z1: 8.5, cx: -1.8, cz: 7.2 },
  terrace: { x0: 5.0, x1: 7.6, z0: -1.25, z1: 0.05, cx: 6.2, cz: -0.6 },
};
const doorMeshes = {};
for (const rect of [...Object.values(AREAS), ...Object.values(DOORS)]) {
  for (const key of ['x0', 'x1', 'z0', 'z1', 'cx', 'cz']) if (key in rect) rect[key] = at(rect[key]);
}

export const World = {
  minX: at(-5.9), maxX: at(5.9), minZ: at(-4.7), maxZ: at(6.9),
  ext: 0,
  AREAS, DOORS,

  addBlocker(cx, cz, hx, hz) { blockers.push({ cx, cz, hx, hz }); },

  isOpen(name) { return AREAS[name].open; },

  openArea(name, instant) {
    AREAS[name].open = true;
    if (name === 'fournil') {
      if (this.backWalls) { this.backWalls.tall.visible = false; this.backWalls.low.visible = true; }
      if (this.signGroup) this.signGroup.position.z = 13.55;
    }
    const d = doorMeshes[name];
    if (!d) return;
    if (instant) { d.leaf.rotation.y = d.openYaw; if (d.veil) d.veil.visible = false; return; }
    d.anim = 0;
    d.animating = true;
  },
  tickDoors(dt) {
    for (const d of Object.values(doorMeshes)) {
      if (!d.animating) continue;
      d.anim = Math.min(1, d.anim + dt / 0.7);
      const e = 1 - Math.pow(1 - d.anim, 3);
      d.leaf.rotation.y = d.openYaw * e + Math.sin(d.anim * Math.PI) * 0.15;
      if (d.veil) { d.veil.material.opacity = 0.5 * (1 - e); if (d.anim >= 1) d.veil.visible = false; }
      if (d.anim >= 1) d.animating = false;
    }
  },
  roomOf(p) {
    for (const [n, a] of Object.entries(AREAS)) if (p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1) return n;
    for (const [n, d] of Object.entries(DOORS)) if (p.x >= d.x0 && p.x <= d.x1 && p.z >= d.z0 && p.z <= d.z1) return 'door:' + n;
    return 'boutique';
  },

  nav(from, to) {
    const a = this.roomOf(from), b = this.roomOf(to);
    if (a === b || b.startsWith('door:')) return to;
    const side = (n, inRoom) => (n === 'fournil' ? new THREE.Vector3(at(-1.8), 0, at(inRoom ? 8.4 : 4.5)) : new THREE.Vector3(at(inRoom ? 7.3 : 5.2), 0, at(-0.6)));
    const near = (q) => Math.hypot(q.x - from.x, q.z - from.z) < 0.45;
    if (a.startsWith('door:')) { const n = a.slice(5); return b === n ? side(n, true) : side(n, false); }
    if (a === 'boutique') {

      const inLine = b === 'fournil' ? Math.abs(from.x - at(-1.8)) < 0.7 && from.z > at(4.1) : Math.abs(from.z - at(-0.6)) < 0.7 && from.x > at(4.8);
      const q = side(b, false);
      return inLine || near(q) ? side(b, true) : q;
    }

    const inLine = a === 'fournil' ? Math.abs(from.x - at(-1.8)) < 0.7 && from.z < at(9.0) : Math.abs(from.z - at(-0.6)) < 0.7 && from.x < at(7.9);
    const q = side(a, true);
    return inLine || near(q) ? side(a, false) : q;
  },

  camBounds() {
    let x0 = -4.8, x1 = 4.8, z0 = -3, z1 = 5.8;
    if (AREAS.fournil.open) { z1 = 10.2; x1 = Math.max(x1, 7.5); }
    if (AREAS.terrace.open) { x1 = Math.max(x1, 10.6); }
    return { x0: at(x0), x1: at(x1), z0: at(z0), z1: at(z1) };
  },

  resolve(p, r, skipBlockers = false) {

    let best = null, bestD = Infinity;
    const test = (q) => {
      const x0 = q.x0 + r, x1 = q.x1 - r, z0 = q.z0 + (q === AREAS.boutique ? 0 : r), z1 = q.z1 - r;
      const cx = Math.min(Math.max(p.x, x0), x1), cz = Math.min(Math.max(p.z, z0), z1);
      const d = (cx - p.x) ** 2 + (cz - p.z) ** 2;
      if (d < bestD) { bestD = d; best = [cx, cz]; }
    };
    for (const a of Object.values(AREAS)) if (a.open) test(a);
    for (const [n, d] of Object.entries(DOORS)) if (AREAS[n].open) test(d);
    if (best && bestD > 0) { p.x = best[0]; p.z = best[1]; }
    if (skipBlockers) return;
    for (const b of blockers) {
      const hx = b.hx + r, hz = b.hz + r;
      const dx = p.x - b.cx, dz = p.z - b.cz;
      if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
        const px = hx - Math.abs(dx), pz = hz - Math.abs(dz);
        if (px < pz) p.x += Math.sign(dx || 1) * px;
        else p.z += Math.sign(dz || 1) * pz;
      }
    }
  },

  build(root) {
    this.maxX = at(5.9 + this.ext);
    const env = group(root, [0, 0, 0], [0, 0, 0], 'Decor');
    env.scale.set(SPACE, 1, SPACE);
    const firstBlocker = blockers.length;
    buildGround(env);
    buildShop(env);
    buildFournil(env);
    buildSurroundings(env);
    this.skyline = group(env, [0, 0, 0], [0, 0, 0], 'Horizon');
    buildHorizon(this.skyline);

    for (const b of blockers.slice(firstBlocker)) {
      b.cx *= SPACE; b.cz *= SPACE; b.hx *= SPACE; b.hz *= SPACE;
    }
  },
};

function canvasTex(w, h, draw, repeat) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function lawnTex() {
  return canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#97CF63'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 70;
      const light = rnd() > 0.5;
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, light ? 'rgba(190,232,120,.28)' : 'rgba(110,175,70,.22)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  });
}

function slabTex() {
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#DCD2C1'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const v = (x + y) % 2 ? 3 : 6;
      c.fillStyle = `rgb(${240 - v},${234 - v},${222 - v})`;
      c.beginPath(); c.roundRect(x * 128 + 2, y * 128 + 2, 124, 124, 6); c.fill();
    }
  });
}

function gravelTex() {
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#E8D9B8'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = rnd() > 0.5 ? 'rgba(255,248,230,.55)' : 'rgba(190,165,120,.35)';
      c.beginPath(); c.arc(rnd() * w, rnd() * h, 1 + rnd() * 1.6, 0, 7); c.fill();
    }
  });
}

function shopFloorTex(widthM = 12.4) {
  const H = 1024, PX = H / 12.4, S = Math.round(widthM * PX);
  return canvasTex(S, H, (c) => {

    const n = 12, T = H / n, nx = Math.round(S / T);
    c.fillStyle = '#B9C6D1'; c.fillRect(0, 0, S, H);
    for (let y = 0; y < n; y++) for (let x = 0; x < nx; x++) {
      c.fillStyle = (x + y) % 2 ? '#CFDAE3' : '#F4F7F9';
      c.fillRect(x * T + 1.5, y * T + 1.5, T - 3, T - 3);
      c.fillStyle = 'rgba(255,255,255,.18)';
      c.fillRect(x * T + 1.5, y * T + 1.5, T - 3, T * 0.12);
    }

    const ao = (x0, y0, x1, y1) => {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(40,60,80,.28)'); g.addColorStop(1, 'rgba(40,60,80,0)');
      c.fillStyle = g;
      c.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || S, Math.abs(y1 - y0) || H);
    };
    const d = 0.75 * PX;
    ao(0, 0, d, 0); ao(S, 0, S - d, 0); ao(0, 0, 0, d);
  });
}

function texturedBox(parent, size, pos, tex, color = '#ffffff', side = '#CFC5B4') {
  const top = new LitMaterial({ map: tex, roughness: 0.92, color });
  const sideM = new LitMaterial({ color: side, roughness: 0.95 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), [sideM, sideM, top, sideM, sideM, sideM]);
  m.position.set(pos[0], pos[1], pos[2]);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function buildGround(env) {
  const lawn = lawnTex();
  lawn.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new LitMaterial({ map: lawn, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.08, 0);
  ground.receiveShadow = true;
  env.add(ground);

  const slabs = (sx, sz, cx, cz) => {
    const t = slabTex();
    t.repeat.set(sx / 1.3, sz / 1.3);
    t.offset.set((cx - sx / 2) / 1.3, (cz - sz / 2) / 1.3);
    return t;
  };

  const E = World.ext;
  texturedBox(env, [16.4 + E, 0.12, 34.66], [E / 2, -0.085, -3.27], slabs(16.4 + E, 34.66, E / 2, -3.27));
  const terraceTex = slabs(6.0, 9.6, 11.2 + E, -1.0);
  terraceTex.offset.y -= 0.12 / 1.3;
  texturedBox(env, [6.0, 0.12, 9.6], [11.2 + E, -0.085, -1.0], terraceTex);

  const k = new Kit();
  const curb = (x, z, w, d) => k.at(x, z).add(new RoundedBoxGeometry(w, 0.16, d, 2, 0.05), new THREE.Matrix4().makeTranslation(0, 0.02, 0), () => new THREE.Color('#F7F1E6'));
  curb(E / 2, 13.95, 16.62 + E, 0.22);
  curb(-8.2, -3.27, 0.22, 34.66);
  curb(8.2, 5.495, 0.22, 3.51);
  curb(8.15, -12.0, 0.22, 12.5);
  curb(11.1 + E, 3.85, 6.15, 0.22); curb(11.1 + E, -5.85, 6.15, 0.22); curb(14.25 + E, -1.0, 0.22, 9.7);

  const gravel = gravelTex(); gravel.repeat.set(3, 3);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.1, 48), new LitMaterial({ map: gravel, roughness: 1 }));
  disc.position.set(TOWER.x, -0.04, TOWER.z);
  disc.receiveShadow = true;
  env.add(disc);
  k.at(TOWER.x, TOWER.z).add(new THREE.TorusGeometry(2.6, 0.09, 6, 48), new THREE.Matrix4().makeRotationX(Math.PI / 2), () => new THREE.Color('#F4EDE0'));
  const m = k.mesh(false);
  env.add(m);
}

export const TOWER = { x: -10.9, z: 1.3, s: 0.84 };

function buildShop(env) {

  const E = World.ext;
  const tex = shopFloorTex(12.4 + E);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(12.4 + E, 0.3, 12.4), [
    new LitMaterial({ color: '#B5A48C' }), new LitMaterial({ color: '#B5A48C' }),
    new LitMaterial({ map: tex, roughness: 0.85 }),
    new LitMaterial({ color: '#B5A48C' }), new LitMaterial({ color: '#B5A48C' }), new LitMaterial({ color: '#B5A48C' }),
  ]);
  floor.position.set(E / 2, -0.15, 1.1);
  floor.receiveShadow = true;
  env.add(floor);

  const shell = group(env, [0, 0, 0], [0, 0, 0], 'Boutique');

  box(shell, [12.6 + E, 0.3, 0.32], 0.06, '#D8CDBB', [E / 2, -0.12, -5.1], [0, 0, 0], false);

  const backTall = group(env, [0, 0, 0], [0, 0, 0], 'MurFondHaut');
  const backLow = group(env, [0, 0, 0], [0, 0, 0], 'MurFondBas');
  for (const [g, h] of [[backTall, 2.7], [backLow, 1.15]]) {
    wall(g, [-4.425, 0, 7.15], [3.85, 0, 0.35], h);
    wall(g, [2.625, 0, 7.15], [7.45, 0, 0.35], h);
    bake(g, true);
  }
  backLow.visible = false;
  World.backWalls = { tall: backTall, low: backLow };
  wall(shell, [-6.2, 0, 1.2], [0.35, 0, 11.9]);

  wall(shell, [6.2, 0, -3.025], [0.35, 0, 3.45]);
  wall(shell, [6.2, 0, 3.625], [0.35, 0, 7.05]);

  for (const sx of [-1, 1]) {
    const px = sx * 6.15 + (sx > 0 ? E : 0);
    box(shell, [0.55, 3.1, 0.55], 0.04, '#24453A', [px, 1.55, -4.9]);
    box(shell, [0.6, 0.3, 0.6], 0.04, '#1B352C', [px, 0.15, -4.9]);
    box(shell, [0.04, 2.2, 0.57], 0.01, '#C9A04A', [px - sx * 0.2, 1.55, -4.9], [0, 0, 0], false);
  }

  for (const z of [0.4, 3.6]) {
    windowFrame(shell, [-6.0, 1.75, z], true);
    windowFrame(shell, [-6.4, 1.75, z], false);
  }
  for (const z of [2.4, 4.9]) {
    windowFrame(shell, [6.0, 1.75, z], false);
    windowFrame(shell, [6.4, 1.75, z], true);
  }
  bake(shell, true);
  door(env, 'fournil', -1.8, 7.15, 'x');
  door(env, 'terrace', 6.2, -0.6, 'z');

  const furniture = group(env, [0, 0, 0], [0, 0, 0], 'Mobilier');
  for (const [x, rot] of [[-5.78, 90], [5.78 + E, -90]]) {
    const s = prop('bread_shelf', 1);
    s.position.set(x, 0, -2.6);
    s.rotation.y = rot * DEG;
    furniture.add(s);
    World.addBlocker(x, -2.6, 0.3, 0.88);
  }
  mergeByMaterial(furniture, true);

  sign(env);
}

function wall(p, pos, size, h = 2.7) {
  const thin = (v) => v < 1;
  if (h > 1.2) box(p, [size[0], h, size[2]], 0.05, '#F3E6CF', [pos[0], h / 2, pos[2]], [0, 0, 0], true);

  box(p, [size[0] + (thin(size[0]) ? 0.06 : 0.04), 1.05, size[2] + (thin(size[2]) ? 0.06 : 0.04)], 0.04, '#7E4B2A', [pos[0], 0.525, pos[2]], [0, 0, 0], false);
  box(p, [size[0] + (thin(size[0]) ? 0.09 : 0.04), 0.08, size[2] + (thin(size[2]) ? 0.09 : 0.04)], 0.03, '#5E3720', [pos[0], 1.07, pos[2]], [0, 0, 0], false);

  const n = Math.floor(Math.max(size[0], size[2]) / 1.4);
  for (let i = 0; i < n; i++) {
    const t = -Math.max(size[0], size[2]) / 2 + (i + 0.5) * Math.max(size[0], size[2]) / n;
    const o = thin(size[0]) ? [pos[0] + (pos[0] < 0 ? 0.05 : -0.05), 0.55, pos[2] + t] : [pos[0] + t, 0.55, pos[2] - 0.05];
    const sz = thin(size[0]) ? [size[0], 0.65, 1.0] : [1.0, 0.65, size[2]];
    box(p, sz, 0.03, '#94592F', o, [0, 0, 0], false);
  }
  box(p, [size[0] + (thin(size[0]) ? 0.14 : 0), 0.16, size[2] + (thin(size[2]) ? 0.14 : 0)], 0.05, '#FFF4DE', [pos[0], h > 1.2 ? h + 0.04 : 1.13, pos[2]], [0, 0, 0], true);
}

function door(env, name, cx, cz, axis) {
  const g = group(env, [cx, 0, cz], [0, axis === 'x' ? 0 : 90, 0], 'Porte');

  box(g, [1.38, 0.06, 0.4], 0.015, '#D8CDBB', [0, -0.012, 0], [0, 0, 0], false);

  const frame = group(g, [0, 0, 0]);
  const H = name === 'fournil' ? 2.55 : 2.6;
  for (const sx of [-0.74, 0.74]) box(frame, [0.2, H, 0.47], 0.03, '#24453A', [sx, H / 2, 0]);
  box(frame, [1.9, 0.36, 0.53], 0.04, '#24453A', [0, H + 0.12, 0]);
  box(frame, [1.94, 0.06, 0.56], 0.02, '#C9A04A', [0, H - 0.04, 0], [0, 0, 0], false);
  bake(frame, true);

  const leaf = group(g, [-0.68, 0, 0]);
  const pane = group(leaf, [0.68, 0, 0]);
  box(pane, [1.36, 2.3, 0.08], 0.03, '#2E5A4A', [0, 1.15, 0]);
  box(pane, [1.1, 0.9, 0.1], 0.02, '#1F3F33', [0, 0.6, 0], [0, 0, 0], false);
  box(pane, [0.12, 0.12, 0.16], 0.04, '#D6B25E', [0.5, 1.15, -0.04], [0, 0, 0], false);
  bake(pane, true);
  const glassPane = new THREE.Mesh(G.box(1.0, 0.8, 0.1, 0.03), glass);
  glassPane.position.set(0.68, 1.65, 0);
  leaf.add(glassPane);
  const d = { leaf, openYaw: axis === 'x' ? -1.75 : 1.75, anim: 0, animating: false, veil: null };
  if (name === 'fournil') {

    const veil = new THREE.Mesh(new THREE.BoxGeometry(16.3, 0.02, 6.0), new LitMaterial({ color: '#1C2333', transparent: true, opacity: 0.5, depthWrite: false }));
    veil.position.set(2.1, 0.06, 10.35);
    env.add(veil);
    d.veil = veil;
  }
  doorMeshes[name] = d;
}

function fournilFloorTex() {
  return canvasTex(512, 512, (c, w, h) => {

    c.fillStyle = '#B5653A'; c.fillRect(0, 0, w, h);
    const R = 32, hx = R * Math.sqrt(3);
    for (let row = -1; row < h / (R * 1.5) + 1; row++) {
      for (let col = -1; col < w / hx + 1; col++) {
        const x = col * hx + (row % 2 ? hx / 2 : 0), y = row * R * 1.5;
        const v = rnd();
        c.fillStyle = v < 0.33 ? '#D9875A' : v < 0.66 ? '#CF7C4E' : '#E29466';
        c.beginPath();
        for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c.lineTo(x + Math.cos(a) * (R - 2.5), y + Math.sin(a) * (R - 2.5)); }
        c.closePath(); c.fill();
      }
    }
  }, [6, 2.4]);
}

function buildFournil(env) {

  const floor = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.3, 6.2), [
    new LitMaterial({ color: '#9A5A36' }), new LitMaterial({ color: '#9A5A36' }),
    new LitMaterial({ map: fournilFloorTex() }),
    new LitMaterial({ color: '#9A5A36' }), new LitMaterial({ color: '#9A5A36' }), new LitMaterial({ color: '#9A5A36' }),
  ]);
  floor.position.set(2.1, -0.15, 10.4);
  floor.receiveShadow = true;
  env.add(floor);
  const shell = group(env, [0, 0, 0], [0, 0, 0], 'Fournil');
  wall(shell, [-6.2, 0, 10.4625], [0.35, 0, 6.625]);
  wall(shell, [10.4, 0, 10.34], [0.35, 0, 6.87]);
  wall(shell, [2.1, 0, 13.6], [16.95, 0, 0.35]);
  wall(shell, [8.3, 0, 7.15], [3.85, 0, 0.35], 1.15);

  flourSack(shell, [-5.4, 0, 8.0], 15);
  flourSack(shell, [-5.35, 0, 8.55], -20);
  flourSack(shell, [-5.4, 0.42, 8.3], 70);
  flourSack(shell, [9.6, 0, 8.1], 10);
  flourSack(shell, [9.65, 0.42, 8.2], -60);
  World.addBlocker(-5.4, 8.3, 0.45, 0.55);
  World.addBlocker(9.6, 8.15, 0.45, 0.4);

  windowFrame(shell, [-6.0, 1.75, 11.2], true);
  windowFrame(shell, [-6.4, 1.75, 11.2], false);
  windowFrame(shell, [10.2, 1.75, 11.2], false);
  windowFrame(shell, [10.6, 1.75, 11.2], true);
  bake(shell, true);
}

const glass = glowMaterial(Pal.sky, Pal.sky, 0.3);
function windowFrame(p, pos, left) {
  const dir = left ? 1 : -1;
  box(p, [0.12, 1.25, 1.55], 0.05, '#24453A', pos, [0, 0, 0], false);
  const g = new THREE.Mesh(G.box(0.1, 1.05, 1.35, 0.04), glass);
  g.position.set(pos[0] + dir * 0.03, pos[1], pos[2]);
  p.add(g);
  box(p, [0.14, 1.05, 0.06], 0.02, '#24453A', [pos[0] + dir * 0.04, pos[1], pos[2]], [0, 0, 0], false);
  box(p, [0.14, 0.06, 1.35], 0.02, '#24453A', [pos[0] + dir * 0.04, pos[1], pos[2]], [0, 0, 0], false);
  box(p, [0.3, 0.08, 1.7], 0.03, '#FFF4DE', [pos[0] + dir * 0.08, pos[1] - 0.66, pos[2]], [0, 0, 0], false);
}

function flourSack(p, pos, yaw) {
  const s = group(p, pos, [0, yaw, 0]);
  box(s, [0.55, 0.5, 0.38], 0.16, '#F4ECDC', [0, 0.25, 0]);
  box(s, [0.42, 0.14, 0.3], 0.06, '#F4ECDC', [0, 0.52, 0], [0, 0, 8]);
  box(s, [0.3, 0.2, 0.02], 0.009, '#2E5E8C', [0, 0.26, -0.19], [0, 0, 0], false);
}

function plant(g, name, x, z, h, y = 0, rot = null) {
  const o = nature(name, h);
  o.position.set(x, y, z);
  o.rotation.y = rot ?? (name.startsWith('Bush') ? Math.PI : rnd() * Math.PI * 2);
  g.add(o);
  return o;
}
const TREES = ['NormalTree_1', 'NormalTree_2', 'NormalTree_3', 'NormalTree_1', 'MapleTree_1'];

function buildSurroundings(env) {
  const k = new Kit();
  const E = World.ext;
  const green = group(env, [0, 0, 0], [0, 0, 0], 'Vegetation');

  for (const dz of [-3.6, 3.6]) {
    flowerBed(k, TOWER.x, TOWER.z + dz, 3.0, 0.9, 0, false);

    for (const ox of [-0.68, 0.68]) plant(green, 'Bush_Small_Flowers', TOWER.x + ox, TOWER.z + dz, 0.5, 0.3, Math.PI);
  }

  plant(green, 'Bush_Large_Flowers', TOWER.x + 0.5, TOWER.z - 5.0, 1.0, 0, Math.PI);
  plant(green, 'Bush_Flowers', TOWER.x + 2.2, TOWER.z + 3.6, 0.95, 0, Math.PI);
  plant(green, 'Rock_1', TOWER.x - 3.4, TOWER.z - 0.2, 0.5);
  bench(k, TOWER.x - 2.9, TOWER.z - 2.2, -125); bench(k, TOWER.x - 2.9, TOWER.z + 2.4, -55);
  plant(green, 'NormalTree_1', -9.8, 8.6, 4.6); plant(green, 'MapleTree_1', -12.8, 6.2, 4.2);
  plant(green, 'NormalTree_2', -13.6, -3.4, 4.8); plant(green, 'NormalTree_3', -15.2, -5.6, 4.2);

  hedge(k, 14.35, -1.0, 9.2, 90, 0.55);
  plant(green, 'NormalTree_2', 12.6, 9.4, 4.6); plant(green, 'MapleTree_1', 13.0, 5.4, 4.0); plant(green, 'NormalTree_1', 12.8, -7.8, 4.6);

  plant(green, 'Bush_Flowers', -9.2, 10.6, 0.9); plant(green, 'Bush_Flowers', 11.4, 7.0, 0.9); plant(green, 'Bush_Large_Flowers', 4.0, 14.9, 1.0);

  for (const [x, z] of [[-7.45, -4.2], [14.6, -5.9], [-7.45, 5.2], [7.45, 5.2]]) lamp(k, x, z, 0.95);

  for (const [x, z, n] of [[-9.2, -7.5, 'Bush_Flowers'], [-16.5, 1.5, 'Bush_Large_Flowers'], [16.3 + E, 1.0, 'Bush_Large_Flowers'], [9.4 + E, -7.0, 'Bush_Flowers'], [16.2 + E, -4.5, 'Bush']]) plant(green, n, x, z, 0.95);
  env.add(k.mesh(true));
  mergeByMaterial(green, true);

  const tower = eiffelTower(TOWER.s);
  tower.position.set(TOWER.x, 0, TOWER.z);
  tower.scale.x /= SPACE; tower.scale.z /= SPACE;
  tower.rotation.y = 8 * DEG;
  env.add(tower);
}

function buildHorizon(env) {
  const g = group(env, [0, 0, 0], [0, 0, 0], 'Horizon');
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + rnd() * 0.08, r = 24 + rnd() * 9;
    plant(g, TREES[i % TREES.length], Math.cos(a) * r, Math.sin(a) * r + 2, 5.5 + rnd() * 2);
  }
  mergeByMaterial(g, false);
}

const signText = 'BOULANGERIE';

function sign(p) {
  const g = group(p, [2.3, 3.05, 7.1], [0, 0, 0], 'Enseigne');
  World.signGroup = g;
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = -1;
  tex.offset.x = 1;
  const draw = () => {
    const c = cv.getContext('2d');
    c.clearRect(0, 0, 1024, 256);
    c.fillStyle = '#C9A04A'; c.beginPath(); c.roundRect(0, 0, 1024, 256, 36); c.fill();
    c.fillStyle = '#24453A'; c.beginPath(); c.roundRect(12, 12, 1000, 232, 28); c.fill();
    c.strokeStyle = '#C9A04A'; c.lineWidth = 4; c.beginPath(); c.roundRect(30, 30, 964, 196, 20); c.stroke();
    const txt = signText;
    let size = 140;
    c.font = `${size}px "Lilita One"`;
    while (c.measureText(txt).width > 860 && size > 60) { size -= 6; c.font = `${size}px "Lilita One"`; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const grad = c.createLinearGradient(0, 58, 0, 178);
    grad.addColorStop(0, '#FFE8A3'); grad.addColorStop(1, '#C9952F');
    c.lineJoin = 'round'; c.lineWidth = size * 0.12; c.strokeStyle = '#13261F'; c.strokeText(txt, 512, 124);
    c.fillStyle = grad; c.fillText(txt, 512, 124);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts.load('140px "Lilita One"').then(draw);
  box(g, [4.3, 1.1, 0.12], 0.05, '#1B352C', [0, 0, 0.02]);
  box(g, [0.12, 0.6, 0.12], 0.03, '#1B352C', [-1.6, -0.75, 0.05]);
  box(g, [0.12, 0.6, 0.12], 0.03, '#1B352C', [1.6, -0.75, 0.05]);
  bake(g, false);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new LitMaterial({ map: tex, roughness: 0.6, metalness: 0.1 }));
  face.position.set(0, 0, -0.045);
  face.rotation.y = Math.PI;
  g.add(face);
}
