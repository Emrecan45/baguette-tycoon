import { newProduct } from '../../src/products.js';

const FPS = 60;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const SCENARIO = [
  { start: 0, name: 'generated-cover' }, { start: .8, name: 'pickup' },
  { start: 3, name: 'serve' }, { start: 5.2, name: 'cash' },
  { start: 6.4, name: 'build-oven' }, { start: 8.6, name: 'dough-croissants' },
  { start: 11.2, name: 'terrace-coffee' }, { start: 13.8, name: 'cakes-outfit' },
  { start: 15.5, name: 'expanded-bakery' },
];

export async function installRecording(ctx) {
  const { THREE, renderer, camera, root, player, World, OUTFITS, simulate, getGame, setMoney, prepareExpansion, createGuest } = ctx;
  document.body.classList.add('recording');
  const style = document.createElement('style');
  style.textContent = `body.recording,body.recording *{cursor:none!important}body.recording>:not(#game):not(#record-cover):not(style):not(script){display:none!important}#record-cover{position:fixed;inset:0;width:100%;height:100%;z-index:100;pointer-events:none}`;
  document.head.append(style); await document.fonts.ready;
  let frame = 0, portrait = false, cover = null, started = false, startTime = 0, renderCount = 0;
  let chapter = '', cameraPos = null, cameraLook = null, lastShot = '', terraceTable = null, buildTarget = null;
  const events = [], samples = [];
  const vec = a => new THREE.Vector3(...a), pitch = 52 * Math.PI / 180;
  const fill = (stack, kind, count) => {
    while (stack.count < Math.min(stack.capacity, count)) {
      const item = newProduct(kind), index = stack.count;
      stack.anchor.add(item); item.position.copy(stack.slotPos(index)); item.rotation.y = stack.slotYaw(index);
      stack.items.push(item); stack.values.push(1);
    }
  };
  function clear(stack) {
    for (const item of stack.items) { item.visible = false; item.removeFromParent(); }
    stack.items.length = 0; stack.values.length = 0;
  }
  function at(x, z, yaw = Math.PI) {
    player.pos.set(x, 0, z); player.vel.set(0, 0, 0); player.desired.set(0, 0, 0); player.root.rotation.y = yaw;
  }
  function move(x, z) {
    window.bt.autopilot = ch => {
      const goal = vec([x, 0, z]), next = World.nav(ch.pos, goal);
      const dx = next.x - ch.pos.x, dz = next.z - ch.pos.z, distance = Math.hypot(dx, dz);
      ch.desired.set(dx, 0, dz).multiplyScalar(distance > .08 ? Math.min(1, distance * 3) / distance : 0);
    };
  }
  function enter(name) {
    if (chapter === name) return false;
    chapter = name; events.push({ frame, seconds: frame / FPS, name, unlockIndex: getGame().unlockIndex }); return true;
  }
  function beforeFrame() {
    const t = frame / FPS, g = getGame();
    if (t < .8) { enter('generated-cover'); move(-1, 2); }
    else if (t < 3) {
      if (enter('pickup')) { const p = g.ovens[0].pickup; clear(player.carry); fill(g.ovens[0].tray, 'baguette', 12); at(p.cx, p.cz, Math.PI + .8); }
      move(g.ovens[0].pickup.cx, g.ovens[0].pickup.cz);
    } else if (t < 5.2) {
      enter('serve'); move(g.counters[0].drop.cx, g.counters[0].drop.cz + .15);
    } else if (t < 6.4) {
      enter('cash'); move(g.counters[0].pile.zone.cx, g.counters[0].pile.zone.cz);
    } else if (t < 8.6) {
      if (enter('build-oven')) { if (!g.pad) throw new Error('Missing construction pad.'); buildTarget = [g.pad.zone.cx, g.pad.zone.cz]; at(...buildTarget); setMoney(2000); }
      move(...buildTarget);
    } else if (t < 11.2) {
      const m = g.machines.find(m => m.type === 'croissant');
      if (enter('dough-croissants')) {
        if (g.unlockIndex !== 3) throw new Error(`Oven purchase failed: ${g.unlockIndex}`);
        clear(player.carry); clear(m.inStack); fill(player.carry, 'pate', 6);
        at(m.drop.cx, m.drop.cz, 0);
      }
      if (t < 9.6) move(m.drop.cx, m.drop.cz);
      else move(m.pickup.cx, m.pickup.cz);
    } else if (t < 13.8) {
      if (enter('terrace-coffee')) {
        terraceTable = g.tables.find(tb => tb.state === 'wait' && tb.guest) || g.tables.find(tb => tb.guest) || g.tables[0];
        const guest = terraceTable.guest || createGuest(terraceTable);
        guest.path = []; guest.ch.pos.copy(terraceTable.seat); guest.ch.vel.set(0, 0, 0); guest.sitDown();
        clear(terraceTable.served); clear(player.carry);
        for (const order of terraceTable.order) fill(player.carry, order.kind, player.carry.count + order.n);
        at(terraceTable.zone.cx, terraceTable.zone.cz + .1, Math.PI / 2);
      }
      move(terraceTable.zone.cx, terraceTable.zone.cz);
    } else if (t < 15.5) {
      const cake = g.machines.find(m => m.type === 'cake');
      if (enter('cakes-outfit')) { player.setLook(OUTFITS.find(o => o.id === 'king')); clear(player.carry); at(cake.pickup.cx, cake.pickup.cz, Math.PI + .8); }
      move(cake.pickup.cx, cake.pickup.cz);
    } else {
      if (enter('expanded-bakery')) {
        at(g.counters[0].drop.cx, g.counters[0].drop.cz + 2);
        for (const c of g.counters) for (const [kind, stock] of Object.entries(c.stocks)) fill(stock, kind, kind === 'baguette' ? 12 : 6);
      }
      move(g.counters[0].drop.cx, g.counters[0].drop.cz);
    }
  }
  function frameCamera() {
    const t = frame / FPS, g = getGame();
    const oven = g.ovens[0], counter = g.counters[0];
    const croissant = g.machines.find(m => m.type === 'croissant');
    const cake = g.machines.find(m => m.type === 'cake');
    let look, distance, shot;
    if (t < 3) { look = [oven.pickup.cx, .3, -oven.pickup.cz - .65]; distance = portrait ? 14 : 16; shot = 'pickup'; }
    else if (t < 6.4) { look = [(oven.pickup.cx + counter.drop.cx) / 2 + .6, .2, -(oven.pickup.cz + counter.drop.cz) / 2]; distance = portrait ? 25 : 23; shot = 'service'; }
    else if (t < 8.6) { look = [buildTarget[0], .3, -buildTarget[1] - 1.3]; distance = portrait ? 20 : 20; shot = 'build'; }
    else if (t < 11.2) { look = [croissant.pickup.cx + 1.1, .3, -croissant.pickup.cz - .8]; distance = portrait ? 22 : 21; shot = 'fournil'; }
    else if (t < 13.8) { look = [terraceTable.x - .3, .3, -terraceTable.z]; distance = portrait ? 16 : 18; shot = 'terrace'; }
    else if (t < 15.5) { look = [cake.pickup.cx - 1.6, .4, -cake.pickup.cz - .8]; distance = portrait ? 19 : 20; shot = 'cakes'; }
    else {
      const areas = Object.values(World.AREAS).filter(a => a.open);
      const x0 = Math.min(...areas.map(a => a.x0)), x1 = Math.max(...areas.map(a => a.x1));
      const z0 = Math.min(...areas.map(a => a.z0)), z1 = Math.max(...areas.map(a => a.z1));
      look = [(x0 + x1) / 2, 0, -(z0 + z1) / 2];
      distance = portrait ? 77 : 52; shot = 'wide';
    }
    look = vec(look);
    const pos = look.clone().add(vec([shot === 'pickup' ? 3.5 : shot === 'terrace' ? 2 : 0, Math.sin(pitch) * distance, Math.cos(pitch) * distance]));
    if (lastShot !== shot) { cameraPos = pos.clone(); cameraLook = look.clone(); }
    else { cameraPos.lerp(pos, .09); cameraLook.lerp(look, .09); }
    camera.position.copy(cameraPos); camera.lookAt(cameraLook); lastShot = shot;
    World.skyline.visible = false;
  }
  function render() { renderer.render(root.parent, camera); renderCount++; }
  async function prepare(width, height, imageDataUrl) {
    if (started) throw new Error('Use a fresh capture tab.');
    portrait = width < height; renderer.setPixelRatio(1); renderer.setSize(width, height);
    camera.aspect = width / height; camera.fov = 34; camera.updateProjectionMatrix(); window.bt.freeCam = true;
    setMoney(50000); for (let i = 0; i < 8; i++) window.bt.buyUpgrade('carry');
    prepareExpansion(); at(-1, 2);
    for (const o of [...getGame().ovens, ...getGame().machines]) { if (o.inStack) fill(o.inStack, o.input, 8); fill(o.tray, o.kind, 8); }
    for (const c of getGame().counters) for (const [kind, stock] of Object.entries(c.stocks)) fill(stock, kind, 8);
    for (let i = 0; i < 1440; i++) simulate(1 / FPS);
    clear(player.carry);
    for (const o of [...getGame().ovens, ...getGame().machines]) { if (o.inStack) fill(o.inStack, o.input, 8); fill(o.tray, o.kind, 8); }
    for (const c of getGame().counters) for (const [kind, stock] of Object.entries(c.stocks)) fill(stock, kind, 8);
    cover = document.createElement('img'); cover.id = 'record-cover'; cover.src = imageDataUrl; document.body.append(cover); await cover.decode();
    startTime = getGame().time; started = true; frameCamera(); render();
  }
  function metrics() {
    const g = getGame(), gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { frame, fps: FPS, renderCount, simulationTime: g.time, takeSimulationSeconds: g.time - startTime, events, samples,
      scenario: SCENARIO, stats: g.stats, game: { unlockIndex: g.unlockIndex, queues: g.counters.map(c => c.queue.length), carry: player.carry.count, helpers: g.helpers.map(h => h.role), machines: g.machines.map(m => m.type), tables: g.tables.length, areas: Object.entries(World.AREAS).filter(([, area]) => area.open).map(([name]) => name) },
      playerScale: player.root.scale.toArray(), pixelRatio: renderer.getPixelRatio(), gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
  }
  window.bt.record = { ready: true, prepare, metrics };
  window.renderFrame = () => {
    if (!started) throw new Error('Prepare the capture first.');
    beforeFrame(); simulate(1 / FPS); if (getGame().paused) throw new Error('Simulation paused during the take.'); frameCamera();
    if (cover) { cover.style.opacity = String(1 - smooth((frame / FPS - .8) / .55)); if (frame / FPS >= 1.35) { cover.remove(); cover = null; } }
    render();
    if (frame % 30 === 0) {
      const g = getGame();
      samples.push({ frame, position: player.pos.toArray(), carry: player.carry.items.map(it => it.userData.kind), money: g.money, unlockIndex: g.unlockIndex, served: g.stats.served, earned: g.stats.earned, guests: g.stats.guests,
        machines: g.machines.map(m => ({ type: m.type, input: m.inStack?.count, output: m.tray.count, working: m.working })),
        tables: g.tables.map(tb => ({ state: tb.state, seated: tb.guest?.ch.sitting || false, order: tb.order.map(o => ({ ...o })) })),
      });
    }
    frame++; return { frame, simulationTime: getGame().time };
  };
}
