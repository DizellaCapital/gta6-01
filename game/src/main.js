// Solmar Bay boot: URL params, fixed-timestep loop, screen state machine,
// input wiring, staging screenshots, save/load.
import { CFG } from './config.js';
import { createWorld, stepWorld, saveGame, loadGame, applySave } from './world.js';
import { createInput, bindInput, consumePress, clearPresses } from './input.js';
import { drawWorld, drawHUD, drawTitle, drawPause, drawGameOver } from './render.js';
import { stageScene, runStaging } from './shots.js';
import { nextStation } from './radio.js';
import { switchWeapon } from './combat.js';
import { callCrew } from './crew.js';
import { unlockAudio, setMuted, isMuted, startRadio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot');

let world = createWorld(seed);
let screen = 'title';
const input = createInput();
bindInput(input, canvas);

const save = loadGame();
if (save) applySave(world, save);

let cam = { x: world.player.x, y: world.player.y };
let viewW = window.innerWidth;
let viewH = window.innerHeight;
let dpr = 1;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
}
window.addEventListener('resize', resize);
resize();

function updateCamera(dt) {
  const tx = world.player.x;
  const ty = world.player.y;
  cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  cam.y += (ty - cam.y) * Math.min(1, dt * 5);
  cam.x = Math.max(viewW / 2 - 200, Math.min(CFG.worldW - viewW / 2 + 200, cam.x));
  cam.y = Math.max(viewH / 2 - 200, Math.min(CFG.worldH - viewH / 2 + 200, cam.y));
}

function renderFrame() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewW, viewH);
  drawWorld(ctx, world, cam, viewW, viewH);
  if (screen === 'playing' || screen === 'paused') drawHUD(ctx, world, viewW, viewH);
  if (screen === 'title') drawTitle(ctx, world, viewW, viewH, save);
  if (screen === 'paused') drawPause(ctx, viewW, viewH);
  if (screen === 'over') {
    drawHUD(ctx, world, viewW, viewH);
    drawGameOver(ctx, world, viewW, viewH);
  }
  if (statusEl) {
    statusEl.textContent = screen === 'title'
      ? 'Solmar Bay — press Enter to play'
      : `Solmar Bay — $${world.money} — wanted ${world.wanted}`;
  }
}

// --- staging for screenshots: runs synchronously before first paint ---
let shotDone = false;
if (shot) {
  const scene = stageScene(world, shot);
  if (shot === 'start') {
    const idle = { up: false, down: false, left: false, right: false, action: false, shoot: false, brake: false, pressed: {} };
    const steps = Math.round(scene.seconds / CFG.step);
    for (let i = 0; i < steps; i++) stepWorld(world, idle, CFG.step);
  } else {
    runStaging(world, stepWorld, scene.seconds);
  }
  if (scene.setup) {
    scene.setup();
    const idle = { up: false, down: false, left: false, right: false, action: false, shoot: false, brake: false, pressed: {} };
    for (let i = 0; i < Math.round(2 / CFG.step); i++) stepWorld(world, idle, CFG.step);
  }
  screen = world.over ? 'over' : scene.screen;
  cam.x = world.player.x;
  cam.y = world.player.y;
  renderFrame();
  shotDone = true;
  window.__shotReady = true;
}

function startPlaying() {
  unlockAudio();
  startRadio(world.radio.station);
  screen = 'playing';
  statusEl.textContent = 'Solmar Bay — playing';
}

function restart() {
  world = createWorld(seed);
  const s = loadGame();
  if (s) applySave(world, s);
  cam.x = world.player.x;
  cam.y = world.player.y;
  screen = 'playing';
}

let last = performance.now();
let acc = 0;
let saveTimer = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;

  // Global keys.
  if (consumePress(input, 'Enter')) {
    if (screen === 'title') startPlaying();
    else if (screen === 'over') restart();
  }
  if (consumePress(input, 'KeyP') || consumePress(input, 'Escape')) {
    if (screen === 'playing') { screen = 'paused'; saveGame(world); }
    else if (screen === 'paused') screen = 'playing';
  }
  if (consumePress(input, 'KeyM')) setMuted(!isMuted());
  if (screen === 'playing') {
    if (consumePress(input, 'KeyQ')) {
      nextStation(world.radio);
      startRadio(world.radio.station);
    }
    if (consumePress(input, 'Digit1')) callCrew(world, world.crew, 0);
    if (consumePress(input, 'Digit2')) callCrew(world, world.crew, 1);
    if (consumePress(input, 'Digit3')) callCrew(world, world.crew, 2);
  }

  if (screen === 'playing' && !shotDone) {
    // Aim from the mouse position in world space.
    const wx = input.mouseX + cam.x - viewW / 2;
    const wy = input.mouseY + cam.y - viewH / 2;
    world.aimAngle = Math.atan2(wy - world.player.y, wx - world.player.x);
    acc += dt;
    const step = CFG.step;
    let n = 0;
    while (acc >= step && n < 5) {
      stepWorld(world, input, step);
      acc -= step;
      n++;
    }
    if (world.over) screen = 'over';
    saveTimer += dt;
    if (saveTimer > 10) { saveTimer = 0; saveGame(world); }
    clearPresses(input);
  } else if (screen === 'title') {
    // Living city behind the title: traffic and peds keep moving.
    const idle = { up: false, down: false, left: false, right: false, action: false, shoot: false, brake: false, pressed: {} };
    acc += dt;
    let n = 0;
    while (acc >= CFG.step && n < 5) {
      stepWorld(world, idle, CFG.step);
      acc -= CFG.step;
      n++;
    }
    cam.x = CFG.worldW / 2 + Math.sin(now / 9000) * 500;
    cam.y = CFG.worldH / 2 + Math.cos(now / 12000) * 300;
    clearPresses(input);
  } else {
    clearPresses(input);
  }

  if (!shotDone) {
    updateCamera(dt);
    renderFrame();
  }
}
requestAnimationFrame(frame);

window.__game = { get world() { return world; }, get screen() { return screen; } };
