// WebAudio sound: engine hum, sirens, gunshots, pickups and the radio music
// engine. Nothing here creates an AudioContext until unlockAudio() is called
// from a real user gesture — headless staging never touches audio, so the
// console stays silent.
export function createAudio() {
  return {
    ctx: null,
    unlocked: false,
    master: null,
    musicTimer: null,
    musicStep: 0,
    station: 0,
    engineOsc: null,
    engineGain: null,
  };
}

export function unlockAudio(audio) {
  if (audio.unlocked) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
    audio.unlocked = true;
  } catch (err) {
    // Audio is decoration; a failure here must never break the game.
    audio.unlocked = false;
  }
}

function blip(audio, freq, dur, type, vol, slideTo) {
  if (!audio.unlocked || !audio.ctx) return;
  try {
    const t = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t);
    osc.stop(t + dur);
  } catch (err) {
    // ignore
  }
}

export function sfxShot(audio) {
  blip(audio, 180, 0.12, 'square', 0.2, 60);
}

export function sfxPickup(audio) {
  blip(audio, 660, 0.1, 'sine', 0.16);
  setTimeout(() => blip(audio, 990, 0.14, 'sine', 0.16), 90);
}

export function sfxClick(audio) {
  blip(audio, 440, 0.06, 'sine', 0.1);
}

export function sfxSiren(audio) {
  if (!audio.unlocked) return;
  blip(audio, 700, 0.5, 'sine', 0.05, 950);
}

// A tiny step sequencer for the radio: a bass note plus a lead note per
// eighth-note step, with a different scale per station.
const SCALES = [
  [0, 3, 5, 7, 10],
  [0, 2, 3, 7, 9],
  [0, 2, 5, 7, 9],
  [0, 4, 5, 7, 11],
];

export function startRadio(audio, station) {
  if (!audio.unlocked || audio.musicTimer) return;
  audio.station = station;
  audio.musicStep = 0;
  const scale = SCALES[station % SCALES.length];
  const base = 110;
  audio.musicTimer = setInterval(() => {
    if (!audio.unlocked || !audio.ctx) return;
    const step = audio.musicStep;
    audio.musicStep += 1;
    const note = scale[step % scale.length];
    const octave = step % 8 === 0 ? 2 : 1;
    const freq = base * Math.pow(2, note / 12) * octave;
    blip(audio, freq, 0.22, 'triangle', 0.07);
    if (step % 2 === 0) blip(audio, base / 2, 0.24, 'sine', 0.1);
  }, 240);
}

export function stopRadio(audio) {
  if (audio.musicTimer) {
    clearInterval(audio.musicTimer);
    audio.musicTimer = null;
  }
}

export function setEngine(audio, on, speedRatio) {
  if (!audio.unlocked || !audio.ctx) return;
  try {
    if (on && !audio.engineOsc) {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 70;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start();
      audio.engineOsc = osc;
      audio.engineGain = gain;
    }
    if (!on && audio.engineOsc) {
      audio.engineOsc.stop();
      audio.engineOsc = null;
      audio.engineGain = null;
    }
    if (audio.engineOsc) {
      audio.engineOsc.frequency.value = 60 + speedRatio * 140;
    }
  } catch (err) {
    // ignore
  }
}
