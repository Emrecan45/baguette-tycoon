const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2147483648 - 1; };
}

function biquad(type, sr) {
  let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const f = {
    set(freq, q) {
      const w = TAU * Math.min(freq, sr * 0.45) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
      let n0, n1, n2;
      if (type === 'bp') { n0 = al; n1 = 0; n2 = -al; }
      else if (type === 'lp') { n0 = (1 - c) / 2; n1 = 1 - c; n2 = (1 - c) / 2; }
      else { n0 = (1 + c) / 2; n1 = -(1 + c); n2 = (1 + c) / 2; }
      const a0 = 1 + al;
      b0 = n0 / a0; b1 = n1 / a0; b2 = n2 / a0; a1 = (-2 * c) / a0; a2 = (1 - al) / a0;
      return f;
    },
    run(x) {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    },
  };
  return f;
}

function buffer(sr, dur) { return new Float32Array(Math.ceil(sr * dur)); }

function bell(out, sr, t0, f0, parts, gain) {
  const i0 = Math.floor(t0 * sr);
  for (const [ratio, amp, tau] of parts) {
    const f = f0 * ratio;
    if (f > sr * 0.45) continue;
    const n = Math.min(out.length - i0, Math.ceil(tau * 7 * sr));
    const ph = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const att = Math.min(1, t / 0.0015);
      out[i0 + i] += Math.sin(TAU * f * t + ph) * amp * gain * att * Math.exp(-t / tau);
    }
  }
}

function click(out, sr, t0, freq, q, tau, gain, seed) {
  const r = rng(seed), bp = biquad('bp', sr).set(freq, q);
  const i0 = Math.floor(t0 * sr), n = Math.min(out.length - i0, Math.ceil(tau * 8 * sr));
  for (let i = 0; i < n; i++) out[i0 + i] += bp.run(r()) * gain * Math.exp(-i / sr / tau);
}

function tone(out, sr, t0, f0, dur, gain, { f1 = f0, glide = 0.02, tau = dur, bright = 0.25, vib = 0 } = {}) {
  const i0 = Math.floor(t0 * sr), n = Math.min(out.length - i0, Math.ceil(dur * sr));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = (f1 + (f0 - f1) * Math.exp(-t / glide)) * (1 + vib * Math.sin(TAU * 6 * t) * Math.min(1, t / 0.15));
    ph += TAU * f / sr;
    let s = Math.sin(ph);
    if (bright) s += bright * (Math.sin(3 * ph) / 3 + (f * 5 < sr * 0.45 ? Math.sin(5 * ph) / 5 : 0));
    const env = Math.min(1, t / 0.004) * Math.exp(-t / tau) * Math.min(1, (dur - t) / 0.01);
    out[i0 + i] += s * gain * env;
  }
}

function normalize(a, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  if (m > 0) for (let i = 0; i < a.length; i++) a[i] *= peak / m;

  const f = Math.min(a.length, 64);
  for (let i = 0; i < f; i++) a[a.length - 1 - i] *= i / f;
  return a;
}

export function createRegisterSound(sr) {
    const a = buffer(sr, 0.8);
    [0, 0.027, 0.052].forEach((t, k) => click(a, sr, t, 2100 + k * 380, 4, 0.006, 0.9, 30 + k));
    tone(a, sr, 0.075, 170, 0.1, 0.65, { f1: 85, glide: 0.025, tau: 0.035, bright: 0 });
    click(a, sr, 0.075, 650, 1.5, 0.015, 0.7, 40);
    const partials = [[1, 1, .17], [2.01, .22, .11], [2.76, .3, .08], [5.4, .08, .04]];
    bell(a, sr, .085, 1568, partials, 1);
    bell(a, sr, .085, 1572, partials, .25);
  return normalize(a, .85);
}
