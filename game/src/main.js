// Solmar Bay — boot. Reads the URL (?shot=start|play|chase|end&seed=1),
// builds the world, stages screenshot scenes by running the real
// simulation forward, then runs the fixed-step loop and draws every frame.
// The canvas is always locked to the full window, including devicePixelRatio.
import { CONFIG } from './config.js';
import { createWorld, stepWorld, loadGame, saveGame, missionBriefing } from './world.js';
import { createInput, attachInput, consumePress, clearPresses } from './input.js';
import { render } from './render.js';
import { createAudio } from './audio.js';
import { stageShot, autopilot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

let viewW = 1280;
let viewH = 720;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  canvas.style.width = viewW + 'px';
  canvas.style.height = viewH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (window.__solmar) {
    window.__solmar.viewW = viewW;
    window.__solmar.viewH = viewH;
  }
}
window.addEventListener('resize', resize);
resize();

const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot') || '';

const input = createInput();
attachInput(input, canvas);
const audio = createAudio();
const state = createWorld(seed);
state.input = input;
state.audio = audio;
state.viewW = viewW;
state.viewH = viewH;
state.saveLoaded = loadGame(state);
window.__solmar = state;

if (shot) {
  const seconds = shot === 'start' ? 6 : shot === 'end' ? 0 : 9;
  stageShot(state, shot, seconds);
} else {
  state.camera.x = Math.max(0, state.player.x - viewW / 2);
  state.camera.y = Math.max(0, state.player.y - viewH / 2);
}

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  state.viewW = viewW;
  state.viewH = viewH;

  // Screen transitions (edge-triggered keys).
  if (state.screen === 'title' && (consumePress(input, 'enter') || consumePress(input, ' '))) {
    state.screen = 'play';
    audio.unlock();
    missionBriefing(state);
    state.message = 'Job 1: drive to the marker. Steal a car with E if you need wheels.';
    state.messageTimer = 5;
  } else if (state.screen === 'play' && consumePress(input, 'escape')) {
    state.screen = 'pause';
    saveGame(state);
  } else if (state.screen === 'pause' && consumePress(input, 'escape')) {
    state.screen = 'play';
  } else if (state.screen === 'pause' && consumePress(input, 'r')) {
    const fresh = createWorld(seed);
    Object.assign(state, fresh, { input, audio, viewW, viewH, saveLoaded: state.saveLoaded });
    state.screen = 'title';
  } else if (state.screen === 'over' && consumePress(input, 'r')) {
    const fresh = createWorld(seed);
    Object.assign(state, fresh, { input, audio, viewW, viewH, saveLoaded: false });
    state.screen = 'title';
  }

  // In staged screenshot mode the autopilot keeps driving the scene.
  if (shot && shot !== 'start' && shot !== 'end' && state.screen === 'play') {
    acc += dt;
    while (acc >= CONFIG.stepSeconds) {
      autopilot(state, CONFIG.stepSeconds);
      stepWorld(state, CONFIG.stepSeconds);
      acc -= CONFIG.stepSeconds;
    }
  } else if (state.screen === 'play' || state.screen === 'title') {
    acc += dt;
    while (acc >= CONFIG.stepSeconds) {
      stepWorld(state, CONFIG.stepSeconds);
      acc -= CONFIG.stepSeconds;
    }
  }
  clearPresses(input);

  ctx.clearRect(0, 0, viewW, viewH);
  render(ctx, state, viewW, viewH);
  if (statusEl) {
    statusEl.textContent = state.screen === 'play'
      ? `Solmar Bay — Rico, $${state.player.money}, wanted ${state.player.wanted} stars`
      : 'Solmar Bay — open-world crime game';
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
