// Solmar Bay — sound. Everything is synthesized with WebAudio: engine hum,
// sirens, gunshots, pickups, and a tiny per-station music loop. The audio
// context is created lazily on the first user gesture; in headless runs it
// simply stays off and every call is a safe no-op.
export function createAudio() {
  const api = { enabled: false, ctx: null, musicTimer: 0, station: 0 };
  const ensure = () => {
    if (api.ctx) return api.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      api.ctx = new AC();
      api.enabled = true;
      return api.ctx;
    } catch {
      return null;
    }
  };
  api.unlock = () => { try { ensure()?.resume?.(); } catch { /* silent */ } };
  const tone = (freq, dur, type, vol, slideTo) => {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch { /* silent */ }
  };
  api.engine = (speedRatio) => { tone(50 + speedRatio * 90, 0.12, 'sawtooth', 0.015); };
  api.siren = () => { tone(720, 0.5, 'sine', 0.04, 980); };
  api.shoot = () => { tone(190, 0.12, 'square', 0.09, 60); };
  api.pickup = () => { tone(660, 0.15, 'sine', 0.07, 990); };
  api.crash = () => { tone(90, 0.25, 'sawtooth', 0.1, 40); };
  api.musicTick = (station) => {
    // A short two-note phrase; the station picks the scale.
    const scales = [[262, 330, 392], [220, 277, 330], [196, 247, 294], [247, 311, 370]];
    const scale = scales[station % scales.length];
    const now = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
    const note = scale[Math.floor(now * 2) % scale.length];
    tone(note, 0.5, 'triangle', 0.025);
  };
  return api;
}
