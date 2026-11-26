import * as THREE from 'three';
import { Pal, box, group, bake, newItem, newBill } from './art.js';
import { Kit } from './decor.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { prop } from './assets.js';
import { ItemStack } from './character.js';
import { World } from './world.js';
import { fly, flyAndVanish, punch, toRoot } from './juice.js';
import { floorIcon } from './icons.js';
import { LitMaterial } from './lit.js';

const tmp = new THREE.Vector3();

export class Zone {
  constructor(parent, cx, cz, w, d, border = Pal.zone, fill = Pal.zoneInner, icon = null, iconColor = '#94673C') {
    this.cx = cx; this.cz = cz; this.hx = w / 2; this.hz = d / 2;
    this.pulse = 0;
    this.visual = group(parent, [cx, 0, cz], [0, 0, 0], 'Zone');
    box(this.visual, [w, 0.03, d], 0.2, border, [0, 0.015, 0], [0, 0, 0], false);
    box(this.visual, [w - 0.16, 0.03, d - 0.16], 0.14, fill, [0, 0.02, 0], [0, 0, 0], false);
    bake(this.visual, false);
    if (icon) floorIcon(this.visual, icon, Math.min(w, d) * 0.82, 0.04, iconColor, 0.9);
  }
  get center() { return new THREE.Vector3(this.cx, 0, this.cz); }
  contains(p) { return Math.abs(p.x - this.cx) <= this.hx && Math.abs(p.z - this.cz) <= this.hz; }
  tick(dt, time, occupied) {
    this.pulse += ((occupied ? 1 : 0) - this.pulse) * (1 - Math.exp(-10 * dt));
    const s = 1 + this.pulse * (0.04 + Math.sin(time * 10) * 0.02);
    this.visual.scale.set(s, 1, s);
  }
}


export function croissantOvenModel(glow) {
  const g = new THREE.Group();
  const k = new Kit();
  const M = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const C = (h) => { const c = new THREE.Color(h); return () => c; };
  const grad = (a, b, y0, y1) => { const ca = new THREE.Color(a), cb = new THREE.Color(b); return (p) => ca.clone().lerp(cb, Math.min(1, Math.max(0, (p.y - y0) / (y1 - y0)))); };
  const RB = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, r);
  k.add(RB(1.5, 0.22, 0.95, 0.06), M(0, 0.11, 0), C('#3A3F45'));
  k.add(RB(1.42, 1.25, 0.9, 0.12), M(0, 0.85, 0), grad('#AEB8C0', '#E4EAEE', 0.2, 1.5));
  k.add(RB(1.5, 0.12, 0.98, 0.05), M(0, 1.5, 0), C('#C7A15A'));
  k.add(RB(1.2, 0.08, 0.06, 0.03), M(0, 1.28, -0.46), C('#C7A15A'));
  for (const x of [-0.45, -0.2]) k.add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 14).rotateX(Math.PI / 2), M(x + 0.85, 1.36, -0.44), C('#2E3236'));
  k.add(RB(0.24, 0.5, 0.24, 0.05), M(0.45, 1.8, 0.2), C('#9AA4AC'));
  const body = k.mesh(true);
  g.add(body);
  const win = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.62, 0.05, 2, 0.06), glow);
  win.position.set(0, 0.86, -0.45);
  g.add(win);
  return g;
}

export class Oven {

  constructor(parent, worldRoot, x, z, kind = 'baguette') {
    this.worldRoot = worldRoot;
    this.kind = kind;
    this.interval = kind === 'croissant' ? 3.0 : 2.2;
    this.timer = 0;
    const side = kind === 'croissant';
    const r = this.root = group(parent, [x, 0, z], [0, side ? 90 : 0, 0], 'Four');
    this.glow = new LitMaterial({ color: '#FFB060', emissive: '#FF8A2A', emissiveIntensity: 1.2, roughness: 0.6 });
    if (side) {
      r.add(croissantOvenModel(this.glow));
      this.mouth = group(r, [0, 0.0, -0.45], [0, 0, 0], 'Gueule');
    } else {

      const oven = prop('oven', 1);
      oven.rotation.y = Math.PI;
      r.add(oven);
      oven.traverse((o) => { if (o.isMesh && o.material && o.material.name === 'Ember') o.material = this.glow; });
      this.mouth = group(r, [0, 0, -0.58], [0, 0, 0], 'Gueule');
    }


    this.input = side ? null : 'pate';
    this.yield = 3;
    this.charge = 0;
    const tx = this.input ? 0.4 : 0;

    const table = group(r, [tx, 0, side ? -1.15 : -1.3]);
    const tm = prop('table', 1);
    tm.rotation.y = Math.PI;
    table.add(tm);
    const trayAnchor = group(table, [0, 0.86, 0], [0, 0, 0], 'Plateau');
    this.tray = new ItemStack(trayAnchor, 'pile', 12, 3);
    if (side) {
      this.pickup = new Zone(parent, x - 2.15, z, 0.95, 1.8, Pal.zone, Pal.zoneInner, 'croissant');
      World.addBlocker(x - 0.55, z, 1.05, 0.95);
    } else {
      this.pickup = new Zone(parent, x + tx, z - 2.35, 1.25, 1.0, Pal.zone, Pal.zoneInner, 'baguette');
      World.addBlocker(x, z - 0.45, 1.05, 1.25);

      const bin = group(r, [-0.95, 0, -1.2]);
      const kb = new Kit();
      const RB = (w, h, d, rr) => new RoundedBoxGeometry(w, h, d, 2, rr);
      const T = (a, b, c) => new THREE.Matrix4().makeTranslation(a, b, c);
      const grad = (a, b, y0, y1) => { const ca = new THREE.Color(a), cb = new THREE.Color(b); return (p) => ca.clone().lerp(cb, Math.min(1, Math.max(0, (p.y - y0) / (y1 - y0)))); };
      const flat = (h) => { const c = new THREE.Color(h); return () => c; };
      kb.add(RB(0.72, 0.62, 0.6, 0.06), T(0, 0.31, 0), grad('#8A5A34', '#B07A48', 0, 0.62));
      kb.add(RB(0.62, 0.05, 0.5, 0.02), T(0, 0.63, 0), flat('#E9DCC4'));
      bin.add(kb.mesh(true));
      this.inStack = new ItemStack(group(bin, [0, 0.64, 0]), 'pile', 10, 2);
      this.drop = new Zone(parent, x - 0.95, z - 2.35, 1.05, 1.0, Pal.zone, Pal.zoneInner, 'pate', '#94673C');
      World.addBlocker(x - 0.95, z - 1.2, 0.36, 0.3);
    }
  }


  get center() { return this.root.position; }

  get inputNeed() { return this.input ? this.inStack.capacity - this.inStack.count : 0; }

  tick(dt, time, speed = 1) {
    let g = 0.9 + Math.sin(time * 3.1 + this.root.position.x) * 0.25;
    this.working = !this.tray.full && (!this.input || this.charge > 0 || !this.inStack.empty);
    if (this.working) {
      this.timer += dt * speed;
      g += (this.timer / this.interval) * 0.6;
      if (this.timer >= this.interval) {
        this.timer = 0;
        if (this.input && this.charge <= 0) {
          const t = this.inStack.take();
          if (!t) return;
          this.charge = this.yield;

          const end = toRoot(this.mouth, tmp.set(0, 0.9, 0), new THREE.Vector3());
          flyAndVanish(t.item, () => end, 0.3, 0.35);
        }
        if (this.input) this.charge--;
        const b = newItem(this.kind);
        toRoot(this.mouth, tmp.set(0, 0.95, -0.1), b.position);
        this.worldRoot.add(b);
        this.tray.addFlying(b, 1, 0.35, 0.9, fly, punch);
        punch(this.root, 0.06, 0.3);
        if (this.onBake) this.onBake();
      }
    }
    this.glow.emissiveIntensity = g;
  }
}

export class Counter {
  constructor(parent, x, z, pileX, pileZ, exitSide) {
    this.queue = [];
    this.spawnTimer = 0.6;
    this.serveTimer = 0;
    this.exitSide = exitSide;
    const r = this.root = group(parent, [x, 0, z], [0, 0, 0], 'Comptoir');

    const c = prop('counter', 1);
    c.rotation.y = Math.PI;
    r.add(c);

    this.stocks = {
      gateau: new ItemStack(group(r, [-0.32, 1.07, 0], [0, 0, 0], 'Gateaux'), 'pile', 9, 3),
      baguette: new ItemStack(group(r, [0.3, 1.07, 0], [0, 0, 0], 'Stock'), 'pile', 18, 3),
      croissant: new ItemStack(group(r, [0.88, 1.07, 0], [0, 0, 0], 'Croissants'), 'pile', 12, 3),
      painchoc: new ItemStack(group(r, [1.38, 1.07, 0], [0, 0, 0], 'PainsChoc'), 'pile', 12, 3),
    };
    this.stock = this.stocks.baguette;
    this.stock2 = this.stocks.croissant;

    this.drop = new Zone(parent, x + 0.55, z + 1.3, 1.75, 0.95, Pal.zone, Pal.zoneInner, 'stock');

    this.register = { cx: x - 1.15, cz: z + 1.3 };
    this.cashier = null;
    this.pile = new MoneyPile(parent, pileX, pileZ);
    World.addBlocker(x, z, 1.6, 0.58);
  }

  stockFor(kind) { return this.stocks[kind]; }


  slotPos(i) {

    return new THREE.Vector3(this.root.position.x - 0.85, 0, this.root.position.z - 1.3 - i * 0.78);
  }
}

export class MoneyPile {
  constructor(parent, x, z) {
    this.zone = new Zone(parent, x, z, 1.25, 1.25, Pal.zone, '#CFEAB8', 'cash', '#7DB561');
    this.stack = new ItemStack(group(parent, [x, 0.035, z], [0, 0, 0], 'Argent'), 'money', 40);
  }
  get pos() { return this.zone.center; }
  add(worldRoot, from, value) {
    if (this.stack.full) { this.stack.addValueToTop(value); return; }
    const bill = newBill();
    bill.position.copy(from);
    worldRoot.add(bill);
    this.stack.addFlying(bill, value, 0.4, 1.4, fly, punch);
  }
}

export class UnlockPad {
  constructor(parent, x, z, title, price) {
    this.title = title; this.price = price; this.paid = 0; this.standTime = 0;
    this.root = group(parent, [x, 0, z], [0, 0, 0], 'Deblocage');
    this.zone = { cx: x, cz: z, contains: (p) => Math.abs(p.x - x) <= 0.72 && Math.abs(p.z - z) <= 0.72 };
    box(this.root, [1.44, 0.05, 1.44], 0.25, Pal.padBorder, [0, 0.025, 0], [0, 0, 0], false);
    box(this.root, [1.24, 0.05, 1.24], 0.18, Pal.padFill, [0, 0.04, 0], [0, 0, 0], false);
    this.progress = group(this.root, [0, 0.05, -0.59]);
    box(this.progress, [1.18, 0.05, 1.18], 0.16, Pal.padProgress, [0, 0, 0.59], [0, 0, 0], false);
    this.progress.scale.z = 0.001;
    this.icon = floorIcon(this.root, title, 1.0, 0.1, Pal.padBorder, 0.85);
  }
  get remaining() { return Math.max(0, this.price - this.paid); }
  refresh() {
    const k = this.price <= 0 ? 1 : Math.min(1, this.paid / this.price);
    const s = this.progress.scale.z;
    this.progress.scale.z = Math.max(0.001, s + (k - s) * 0.35);
  }
}


export class TrashBin {
  constructor(parent, x, z, bx, bz) {
    this.zone = new Zone(parent, x, z, 0.95, 0.95, Pal.zone, '#D5E8C8', 'trash', '#4E8F45');
    const r = this.root = group(parent, [bx, 0, bz], [0, 0, 0], 'Poubelle');
    const k = new Kit();
    const T = (a, b, c) => new THREE.Matrix4().makeTranslation(a, b, c);
    const flat = (h) => { const c = new THREE.Color(h); return () => c; };
    const grad = (a, b, y0, y1) => { const ca = new THREE.Color(a), cb = new THREE.Color(b); return (p) => ca.clone().lerp(cb, Math.min(1, Math.max(0, (p.y - y0) / (y1 - y0)))); };

    k.add(new THREE.CylinderGeometry(0.27, 0.21, 0.66, 20), T(0, 0.33, 0), grad('#2F7A3A', '#57B05E', 0, 0.66));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.add(new RoundedBoxGeometry(0.035, 0.5, 0.035, 1, 0.012), new THREE.Matrix4().makeRotationY(-a).setPosition(Math.cos(a) * 0.245, 0.34, Math.sin(a) * 0.245), flat('#2A6A33'));
    }
    k.add(new THREE.TorusGeometry(0.27, 0.025, 6, 22).rotateX(Math.PI / 2), T(0, 0.64, 0), flat('#245C2D'));
    r.add(k.mesh(true));

    this.lid = group(r, [0, 0.67, -0.27]);
    const kl = new Kit();
    kl.add(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 20), T(0, 0.03, 0.27), flat('#3E9A48'));
    kl.add(new RoundedBoxGeometry(0.16, 0.06, 0.06, 1, 0.02), T(0, 0.08, 0.27), flat('#245C2D'));
    this.lid.add(kl.mesh(true));
    this.mouth = group(r, [0, 0.55, 0]);
    this.open = 0;
    World.addBlocker(bx, bz, 0.26, 0.26);
  }
  tick(dt, time, occupied, throwing) {
    this.zone.tick(dt, time, occupied);
    this.open += ((throwing ? 1 : 0) - this.open) * (1 - Math.exp(-14 * dt));
    this.lid.rotation.x = -this.open * 1.1;
  }
}
