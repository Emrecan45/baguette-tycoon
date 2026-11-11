import * as THREE from 'three';

const cache = new Map();
const R = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };

const draw = {
  baguette(c) {
    c.save(); c.translate(128, 128); c.rotate(-0.6);
    R(c, -100, -30, 200, 60, 30);
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 11; c.lineCap = 'round';
    for (const x of [-48, 0, 48]) { c.beginPath(); c.moveTo(x - 14, 16); c.lineTo(x + 14, -16); c.stroke(); }
    c.restore();
  },
  stock(c) {
    c.save(); c.translate(128, 96); c.scale(0.72, 0.72); c.translate(-128, -128); draw.baguette(c); c.restore();
    c.beginPath(); c.moveTo(128, 246); c.lineTo(78, 190); c.lineTo(108, 190); c.lineTo(108, 160); c.lineTo(148, 160); c.lineTo(148, 190); c.lineTo(178, 190); c.closePath(); c.fill();
  },
  register(c) {
    R(c, 40, 140, 176, 80, 14);
    c.beginPath(); c.moveTo(62, 140); c.lineTo(82, 70); c.lineTo(174, 70); c.lineTo(194, 140); c.closePath(); c.fill();
    R(c, 100, 36, 56, 40, 8);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) R(c, 96 + i * 24, 92 + j * 20, 16, 12, 3);
    R(c, 80, 168, 96, 12, 6);
    c.globalCompositeOperation = 'source-over';
  },
  cash(c) {
    for (const [dx, dy] of [[14, -18], [-10, 14]]) {
      c.save(); c.translate(128 + dx, 128 + dy); c.rotate(-0.15);
      R(c, -92, -50, 184, 100, 12);
      c.globalCompositeOperation = 'destination-out';
      c.lineWidth = 8; c.beginPath(); c.roundRect(-78, -36, 156, 72, 8); c.stroke();
      c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill();
      c.restore();
    }
  },
  croissant(c) {

  const cx = 128, cy = 168, R = 82, A = 2.05, N = 48;
  const thick = (a) => 18 + 56 * Math.pow(Math.cos((a / A) * Math.PI / 2), 1.3);
  const P = (a, r) => [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
  c.beginPath();
  for (let i = 0; i <= N; i++) { const a = -A + (2 * A * i) / N; const [x, y] = P(a, R + thick(a) / 2); i ? c.lineTo(x, y) : c.moveTo(x, y); }
  for (let i = N; i >= 0; i--) { const a = -A + (2 * A * i) / N; const [x, y] = P(a, R - thick(a) / 2); c.lineTo(x, y); }
  c.closePath(); c.fill();

  for (const s of [-1, 1]) { const [x, y] = P(s * A, R); c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill(); }

  c.globalCompositeOperation = 'destination-out';
  c.lineWidth = 7; c.lineCap = 'round';
  for (const a of [-1.3, -0.62, 0, 0.62, 1.3]) {
    const t = thick(a) * 0.42;
    const [x0, y0] = P(a + 0.12, R - t), [x1, y1] = P(a - 0.12, R + t);
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(...P(a, R), x1, y1); c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  },
  upgrade(c) {
    c.beginPath(); c.moveTo(128, 20); c.lineTo(228, 124); c.lineTo(168, 124); c.lineTo(168, 230); c.lineTo(88, 230); c.lineTo(88, 124); c.lineTo(28, 124); c.closePath(); c.fill();
  },
  oven(c) {
    c.beginPath(); c.moveTo(30, 210); c.lineTo(30, 140); c.arc(128, 140, 98, Math.PI, 0); c.lineTo(226, 210); c.closePath(); c.fill();
    R(c, 150, 18, 30, 60, 6);
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(84, 210); c.lineTo(84, 160); c.arc(128, 160, 44, Math.PI, 0); c.lineTo(172, 210); c.closePath(); c.fill();
  },
  person(c) {
    c.beginPath(); c.arc(128, 78, 46, 0, 7); c.fill();
    c.beginPath(); c.moveTo(44, 226); c.quadraticCurveTo(44, 136, 128, 136); c.quadraticCurveTo(212, 136, 212, 226); c.closePath(); c.fill();
  },
  cashier(c) { c.save(); c.translate(-30, 0); c.scale(0.9, 0.9); draw.person(c); c.restore(); c.save(); c.translate(120, 120); c.scale(0.5, 0.5); draw.register(c); c.restore(); },
  counter(c) {
    R(c, 26, 120, 204, 96, 14);
    c.globalCompositeOperation = 'destination-out';
    R(c, 44, 136, 168, 40, 8);
    c.globalCompositeOperation = 'source-over';
    c.save(); c.translate(70, 40); c.scale(0.45, 0.45); draw.register(c); c.restore();
  },
  helper(c) {
    c.beginPath(); c.arc(84, 104, 46, 0, 7); c.arc(128, 78, 56, 0, 7); c.arc(172, 104, 46, 0, 7); c.fill();
    R(c, 72, 110, 112, 80, 10); R(c, 64, 186, 128, 34, 10);
  },
  basket(c) {
    c.lineWidth = 18; c.beginPath(); c.arc(128, 128, 70, Math.PI, 0); c.stroke();
    c.beginPath(); c.moveTo(24, 124); c.lineTo(232, 124); c.lineTo(204, 222); c.lineTo(52, 222); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    for (const x of [86, 128, 170]) R(c, x - 8, 144, 16, 62, 8);
  },
  pate(c) {
    c.beginPath(); c.ellipse(128, 140, 98, 74, 0, 0, 7); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 12; c.lineCap = 'round';
    for (const x of [-40, 0, 40]) { c.beginPath(); c.moveTo(128 + x - 16, 118); c.lineTo(128 + x + 16, 156); c.stroke(); }
    c.globalCompositeOperation = 'source-over';
  },
  painchoc(c) {
    R(c, 28, 66, 200, 130, 44);
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(128, 78); c.lineTo(120, 128); c.stroke();
    for (const x of [80, 174]) {
      c.beginPath(); c.ellipse(x, 160, 18, 14, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(x - 8, 90); c.lineTo(x - 18, 119); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  },
  cafe(c) {
    R(c, 40, 206, 176, 22, 11);
    c.beginPath(); c.moveTo(56, 104); c.lineTo(184, 104); c.lineTo(172, 190); c.quadraticCurveTo(170, 200, 158, 200); c.lineTo(82, 200); c.quadraticCurveTo(70, 200, 68, 190); c.closePath(); c.fill();
    c.lineWidth = 18; c.beginPath(); c.arc(192, 140, 26, -1.3, 1.3); c.stroke();
    c.lineWidth = 11; c.lineCap = 'round';
    for (const x of [92, 124, 156]) { c.beginPath(); c.moveTo(x, 84); c.quadraticCurveTo(x - 14, 60, x, 40); c.stroke(); }
  },
  appareil(c) {
    c.beginPath(); c.moveTo(24, 120); c.lineTo(232, 120); c.quadraticCurveTo(222, 226, 128, 226); c.quadraticCurveTo(34, 226, 24, 120); c.closePath(); c.fill();
    c.lineWidth = 12; c.lineCap = 'round';
    c.beginPath(); c.moveTo(150, 120); c.lineTo(196, 26); c.stroke();
    c.beginPath(); c.ellipse(140, 104, 22, 44, 0.45, 0, 7); c.stroke();
  },
  gateau(c) {
    R(c, 36, 120, 184, 100, 18);
    c.beginPath(); c.ellipse(128, 120, 92, 30, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(128, 66, 24, 0, 7); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 10; c.beginPath(); c.moveTo(40, 160);
    for (let x = 40; x <= 216; x += 22) c.quadraticCurveTo(x + 11, 180, x + 22, 160);
    c.stroke();
    c.globalCompositeOperation = 'source-over';
  },
  cake(c) { draw.oven(c); c.save(); c.translate(128, 182); c.scale(0.32, 0.32); c.translate(-128, -128); draw.gateau(c); c.restore(); },
  table(c) {
    c.beginPath(); c.ellipse(128, 104, 104, 34, 0, 0, 7); c.fill();
    R(c, 116, 104, 24, 100, 8); R(c, 70, 196, 116, 22, 11);
    c.globalCompositeOperation = 'destination-out';
    c.save(); c.translate(128, 72); c.scale(0.28, 0.28); c.translate(-128, -128); draw.cafe(c); c.restore();
    c.globalCompositeOperation = 'source-over';
  },
  fournil(c) {
    R(c, 54, 30, 148, 200, 16);
    c.globalCompositeOperation = 'destination-out';
    R(c, 74, 52, 108, 70, 10); R(c, 74, 136, 108, 74, 10);
    c.globalCompositeOperation = 'source-over';
    c.beginPath(); c.arc(166, 140, 10, 0, 7); c.fill();
  },
  terrace(c) {
    c.beginPath(); c.moveTo(20, 120); c.quadraticCurveTo(128, -10, 236, 120); c.closePath(); c.fill();
    R(c, 120, 110, 16, 120, 8); R(c, 70, 220, 116, 18, 9);
  },
  petrin(c) {
    c.beginPath(); c.moveTo(30, 120); c.lineTo(226, 120); c.lineTo(200, 230); c.lineTo(56, 230); c.closePath(); c.fill();
    R(c, 168, 26, 30, 96, 10); R(c, 96, 26, 102, 26, 10);
    c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(118, 52); c.lineTo(118, 96); c.arc(132, 96, 14, Math.PI, 0.3, true); c.stroke();
  },
  coffee(c) { draw.cafe(c); },
  mixer(c) {
    R(c, 40, 206, 176, 26, 10); R(c, 172, 60, 34, 150, 12); R(c, 60, 44, 150, 50, 22);
    c.beginPath(); c.moveTo(56, 136); c.lineTo(170, 136); c.quadraticCurveTo(164, 204, 113, 204); c.quadraticCurveTo(62, 204, 56, 136); c.closePath(); c.fill();
  },
  waiter(c) {
    c.save(); c.translate(-20, 10); c.scale(0.92, 0.92); draw.person(c); c.restore();
    R(c, 150, 92, 96, 14, 7); c.beginPath(); c.arc(198, 80, 18, Math.PI, 0); c.fill();
  },
  cleaner(c) {
    c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(186, 24); c.lineTo(110, 150); c.stroke();
    c.beginPath(); c.moveTo(70, 140); c.lineTo(150, 186); c.lineTo(110, 236); c.lineTo(30, 196); c.closePath(); c.fill();
  },
  trash(c) {
    R(c, 104, 22, 48, 26, 9);
    R(c, 44, 44, 168, 30, 12);
    c.beginPath(); c.moveTo(60, 86); c.lineTo(196, 86); c.lineTo(180, 236); c.lineTo(76, 236); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 13; c.lineCap = 'round';
    for (const x of [-34, 0, 34]) { c.beginPath(); c.moveTo(128 + x, 112); c.lineTo(128 + x * 0.88, 210); c.stroke(); }
    c.globalCompositeOperation = 'source-over';
  },
  turbo(c) {
    c.beginPath(); c.moveTo(150, 18); c.lineTo(58, 146); c.lineTo(122, 146); c.lineTo(100, 238); c.lineTo(198, 104); c.lineTo(134, 104); c.closePath(); c.fill();
  },
};


export function iconTexture(kind, color) {
  const key = kind + color;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = color; c.strokeStyle = color;
  (draw[kind] || draw.baguette)(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;

  t.wrapT = THREE.RepeatWrapping; t.repeat.y = -1; t.offset.y = 1;
  cache.set(key, t);
  return t;
}


export function floorIcon(parent, kind, size, y = 0.05, color = '#FFFFFF', opacity = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: iconTexture(kind, color), transparent: true, opacity, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = 2;
  parent.add(m);
  return m;
}
