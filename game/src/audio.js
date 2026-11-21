// WebAudio sound: engine hum, sirens, gunshots and pickups, plus a tiny
// step-sequencer that plays each radio station's tune. Everything is
// synthesised — no audio files — and every call is guarded so the game never
// breaks when audio is unavailable (headless screenshot runs included).
export class SoundBoard {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.station = null;
    this.stepTimer = null;
    this.step = 0;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      return true;
    } catch {
      return false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  blip(freq, dur, type = 'sine', vol = 0.2) {
    if (!this.ensure() || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur);
    } catch { /* audio is best-effort */ }
  }

  noise(dur, vol = 0.25) {
    if (!this.ensure() || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(g);
      g.connect(this.master);
      src.start(t);
    } catch { /* audio is best-effort */ }
  }

  gunshot() { this.noise(0.12, 0.3); this.blip(160, 0.08, 'square', 0.12); }
  pickup() { this.blip(660, 0.09); setTimeout(() => this.blip(990, 0.12), 70); }
  crash() { this.noise(0.25, 0.35); }
  sirenBlip() { this.blip(720, 0.18, 'triangle', 0.1); }

  engine(on, speedRatio) {
    if (!this.ensure() || this.muted) return;
    try {
      if (!on) {
        if (this.engineOsc) { this.engineOsc.stop(); this.engineOsc = null; this.engineGain = null; }
        return;
      }
      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.03;
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
      }
      this.engineOsc.frequency.value = 55 + speedRatio * 140;
      this.engineGain.gain.value = 0.02 + speedRatio * 0.05;
    } catch { /* audio is best-effort */ }
  }

  // A station is { name, bpm, scale: [semitone offsets], root, wave }.
  playStation(station) {
    this.station = station;
    this.step = 0;
    if (this.stepTimer) { clearInterval(this.stepTimer); this.stepTimer = null; }
    if (!station || !this.ensure() || this.muted) return;
    const stepMs = 60000 / station.bpm / 2;
    this.stepTimer = setInterval(() => this.playStep(), stepMs);
  }

  playStep() {
    if (!this.ctx || !this.station || this.muted) return;
    try {
      const s = this.station;
      const scale = s.scale;
      const idx = s.pattern[this.step % s.pattern.length];
      if (idx >= 0) {
        const semi = scale[idx % scale.length] + 12 * Math.floor(idx / scale.length);
        const freq = s.root * Math.pow(2, semi / 12);
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = s.wave || 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(t);
        o.stop(t + 0.25);
      }
      if (this.step % 8 === 0) this.blip(s.root / 2, 0.2, 'sine', 0.08);
      this.step++;
    } catch { /* audio is best-effort */ }
  }

  stopMusic() {
    if (this.stepTimer) { clearInterval(this.stepTimer); this.stepTimer = null; }
    this.station = null;
  }
}
