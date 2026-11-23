// Solmar Bay — boot, fixed-step loop, screen state machine, input wiring
// and screenshot staging hooks.

import { CONFIG } from './config.js';
import { createWorld, resetWorld, stepWorld, saveGame, loadGame, hasSave } from './world.js';
import { createInput, attachInput, wasPressed } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { nextStation } from './radio.js';
import { callCrew } from './crew.js';
import { ensureAudio, startMusic, stopMusic } from './audio.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot');

let world;
if (shot) {
  world = stageShot(shot, seed);
} else {
  world = createWorld(seed);
  world.hasSave = hasSave();
  if (world.hasSave) loadGame(world);
}
world.viewW = window.innerWidth;
world.viewH = window.innerHeight;

const input = createInput();
attachInput(input, window);
window.addEventListener('mousedown', ensureAudio, { once: true });
window.addEventListener('keydown', ensureAudio, { once: true });

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  world.viewW = window.innerWidth;
  world.viewH = window.innerHeight;
  canvas.width = Math.floor(world.viewW * dpr);
  canvas.height = Math.floor(world.viewH * dpr);
  canvas.style.width = `${world.viewW}px`;
  canvas.style.height = `${world.viewH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let acc = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += elapsed;

  // Screen state machine + one-shot keys.
  if (wasPressed(input, 'Enter')) {
    if (world.screen === 'title') {
      world.screen = 'play';
      world.dialogTimer = 8;
      startMusic(world.radio.station);
    } else if (world.screen === 'over') {
      resetWorld(world);
      world.screen = 'play';
      startMusic(world.radio.station);
    }
  }
  if (wasPressed(input, 'Escape') || wasPressed(input, 'KeyP')) {
    if (world.screen === 'play') {
      world.screen = 'pause';
      saveGame(world);
    } else if (world.screen === 'pause') {
      world.screen = 'play';
    }
  }
  if (world.screen === 'play') {
    if (wasPressed(input, 'KeyQ')) {
      nextStation(world.radio);
      startMusic(world.radio.station);
      world.message = `Radio: ${world.radio.station + 1} — ${world.radio.station === 0 ? 'SOLMAR FM' : world.radio.station === 1 ? 'BAY 104' : world.radio.station === 2 ? 'VOSS TALK' : 'PALM ROCK'}`;
      world.messageTimer = 3;
    }
    if (wasPressed(input, 'Digit1')) callCrew(world, 0);
    if (wasPressed(input, 'Digit2')) callCrew(world, 1);
    if (wasPressed(input, 'Digit3')) callCrew(world, 2);
    if (wasPressed(input, 'KeyF')) {
      world.combat.slot = (world.combat.slot + 1) % 3;
      world.message = `Weapon: ${['Fists', 'Pistol', 'SMG'][world.combat.slot]}`;
      world.messageTimer = 2;
    }
    if (wasPressed(input, 'KeyM')) {
      world.radio.on = !world.radio.on;
      if (world.radio.on) startMusic(world.radio.station);
      else stopMusic();
    }
    if (wasPressed(input, 'KeyC')) saveGame(world);
  }

  // Edge-triggered action key (E): consumed once per step.
  const frameInput = { ...input, action: wasPressed(input, 'KeyE') };
  world.aim = { x: input.mouseX, y: input.mouseY };

  // Busted check: caught on foot at high wanted with police touching.
  if (world.screen === 'play' && world.wanted >= 4 && world.player.onFoot && !world.playerHeli) {
    const near = world.cars.some((c) => {
      if (c.kind !== 'police') return false;
      const dx = c.x - world.player.x;
      const dy = c.y - world.player.y;
      return dx * dx + dy * dy < 40 * 40;
    });
    if (near) {
      world.screen = 'over';
      world.overKind = 'busted';
      stopMusic();
    }
  }

  while (acc >= CONFIG.DT) {
    stepWorld(world, frameInput, CONFIG.DT);
    frameInput.action = false;
    acc -= CONFIG.DT;
  }

  render(ctx, world, world.viewW, world.viewH);
  if (statusLine) {
    statusLine.textContent = `Solmar Bay — ${world.screen} — $${world.money} — wanted ${world.wanted} — job ${Math.min(world.missionIndex + 1, 8)}/8`;
  }
  requestAnimationFrame(frame);
}

if (shot) {
  // Staging: one render, then signal the driver.
  render(ctx, world, world.viewW, world.viewH);
  if (statusLine) {
    statusLine.textContent = `Solmar Bay — ${world.screen} — $${world.money} — wanted ${world.wanted} — job ${Math.min(world.missionIndex + 1, 8)}/8`;
  }
  window.__shotReady = true;
  window.__shotWorld = world;
} else {
  requestAnimationFrame(frame);
}
