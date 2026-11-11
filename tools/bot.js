(() => {
  const log = [];
  let lastUnlock = -1, task = null, stuck = 0;
  bt.player.collide = false;
  const go = (p, t) => { const dx = t.x - p.pos.x, dz = t.z - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.15) p.desired.set(0,0,0); else { const k = Math.min(1, d/0.4+0.2)/d; p.desired.set(dx*k,0,dz*k);} return d; };
  const dist = (p, t) => Math.hypot(t.x - p.pos.x, t.z - p.pos.z);
  const sum = (st) => st.values.reduce((a, b) => a + b, 0);
  window.botTask = () => task && task.type;
  bt.autopilot = (p) => {
    const g = bt.game(), m = bt.money(), c = p.carry;
    if (g.paused) return;
    if (g.unlockIndex !== lastUnlock) { log.push(['unlock', g.unlockIndex, +g.time.toFixed(0), m]); lastUnlock = g.unlockIndex; }
    const srcs = [...g.ovens, ...g.machines];
    if (task && task.until && task.until()) task = null;
    if (!task) {
      const padRem = g.pad ? g.pad.remaining : Infinity;
      const ups = bt.upgradeList().filter((u) => u.level < u.max).sort((a, b) => a.price - b.price);
      const piles = g.counters.map((k) => ({ zone: k.pile.zone, st: k.pile.stack })).concat(g.tables.map((tb) => ({ zone: tb.zone, st: tb.money })));
      const money = piles.reduce((a, x) => a + sum(x.st), 0);
      if (c.empty && g.pad && m >= padRem) task = { type: 'pad', at: () => g.pad.root.position, until: () => !bt.game().pad || bt.game().pad !== g.pad };
      else if (c.empty && ups.length && ups[0].price <= m && ups[0].price < padRem * 0.5) { bt.buyUpgrade(ups[0].id, false); log.push(['up', ups[0].id, +g.time.toFixed(0)]); return; }
      else if (c.empty && g.tables.some((tb) => tb.state === 'dirty')) { const tb = g.tables.find((x) => x.state === 'dirty'); task = { type: 'clean', at: () => tb.zone.center, until: () => tb.state !== 'dirty' }; }
      else if (c.empty && money > 0 && (money + m >= padRem || money > 40)) { const pl = piles.filter((x) => x.st.count).sort((a, b) => dist(p, a.zone.center) - dist(p, b.zone.center))[0]; task = { type: 'collect', at: () => pl.zone.center, until: () => pl.st.empty }; }
      else {

        const carried = new Set(c.items.map((it) => it.userData.kind));
        const sinks = [];
        for (const tb of g.tables) if (tb.state === 'wait') for (const o of tb.order) if (o.got < o.n) sinks.push({ kind: o.kind, zone: tb.zone, prio: 5 });
        for (const mc of srcs) if (mc.input && mc.inStack.count < mc.inStack.capacity) sinks.push({ kind: mc.input, zone: mc.drop, prio: mc.inStack.count < 3 ? 4 : 1.5 });
        for (const k of g.counters) for (const kind of g.sellable) { const st = k.stockFor(kind); if (!st.full) sinks.push({ kind, zone: k.drop, prio: (bt.needed(kind) ? 3 : 1) + (st.count < 3 ? 1 : 0) }); }
        sinks.sort((a, b) => b.prio - a.prio);
        const deliver = sinks.find((s) => carried.has(s.kind));
        if (c.full || (deliver && c.count > 0 && !sinks.some((s) => s.prio > deliver.prio && srcs.some((o) => o.kind === s.kind && !o.tray.empty)))) {
          if (deliver) { const z = deliver.zone, k = deliver.kind; let n = c.count, still = 0; task = { type: 'deliver', at: () => z.center, until: () => { if (c.count !== n) { n = c.count; still = 0; } else if (z.contains(p.pos)) still += 1/60; return !c.items.some((it) => it.userData.kind === k) || still > 3; }, t: 0 }; }
          else { const tr = g.trashes[0]; task = { type: 'trash', at: () => tr.zone.center, until: () => c.empty }; }
        } else {
          const want = c.count >= 6 ? null : sinks.find((s) => bt.canTake(s.kind) && srcs.some((o) => o.kind === s.kind && !o.tray.empty));
          if (want) { const src = srcs.filter((o) => o.kind === want.kind && !o.tray.empty).sort((a, b) => b.tray.count - a.tray.count)[0]; task = { type: 'fetch', at: () => src.pickup.center, until: () => c.full || src.tray.empty || c.count >= 6 || !bt.canTake(want.kind) }; }
          else if (c.count > 0 && deliver) { const z = deliver.zone, k = deliver.kind; task = { type: 'deliver', at: () => z.center, until: () => !c.items.some((it) => it.userData.kind === k) }; }
          else if (money > 0) { const pl = piles.filter((x) => x.st.count)[0]; task = { type: 'collect', at: () => pl.zone.center, until: () => pl.st.empty }; }
          else task = { type: 'idle', at: () => g.ovens[0].pickup.center, t: 0, until: () => (task.t += 1/60) > 1 };
        }
      }
      stuck = 0;
    }
    if (task) {
      go(p, task.at());
      stuck += 1/60;
      if (stuck > 12) { log.push(['stuck', task.type, +g.time.toFixed(0), c.items.map((it) => it.userData.kind).join(','), +p.pos.x.toFixed(1), +p.pos.z.toFixed(1), String(task.at().x.toFixed(1)) + ',' + task.at().z.toFixed(1)]); task = null; }
    }
  };
  window.botlog = log;
})();
setInterval(() => { const b = document.querySelector('.modal:not(.hidden) .pbtn.green, .modal:not(.hidden) .pbtn.grey'); if (b) b.click(); }, 500);
