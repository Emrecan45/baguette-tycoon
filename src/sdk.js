const S = () => window[import.meta.env.VITE_SERVICE_GLOBAL]?.SDK;

async function loadHostService() {
  const url = import.meta.env.VITE_SERVICE_SCRIPT;
  if (!url || S()) return;
  await new Promise(resolve => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.append(script);
  });
}
let ready = false;

export const BASIC = import.meta.env.MODE === 'basic';

export const CG = {
  get ready() { return ready; },
  get env() { return ready ? S().environment : 'none'; },

  async init() {
    try {
      await loadHostService();
      if (!S()) return;
      await S().init();
      const env = S().environment;
      ready = env === 'local' || env === import.meta.env.VITE_SERVICE_ENV;
    } catch (e) { ready = false; }
  },

  loadingStart() { if (ready) S().game.loadingStart(); },
  loadingStop() { if (ready) S().game.loadingStop(); },
  gameplayStart() { if (ready) S().game.gameplayStart(); },
  gameplayStop() { if (ready) S().game.gameplayStop(); },
  happytime() { if (ready) S().game.happytime(); },

  get muteAudio() { return ready ? !!(S().game.settings && S().game.settings.muteAudio) : false; },
  onSettings(fn) { if (ready) S().game.addSettingsChangeListener(fn); },

  getItem(key) {
    try { return ready ? S().data.getItem(key) : localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem(key, value) {
    try { if (ready) S().data.setItem(key, value); else localStorage.setItem(key, value); } catch (e) {  }
  },
  removeItem(key) {
    try { if (ready) S().data.removeItem(key); else localStorage.removeItem(key); } catch (e) {  }
  },

  get locale() { try { return ready ? (S().user.systemInfo || {}).locale || navigator.language : navigator.language || ''; } catch (e) { return ''; } },
  get isMobile() {
    try {
      if (ready) { const d = ((S().user.systemInfo || {}).device || {}).type; if (d) return d === 'mobile' || d === 'tablet'; }
    } catch (e) {  }
    return matchMedia('(pointer: coarse)').matches;
  },
  get adsAvailable() { return ready && !BASIC; },

  rewarded({ onStart, reward, fail, done }) {
    if (!ready || BASIC) { fail && fail('adsDisabled'); done(); return; }
    let finished = false;
    const end = (ok, code) => {
      if (finished) return;
      finished = true;
      if (ok) reward(); else fail && fail(code);
      done();
    };
    try {
      S().ad.requestAd('rewarded', {
        adStarted: () => onStart && onStart(),
        adFinished: () => end(true),
        adError: (err) => end(false, err && err.code),
      });
    } catch (e) { end(false, 'other'); }
  },

  midgame({ onStart, done }) {
    if (!ready || BASIC) { done(); return; }
    let finished = false;
    const end = () => { if (!finished) { finished = true; done(); } };
    try {
      S().ad.requestAd('midgame', { adStarted: () => onStart && onStart(), adFinished: end, adError: end });
    } catch (e) { end(); }
  },
};
