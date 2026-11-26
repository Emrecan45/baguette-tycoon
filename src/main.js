import { createMoneyBag } from './models/money-bag.js';
import { SPACE, at } from './layout.js';
import { offlineReward } from './economy.js';

import '@fontsource/lilita-one/400.css';
import './style.css';
import * as THREE from 'three';
import { newBill, G, part, mat } from './art.js';
import { World, TOWER } from './world.js';
import { t, initLang, nextLang, getLang, onLangChange } from './i18n.js';
import { Character } from './character.js';
import { Oven, Counter, UnlockPad, TrashBin } from './stations.js';
import { Kit } from './decor.js';
import { OUTFITS } from './outfits.js';
import { outfitPreviews } from './preview.js';
import { HUD, format, ICONS } from './hud.js';
import {
  setWorldRoot, updateTweens, fly, flyAndVanish, flyAndSink, pop, shrink, punch, delay, sfx, input, initInput, keyDir, toRoot, audioCtx, initAudio,
} from './juice.js';
import { loadAssets, prop, loadExtraMusic, nature } from './assets.js';
import { CG } from '@host-service';
import { audio } from './juice.js';
import { LitMaterial } from './lit.js';
import { PRODUCTS, SELL_KINDS, Machine, machineGhost, CafeTable, newProduct, warmupModels } from './products.js';
import { cafeTable } from './decor.js';


const PRICE = Object.fromEntries(Object.entries(PRODUCTS).map(([k, v]) => [k, v.price || 0]));
const TRANSFER_INTERVAL = 0.075;
const SAVE_KEY = 'baguette-tycoon-v3';

const UPGRADES = [
  { id: 'oven', icon: 'bolt', max: 10, base: 60, growth: 1.6 },
  { id: 'price', icon: 'cash', max: 12, base: 90, growth: 1.6 },
  { id: 'carry', icon: 'strength', max: 8, base: 50, growth: 1.7 },
  { id: 'speed', icon: 'up', max: 8, base: 40, growth: 1.6 },
];
const CROWD_SIZE = 10;


const loadingEl = document.getElementById('loading');
await CG.init();
CG.loadingStart();

const canvas = document.getElementById('game');


const SAVED_Q = (() => { try { return +localStorage.getItem('baguette-tycoon-quality') || 0; } catch (e) { return 0; } })();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: SAVED_Q < 2, powerPreference: 'high-performance', preserveDrawingBuffer: location.search.includes('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#BFE3F2');
scene.fog = new THREE.Fog('#CFE6F0', 90, 420);
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.5, 600);



scene.add(new THREE.HemisphereLight('#EEF6FF', '#E0C29A', 1.65));
const fill = new THREE.DirectionalLight('#CFE2FF', 0.55);
fill.position.set(9, 8, -10);
scene.add(fill);
const sun = new THREE.DirectionalLight('#FFE9C9', 2.05);
sun.position.set(-7, 14, 9);
sun.target.position.set(0, 0, -1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 100 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 3;
sun.shadow.intensity = 0.62;
scene.add(sun, sun.target);


const root = new THREE.Group();
root.scale.z = -1;
scene.add(root);
setWorldRoot(root);


await loadAssets(audioCtx, (k) => { if (loadingEl) loadingEl.style.setProperty('--p', k.toFixed(3)); });




const RESTART_KEY = 'baguette-tycoon-restart';
const earlySave = (() => {
  let data = null;
  try { data = JSON.parse(CG.getItem(SAVE_KEY) || 'null'); } catch (e) { data = null; }
  try {
    const next = JSON.parse(sessionStorage.getItem(RESTART_KEY) || 'null');
    if (next && (!data || (data.prestige | 0) < (next.prestige | 0))) { data = next; CG.setItem(SAVE_KEY, JSON.stringify(next)); }
    else if (next) sessionStorage.removeItem(RESTART_KEY);
  } catch (e) {  }
  return data;
})();
const earlyParams = new URLSearchParams(location.search);
const PRESTIGE0 = earlyParams.has('debug') ? (+earlyParams.get('bakery') || 0) : ((earlySave && earlySave.prestige) | 0);

let shadowsAt = 0;
function still(o) {
  o.traverse((m) => { if (m.isMesh && m.castShadow) m.userData.still = true; });
  shadowsAt = performance.now() + 600;
}

World.ext = 0;
World.build(root);
const hud = new HUD(document.body, camera, root);

const ovens = [];
const machines = [];
const tables = [];
const counters = [];
const carriers = [];
const staff = [];
ovens.push(new Oven(root, root, at(-4.2), at(6.0)));
ovens[0].onBake = () => sfx.oven();
counters.push(new Counter(root, at(-2.2), at(-1.0), at(-2.2) + 2.1, at(-1.0) - 0.05, -1));

addMachine('petrin', -5.45, 1.7, -90, true);

const trashes = [new TrashBin(root, at(-4.85), at(-0.5), at(-5.55), at(-0.5))];
still(root);

const SHIRTS = ['#E53935', '#43A047', '#8E24AA', '#FB8C00', '#1E88E5', '#00ACC1', '#F06292', '#FDD835', '#6D4C41', '#5C6BC0'];
const PANTS = ['#2F3B55', '#3E2723', '#263238', '#37474F', '#1A237E', '#4E342E', '#455A64'];
const HATS = [null, null, 'cap', 'cap', 'hair', 'hair'];
const HAT_COLORS = { cap: ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#212121', '#FFFFFF'], hair: ['#4E342E', '#212121', '#F9A825', '#BF360C', '#6D4C41'] };
const pick = (a) => a[(Math.random() * a.length) | 0];
const player = new Character(root, [at(-3.2), 0, at(1.7)], { shirt: '#FFFFFF', pants: '#34405E', hat: 'toque' });
player.speed = 5.2;
player.root.rotation.y = Math.PI;
carriers.push(player);
player.carry.capacity = 6;
addCashier(0);

const maxLabel = hud.followText(() => {
  const v = new THREE.Vector3();
  toRoot(player.stackAnchor, v.set(0, player.carry.count * 0.17 + 0.45, 0), v);
  return v;
}, t('max'), 'max');
maxLabel.classList.add('hidden');


let money = 0;
let unlockIndex = 0;
let pad = null, padLabel = null, padSpend = 0, savedPadPaid = 0;
const helpers = [];
let fastOvens = false, bigBasket = false;
const up = { oven: 0, price: 0, carry: 0, speed: 0 };
let lastSeen = 0;
let tutoStep = 0;
const transferTimers = new Map();
let moneyTimer = 0, saveTimer = 0;
let paused = false;
let hostPaused = false;
let savedLang = null;
let boostTime = 0, lastBoostOffer = 0;


const ovenGhost = (x) => [['oven', at(x), at(6.0)], ['table', at(x) + 0.4, at(6.0) - 1.3]];

const PRICE_SCALE = Math.pow(1.5, PRESTIGE0);
const P = (v) => Math.round((v * PRICE_SCALE) / 5) * 5;
const MACH = (type, x, z, rot = 0) => ({ apply: (i) => addMachine(type, x, z, rot, i), ghost: { type, x: at(x), z: at(z), rot } });
const unlocks = [

  { title: 'oven', price: P(15), x: 0.6, z: 3.65, ghost: ovenGhost(0.6), apply: (i) => addOven(0.6, 6.0, i) },
  { title: 'counter', price: P(100), x: 2.6, z: 0.3, ghost: [['counter', at(2.6), at(-1.0)]], apply: (i) => addCounter(2.6, i) },
  { title: 'helper', price: P(200), x: 4.9, z: 2.6, apply: (i) => addHelper(4.9, 2.6, i, 'mitron') },
  { title: 'oven', price: P(320), x: 4.0, z: 3.65, ghost: ovenGhost(4.0), apply: (i) => addOven(4.0, 6.0, i) },
  { title: 'basket', price: P(450), x: 4.9, z: 2.6, apply: (i) => biggerBasket(i) },

  { title: 'fournil', price: P(650), x: -1.8, z: 5.3, apply: (i) => openArea('fournil', i) },
  { title: 'petrin', price: P(750), x: -4.4, z: 9.9, ...MACH('petrin', -4.4, 12.4) },
  { title: 'croissant', price: P(900), x: -1.2, z: 9.9, ...MACH('croissant', -1.2, 12.4) },
  { title: 'helper', price: P(1200), x: 4.9, z: 2.6, apply: (i) => addHelper(4.9, 2.6, i, 'mitron') },
  { title: 'painchoc', price: P(1500), x: 2.0, z: 9.9, ...MACH('painchoc', 2.0, 12.4) },

  { title: 'terrace', price: P(2000), x: 5.0, z: 1.5, apply: (i) => openArea('terrace', i) },
  { title: 'coffee', price: P(2300), x: 7.4, z: 0.4, ...MACH('coffee', 7.4, 2.7) },
  { title: 'table', price: P(2400), x: 8.25, z: -1.2, ghost: { table: [at(9.4), at(-1.2)] }, apply: (i) => addTable(9.4, -1.2, i) },
  { title: 'table', price: P(2800), x: 8.25, z: -3.8, ghost: { table: [at(9.4), at(-3.8)] }, apply: (i) => addTable(9.4, -3.8, i) },
  { title: 'waiter', price: P(3200), x: 7.6, z: -4.4, apply: (i) => addHelper(7.6, -4.4, i, 'waiter') },
  { title: 'table', price: P(3800), x: 11.65, z: -1.2, ghost: { table: [at(12.8), at(-1.2)] }, apply: (i) => addTable(12.8, -1.2, i) },

  { title: 'mixer', price: P(4400), x: 5.2, z: 9.9, ...MACH('mixer', 5.2, 12.4) },
  { title: 'cake', price: P(5000), x: 8.4, z: 9.9, ...MACH('cake', 8.4, 12.4) },
  { title: 'table', price: P(5600), x: 11.65, z: -3.8, ghost: { table: [at(12.8), at(-3.8)] }, apply: (i) => addTable(12.8, -3.8, i) },
  { title: 'cleaner', price: P(6200), x: 7.6, z: -4.4, apply: (i) => addHelper(7.6, -4.4, i, 'cleaner') },
  { title: 'helper', price: P(7000), x: 4.9, z: 2.6, apply: (i) => addHelper(4.9, 2.6, i, 'mitron') },
  { title: 'turbo', price: P(8000), x: 4.9, z: 2.6, apply: (i) => fasterOvens(i) },
  { title: 'table', price: P(9000), x: 9.05, z: 1.8, ghost: { table: [at(10.2), at(1.8)] }, apply: (i) => addTable(10.2, 1.8, i) },
];
for (const d of unlocks) { d.x = at(d.x); d.z = at(d.z); }
const hasCroissants = () => machines.some((m) => m.kind === 'croissant');

const sellable = () => SELL_KINDS.filter((k) => (k === 'baguette' ? ovens.length > 0 : machines.some((m) => m.kind === k)));

function addMachine(type, x, z, rot, instant) {
  x = at(x); z = at(z);
  const m = new Machine(root, root, type, x, z, rot);
  m.onMake = () => sfx.oven();
  machines.push(m);
  still(m.root);
  if (!instant) { pop(m.root, 1, 0.5); confetti(x, 2.0, z); if (m.input) firstHint(m); }
}
function addTable(x, z, instant) {
  x = at(x); z = at(z);
  const tb = new CafeTable(root, x, z, ['#E2463B', '#2E6FB7', '#2E8B57'][tables.length % 3]);
  tables.push(tb);
  still(tb.root);
  if (!instant) { pop(tb.root, 1, 0.5); confetti(x, 1.6, z); if (tables.length === 1) hint = { type: 'table' }; }
}
function openArea(name, instant) {
  World.openArea(name, instant);
  if (name === 'fournil') trashes.push(new TrashBin(root, at(-4.65), at(9.3), at(-5.45), at(9.3)));
  if (name === 'terrace') trashes.push(new TrashBin(root, at(7.0), at(-2.4), at(7.0), at(-3.1)));
  still(trashes[trashes.length - 1].root);
  shadowsAt += 300;
  if (!instant) { sfx.door(); }
  if (!instant) { confetti(World.DOORS[name].cx, 2.4, World.DOORS[name].cz); }
}

function addOven(x, z, instant, kind = 'baguette') {
  x = at(x); z = at(z);
  const o = new Oven(root, root, x, z, kind);
  o.onBake = () => sfx.oven();
  ovens.push(o);
  still(o.root);
  if (!instant) { pop(o.root, 1, 0.5); confetti(x, 2.2, z); }
}
function addCounter(x, instant) {
  x = at(x);
  const c = new Counter(root, x, at(-1.0), x + 2.25, at(-1.0) - 0.05, 1);
  counters.push(c);
  still(c.root);
  addCashier(counters.length - 1, true);
  if (!instant) { pop(c.root, 1, 0.5); pop(c.cashier.root, 1, 0.5); confetti(x, 1.6, -1); }
}
const ROLE_LOOK = {
  mitron: (n) => ({ shirt: ['#F28C38', '#4DB6AC', '#9575CD'][n % 3], pants: '#3B3B4F', hat: 'cap', hatColor: '#FFFFFF', scale: 0.94 }),
  waiter: () => ({ shirt: '#FFFFFF', pants: '#1E1E24', hat: 'hair', hatColor: '#3E2723', scale: 0.95 }),
  cleaner: () => ({ shirt: '#2E7DD1', pants: '#2E7DD1', hat: 'cap', hatColor: '#FFD54F', scale: 0.93 }),
};
function addHelper(x, z, instant, role = 'mitron') {
  x = at(x); z = at(z);
  const ch = new Character(root, [x, 0, z], ROLE_LOOK[role](helpers.filter((h) => h.role === role).length), true);
  const rec = { ch, role, phase: 'fetch', want: null, idle: 0, stuck: 0 };
  ch.helper = rec;
  helpers.push(rec);
  carriers.push(ch);
  applyStats();
  if (!instant) { pop(ch.root, 1, 0.5); confetti(x, 1.6, z); }
}
function addCashier(ci) {
  const c = counters[ci];
  if (!c) return;
  const ch = new Character(root, [c.register.cx, 0, c.register.cz + 0.1], { shirt: '#E91E63', pants: '#3B3B4F', hat: 'hair', hatColor: pick(HAT_COLORS.hair), scale: 0.95 }, true);
  ch.collide = false;
  ch.root.rotation.y = Math.PI;
  c.cashier = ch;
  staff.push(ch);
}
function biggerBasket(instant) {
  bigBasket = true;
  applyStats();
  if (!instant) confetti(player.pos.x, 1.6, player.pos.z);
}
function fasterOvens(instant) {
  fastOvens = true;
  if (!instant) for (const o of ovens) confetti(o.root.position.x, 2.6, o.root.position.z);
}


const upPrice = (u) => Math.round(u.base * Math.pow(u.growth, up[u.id]));
const priceMult = () => (1 + 0.2 * up.price) * (1 + 0.5 * prestige);
const ovenSpeed = () => (1 / Math.pow(0.88, up.oven)) * (fastOvens ? 1.6 : 1) * (boostTime > 0 ? 2 : 1);
function applyStats() {
  const sp = 1 + 0.07 * up.speed;
  player.speed = 5.2 * sp;
  player.carry.capacity = (bigBasket ? 9 : 6) + up.carry;
  for (const h of helpers) { h.ch.speed = 3.6 * sp; h.ch.carry.capacity = (bigBasket ? 6 : 4) + up.carry; }
}
function upgradeList() {
  return UPGRADES.map((u) => {
    const lv = up[u.id];
    const effect = u.id === 'oven' ? `+${Math.round((1 / Math.pow(0.88, lv + 1) - 1) * 100)}%`
      : u.id === 'price' ? `+${(lv + 1) * 20}%` : t('eff_' + u.id);
    return { id: u.id, icon: u.icon, name: t('upg_' + u.id), level: lv, max: u.max, effect, price: upPrice(u), canAfford: money >= upPrice(u) };
  });
}
function buyUpgrade(id, viaAd) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || up[id] >= u.max) return;
  const grant = () => {
    up[id]++;
    applyStats();
    sfx.upgrade();
    confetti(player.pos.x, 2, player.pos.z);
    stats.upgrades++;
    gainXP(5);
    if (hud.modalOpen && openPanel === 'upgrades') openUpgrades();
    save();
  };
  if (viaAd) {
    paused = true;
    CG.rewarded({
      onStart: () => { audio.setAdMuted(true); CG.gameplayStop(); },
      reward: grant,
      fail: () => hud.toast(t('ad_unavailable')),
      done: () => { audio.setAdMuted(false); paused = false; CG.gameplayStart(); },
    });
    return;
  }
  const price = upPrice(u);
  if (money < price) return;
  money -= price;
  grant();
}



let xp = 0, level = 1, prestige = 0;
const stats = { baguettes: 0, croissants: 0, painchocs: 0, gateaux: 0, served: 0, guests: 0, cleaned: 0, earned: 0, upgrades: 0 };
let missions = [];
const SKINS = OUTFITS;
let skins = ['classic'], skin = 'classic';
let openPanel = null, pendingLevelUps = 0;
const levelNeed = () => 20 + level * 15;
const bakeryName = () => t('bakery_name') + (prestige > 0 ? ` ${prestige + 1}` : '');

function gainXP(n) {
  xp += n;
  while (xp >= levelNeed()) { xp -= levelNeed(); level++; pendingLevelUps++; }
}

function checkLevelUp() {
  if (!pendingLevelUps || paused || hud.modalOpen) return;
  openPanel = null;
  pendingLevelUps--;
  const reward = 15 + level * 12;
  sfx.levelup();
  confetti(player.pos.x, 2.4, player.pos.z);
  const done = () => { save(); };
  const buttons = [{ icon: 'cash', label: t('collect'), onClick: () => { money += reward; done(); } }];
  if (CG.adsAvailable) buttons.unshift({ ad: true, label: 'x2', onClick: () => watchAd(() => { money += reward; }, () => { money += reward; save(); }) });
  hud.offer({ icon: 'star', title: t('level_up'), desc: t('level_up_desc', { n: level }), amount: reward, buttons });
}
function pauseGame() { paused = true; CG.gameplayStop(); }
function resumeGame() { paused = false; openPanel = null; CG.gameplayStart(); }

function closePanel() { openPanel = null; }


const MISSION_TYPES = [
  { id: 'sell_b', stat: 'baguettes', base: 15 },
  { id: 'sell_c', stat: 'croissants', base: 8, need: () => hasCroissants() },
  { id: 'sell_p', stat: 'painchocs', base: 6, need: () => machines.some((m) => m.kind === 'painchoc') },
  { id: 'sell_g', stat: 'gateaux', base: 4, need: () => machines.some((m) => m.kind === 'gateau') },
  { id: 'guests', stat: 'guests', base: 4, need: () => tables.length > 0 && machines.some((m) => m.kind === 'cafe') },
  { id: 'clean', stat: 'cleaned', base: 4, need: () => tables.length > 0 && machines.some((m) => m.kind === 'cafe') },
  { id: 'serve', stat: 'served', base: 6 },
  { id: 'earn', stat: 'earned', base: 120 },
  { id: 'upgrade', stat: 'upgrades', base: 2 },
];
function newMission(exclude) {
  const pool = MISSION_TYPES.filter((m) => (!m.need || m.need()) && !exclude.includes(m.id));
  const m = pool[(Math.random() * pool.length) | 0] || MISSION_TYPES[0];
  const k = 1 + level * 0.35;
  const target = Math.max(m.id === 'upgrade' ? 2 : 1, Math.round(m.base * k * (m.id === 'upgrade' ? 0.5 : 1)));
  return { id: m.id, start: stats[m.stat] || 0, target, reward: Math.round((30 + level * 18) * (m.id === 'earn' ? 1.2 : 1)) };
}
function fillMissions() {
  while (missions.length < 3) missions.push(newMission(missions.map((m) => m.id)));
}
const missionProgress = (m) => { const ty = MISSION_TYPES.find((x) => x.id === m.id); return ty ? Math.min(m.target, (stats[ty.stat] || 0) - m.start) : 0; };
const missionDone = (m) => missionProgress(m) >= m.target;

function claimMission(i, viaAd) {
  const m = missions[i];
  if (!m || !missionDone(m)) return;
  const give = () => { money += m.reward; stats.claims = (stats.claims || 0) + 1; sfx.upgrade(); confetti(player.pos.x, 2, player.pos.z); };
  const next = () => { missions.splice(i, 1, newMission(missions.map((x) => x.id))); gainXP(8); save(); openMissions(); };
  if (viaAd) watchAdInPanel(() => { give(); money += m.reward; }, next);
  else { give(); next(); }
}


function watchAdInPanel(reward, after) {
  watchAd(reward, after);
}


const iconBox = (svg) => `<span class="ico icon">${svg}</span>`;
const priceBtn = (act, price, can) => `<button class="pbtn ${can ? 'green' : 'off'}" data-act="${act}"><span class="icon">${ICONS.cash}</span><span>${format(price)}</span></button>`;
const adBtn = (act, label) => `<button class="pbtn blue sm" data-act="${act}"><span class="icon">${ICONS.video}</span><span>${label}</span></button>`;

function openUpgrades() {
  openPanel = 'upgrades';
  const items = upgradeList().map((u) => {
    const maxed = u.level >= u.max;
    const dots = Array.from({ length: u.max }, (_, i) => `<i class="${i < u.level ? 'on' : ''}"></i>`).join('');
    const acts = maxed ? `<button class="pbtn off">${t('max')}</button>`
      : priceBtn('buy:' + u.id, u.price, u.canAfford) + (CG.adsAvailable ? adBtn('ad:' + u.id, t('boost_free')) : '');
    const actionCount = maxed ? 1 : (CG.adsAvailable ? 2 : 1);
    return `<div class="item">${iconBox(ICONS[u.icon])}<div class="info"><div class="name">${u.name}</div><div class="dots">${dots}</div><div class="sub">${u.effect}</div></div><div class="acts count-${actionCount}">${acts}</div></div>`;
  }).join('');
  hud.panel({
    title: t('upgrades'), wide: true, body: `<div class="list">${items}</div>`,
    onClose: closePanel,
    onAct: (act) => { const [a, id] = act.split(':'); buyUpgrade(id, a === 'ad'); },
  });
}

function openMissions() {
  openPanel = 'missions';
  fillMissions();
  const items = missions.map((m, i) => {
    const p = missionProgress(m), done = p >= m.target;
    const claim = done ? `data-act="claim:${i}"` : 'disabled';
    const claimColor = done ? 'green' : 'grey';
    const hasAd = CG.adsAvailable;
    const acts = `<button class="pbtn ${claimColor}" ${claim}><span class="icon">${ICONS.cash}</span><span>${format(m.reward)}</span></button>`
      + (hasAd ? `<button class="pbtn ${done ? 'blue' : 'grey'} x2" ${done ? `data-act="claim2:${i}"` : 'disabled'}><span class="icon">${ICONS.video}</span><span>x2</span></button>` : '');
    const iconKey = { sell_b: 'baguette', sell_c: 'croissant', sell_p: 'painchoc', sell_g: 'gateau', guests: 'cafe', clean: 'clean', serve: 'heart', earn: 'cash', upgrade: 'up' }[m.id];
    return `<div class="item mission">${iconBox(ICONS[iconKey] || ICONS.star)}<div class="info"><div class="name">${t('m_' + m.id, { n: format(m.target) })}</div><div class="bar"><i style="width:${Math.round((p / m.target) * 100)}%"></i></div><div class="sub">${format(p)} / ${format(m.target)}</div></div><div class="acts count-${hasAd ? 2 : 1}">${acts}</div></div>`;
  }).join('');
  hud.panel({
    title: t('missions'), wide: true, body: `<div class="list">${items}</div>`,
    onClose: closePanel,
    onAct: (act) => { const [a, i] = act.split(':'); claimMission(+i, a === 'claim2'); },
  });
}

function setSkin(id) {
  skin = id;
  player.setLook(SKINS.find((x) => x.id === id) || SKINS[0]);
}
function openShop() {
  openPanel = 'shop';
  const pics = outfitPreviews(SKINS);
  const items = SKINS.map((k) => {
    const owned = skins.includes(k.id), sel = skin === k.id;
    const acts = sel ? `<button class="pbtn off">${t('selected')}</button>`
      : owned ? `<button class="pbtn blue" data-act="use:${k.id}"><span>${t('use')}</span></button>`
        : priceBtn('buy:' + k.id, k.price, money >= k.price);
    return `<div class="tile${sel ? ' sel' : ''}"><img src="${pics.get(k.id)}" alt=""><div class="name">${t('skin_' + k.id)}</div><div class="acts">${acts}</div></div>`;
  }).join('');
  hud.panel({
    title: t('shop'), wide: true, cls: 'shop', body: `<div class="tiles outfits">${items}</div>`,
    onClose: closePanel,
    onAct: (act) => {
      const [a, id] = act.split(':');
      const k = SKINS.find((x) => x.id === id);
      const own = () => { if (!skins.includes(id)) skins.push(id); setSkin(id); sfx.unlock(); save(); openShop(); };
      if (a === 'use') { setSkin(id); save(); openShop(); }
      else if (a === 'buy' && money >= k.price) { money -= k.price; own(); }
    },
  });
}

function openSettings() {
  openPanel = 'settings';
  const toggle = (act, icon, label, on) => `<div class="item"><span class="ico icon blue">${ICONS[icon]}</span><div class="info"><div class="name">${label}</div></div><div class="acts"><button class="pbtn ${on ? 'green' : 'grey'}" data-act="${act}"><span>${on ? t('on') : t('off')}</span></button></div></div>`;
  const allDone = unlockIndex >= unlocks.length;
  const nb = allDone
    ? `<div class="item"><span class="ico icon">${ICONS.star}</span><div class="info"><div class="name">${t('new_bakery')}</div><div class="sub">${t('new_bakery_desc', { n: (prestige + 1) * 50 })}</div></div><div class="acts"><button class="pbtn blue" data-act="prestige"><span>${t('go')}</span></button></div></div>`
    : `<div class="item"><span class="ico icon">${ICONS.lock}</span><div class="info"><div class="name">${t('new_bakery')}</div><div class="sub">${t('new_bakery_lock')}</div></div></div>`;
  hud.panel({
    title: t('settings'),
    body: `<div class="list">${toggle('sound', 'sound', t('sound'), audio.on)}${toggle('music', 'music', t('music'), audio.musicOn)}<div class="item"><span class="ico icon blue">${ICONS.globe}</span><div class="info"><div class="name">${t('language')}</div></div><div class="acts"><button class="pbtn blue" data-act="lang"><span>${getLang().toUpperCase()}</span></button></div></div>${nb}</div>`,
    onClose: closePanel,
    onAct: (act) => {
      if (act === 'sound') { audio.setUser(!audio.on); save(); openSettings(); }
      else if (act === 'music') { audio.setMusic(!audio.musicOn); save(); openSettings(); }
      else if (act === 'lang') nextLang();
      else if (act === 'prestige') newBakery();
    },
  });
}


function offerNewBakery() {
  if (unlockIndex < unlocks.length || hud.modalOpen) return;
  pauseGame();
  hud.offer({
    icon: 'star', title: t('complete_title'), desc: t('new_bakery_desc2', { n: (prestige + 1) * 50 }),
    buttons: [
      { label: t('later'), alt: true, onClick: resumeGame },
      { label: t('open_bakery'), icon: 'star', onClick: newBakery },
    ],
  });
}


function newBakery() {
  if (params.has('debug') || restarting) return;
  const next = JSON.stringify({ money: 0, unlockIndex: 0, padPaid: 0, sound: audio.on, lang: savedLang, up: { oven: 0, price: 0, carry: 0, speed: 0 }, last: 0, xp, level, stats, missions: [], skins, skin, prestige: prestige + 1, music: audio.musicOn });
  restarting = true;
  try { sessionStorage.setItem(RESTART_KEY, next); } catch (e) {  }
  CG.setItem(SAVE_KEY, next);
  location.reload();
}

hud.onButton = (id) => {
  if ((paused || hud.modalOpen) && !openPanel) return;
  sfx.click();
  if (id === 'upgrades') openUpgrades();
  else if (id === 'missions') openMissions();
  else if (id === 'shop') openShop();
  else if (id === 'settings') openSettings();
  else if (id === 'restart') offerNewBakery();
};

let missionsDone = 0, panelRefresh = 0;
function updateDots() {
  hud.setLevel(level, xp, levelNeed(), bakeryName());

  const nDone = missions.filter(missionDone).length;
  if (nDone > missionsDone) { sfx.mission(); hud.toast('✓ ' + t('missions')); }
  missionsDone = nDone;
  hud.buttonHint('missions', nDone > 0 && (stats.claims || 0) < 3 && openPanel !== 'missions' && tutoStep >= 99 ? t('h_claim') : null);
  const canUp = unlockIndex >= 1 && upgradeList().some((u) => u.level < u.max && u.canAfford);
  hud.buttonHint('upgrades', canUp && stats.upgrades < 2 && openPanel !== 'upgrades' && tutoStep >= 99 && !(nDone > 0 && (stats.claims || 0) < 3) ? t('h_upgrade') : null);
  hud.setDot('upgrades', unlockIndex >= 1 && upgradeList().some((u) => u.level < u.max && u.canAfford));
  hud.setDot('missions', missions.some(missionDone));
  hud.setDot('shop', SKINS.some((k) => !skins.includes(k.id) && money >= k.price));
  hud.showButton('restart', unlockIndex >= unlocks.length);
  hud.setDot('restart', true);
}

const ghostMat = new LitMaterial({ color: '#FFE89A', emissive: '#FFB300', emissiveIntensity: 0.45, roughness: 0.4, transparent: true, opacity: 0.6, depthWrite: true });
function spawnPad() {
  if (unlockIndex >= unlocks.length) { pad = null; return; }
  const d = unlocks[unlockIndex];
  pad = new UnlockPad(root, d.x, d.z, d.title, d.price);

  if (d.ghost && d.ghost.type) {
    pad.ghost = machineGhost(d.ghost.type, d.ghost.x, d.ghost.z, d.ghost.rot, ghostMat);
    root.add(pad.ghost);
  } else if (d.ghost && d.ghost.table) {
    const k = new Kit();
    cafeTable(k, d.ghost.table[0], d.ghost.table[1], 90, false);
    const gm = k.mesh(false); gm.material = ghostMat; gm.receiveShadow = false;
    pad.ghost = gm;
    root.add(gm);
  } else if (d.ghost) {
    const gh = new THREE.Group();
    const parts = d.ghost;
    for (const [name, gx, gz] of parts) {
      const o = prop(name, 1);
      o.position.set(gx, 0, gz);
      o.rotation.y = Math.PI;
      gh.add(o);
    }
    gh.traverse((m) => { if (m.isMesh) { m.material = ghostMat; m.castShadow = false; m.receiveShadow = false; } });
    root.add(gh);
    pad.ghost = gh;
  }
  pad.paid = Math.min(savedPadPaid, d.price - 1);
  savedPadPaid = 0;
  pop(pad.root, 1, 0.4);
  const p = pad;
  padLabel = hud.padLabel(() => new THREE.Vector3(p.root.position.x, 0.1, p.root.position.z + 0.72), t(d.title));
  padLabel.set(pad.remaining);
}

function completeUnlock() {
  const d = unlocks[unlockIndex];
  sfx.unlock();
  const r = pad.root;
  shrink(r, 0.35, () => r.removeFromParent());
  if (pad.ghost) pad.ghost.removeFromParent();
  hud.unfollow(padLabel.el);
  d.apply(false);
  unlockIndex++;
  pad = null;
  save();
  if (unlockIndex >= unlocks.length) CG.happytime();
  gainXP(10);


  const complete = unlockIndex >= unlocks.length;

  const after = () => { delay(0.5, spawnPad); if (complete) setTimeout(offerNewBakery, 900); };
  if (unlockIndex >= 2 && CG.adsAvailable && time - lastBoostOffer > 300 && boostTime <= 0) {
    after();
    setTimeout(() => { if (!hud.modalOpen) offerBoost(); }, 900);
  } else if (unlockIndex >= 2) {
    CG.midgame({
      onStart: () => { paused = true; audio.setAdMuted(true); CG.gameplayStop(); },
      done: () => { audio.setAdMuted(false); if (paused) { paused = false; CG.gameplayStart(); } after(); },
    });
  } else after();
}


function watchAd(reward, after) {
  paused = true;
  CG.gameplayStop();
  CG.rewarded({
    onStart: () => audio.setAdMuted(true),
    reward,
    fail: () => hud.toast(t('ad_unavailable')),
    done: () => { audio.setAdMuted(false); paused = false; CG.gameplayStart(); if (after) after(); },
  });
}

function offerBoost(after) {
  lastBoostOffer = time;
  hud.offer({
    icon: 'bolt', title: t('boost_title'), desc: t('boost_desc'),
    buttons: [
      { ad: true, label: t('boost_free'), onClick: () => watchAd(startBoost, after) },
      { alt: true, label: t('boost_no'), onClick: () => { if (after) after(); } },
    ],
  });
}
hud.onBoost = () => { if (!paused && boostTime <= 0) offerBoost(); };


function incomeRate() {
  let r = 0;
  for (const o of ovens) r += PRICE[o.kind] / o.interval;

  for (const m of machines) if (PRODUCTS[m.kind].sell) r += (PRICE[m.kind] / m.interval) * (m.input ? 0.7 : 1);
  if (machines.some((m) => m.kind === 'cafe')) r += tables.length * (PRICE.cafe + 8) * 1.5 / 25;

  return r * priceMult() * (1 / Math.pow(0.88, up.oven)) * 0.55;
}


const BAG_SPOTS = [[-2.4, 2.4], [2.2, 2.4], [-4.7, -3.4], [0.9, -3.1]].map(p => p.map(at));
let bag = null, bagTimer = 150;

const bagGeo = createMoneyBag();
const bagRingMat = new LitMaterial({ color: '#A1E5FF', emissive: '#56BAED', emissiveIntensity: 0.9, transparent: true, opacity: 0.7, depthWrite: false });
function updateBag(dt) {
  if (!CG.adsAvailable || unlockIndex < 2) return;
  if (!bag) {
    bagTimer -= dt;
    if (bagTimer > 0 || paused) return;
    const [x, z] = BAG_SPOTS[(Math.random() * BAG_SPOTS.length) | 0];
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const m = bagGeo.clone();
    g.add(m);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 40), bagRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    g.add(ring);
    g.userData.ring = ring;
    root.add(g);
    pop(g, 1, 0.5);
    const amount = Math.max(60, Math.round(incomeRate() * 75 / 10) * 10);
    const label = hud.followText(() => new THREE.Vector3(x, 1.5, z), `<span class="icon ti">${ICONS.video}</span>${format(amount)}`, 'bagtag');
    bag = { g, m, x, z, amount, life: 30, label };
    return;
  }
  bag.life -= dt;

  bag.m.position.y = 0.12 + Math.sin(time * 2.6) * 0.06;
  bag.m.rotation.y = Math.PI + Math.sin(time * 1.3) * 0.12;
  bag.m.rotation.z = Math.sin(time * 2.6 + 1) * 0.06;
  const rs = 1 + Math.sin(time * 4) * 0.08;
  bag.g.userData.ring.scale.set(rs, rs, rs);
  bagRingMat.opacity = 0.45 + Math.sin(time * 4) * 0.2;
  const near = Math.hypot(player.pos.x - bag.x, player.pos.z - bag.z) < 0.7;
  if (bag.life <= 0 || near) {
    const b = bag;
    bag = null;
    bagTimer = 160 + Math.random() * 80;
    hud.unfollow(b.label);
    shrink(b.g, 0.3, () => b.g.removeFromParent());
    if (near) {
      hud.offer({
        icon: 'bag', title: t('tip_title'), desc: t('tip_desc'), amount: b.amount,
        buttons: [
          { ad: true, label: t('boost_free'), onClick: () => watchAd(() => { money += b.amount; sfx.sale(); confetti(player.pos.x, 2, player.pos.z); }) },
          { alt: true, label: t('boost_no'), onClick: () => {} },
        ],
      });
    }
  }
}


function offlineEarnings() {
  if (!lastSeen || unlockIndex < 1 || params.has('debug')) return;
  const away = (Date.now() - lastSeen) / 1000;
  if (away < 120) return;
  const earned = offlineReward(away, incomeRate(), unlocks[unlockIndex]?.price ?? P(2500));
  if (earned < 10) return;
  const done = () => { save(); };
  const buttons = [{ icon: 'cash', label: t('collect'), onClick: () => { money += earned; sfx.sale(); done(); } }];
  if (CG.adsAvailable) buttons.unshift({ ad: true, label: 'x2', onClick: () => watchAd(() => { money += earned; }, () => { money += earned; sfx.sale(); save(); }) });
  hud.offer({ icon: 'cash', title: t('welcome_title'), desc: t('welcome_desc'), amount: earned, buttons });
}


function startBoost() {
  boostTime = 120;
  sfx.unlock();
  for (const o of ovens) confetti(o.root.position.x, 2.6, o.root.position.z);
}


const confettiColors = ['#FF5A4E', '#FFC93C', '#5BC95B', '#4F8FE0', '#F06292', '#FFFFFF'];
const confettiGeos = confettiColors.map((c) => {
  const m = part(null, G.box(0.14, 0.14, 0.05, 0.02), c);
  return m.geometry;
});
function confetti(x, y, z) {
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(confettiGeos[i % confettiGeos.length], mat);
    m.position.set(x, y, z);
    root.add(m);
    const v = new THREE.Vector3((Math.random() - 0.5) * 6, 5 + Math.random() * 4, (Math.random() - 0.5) * 6);
    const spin = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    addConfettiTween(m, v, spin);
  }
}
const confettiList = [];
function addConfettiTween(m, v, spin) { confettiList.push({ m, v, spin, t: 0 }); }
function updateConfetti(dt) {
  for (let i = confettiList.length - 1; i >= 0; i--) {
    const c = confettiList[i];
    c.t += dt;
    c.v.y -= 16 * dt;
    c.v.multiplyScalar(1 - 1.5 * dt);
    c.m.position.addScaledVector(c.v, dt);
    c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
    if (c.m.position.y < 0.03) { c.m.position.y = 0.03; c.v.set(0, 0, 0); c.spin.set(0, 0, 0); }
    if (c.t > 1.6) c.m.scale.setScalar(Math.max(0.0001, 1 - (c.t - 1.6) / 0.4));
    if (c.t > 2) { c.m.removeFromParent(); confettiList.splice(i, 1); }
  }
}


let restarting = false;
function save() {
  if (params.has('debug') || restarting) return;
  CG.setItem(SAVE_KEY, JSON.stringify({ money, unlockIndex, padPaid: pad ? pad.paid : 0, sound: audio.on, lang: savedLang, up, last: Date.now(), xp, level, stats, missions, skins, skin, prestige, music: audio.musicOn }));
}
const params = new URLSearchParams(location.search);
function load() {
  if (params.has('debug')) {
    money = 400;
    prestige = PRESTIGE0;
    const u = Math.min(unlocks.length, +params.get('debug') || 0);
    for (let i = 0; i < u; i++) unlocks[i].apply(true);
    unlockIndex = u;
    tutoStep = 99;
    applyStats();
    return;
  }
  const data = earlySave;
  if (!data) return;
  if (data.sound === false) audio.setUser(false);
  if (data.lang) savedLang = data.lang;
  money = data.money | 0;
  if (data.up) for (const k in up) up[k] = Math.max(0, data.up[k] | 0);
  xp = +data.xp || 0; level = Math.max(1, data.level | 0);
  if (data.stats) Object.assign(stats, data.stats);
  if (Array.isArray(data.missions)) missions = data.missions;
  if (Array.isArray(data.skins)) skins = data.skins;
  if (data.skin) skin = data.skin;
  prestige = data.prestige | 0;
  if (data.music === false) audio.setMusic(false);
  lastSeen = +data.last || 0;
  const u = Math.max(0, Math.min(unlocks.length, data.unlockIndex | 0));
  for (let i = 0; i < u; i++) unlocks[i].apply(true);
  unlockIndex = u;
  savedPadPaid = data.padPaid | 0;
  if (u > 0) tutoStep = 99;
  applyStats();
  if (World.AREAS.terrace.open && !trashes.some((t) => t.root.position.x > at(6.0))) {
    trashes.push(new TrashBin(root, at(7.0), at(-2.4), at(7.0), at(-3.1)));
    still(trashes[trashes.length - 1].root);
  }
}
addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);


initInput(canvas);
let dragging = false, ox = 0, oy = 0, hasMoved = false;
function joyRadius() { return Math.min(innerWidth, innerHeight) * 0.07 + 20; }

function handleInput() {
  let mx = 0, mz = 0;
  const k = keyDir();
  mx = k.x; mz = k.y;
  if (input.pointerDown) {
    if (!dragging) { dragging = true; ox = input.x; oy = input.y; }
    let dx = input.x - ox, dy = input.y - oy;
    const r = joyRadius();
    const len = Math.hypot(dx, dy);
    if (len > r) { ox = input.x - (dx / len) * r; oy = input.y - (dy / len) * r; dx = input.x - ox; dy = input.y - oy; }
    if (len > r * 0.12) { mx = dx / r; mz = -dy / r; }
    hud.joystick(true, ox, oy, ox + dx, oy + dy);
  } else if (dragging) {
    dragging = false;
    hud.joystick(false);
  }
  player.desired.set(mx, 0, mz);
  if (window.bt && window.bt.autopilot) window.bt.autopilot(player);
  if (!hasMoved && mx * mx + mz * mz > 0.05) { hasMoved = true; hud.hideHint(); }
}


function transferReady(ch, dt) {
  let t = (transferTimers.get(ch) || 0) - dt;
  if (t > 0) { transferTimers.set(ch, t); return false; }
  transferTimers.set(ch, TRANSFER_INTERVAL);
  return true;
}

const sources = () => [...ovens, ...machines];

const feeders = () => sources().filter((o) => o.input);

function room(kind) {
  let n = 0;
  if (PRODUCTS[kind].sell) for (const c of counters) { const st = c.stockFor(kind); n += st.capacity - st.count; }
  for (const o of feeders()) if (o.input === kind) n += o.inputNeed;
  if (PRODUCTS[kind].table && machines.some((m) => m.kind === 'cafe')) n += tables.length * 2;
  return n;
}

const useful = (kind, carry) => carry.items.reduce((a, it) => a + (it.userData.kind === kind ? 1 : 0), 0) < room(kind);
function handleCarrier(ch, dt) {
  const p = ch.pos, carry = ch.carry, h = ch.helper;

  if (h && h.role === 'waiter' && h.want && !carry.full) for (const c of counters) {
    const st = c.stockFor(h.want);
    if (!st || st.empty || !c.drop.contains(p)) continue;
    if (!transferReady(ch, dt)) return;
    const t = st.take();
    if (t) carry.addFlying(t.item, 1, 0.22, 0.8, fly, punch);
    return;
  }

  for (const o of sources()) {
    if (!o.pickup.contains(p) || carry.full || o.tray.empty) continue;
    if (h && h.want !== o.kind) continue;
    if (!useful(o.kind, carry)) continue;
    if (!transferReady(ch, dt)) return;
    const t = o.tray.take();
    if (t) { carry.addFlying(t.item, 1, 0.22, 0.8, fly, punch); if (ch === player) sfx.pop(carry.count); }
    return;
  }
  if (carry.empty) return;
  const role = h ? h.role : null;

  for (const m of feeders()) {
    if (!m.input || !m.drop.contains(p) || m.inStack.full) continue;
    if (role === 'waiter' && !machines.includes(m)) continue;
    const fits = (it) => it.userData.kind === m.input;
    if (!carry.items.some(fits)) continue;
    if (!transferReady(ch, dt)) return;
    const t = carry.takeWhere(fits);
    if (t) { m.inStack.addFlying(t.item, 1, 0.24, 0.8, fly, punch); if (ch === player) sfx.drop(); }
    return;
  }

  if (role !== 'waiter') for (const c of counters) {
    if (!c.drop.contains(p)) continue;
    const fits = (it) => { const st = c.stockFor(it.userData.kind); return st && !st.full; };
    if (!carry.items.some(fits)) continue;
    if (!transferReady(ch, dt)) return;
    const t = carry.takeWhere(fits);
    if (t) { c.stockFor(t.item.userData.kind).addFlying(t.item, 1, 0.24, 0.9, fly, punch); if (ch === player) sfx.drop(); }
    return;
  }

  if (role !== 'mitron') for (const tb of tables) {
    if (tb.state !== 'wait' || !tb.zone.contains(p)) continue;
    const fits = (it) => tb.missing(it.userData.kind) > 0;
    if (!carry.items.some(fits)) continue;
    if (!transferReady(ch, dt)) return;
    const t = carry.takeWhere(fits);
    if (t) {
      tb.order.find((o) => o.kind === t.item.userData.kind).got++;
      tb.served.addFlying(t.item, 1, 0.24, 0.8, fly, punch);
      if (ch === player) sfx.drop();
      if (tb.guest && tb.guest.bubble) tb.guest.bubble.set(tb.order);
      if (tb.complete) startEating(tb);
    }
    return;
  }
}

class Customer {
  constructor(counter, want, kind = 'baguette') {
    this.counter = counter;
    this.want = want;
    this.kind = kind;
    this.got = 0;
    this.leaving = false;
    this.arrived = false;
    this.exitPath = [];
    this.bubble = null;

    this.jx = 0;
    this.jz = 0;
    const hat = pick(HATS);
    const look = { shirt: pick(SHIRTS), pants: pick(PANTS), hat, hatColor: hat ? pick(HAT_COLORS[hat]) : null, scale: 0.9 + Math.random() * 0.12 };

    const lineX = counter.slotPos(0).x;
    this.ch = new Character(root, [lineX + (Math.random() - 0.5) * 0.3, 0, -13.5 - Math.random() * 2], look, true);
    this.ch.collide = false;
    this.ch.speed = 2.6 + Math.random() * 0.8;
    counter.queue.push(this);
  }
  get readyToBuy() { return !this.leaving && this.arrived && this.counter.queue[0] === this; }
  moveTo(t, tol) {
    const dx = t.x - this.ch.pos.x, dz = t.z - this.ch.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= tol) { this.ch.desired.set(0, 0, 0); return true; }
    const k = Math.min(1, dist / 0.6 + 0.2) / dist;
    this.ch.desired.set(dx * k, 0, dz * k);
    return false;
  }
  update(dt) {
    if (this.leaving) {
      if (!this.exitPath.length) { this.ch.dispose(); return false; }
      if (this.moveTo(this.exitPath[0], 0.25)) this.exitPath.shift();
      return true;
    }
    const i = Math.max(0, this.counter.queue.indexOf(this));
    const slot = this.counter.slotPos(i);
    if (i > 0) { slot.x += this.jx; slot.z += this.jz; }
    this.arrived = this.moveTo(slot, 0.06);
    if (this.arrived) {
      let dy = 0 - this.ch.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.ch.root.rotation.y += dy * (1 - Math.exp(-10 * dt));
    }

    if (!this.bubble && i === 0 && this.arrived) {
      const r = this.ch.root, h = this.ch.height + 0.45;
      this.bubble = hud.bubble(() => new THREE.Vector3(r.position.x, h, r.position.z), this.kind);
    }
    if (this.bubble) this.bubble.set(Math.max(0, this.want - this.got));
    return true;
  }
  leave() {
    this.leaving = true;
    const q = this.counter.queue;
    q.splice(q.indexOf(this), 1);
    const sideX = this.counter.root.position.x + this.counter.exitSide * 2.2;
    this.exitPath.push(new THREE.Vector3(sideX, 0, this.ch.pos.z - 0.3), new THREE.Vector3(sideX, 0, -13.5));
  }
}
let customers = [];

function handleCounter(c, dt) {

  c.spawnTimer -= dt;
  if (c.spawnTimer <= 0 && c.queue.length < CROWD_SIZE) {
    const maxWant = Math.max(2, Math.min(5, 2 + (unlockIndex >> 1)));

    const kinds = sellable();

    const W0 = { baguette: 1, croissant: 0.75, painchoc: 0.65, gateau: 0.5 };
    const W = {};
    for (const k of kinds) W[k] = W0[k] * (c.stockFor(k).count > 0 ? 1 : 0.3);
    let r = Math.random() * kinds.reduce((a, k) => a + W[k], 0), kind = kinds[0];
    for (const k of kinds) { r -= W[k]; if (r <= 0) { kind = k; break; } }
    const most = kind === 'baguette' ? maxWant : kind === 'gateau' ? 2 : 4;
    customers.push(new Customer(c, 1 + ((Math.random() * most) | 0), kind));
    c.spawnTimer = c.queue.length < 6 ? 0.25 + Math.random() * 0.25 : 0.8 + Math.random() * 0.8;
  }
  const front = c.queue[0];
  if (!front || !front.readyToBuy) return;

  if (front.got === 0 && c.stockFor(front.kind).empty) {
    front.waitT = (front.waitT || 0) + dt;
    if (front.waitT > 6) {
      const alt = sellable().filter((k) => k !== front.kind && c.stockFor(k).count > 0);
      if (alt.length) {
        front.kind = pick(alt);
        front.want = Math.min(front.want, c.stockFor(front.kind).count);
        if (front.bubble) { hud.unfollow(front.bubble.el); front.bubble = null; }
      }
      front.waitT = 0;
    }
  }
  const stock = c.stockFor(front.kind);
  if (front.got < front.want) {
    c.serveTimer -= dt;
    if (c.serveTimer > 0 || stock.empty) return;
    const t = stock.take();
    if (t) { front.got++; front.ch.carry.addFlying(t.item, 1, 0.22, 0.7, fly, punch); c.serveTimer = 0.12; }
    return;
  }
  if (front.ch.carry.count < front.want) return;
  const unit = Math.round(PRICE[front.kind] * priceMult());
  const total = front.want * unit;
  const from = new THREE.Vector3(front.ch.pos.x, 1.2, front.ch.pos.z);
  for (let i = 0; i < front.want; i++) delay(i * 0.08, () => c.pile.add(root, from.clone(), unit));
  hud.floatText(new THREE.Vector3(from.x, 2.4, from.z), '+' + total);
  sfx.sale();
  if (c.cashier) punch(c.cashier.visual, 0.12, 0.25);
  const b = front.bubble;
  if (b) { b.happy(); setTimeout(() => hud.unfollow(b.el), 700); }
  front.bubble = null;
  front.leave();
  stats.served++;
  const sk = { baguette: 'baguettes', croissant: 'croissants', painchoc: 'painchocs', gateau: 'gateaux' }[front.kind];
  stats[sk] = (stats[sk] || 0) + front.want;
  gainXP(front.want);
}


const CLEAN_T = 1.1;
const PASTRIES = ['croissant', 'painchoc', 'gateau'];

const TQ_X = at(7.0), TQ_Z = at(-5.3), TQ_GAP = 0.75, TQ_SIZE = 4;
const terraceQueue = [];
let terraceSpawn = 0;
class TableGuest {
  constructor() {
    this.tb = null;
    const hat = pick(HATS);
    const look = { shirt: pick(SHIRTS), pants: pick(PANTS), hat, hatColor: hat ? pick(HAT_COLORS[hat]) : null, scale: 0.9 + Math.random() * 0.12 };
    this.ch = new Character(root, [TQ_X + (Math.random() - 0.5) * 0.3, 0, at(-7.5) - Math.random()], look, true);
    this.ch.collide = false;
    this.ch.speed = 3.2 + Math.random() * 0.6;
    this.path = [];
    this.state = 'queue';
    this.bubble = null;
    terraceQueue.push(this);
  }

  seat(tb) {
    this.tb = tb;
    tb.guest = this;
    terraceQueue.splice(terraceQueue.indexOf(this), 1);
    this.aisle = Math.min(12.2, tb.seat.x + (tb.seat.x > 11 ? 0 : 0.72));
    this.path = [new THREE.Vector3(this.aisle, 0, tb.seat.z), tb.seat.clone()];
    this.state = 'walk';
  }
  get ready() { return this.state === 'queue' && terraceQueue[0] === this && this.arrived; }
  update(dt) {
    const ch = this.ch;
    if (this.state === 'queue') {
      const i = terraceQueue.indexOf(this);
      const tx = TQ_X, tz = TQ_Z - i * TQ_GAP;
      const dx = tx - ch.pos.x, dz = tz - ch.pos.z, d = Math.hypot(dx, dz);
      this.arrived = d < 0.12;
      if (this.arrived) {
        ch.desired.set(0, 0, 0);

        let dy = Math.PI / 2 - ch.root.rotation.y;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        ch.root.rotation.y += dy * (1 - Math.exp(-8 * dt));
      } else { const k = Math.min(1, d / 0.5 + 0.25) / d; ch.desired.set(dx * k, 0, dz * k); }
      return true;
    }
    if (this.state === 'walk' || this.state === 'leave') {
      if (!this.path.length) {
        if (this.state === 'leave') { ch.dispose(); return false; }
        this.sitDown();
      } else {
        const tg = this.path[0];
        const dx = tg.x - ch.pos.x, dz = tg.z - ch.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.12) { this.path.shift(); ch.desired.set(0, 0, 0); } else { const k = Math.min(1, d / 0.5 + 0.25) / d; ch.desired.set(dx * k, 0, dz * k); }
      }
      return true;
    }

    ch.desired.set(0, 0, 0);
    ch.vel.set(0, 0, 0);
    ch.pos.lerp(this.tb.seat, 1 - Math.exp(-12 * dt));
    let dy = -Math.PI / 2 - ch.root.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    ch.root.rotation.y += dy * (1 - Math.exp(-10 * dt));
    return true;
  }
  sitDown() {
    const tb = this.tb;
    this.state = 'sit';
    this.ch.sitting = true;

    const pastries = PASTRIES.filter((k) => machines.some((m) => m.kind === k));
    tb.order = [{ kind: 'cafe', n: 1, got: 0 }];
    if (pastries.length) tb.order.push({ kind: pick(pastries), n: Math.random() < 0.3 ? 2 : 1, got: 0 });
    tb.state = 'wait';
    const r = this.ch.root, h = this.ch.height + 0.1;
    this.bubble = hud.order(() => new THREE.Vector3(r.position.x, h, r.position.z), tb.order);
  }
  leave() {
    this.ch.sitting = false;
    this.state = 'leave';
    this.path = [new THREE.Vector3(this.aisle, 0, this.tb.seat.z), new THREE.Vector3(this.aisle, 0, at(-7.5))];
    this.tb.guest = null;
  }
}
const guests = [];

function startEating(tb) {
  tb.state = 'eat';
  tb.eatT = 3.2 + Math.random();
  const g = tb.guest;
  if (g && g.bubble) { const b = g.bubble; b.happy(); setTimeout(() => hud.unfollow(b.el), 700); g.bubble = null; }
}
function payTable(tb) {
  const g = tb.guest;
  const total = Math.round(tb.order.reduce((a, o) => a + PRICE[o.kind] * o.n, 0) * priceMult() * 2);
  const n = tb.order.reduce((a, o) => a + o.n, 0);

  while (!tb.served.empty) { const t = tb.served.take(); if (!t) break; shrink(t.item, 0.25, () => t.item.removeFromParent()); }
  const from = g ? new THREE.Vector3(g.ch.pos.x, 1.2, g.ch.pos.z) : new THREE.Vector3(tb.x, 1.2, tb.z);
  for (let i = 0; i < n; i++) {
    const v = i === n - 1 ? total - Math.floor(total / n) * (n - 1) : Math.floor(total / n);
    delay(i * 0.1, () => {
      const bill = newBill();
      bill.position.copy(from);
      root.add(bill);
      tb.money.addFlying(bill, v, 0.4, 1.0, fly, punch);
    });
  }
  hud.floatText(new THREE.Vector3(from.x, 2.3, from.z), '+' + total);
  sfx.sale();
  tb.dirt.visible = true;
  tb.dirt.scale.setScalar(1);
  tb.clean = 0;
  tb.state = 'dirty';
  tb.order = [];
  stats.guests++;
  stats.served++;
  gainXP(n + 1);
  if (g) g.leave();
}

function updateTables(dt) {
  const coffee = machines.some((m) => m.kind === 'cafe');

  terraceSpawn -= dt;
  if (coffee && tables.length && terraceQueue.length < TQ_SIZE && terraceSpawn <= 0) {
    guests.push(new TableGuest());
    terraceSpawn = 0.8 + Math.random() * 1.2;
  }
  for (const tb of tables) {
    const someone = carriers.some((ch) => tb.zone.contains(ch.pos));
    tb.zone.tick(dt, time, someone);
    if (tb.state === 'free') {
      if (!coffee) continue;
      tb.cooldown -= dt;
      if (tb.cooldown <= 0 && terraceQueue[0] && terraceQueue[0].ready) { terraceQueue[0].seat(tb); tb.state = 'coming'; }
    } else if (tb.state === 'eat') {
      tb.eatT -= dt;
      if (tb.eatT <= 0) payTable(tb);
    } else if (tb.state === 'dirty') {

      const cleaner = tb.zone.contains(player.pos) || helpers.some((h) => h.role === 'cleaner' && tb.zone.contains(h.ch.pos));
      if (!cleaner && tb.clean === 0) continue;
      if (tb.clean === 0) sfx.clean();
      tb.clean += dt;
      tb.dirt.scale.setScalar(Math.max(0.01, 1 - tb.clean / CLEAN_T));
      if (tb.clean >= CLEAN_T) {
        tb.state = 'free';
        tb.dirt.visible = false;
        tb.cooldown = 0.15;
        stats.cleaned++;
        confetti(tb.x, 1.2, tb.z);
      }
    }
  }
  for (let i = guests.length - 1; i >= 0; i--) {
    const g = guests[i];
    if (!g.update(dt)) { guests.splice(i, 1); continue; }
    g.ch.update(dt, time);
  }
}


let trashTimer = 0;
function handleTrash(dt) {
  trashTimer -= dt;
  for (const tr of trashes) {
    const on = tr.zone.contains(player.pos);
    const throwing = on && !player.carry.empty;
    tr.tick(dt, time, on, time - (tr.lastThrow ?? -9) < 0.35);
    if (!throwing || trashTimer > 0) continue;
    trashTimer = 0.12;
    tr.lastThrow = time;
    const t = player.carry.take();
    if (!t) continue;
    const end = toRoot(tr.mouth, new THREE.Vector3(), new THREE.Vector3());
    flyAndVanish(t.item, () => end, 0.28, 0.7);
    sfx.drop();
  }
}

function handleMoney(dt) {
  const p = player.pos;
  const piles = counters.map((c) => ({ zone: c.pile.zone, stack: c.pile.stack })).concat(tables.map((tb) => ({ zone: tb.zone, stack: tb.money })));
  for (const c of piles.map((x) => ({ pile: x }))) {
    if (!c.pile.zone.contains(p) || c.pile.stack.empty) continue;
    moneyTimer -= dt;
    if (moneyTimer > 0) return;
    moneyTimer = 0.03;
    const t = c.pile.stack.take();
    if (t) {
      money += t.value;
      stats.earned += t.value;
      sfx.coin();
      flyAndVanish(t.item, () => new THREE.Vector3(player.pos.x, 1.3, player.pos.z), 0.25, 1.0);
    }
    return;
  }
}

function handlePad(dt) {
  if (!pad) return;
  pad.refresh();
  ghostMat.opacity = 0.55 + Math.sin(time * 4) * 0.1;
  const inside = pad.zone.contains(player.pos);
  pad.standTime = inside ? pad.standTime + dt : 0;
  if (!inside || pad.standTime < 0.25 || money <= 0) return;
  let step = Math.max(1, Math.ceil(pad.price * dt / 1.5));
  step = Math.min(step, money, pad.remaining);
  money -= step;
  pad.paid += step;
  padLabel.set(pad.remaining);

  padSpend -= dt;
  if (padSpend <= 0) {
    padSpend = 0.045;
    const bill = newBill();
    bill.position.set(player.pos.x, 0.9, player.pos.z);
    bill.rotation.y = Math.random() * Math.PI;
    root.add(bill);
    const target = new THREE.Vector3(pad.root.position.x + (Math.random() - 0.5) * 0.9, 0.06, pad.root.position.z + (Math.random() - 0.5) * 0.9);
    flyAndSink(bill, target, 0.32, 1.1);
    sfx.spend(pad.paid / pad.price);
    punch(pad.root, 0.03, 0.15);
  }
  if (pad.remaining <= 0) completeUnlock();
}


const needed = (kind) => counters.some((c) => c.queue[0] && c.queue[0].kind === kind && c.stockFor(kind).count < c.queue[0].want - c.queue[0].got);


function demands(role) {
  const list = [];
  if (role === 'mitron') {


    for (const m of feeders()) {
      if (m.inputNeed <= 0) continue;
      const fill = m.inStack.count / m.inStack.capacity;
      const tableWait = needed(m.kind) || tables.some((tb) => tb.state === 'wait' && tb.missing(m.kind) > 0);
      list.push({ kind: m.input, zone: m.drop, amount: m.inputNeed, prio: 1.4 + 2 * (1 - fill) + (m.tray.empty ? 0.4 : 0) + (tableWait ? 0.8 : 0) - (m.tray.full ? 1 : 0) });
    }
    for (const c of counters) for (const k of sellable()) {
      const st = c.stockFor(k), free = st.capacity - st.count;
      if (free > 0) list.push({ kind: k, zone: c.drop, amount: free, prio: (needed(k) ? 4 : 1) + (st.count < 3 ? 1 : 0) });
    }
  }
  return list;
}

function serve(h) {
  const { ch } = h, carry = ch.carry;
  const need = {};
  for (const tb of tables) if (tb.state === 'wait') for (const o of tb.order) if (o.got < o.n) need[o.kind] = (need[o.kind] || 0) + o.n - o.got;
  for (const it of carry.items) if (need[it.userData.kind]) need[it.userData.kind]--;
  const has = (k) => carry.items.reduce((a, it) => a + (it.userData.kind === k ? 1 : 0), 0);
  const far = (z) => Math.hypot(z.cx - ch.pos.x, z.cz - ch.pos.z);
  const serving = carry.items.some((it) => tables.some((tb) => tb.state === 'wait' && tb.missing(it.userData.kind) > 0));
  if (!carry.full) {
    let best = null;
    for (const kind of Object.keys(need)) {
      if (need[kind] <= 0) continue;
      const src = sourceOf(kind, ch.pos);
      if (src && (!best || far(src.pickup) < far(best.zone))) best = { kind, zone: src.pickup };
      for (const c of counters) if (c.stockFor(kind)?.count && (!best || far(c.drop) < far(best.zone))) best = { kind, zone: c.drop };
    }
    if (best && (carry.empty || far(best.zone) < at(3))) { h.want = best.kind; steer(ch, best.zone.center); return; }
    if (!best && !serving) {
      for (const m of machines) {
        if (!m.input || !need[m.kind] || m.inStack.count * m.yield + m.charge >= need[m.kind]) continue;
        if (has(m.input) >= Math.min(m.inputNeed, Math.ceil(need[m.kind] / m.yield))) continue;
        const src = sourceOf(m.input, ch.pos);
        if (src) { h.want = m.input; steer(ch, src.pickup.center); return; }
      }
    }
  }
  h.want = null;
  let goal = null;
  for (const tb of tables) {
    if (tb.state !== 'wait' || !carry.items.some((it) => tb.missing(it.userData.kind) > 0)) continue;
    if (!goal || far(tb.zone) < far(goal)) goal = tb.zone;
  }
  if (!goal) goal = machines.find((m) => m.input && has(m.input) && m.inputNeed > 0)?.drop;
  steer(ch, goal ? goal.center : HOME.waiter);
}
const sourceOf = (kind, from) => {
  let best = null, bd = Infinity;
  for (const o of sources()) {
    if (o.kind !== kind || o.tray.empty) continue;
    const d = Math.hypot(o.pickup.cx - from.x, o.pickup.cz - from.z) - o.tray.count * 0.3;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
};
const HOME = { mitron: new THREE.Vector3(1.6, 0, 2.3), waiter: new THREE.Vector3(7.8, 0, -2.6), cleaner: new THREE.Vector3(8.0, 0, -4.6) };
for (const p of Object.values(HOME)) p.multiplyScalar(SPACE);

function steer(ch, goal) {
  const tg = World.nav(ch.pos, goal);
  const dx = tg.x - ch.pos.x, dz = tg.z - ch.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.2 && tg === goal) { ch.desired.set(0, 0, 0); return true; }
  const k = Math.min(1, d / 0.5 + 0.3) / Math.max(d, 0.001);
  ch.desired.set(dx * k, 0, dz * k);
  return false;
}

function updateHelpers(dt) {
  for (const h of helpers) {
    const { ch } = h;

    const want = ch.desired.lengthSq() > 0.05;
    if (!h.last) h.last = ch.pos.clone();
    h.blockT = want && ch.pos.distanceToSquared(h.last) < 0.0004 ? (h.blockT || 0) + dt : 0;
    h.last.copy(ch.pos);
    if (h.blockT > 0.5) { ch.ghostT = 0.9; h.blockT = 0; }
    if (h.role === 'cleaner') {

      let best = null, bd = Infinity;
      for (const tb of tables) if (tb.state === 'dirty') { const d = Math.hypot(tb.zone.cx - ch.pos.x, tb.zone.cz - ch.pos.z); if (d < bd) { bd = d; best = tb; } }
      steer(ch, best ? best.zone.center : HOME.cleaner);
      continue;
    }
    if (h.role === 'waiter') { serve(h); continue; }
    if (h.phase === 'fetch') {
      if (!ch.carry.empty && (ch.carry.full || !h.want)) { h.phase = 'deliver'; continue; }
      if (!h.want) {

        const list = demands(h.role).sort((a, b) => b.prio - a.prio);
        for (const d of list) { const src = sourceOf(d.kind, ch.pos); if (src) { h.want = d.kind; h.src = src; h.amount = d.amount; break; } }
        if (!h.want) { steer(ch, HOME[h.role]); continue; }
      }
      const src = h.src;
      const at = steer(ch, src.pickup.center) || src.pickup.contains(ch.pos);
      if (at && (ch.carry.full || ch.carry.count >= Math.min(h.amount, ch.carry.capacity) || (src.tray.empty && ch.carry.count > 0))) { h.phase = 'deliver'; h.want = null; }
      else if (at && src.tray.empty && ch.carry.empty) { h.idle += dt; if (h.idle > 1.5) { h.want = null; h.idle = 0; } }
    } else {
      if (ch.carry.empty) { h.phase = 'fetch'; h.want = null; continue; }

      const carried = new Set(ch.carry.items.map((it) => it.userData.kind));
      const list = demands(h.role).filter((d) => carried.has(d.kind)).sort((a, b) => b.prio - a.prio);
      if (!list.length) {

        const m = (h.role === 'waiter' ? machines : feeders()).find((f) => f.input && carried.has(f.input) && f.inputNeed > 0);
        if (m) { steer(ch, m.drop.center); continue; }
        h.stuck += dt;
        steer(ch, HOME[h.role]);
        if (h.stuck > 4 && !ch.carry.full) { h.phase = 'fetch'; h.stuck = 0; }
        continue;
      }
      h.stuck = 0;
      steer(ch, list[0].zone.center);
    }
  }
}




let hint = null;
function firstHint(m) { hint = { type: m.input === 'pate' ? 'dough' : 'batter', m, t: 0 }; }
let orphanShown = false;
function updateHint(dt) {


  const orphan = machines.find((m) => !m.input && !PRODUCTS[m.kind].sell && !PRODUCTS[m.kind].table && !feeders().some((f) => f.input === m.kind));
  if (orphan && pad) {
    orphanShown = true;
    hud.tutorial(t('h_next_machine'), () => new THREE.Vector3(pad.root.position.x, 0, pad.root.position.z));
    return;
  }
  if (orphanShown) { orphanShown = false; hud.tutorial(null); }
  if (!hint) return;
  hint.t = (hint.t || 0) + dt;
  const carrying = (k) => player.carry.items.some((it) => it.userData.kind === k);
  if (hint.type === 'dough' || hint.type === 'batter') {
    const m = hint.m;
    if (m.tray.count > 0 || hint.t > 90) { hint = null; hud.tutorial(null); return; }

    const src = sources().filter((x) => x.kind === m.input).sort((a, b) => a.center.distanceTo(m.center) - b.center.distanceTo(m.center))[0];
    const key = hint.type === 'dough' ? 'h_dough_' : 'h_batter_';
    if (carrying(m.input) || !m.inStack.empty) hud.tutorial(t(key + 'feed'), () => m.drop.center);
    else if (src) hud.tutorial(t(key + 'take'), () => src.pickup.center);
    return;
  }
  if (hint.type === 'table') {
    if ((stats.guests >= 1 && stats.cleaned >= 1) || hint.t > 240) { hint = null; hud.tutorial(null); return; }
    const dirty = tables.find((x) => x.state === 'dirty');
    const wait = tables.find((x) => x.state === 'wait');
    if (dirty) { hud.tutorial(t('h_clean'), () => dirty.zone.center); return; }
    if (wait) {
      if (player.carry.items.some((it) => wait.missing(it.userData.kind) > 0)) { hud.tutorial(t('h_serve'), () => wait.zone.center); return; }
      const miss = wait.order.find((o) => o.got < o.n);
      const src = miss && sources().find((o) => o.kind === miss.kind);
      if (src) { hud.tutorial(miss.kind === 'cafe' ? t('h_coffee') : t('h_serve'), () => src.pickup.center); return; }
    }
    hud.tutorial(null);
  }
}
function updateTutorial() {
  if (unlockIndex > 0 || tutoStep >= 99) { if (tutoStep < 99) { tutoStep = 99; hud.tutorial(null); } updateHint(1 / 60); return; }

  const oven = ovens[0], counter = counters[0];
  const petrin = machines.find((m) => m.kind === 'pate');
  const pileValue = counter.pile.stack.values.reduce((a, v) => a + v, 0);
  const need = pad ? pad.remaining : 0;
  const carrying = (k) => player.carry.items.some((it) => it.userData.kind === k);
  if (pad && money >= need) hud.tutorial(t('tuto_unlock'), () => new THREE.Vector3(pad.root.position.x, 0, pad.root.position.z));
  else if (pileValue > 0 && money + pileValue >= need) hud.tutorial(t('tuto_money'), () => counter.pile.pos);
  else if (carrying('baguette')) hud.tutorial(t('tuto_drop'), () => counter.drop.center);
  else if (oven.tray.count > 0) hud.tutorial(t('tuto_pick'), () => oven.pickup.center);
  else if (carrying('pate')) hud.tutorial(t('h_dough_feed'), () => oven.drop.center);
  else if (oven.inStack.count > 0 || oven.charge > 0) hud.tutorial(t('tuto_bake'), null);
  else if (pileValue > 0) hud.tutorial(t('tuto_money'), () => counter.pile.pos);
  else if (petrin) hud.tutorial(t('h_dough_take'), () => petrin.pickup.center);
  else hud.tutorial(t('tuto_wait'), null);
}


const camPos = new THREE.Vector3();
let camInit = false;

const INTRO = params.has('debug') || params.has('nointro') ? 0 : 1.5;
if (!INTRO) World.skyline.visible = false;
let introT = 0;

const introPos = new THREE.Vector3(at(TOWER.x) + 3.2, 3.4, -at(TOWER.z) + 14);
const introPos2 = new THREE.Vector3(at(TOWER.x) + 2.6, 4, -at(TOWER.z) + 13.6);
const introLook = new THREE.Vector3(at(TOWER.x), 2.65, -at(TOWER.z));
const _look = new THREE.Vector3();
const _ip = new THREE.Vector3();
function updateCamera(dt) {
  const aspect = innerWidth / innerHeight;
  const portrait = aspect < 1;
  const dist = portrait ? 27 + 9 * (1 - aspect) : 24;

  const B = World.camBounds();
  const px = player.pos.x, pz = player.pos.z;
  const fx = THREE.MathUtils.clamp(px, B.x0, B.x1);
  const fz = THREE.MathUtils.clamp(pz + (portrait ? 1.2 : 0.8), B.z0, B.z1);
  const pitch = 52 * Math.PI / 180;

  const want = new THREE.Vector3(fx, Math.sin(pitch) * dist, -fz + Math.cos(pitch) * dist);
  if (!camInit) { camPos.copy(want); camInit = true; }
  camPos.lerp(want, 1 - Math.exp(-6 * dt));
  _look.set(camPos.x, 0, camPos.z - Math.cos(pitch) * dist);
  if (introT < INTRO) {
    introT += dt;
    if (introT >= INTRO) World.skyline.visible = false;
    const HOLD = 0.3;
    const k = Math.max(0, Math.min(1, (introT - HOLD) / (INTRO - HOLD)));
    const e = k * k * (3 - 2 * k);
    const drift = Math.min(1, introT / INTRO);
    _ip.lerpVectors(introPos, introPos2, drift);
    camera.position.lerpVectors(_ip, camPos, e);
    camera.lookAt(introLook.x + (_look.x - introLook.x) * e, introLook.y + (_look.y - introLook.y) * e, introLook.z + (_look.z - introLook.z) * e);
    return;
  }
  camera.position.copy(camPos);
  camera.lookAt(_look);
}


load();
setSkin(skin);
fillMissions();
spawnPad();


initLang(savedLang, CG.locale);
function applyLang() {
  hud.relabel();
  hud.setHint(CG.isMobile ? t('hint_touch') : t('hint_desktop'));
  if (pad && padLabel) padLabel.setTitle(t(unlocks[unlockIndex].title));
  const mx = maxLabel.querySelector('.ftext'); if (mx) mx.textContent = t('max');
  if (tutoStep < 99) hud.tutorial(null);
}
onLangChange(() => { savedLang = getLang(); applyLang(); save(); if (openPanel === 'settings') openSettings(); });
applyLang();
audio.setPlatformMuted(CG.muteAudio);
CG.onSettings((st) => audio.setPlatformMuted(!!st.muteAudio || hostPaused));
CG.onPause?.((value) => {
  hostPaused = value;
  audio.setPlatformMuted(CG.muteAudio || hostPaused);
});


const dustTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,248,236,1)'); g.addColorStop(0.55, 'rgba(255,244,226,.55)'); g.addColorStop(1, 'rgba(255,240,220,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const dust = [];
function puff(p, big = 1) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0.6 }));
  m.position.set(p.x + (Math.random() - 0.5) * 0.25, 0.12, p.z + (Math.random() - 0.5) * 0.25);
  m.scale.setScalar(0.25 * big);
  root.add(m);
  dust.push({ m, t: 0, big });
}
function updateDust(dt) {
  for (const ch of carriers) {
    ch.dustT = (ch.dustT || 0) - dt;
    if (ch.vel.length() > 2.4 && ch.dustT <= 0) { puff(ch.pos, ch === player ? 1 : 0.8); ch.dustT = 0.07; }
  }
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i];
    d.t += dt;
    const k = d.t / 0.55;
    d.m.position.y += dt * 0.25;
    d.m.scale.setScalar((0.25 + k * 0.45) * d.big);
    d.m.material.opacity = 0.55 * (1 - k) * (1 - k);
    if (k >= 1) { d.m.removeFromParent(); d.m.material.dispose(); dust.splice(i, 1); }
  }
}




const QKEY = 'baguette-tycoon-quality';
const QUALITY = [
  { dpr: 1.5, shadow: 2048, soft: true },
  { dpr: 1.25, shadow: 2048, soft: true },
  { dpr: 1, shadow: 1024, soft: false },
  { dpr: 0.85, shadow: 1024, soft: false, still: true },
  { dpr: 0.7, shadow: 1024, soft: false, still: true },
];
let qLevel = (() => { try { return Math.max(0, Math.min(QUALITY.length - 1, (+localStorage.getItem(QKEY) || 0) - 1)); } catch (e) { return 0; } })();
if (params.has('q')) qLevel = Math.max(0, Math.min(QUALITY.length - 1, +params.get('q') || 0));
const blobs = (() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(0,0,0,1)');
  r.addColorStop(0.55, 'rgba(0,0,0,0.75)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: '#000000', transparent: true, opacity: 0.32, depthWrite: false }), 96);
  m.frustumCulled = false;
  m.renderOrder = 1;
  m.count = 0;
  m.visible = false;
  root.add(m);
  return m;
})();
const _blob = new THREE.Matrix4();
function updateBlobs() {
  if (!blobs.visible) return;
  let n = 0;
  const put = (ch) => {
    if (n >= 96 || !ch.root.parent) return;
    const s = ch.scale * 1.05 * ch.root.scale.x;
    _blob.makeScale(s, 1, s).setPosition(ch.pos.x, 0.025, ch.pos.z);
    blobs.setMatrixAt(n++, _blob);
  };
  for (const ch of carriers) put(ch);
  for (const ch of staff) put(ch);
  for (const c of customers) put(c.ch);
  for (const g of guests) put(g.ch);
  blobs.count = n;
  blobs.instanceMatrix.needsUpdate = true;
}
function draw() {
  if (!blobs.visible || !renderer.shadowMap.needsUpdate) { renderer.render(scene, camera); return; }
  const off = [];
  root.traverse((o) => { if (o.castShadow && !o.userData.still) { o.castShadow = false; off.push(o); } });
  renderer.render(scene, camera);
  for (const o of off) o.castShadow = true;
}
function applyQuality() {
  const q = QUALITY[qLevel];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.dpr));
  renderer.setSize(innerWidth, innerHeight);
  const type = q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  if (renderer.shadowMap.type !== type) {
    renderer.shadowMap.type = type;
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
  }
  if (sun.shadow.mapSize.x !== q.shadow) {
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  blobs.visible = !!q.still;
  renderer.shadowMap.autoUpdate = !q.still;
  renderer.shadowMap.needsUpdate = true;
}
const fps = { t: 0, n: 0, wait: 2, probe: 0, floor: false };
function watchFps(raw) {
  if (params.has('q')) return;
  if (document.hidden || paused || introT < INTRO) { fps.t = 0; fps.n = 0; return; }
  if (fps.wait > 0) { fps.wait -= Math.min(raw, 0.5); return; }
  if (raw > 2) return;
  fps.t += raw; fps.n++;

  if (fps.t < 2.5 && !(fps.t > 1 && fps.n / fps.t < 25)) return;
  const f = fps.n / fps.t;
  fps.t = 0; fps.n = 0;
  if (fps.probe) {
    if (f < fps.probe * 1.06) { qLevel--; fps.floor = true; applyQuality(); try { localStorage.setItem(QKEY, String(qLevel)); } catch (e) {  } }
    fps.probe = 0;
    return;
  }
  if (f < 48 && qLevel < QUALITY.length - 1 && !fps.floor) {
    qLevel++;
    if (qLevel === QUALITY.length - 1) fps.probe = f;
    applyQuality();
    fps.wait = 1.5;
    try { localStorage.setItem(QKEY, String(qLevel)); } catch (e) {  }
  }
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
applyQuality();
resize();
updateCamera(0);



{
  const warm = [newBill(), ...['pate', 'painchoc', 'cafe', 'appareil', 'gateau', 'croissant'].map(newProduct), warmupModels(), bagGeo.clone()];
  warm.forEach((m) => root.add(m));
  renderer.compile(scene, camera);
  warm.forEach((m) => m.removeFromParent());
}

const clock = new THREE.Clock();
const timeScale = +(params.get('ts') || 1);
const noRender = params.has('norender');
let time = 0;
function frame() {
  const raw = clock.getDelta();
  watchFps(raw);
  if (shadowsAt && performance.now() >= shadowsAt) { shadowsAt = 0; renderer.shadowMap.needsUpdate = true; }

  let dt = Math.min(raw * timeScale, timeScale === 1 ? 0.066 : Math.min(0.35, 0.025 * timeScale));
  if (paused || hostPaused) { hud.tick(time); draw(); requestAnimationFrame(frame); return; }
  time += dt;

  handleInput();
  if (boostTime > 0) boostTime = Math.max(0, boostTime - dt);
  const ovenMult = ovenSpeed();
  for (const o of ovens) o.tick(dt, time, ovenMult);
  for (const m of machines) m.tick(dt, time, ovenMult);
  World.tickDoors(dt);
  hud.setBoost(boostTime);
  hud.setBoostButton(boostTime <= 0 && CG.adsAvailable && unlockIndex >= 2);
  for (const ch of carriers) ch.update(dt, time);
  for (const ch of staff) ch.update(dt, time);
  updateDust(dt);
  updateHelpers(dt);
  updateBag(dt);
  customers = customers.filter((c) => { const alive = c.update(dt); if (alive) c.ch.update(dt, time); return alive; });
  for (const ch of carriers) handleCarrier(ch, dt);
  handleMoney(dt);
  handleTrash(dt);
  handlePad(dt);
  for (const c of counters) handleCounter(c, dt);
  updateTables(dt);

  for (const m of sources()) {
    m.pickup.tick(dt, time, carriers.some((ch) => m.pickup.contains(ch.pos)));
    if (m.drop) m.drop.tick(dt, time, carriers.some((ch) => m.drop.contains(ch.pos)));
  }
  for (const c of counters) {
    c.drop.tick(dt, time, carriers.some((ch) => c.drop.contains(ch.pos)));
    c.pile.zone.tick(dt, time, c.pile.zone.contains(player.pos));
  }
  updateTweens(dt);
  updateConfetti(dt);

  maxLabel.classList.toggle('hidden', !player.carry.full);
  hud.setMoney(money);
  updateDots();

  panelRefresh -= dt;
  if (panelRefresh <= 0 && hud.modalOpen && openPanel) {
    panelRefresh = 0.4;
    ({ upgrades: openUpgrades, missions: openMissions, settings: openSettings }[openPanel] || (() => {}))();
  }
  checkLevelUp();
  updateTutorial();

  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); }

  if (!window.bt || !window.bt.freeCam) updateCamera(dt);
  hud.tick(time);
  updateBlobs();
  if (!noRender) draw();
  requestAnimationFrame(frame);
}

draw();
document.getElementById('loading')?.classList.add('done');
CG.loadingStop();
CG.gameplayStart();
initAudio();
loadExtraMusic(audioCtx);
offlineEarnings();
requestAnimationFrame(frame);


window.bt = {
  unlock(n) { restarting = true; localStorage.setItem(SAVE_KEY, JSON.stringify({ money: 500, unlockIndex: n, padPaid: 0 })); location.reload(); },
  player, input, scene, renderer, THREE, sun, camera, freeCam: false, nature, worldRoot: root, hud,
  state() { return { q: qLevel, dpr: renderer.getPixelRatio(), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, paused, time: time.toFixed(1), customers: customers.length, queues: counters.map((c) => c.queue.length), pos: customers.slice(0, 3).map((c) => [c.ch.pos.x.toFixed(1), c.ch.pos.z.toFixed(1), c.ch.root.visible]) }; },
  money(v) { if (v === undefined) return money; money += v; },
  canTake: (k) => useful(k, player.carry),
  outfits: OUTFITS, setSkin,
  game: () => ({ trashes, ovens, machines, tables, counters, pad, unlockIndex, unlocks: unlocks.length, up, helpers, time, boostTime, paused, stats, sellable: sellable(), guests: guests.length }),
  buyUpgrade, upgradeList, offerBoost, startBoost, needed, demands, sourceOf, sources,
  reset() { restarting = true; CG.removeItem(SAVE_KEY); location.reload(); },
};
