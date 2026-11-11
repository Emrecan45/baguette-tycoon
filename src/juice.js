import * as THREE from 'three';
import { sounds } from './assets.js';


const tweens = [];
export const inFlight = new Set();
let worldRoot = null;
export function setWorldRoot(r) { worldRoot = r; }

export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1, u = t - 1; return 1 + c3 * u * u * u + c1 * u * u; };
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    if (tweens[i](dt)) tweens.splice(i, 1);
  }
}
export function addTween(fn) { tweens.push(fn); }
export function delay(s, fn) { let t = 0; addTween((dt) => { t += dt; if (t >= s) { fn(); return true; } return false; }); }

const _v = new THREE.Vector3();

export function toRoot(obj, local, out = new THREE.Vector3()) {
  out.copy(local);
  obj.localToWorld(out);
  return worldRoot.worldToLocal(out);
}

export function rootYaw(obj) {
  let y = 0;
  for (let o = obj; o && o !== worldRoot; o = o.parent) y += o.rotation.y;
  return y;
}
function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}


export function fly(item, parent, localTarget, localYaw, duration, height, done) {
  inFlight.add(item);
  const start = toRoot(item.parent || worldRoot, item.position.clone());
  const startYaw = item.parent ? rootYaw(item.parent) + item.rotation.y : item.rotation.y;
  worldRoot.add(item);
  item.position.copy(start);
  let t = 0;
  addTween((dt) => {
    if (!parent.parent) { inFlight.delete(item); item.removeFromParent(); return true; }
    t = Math.min(1, t + dt / duration);
    const e = easeOutCubic(t);
    const end = toRoot(parent, localTarget(), _v);
    item.position.lerpVectors(start, end, e);
    item.position.y += Math.sin(t * Math.PI) * height;
    item.rotation.set(0, lerpAngle(startYaw, rootYaw(parent) + localYaw, e), 0);
    item.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.15);
    if (t >= 1) {
      parent.add(item);
      item.position.copy(localTarget());
      item.rotation.set(0, localYaw, 0);
      item.scale.setScalar(1);
      inFlight.delete(item);
      if (done) done();
      return true;
    }
    return false;
  });
}


export function flyAndVanish(item, target, duration, height, done) {
  inFlight.add(item);
  const start = toRoot(item.parent || worldRoot, item.position.clone());
  worldRoot.add(item);
  item.position.copy(start);
  let t = 0;
  addTween((dt) => {
    t = Math.min(1, t + dt / duration);
    const e = easeOutCubic(t);
    item.position.lerpVectors(start, target(), e);
    item.position.y += Math.sin(t * Math.PI) * height;
    item.rotation.y += dt * 12;
    item.scale.setScalar(1 - 0.6 * t * t);
    if (t >= 1) { inFlight.delete(item); item.removeFromParent(); if (done) done(); return true; }
    return false;
  });
}


export function flyAndSink(item, target, duration, height) {
  inFlight.add(item);
  worldRoot.add(item);
  const start = item.position.clone();
  const spin = (Math.random() - 0.5) * 10;
  let t = 0, sink = 0;
  addTween((dt) => {
    if (t < 1) {
      t = Math.min(1, t + dt / duration);
      const e = easeOutCubic(t);
      item.position.lerpVectors(start, target, e);
      item.position.y += Math.sin(t * Math.PI) * height;
      item.rotation.y += spin * dt;
      item.rotation.x = Math.sin(t * Math.PI) * 0.6;
      return false;
    }
    sink += dt / 0.18;
    item.rotation.x = 0;
    item.position.y = target.y - sink * 0.12;
    item.scale.set(1 - sink * 0.5, Math.max(0.0001, 1 - sink), 1 - sink * 0.5);
    if (sink >= 1) { inFlight.delete(item); item.removeFromParent(); return true; }
    return false;
  });
}

export function pop(obj, final = 1, duration = 0.35, wait = 0) {
  obj.scale.setScalar(0.0001);
  let t = -wait;
  addTween((dt) => {
    t += dt;
    if (t < 0) return false;
    const k = Math.min(1, t / duration);
    obj.scale.setScalar(Math.max(0.0001, final * easeOutBack(k)));
    return k >= 1;
  });
}

export function shrink(obj, duration, onEnd) {
  const s0 = obj.scale.x;
  let t = 0;
  addTween((dt) => {
    t = Math.min(1, t + dt / duration);
    const k = t < 0.25 ? 1 + 0.15 * (t / 0.25) : 1.15 * (1 - (t - 0.25) / 0.75);
    obj.scale.setScalar(Math.max(0.0001, s0 * k));
    if (t >= 1) { if (onEnd) onEnd(); return true; }
    return false;
  });
}

const punching = new Map();

export function punch(obj, amount = 0.2, duration = 0.3) {
  let base = punching.get(obj);
  if (!base) { base = { s: obj.scale.clone(), n: 0 }; punching.set(obj, base); }
  base.n++;
  let t = 0;
  addTween((dt) => {
    t = Math.min(1, t + dt / duration);
    const k = Math.sin(t * Math.PI * 2.5) * (1 - t) * amount;
    obj.scale.set(base.s.x * (1 + k), base.s.y * (1 - k), base.s.z * (1 + k));
    if (t >= 1) {
      if (--base.n <= 0) { punching.delete(obj); obj.scale.copy(base.s); }
      return true;
    }
    return false;
  });
}


export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const master = audioCtx.createGain();
master.connect(audioCtx.destination);
const sfxBus = audioCtx.createGain();
sfxBus.gain.value = 0.8;
sfxBus.connect(master);
const musicBus = audioCtx.createGain();
musicBus.gain.value = 0.32;
musicBus.connect(master);
const last = {};
const audioState = { userOn: true, platformMuted: false, adMuted: false };

function applyMute() {

  const on = !audioState.platformMuted && !audioState.adMuted;
  master.gain.setTargetAtTime(on ? 1 : 0, audioCtx.currentTime, 0.05);
  sfxBus.gain.setTargetAtTime(audioState.userOn ? 0.8 : 0, audioCtx.currentTime, 0.05);
}
export const audio = {
  get on() { return audioState.userOn; },
  setUser(on) { audioState.userOn = on; applyMute(); },
  setPlatformMuted(m) { audioState.platformMuted = m; applyMute(); },
  setAdMuted(m) { audioState.adMuted = m; applyMute(); },
  get musicOn() { return audioState.musicOn !== false; },
  setMusic(on) { audioState.musicOn = on; musicBus.gain.setTargetAtTime(on ? 0.32 : 0, audioCtx.currentTime, 0.05); },
};


export function initAudio() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!musicStarted && sounds.music3) { musicStarted = true; playTrack('music3', 0.4); }
}



const TRACKS = ['music1', 'music2', 'music3', 'music4'];
const FADE = 3;
let musicStarted = false, current = null, switchTimer = 0;
function loopRegion(buf) {

  const d = buf.getChannelData(0), thr = 0.002;
  let a = 0, b = d.length - 1;
  while (a < d.length && Math.abs(d[a]) < thr) a++;
  while (b > a && Math.abs(d[b]) < thr) b--;
  return [a / buf.sampleRate, b / buf.sampleRate];
}
function playTrack(name, fadeIn) {
  const buf = sounds[name];
  const [a, b] = loopRegion(buf);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.loopStart = a;
  src.loopEnd = b;
  const g = audioCtx.createGain();
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(1, now + fadeIn);
  src.connect(g).connect(musicBus);
  src.start(now, a);
  current = { name, src, g };
  clearTimeout(switchTimer);
  switchTimer = setTimeout(nextTrack, ((b - a) * 2 - FADE) * 1000);
}
function nextTrack() {
  const ready = TRACKS.filter((n) => sounds[n] && (!current || n !== current.name));
  if (!ready.length) { switchTimer = setTimeout(nextTrack, 10000); return; }
  const name = ready[(Math.random() * ready.length) | 0];
  if (current) {
    const old = current, now = audioCtx.currentTime;
    old.g.gain.cancelScheduledValues(now);
    old.g.gain.setValueAtTime(old.g.gain.value, now);
    old.g.gain.linearRampToValueAtTime(0.0001, now + FADE);
    old.src.stop(now + FADE + 0.1);
  }
  playTrack(name, FADE);
}

function play(name, { rate = 1, vol = 1, gap = 0 } = {}) {
  const buf = sounds[name];
  if (!buf || audioCtx.state !== 'running') return;
  const now = performance.now();
  if (gap && now - (last[name] || 0) < gap) return;
  last[name] = now;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = audioCtx.createGain();
  g.gain.value = vol;
  src.connect(g).connect(sfxBus);
  src.start();
}

const jitter = (a) => 1 + (Math.random() * 2 - 1) * a;


const any = (base, n) => base + (1 + ((Math.random() * n) | 0));

let billStreak = 0, billLast = 0;


export const sfx = {
  pop(step = 0) { play(any('pickup', 2), { rate: (0.98 + Math.min(step, 10) * 0.012) * jitter(0.04), vol: 0.2, gap: 70 }); },
  drop() { play(any('drop', 3), { rate: jitter(0.06), vol: 0.25, gap: 60 }); },
  coin() {
    const now = performance.now();
    billStreak = now - billLast < 300 ? billStreak + 1 : 0;
    billLast = now;
    play(any('bill', 4), { rate: (0.97 + Math.min(billStreak, 12) * 0.012) * jitter(0.03), vol: 0.22, gap: 70 });
  },
  spend(progress = 0) { play(any('place', 3), { rate: (0.96 + Math.min(1, progress) * 0.12) * jitter(0.03), vol: 0.25, gap: 70 }); },
  sale() { play('sale', { rate: jitter(0.02), vol: 0.35, gap: 300 }); },
  unlock() { play('unlock', { vol: 0.55 }); },
  upgrade() { play('upgrade', { vol: 0.55 }); },
  levelup() { play('levelup', { vol: 0.6 }); },
  mission() { play('mission', { vol: 0.55, gap: 400 }); },
  oven() { play('make', { rate: jitter(0.08), vol: 0.3, gap: 350 }); },
  serve() { this.drop(); },
  clean() {},
  door() { play('door', { vol: 0.5 }); },
  click() { play('click', { vol: 0.45, gap: 60 }); },
};


export const input = {
  pointerDown: false, x: 0, y: 0,
  keys: new Set(),
};

export function initInput(el) {
  const down = (e) => { input.pointerDown = true; input.x = e.clientX; input.y = e.clientY; initAudio(); };
  const move = (e) => { input.x = e.clientX; input.y = e.clientY; };
  const up = () => { input.pointerDown = false; };
  el.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('blur', () => { input.pointerDown = false; input.keys.clear(); });

  const NOSCROLL = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown', 'Home', 'End']);
  window.addEventListener('keydown', (e) => { if (NOSCROLL.has(e.code)) e.preventDefault(); input.keys.add(e.code); initAudio(); });
  window.addEventListener('wheel', (e) => { if (!(e.target.closest && e.target.closest('.modal .body'))) e.preventDefault(); }, { passive: false });

  window.addEventListener('touchend', initAudio, { passive: true });
  window.addEventListener('click', initAudio);
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
}


export function keyDir() {
  const k = input.keys;
  let x = 0, y = 0;
  if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
  if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
  const l = Math.hypot(x, y);
  return l > 1 ? { x: x / l, y: y / l } : { x, y };
}
