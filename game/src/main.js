// Boot: read URL params, build the world, run the fixed-step loop,
// own the screen state machine (title / play / pause / over),
// and hook the ?shot= staging used for screenshots.
import { CONFIG } from './config.js';
import { createWorld, stepWorld, saveGame, loadGame, hasSave, resetWorld } from './world.js';
import { makeInput, makeEdge, attachKeyboard, attachMouse } from './input.js';
import { drawWorld, drawHUD, drawTitle, drawPause, drawOver } from './render.js';
import { stageShot, SHOT_NAMES } from './shots.js';
import { setMuted, isMuted } from './audio.js';

function params() {
  return new URLSearchParams(window.location.search);
}

function seedFrom(paramsObj) {
  const s = parseInt(paramsObj.get('seed') || '1', 10);
  return Number.isFinite(s) ? s : 1;
}

function setupCanvas(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }
  resize();
  window.addEventListener('resize', resize);
  return { dpr, view: () => ({ w: window.innerWidth, h: window.innerHeight }) };
}

export function boot() {
  const canvas = document.getElementById('game');
  const statusEl = document.getElementById('status');
  const ctx = canvas.getContext('2d');
  const { dpr, view } = setupCanvas(canvas);
  const q = params();
  const seed = seedFrom(q);
  const world = createWorld(seed);
  world.saveExists = hasSave();
  const input = makeInput();
  const edge = makeEdge();
  attachKeyboard(input, window);
  attachMouse(input, canvas);

  const shot = q.get('shot');
  if (shot && SHOT_NAMES.includes(shot)) {
    // Staging mode: run the real sim synchronously, render one frame.
    // Hide the DOM status line so it never overlaps the HUD in the shot.
    if (statusEl) statusEl.style.display = 'none';
    stageShot(world, shot);
    renderFrame();
    if (statusEl) statusEl.textContent = `Solmar Bay — staged shot "${shot}" (seed ${seed})`;
    window.__shotReady = true;
    window.__world = world;
    return { world, input };
  }

  let last = performance.now();
  let acc = 0;

  function frame(now) {
    const dtMs = Math.min(100, now - last);
    last = now;
    // Screen state machine.
    if (edge.press(input, 'pause')) {
      if (world.screen === 'play') world.screen = 'pause';
      else if (world.screen === 'pause') world.screen = 'play';
    }
    if (world.screen === 'play') {
      acc += dtMs / 1000;
      let n = 0;
      while (acc >= CONFIG.DT && n < 5) {
        stepWorld(world, input, CONFIG.DT);
        acc -= CONFIG.DT;
        n++;
      }
      if (n === 5) acc = 0;
      if (edge.press(input, 'mute')) setMuted(!isMuted());
    }
    renderFrame();
    requestAnimationFrame(frame);
  }

  function renderFrame() {
    const v = view();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (world.screen === 'title') drawTitle(ctx, world, v);
    else if (world.screen === 'pause') { drawWorld(ctx, world, v); drawHUD(ctx, world, v); drawPause(ctx, world, v); }
    else if (world.screen === 'over') drawOver(ctx, world, v);
    else { drawWorld(ctx, world, v); drawHUD(ctx, world, v); }
    if (statusEl) {
      statusEl.textContent = `Solmar Bay — ${world.screen} — job ${world.missions.index + 1}/8 — $${world.player.money}`;
    }
  }

  // Enter starts / restarts; S saves while paused.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      if (world.screen === 'title') {
        if (world.saveExists) loadGame(world);
        world.screen = 'play';
      } else if (world.screen === 'over') {
        resetWorld(world);
        world.screen = 'play';
      }
    }
    if (e.code === 'KeyS' && world.screen === 'pause') {
      saveGame(world);
    }
  });

  if (statusEl) statusEl.textContent = 'Solmar Bay — press Enter to start';
  requestAnimationFrame(frame);
  window.__world = world;
  return { world, input };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
