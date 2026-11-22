// WebAudio sound effects + a tiny synth radio engine. Everything is generated;
// there are no audio files and no network. All calls are safe before any user
// gesture and safe when AudioContext is unavailable (headless screenshots).
let ctx = null;
let muted = false;
let musicTimer = null;
let musicNodes = [];
// Audio stays fully silent until a real user gesture: creating an
// AudioContext earlier only logs autoplay warnings in headless runs.
let unlocked = false;
if (typeof window !== 'undefined') {
  const unlock = () => { unlocked = true; };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function ac() {
  if (muted || !unlocked) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, type, vol, slideTo) {
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch { /* audio is cosmetic */ }
}

export function sfx(name) {
  switch (name) {
    case 'engine': tone(70, 0.18, 'sawtooth', 0.05, 110); break;
    case 'siren': tone(880, 0.5, 'sine', 0.06, 660); break;
    case 'shot': tone(220, 0.09, 'square', 0.14, 60); break;
    case 'pickup': tone(520, 0.12, 'sine', 0.12, 880); break;
    case 'cash': tone(660, 0.1, 'sine', 0.12, 990); tone(990, 0.16, 'sine', 0.1, 1320); break;
    case 'crash': tone(140, 0.25, 'sawtooth', 0.16, 50); break;
    case 'door': tone(180, 0.08, 'triangle', 0.1, 120); break;
    case 'heli': tone(55, 0.3, 'sawtooth', 0.07, 62); break;
    case 'busted': tone(330, 0.4, 'sine', 0.12, 165); break;
    default: break;
  }
}

export function setMuted(m) {
  muted = !!m;
  if (muted) stopMusic();
}

export function isMuted() {
  return muted;
}

// Simple looping bass-line sequencer: one pattern per station.
const PATTERNS = [
  [55, 0, 55, 65.4, 0, 49, 55, 0],
  [82.4, 82.4, 0, 98, 82.4, 0, 73.4, 98],
  [110, 0, 130.8, 0, 98, 0, 110, 123.5],
  [65.4, 0, 0, 65.4, 78, 0, 65.4, 87.3],
];

export function startMusic(station) {
  stopMusic();
  const c = ac();
  if (!c) return;
  const pattern = PATTERNS[station % PATTERNS.length];
  let step = 0;
  const tick = () => {
    const f = pattern[step % pattern.length];
    step++;
    if (f) tone(f, 0.22, 'triangle', 0.07);
    if (step % 2 === 0) tone(f ? f * 2 : 220, 0.1, 'sine', 0.03);
  };
  tick();
  musicTimer = setInterval(tick, 240);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  for (const n of musicNodes) {
    try { n.stop(); } catch { /* noop */ }
  }
  musicNodes = [];
}
