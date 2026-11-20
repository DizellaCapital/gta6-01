// Synthesized sound only — WebAudio oscillators and noise, no audio files
// and no network. Created lazily on the first user gesture; M mutes.
// The radio is synthesized too: each station has a short jingle pattern
// and a looping bassline riff in its own key/tempo while driving.
import { STATIONS } from './radio.js';

const JINGLES = [
  [523, 659, 784, 1047], // Bay FM — bright pop
  [392, 494, 587, 784],  // Reef Radio — island
  [330, 415, 494, 659],  // Harbor Rock — gritty
  [440, 440, 554, 440],  // Solmar Talk — news sting
];
// One riff (semitone offsets from the station root) per station.
const RIFFS = [
  [0, 0, 7, 0, 10, 0, 7, 5],
  [0, 3, 5, 7, 5, 3, 0, -2],
  [0, 0, 12, 0, 10, 7, 5, 3],
  [0, 7, 0, 7, 0, 7, 5, 7],
];
const ROOTS = [220, 196, 165, 247];

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let radioOsc = null;
  let radioGain = null;
  let muted = false;
  let sirenOn = false;
  let riffTimer = null;
  let riffStep = 0;
  let radioStation = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      radioOsc = ctx.createOscillator();
      radioOsc.type = 'triangle';
      radioOsc.frequency.value = ROOTS[0];
      radioGain = ctx.createGain();
      radioGain.gain.value = 0;
      radioOsc.connect(radioGain);
      radioGain.connect(master);
      radioOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function blip(freq, dur, type, vol) {
    if (!ensure() || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch { /* sound is decoration */ }
  }

  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = vol;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = low || 1200;
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start();
    } catch { /* sound is decoration */ }
  }

  function radioRiffStep() {
    if (!ctx || muted || !radioGain) return;
    const riff = RIFFS[radioStation % RIFFS.length];
    const root = ROOTS[radioStation % ROOTS.length];
    const semi = riff[riffStep % riff.length];
    riffStep += 1;
    try {
      radioOsc.frequency.setTargetAtTime(root * Math.pow(2, semi / 12), ctx.currentTime, 0.02);
    } catch { /* ignore */ }
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    /** speed01: 0..1 of top speed. Call every frame while driving. */
    engine(speed01, driving) {
      if (!ctx || muted) return;
      try {
        const t = ctx.currentTime;
        engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.09 : 0, t, 0.1);
        engineOsc.frequency.setTargetAtTime(55 + speed01 * 110, t, 0.1);
        if (sirenOn) sirenOsc.frequency.setTargetAtTime(650 + 250 * Math.sin(t * 4), t, 0.05);
      } catch { /* ignore */ }
    },
    setSiren(on) {
      sirenOn = on;
      if (!ctx) return;
      try { sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, ctx.currentTime, 0.2); } catch { /* ignore */ }
    },
    /** Radio on/off + station. Starts the station riff while driving. */
    setRadio(on, stationIndex, driving) {
      radioStation = stationIndex || 0;
      if (!ensure()) return;
      try {
        radioGain.gain.setTargetAtTime(on && driving && !muted ? 0.05 : 0, ctx.currentTime, 0.2);
      } catch { /* ignore */ }
      if (on && driving) {
        if (!riffTimer) {
          riffStep = 0;
          riffTimer = setInterval(radioRiffStep, 260);
        }
      } else if (riffTimer) {
        clearInterval(riffTimer);
        riffTimer = null;
      }
    },
    /** Short jingle when the station changes. */
    radioJingle(stationIndex) {
      const notes = JINGLES[stationIndex % JINGLES.length];
      notes.forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.22), i * 90));
    },
    pickup() { blip(880, 0.12, 'sine', 0.3); setTimeout(() => blip(1320, 0.14, 'sine', 0.25), 70); },
    cash() { blip(660, 0.1, 'triangle', 0.3); setTimeout(() => blip(990, 0.16, 'triangle', 0.3), 80); },
    shot() { noise(0.12, 0.4, 2500); },
    punch() { noise(0.08, 0.3, 500); },
    crash() { noise(0.25, 0.35, 800); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.3), i * 110)); },
    fail() { [400, 300, 220].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'sawtooth', 0.18), i * 130)); },
    heli() { blip(180, 0.3, 'sawtooth', 0.15); setTimeout(() => blip(240, 0.3, 'sawtooth', 0.15), 120); },
  };
}

// Keep the station list import used (tree-shaken in browsers that need it).
export const RADIO_STATION_COUNT = STATIONS.length;
