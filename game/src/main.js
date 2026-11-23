// Solmar Bay — boot, fixed-timestep loop, screen state machine and the
// screenshot staging hook (?shot=start|play|chase|end&seed=1).
import { CFG } from './config.js';
import { createWorld, stepWorld, resetWorld, loadSave, saveGame } from './world.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stageScene } from './shots.js';
import { unlockAudio, sfxClick } from './audio.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot');

const world = createWorld(seed);
const input = createInput();
input.attach(canvas);
loadSave(world);

let view = { w: window.innerWidth, h: window.innerHeight };

function resize() {
  const dpr = window.devicePixelRatio || 1;
  view = { w: window.innerWidth, h: window.innerHeight };
  canvas.width = Math.round(view.w * dpr);
  canvas.height = Math.round(view.h * dpr);
  canvas.style.width = `${view.w}px`;
  canvas.style.height = `${view.h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  input.centerX = view.w / 2;
  input.centerY = view.h / 2;
}
window.addEventListener('resize', resize);
resize();

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
  document.title = `Solmar Bay — ${text}`;
}

window.addEventListener('keydown', () => unlockAudio(world.audio), { once: false });
canvas.addEventListener('mousedown', () => unlockAudio(world.audio));

if (shot) {
  // Staging mode: run the real simulation, render one frame, stop.
  stageScene(world, shot);
  render(ctx, world, view);
  setStatus(`Solmar Bay — ${shot} scene staged (seed ${seed})`);
  window.__shotReady = true;
  window.__world = world;
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    let steps = 0;
    if (world.screen === 'title') {
      if (input.wasPressed('Enter')) {
        world.screen = 'play';
        unlockAudio(world.audio);
        sfxClick(world.audio);
        world.showDialog('Mara Voss', world.missions[0].intro, 7);
        setStatus('Solmar Bay — playing');
      }
    } else if (world.screen === 'pause') {
      if (input.wasPressed('Escape') || input.wasPressed('KeyP')) {
        world.screen = 'play';
      }
    } else if (world.screen === 'end') {
      if (input.wasPressed('Enter')) {
        resetWorld(world);
        setStatus('Solmar Bay — playing');
      }
    }
    while (acc >= CFG.DT && steps < 5) {
      if (world.screen === 'play' || world.screen === 'title') {
        stepWorld(world, input, CFG.DT);
      }
      input.endStep();
      acc -= CFG.DT;
      steps += 1;
    }
    if (steps === 5) acc = 0;
    if (world.screen === 'title') setStatus('Solmar Bay — title screen. Press Enter to start.');
    if (world.screen === 'pause') setStatus('Solmar Bay — paused. Press Esc to resume.');
    if (world.screen === 'end') setStatus(`Solmar Bay — ${world.endReason === 'busted' ? 'busted' : 'wasted'}. Press Enter to play again.`);
    render(ctx, world, view);
    requestAnimationFrame(frame);
  }
  setStatus('Solmar Bay — title screen. Press Enter to start.');
  window.__world = world;
  requestAnimationFrame(frame);
}

// Save when the tab closes mid-game.
window.addEventListener('beforeunload', () => {
  if (world.screen === 'play') saveGame(world);
});
