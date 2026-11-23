// Sound: WebAudio synth for effects and radio music. Everything is
// guarded — if audio is unavailable (headless, no gesture yet) the game
// simply stays silent instead of throwing.

let ctx = null;
let musicNodes = null;

function getCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

export function ensureAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {});
  }
  return c;
}

function blip(freq, dur, type = 'sine', gain = 0.08) {
  const c = getCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch { /* silent */ }
}

export function sfxPickup() { blip(880, 0.12, 'sine', 0.06); }
export function sfxShoot() { blip(220, 0.08, 'square', 0.05); }
export function sfxCrash() { blip(90, 0.25, 'sawtooth', 0.09); }
export function sfxSiren() { blip(660, 0.18, 'triangle', 0.03); }
export function sfxMission() {
  blip(523, 0.12, 'sine', 0.07);
  setTimeout(() => blip(784, 0.18, 'sine', 0.07), 120);
}

// A tiny looping music bed per station: different waveform + tempo.
// Only one bed runs at a time; switching stations restarts it.
const STATION_SOUND = [
  { type: 'sine', notes: [262, 330, 392, 523], step: 0.42 },
  { type: 'square', notes: [196, 247, 294, 370], step: 0.30 },
  { type: 'triangle', notes: [220, 277, 330, 440], step: 0.55 },
  { type: 'sawtooth', notes: [175, 220, 262, 330], step: 0.26 },
];

export function startMusic(stationIndex) {
  stopMusic();
  const c = getCtx();
  if (!c) return;
  const spec = STATION_SOUND[stationIndex % STATION_SOUND.length];
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = spec.type;
    g.gain.value = 0.035;
    o.connect(g).connect(c.destination);
    o.start();
    let i = 0;
    const timer = setInterval(() => {
      try {
        o.frequency.setValueAtTime(spec.notes[i % spec.notes.length], c.currentTime);
      } catch { /* silent */ }
      i += 1;
    }, spec.step * 1000);
    musicNodes = { o, g, timer };
  } catch { /* silent */ }
}

export function stopMusic() {
  if (!musicNodes) return;
  try {
    clearInterval(musicNodes.timer);
    musicNodes.o.stop();
  } catch { /* silent */ }
  musicNodes = null;
}
