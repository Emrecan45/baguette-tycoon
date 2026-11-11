export function instrumentMain(source) {
  if (source.includes('const RECORD =')) throw new Error('main.js already has a recording integration.');
  let code = source;
  function replace(pattern, replacement, name) {
    const next = code.replace(pattern, replacement);
    if (next === code) throw new Error(`Recording integration could not find ${name}`);
    code = next;
  }
  replace('const CROWD_SIZE = 10;', "const CROWD_SIZE = 10;\nconst RECORD = new URLSearchParams(location.search).has('record');", 'settings');
  replace("preserveDrawingBuffer: location.search.includes('shot')", "preserveDrawingBuffer: RECORD || location.search.includes('shot')", 'drawing buffer');
  replace('renderer.setPixelRatio(Math.min(devicePixelRatio, 2));', 'renderer.setPixelRatio(RECORD ? 1 : Math.min(devicePixelRatio, 2));', 'pixel ratio');
  replace('const earlySave = (() => { try', 'const earlySave = (() => { if (RECORD) return null; try', 'save isolation');
  replace('function checkLevelUp() {', 'function checkLevelUp() {\n  if (RECORD) return;', 'modal suppression');
  replace(/function save\(\) \{\s*if \(params.has\('debug'\)\) return;/, "function save() {\n  if (RECORD || params.has('debug')) return;", 'save guard');
  replace(/function load\(\) \{\s*if \(params.has\('debug'\)\)/, "function load() {\n  if (RECORD || params.has('debug'))", 'debug initialization');
  replace('initInput(canvas);', 'if (!RECORD) initInput(canvas);', 'input isolation');
  replace("const INTRO = params.has('debug')", "const INTRO = RECORD || params.has('debug')", 'intro');
  replace(/\napplyQuality\(\);\s*resize\(\);/, '\nif (!RECORD) applyQuality();\nresize();', 'quality startup');
  replace("const timeScale = +(params.get('ts') || 1);", "const timeScale = RECORD ? 1 : +(params.get('ts') || 1);", 'time scale');
  replace(/function frame\(\) \{[\s\S]*?\n  time \+= dt;/, 'function simulate(dt) {\n  if (paused) { hud.tick(time); return; }\n  time += dt;', 'simulation function');
  replace(/  hud.tick\(time\);\s*if \(!noRender\) renderer.render\(scene, camera\);\s*requestAnimationFrame\(frame\);\s*\}/, `  hud.tick(time);\n}\nfunction frame() {\n  const raw = clock.getDelta();\n  watchFps(raw);\n  shadowTick();\n  const dt = Math.min(raw * timeScale, timeScale === 1 ? 0.066 : Math.min(0.35, 0.025 * timeScale));\n  simulate(dt);\n  if (!noRender) renderer.render(scene, camera);\n  requestAnimationFrame(frame);\n}`, 'normal frame wrapper');
  replace(/initAudio\(\);\s*loadExtraMusic\(audioCtx\);\s*offlineEarnings\(\);\s*requestAnimationFrame\(frame\);/, 'if (!RECORD) {\n  initAudio();\n  loadExtraMusic(audioCtx);\n  offlineEarnings();\n  requestAnimationFrame(frame);\n}', 'manual frame startup');
  code += `
if (RECORD) {
  const { installRecording } = await import('/tools/marketing/recording.js');
  await installRecording({
    THREE, renderer, camera, root, player, World, OUTFITS, simulate,
    getGame: () => ({ ovens, machines, tables, guests, counters, helpers, customers, pad, unlockIndex, time, stats: { ...stats }, money, paused }),
    setMoney: value => { money = value; },
    prepareExpansion() {
      for (let i = 3; i < unlocks.length; i++) if (unlocks[i].title !== 'turbo') unlocks[i].apply(true);
    },
    createGuest(tb) { const guest = new TableGuest(tb); guests.push(guest); return guest; },
  });
}
`;
  return code;
}

export function recordingPlugin() {
  return { name: 'baguette-offline-recording', enforce: 'pre', transform(code, id) { if (id.replaceAll('\\', '/').split('?')[0].endsWith('/src/main.js')) return { code: instrumentMain(code), map: null }; } };
}
