// WebAudio sound effects + a tiny synthesised radio music engine.
// Everything is guarded: no AudioContext exists until the player interacts,
// and headless runs simply stay silent.
let ctx = null;
let musicTimer = null;
let musicGain = null;
let muted = false;
let unlocked = false; // true only after a user gesture (Enter / click)

function ensureCtx() {
  if (!unlocked) return null;
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(ctx.destination);
  } catch (e) { ctx = null; }
  return ctx;
}

export function unlockAudio() {
  unlocked = true;
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(m) { muted = m; if (musicGain) musicGain.gain.value = m ? 0 : 0.12; }
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, when = 0) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = c.currentTime + when;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) { /* silent */ }
}

export function sfx(name) {
  if (muted) return;
  switch (name) {
    case 'shot': tone(220, 0.12, 'square', 0.25); tone(90, 0.1, 'sawtooth', 0.2); break;
    case 'punch': tone(120, 0.08, 'sine', 0.3); break;
    case 'siren': tone(660, 0.35, 'sine', 0.08); tone(880, 0.35, 'sine', 0.08, 0.35); break;
    case 'pickup': tone(523, 0.09, 'sine', 0.2); tone(784, 0.14, 'sine', 0.2, 0.09); break;
    case 'crash': tone(70, 0.25, 'sawtooth', 0.3); break;
    case 'mission': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'sine', 0.2, i * 0.12)); break;
    case 'busted': [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.22, i * 0.22)); break;
    case 'enter': tone(330, 0.08, 'sine', 0.18); tone(440, 0.1, 'sine', 0.18, 0.08); break;
    default: break;
  }
}

// A looping two-bar groove per station, scheduled with lookahead.
const GROOVES = [
  { wave: 'triangle', bpm: 96, notes: [262, 330, 392, 330, 294, 370, 440, 370] },
  { wave: 'sawtooth', bpm: 88, notes: [110, 110, 131, 110, 98, 110, 147, 131] },
  { wave: 'square', bpm: 132, notes: [220, 262, 330, 262, 196, 220, 294, 330] },
  { wave: 'sine', bpm: 60, notes: [440, 415, 440, 466, 440, 415, 392, 415] },
];

export function startRadio(stationIndex) {
  const c = ensureCtx();
  if (!c) return;
  stopRadio();
  const groove = GROOVES[stationIndex % GROOVES.length];
  const beat = 60 / groove.bpm / 2;
  let step = 0;
  musicTimer = window.setInterval(() => {
    if (muted || !ctx) return;
    const note = groove.notes[step % groove.notes.length];
    tone(note, beat * 0.9, groove.wave, 0.07);
    if (step % 4 === 0) tone(note / 2, beat * 1.8, 'sine', 0.12);
    step++;
  }, beat * 1000);
}

export function stopRadio() {
  if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null; }
}
