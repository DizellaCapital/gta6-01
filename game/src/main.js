// Solmar Bay boot: read the URL, build the world, run the fixed-step loop,
// wire input to the simulation, and run the screen state machine
// (title / play / pause / end). With ?shot=start|play|chase|end the game
// stages that scene deterministically instead of waiting for a player.
import { CFG } from './config.js';
import { createWorld, stepWorld, saveGame, loadSave, applySave } from './world.js';
import { Input } from './input.js';
import { SoundBoard } from './audio.js';
import { render } from './render.js';
import { stageScene } from './shots.js';
import { switchWeapon, fireWeapon, aimAngle } from './combat.js';
import { callCrew } from './crew.js';
import { nextStationId, stationById } from './radio.js';
import { startMission, currentMission } from './missions.js';

const canvas = document.querySelector('#game');
const statusEl = document.querySelector('#status');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : 20261121;
const shot = params.get('shot');

const sound = new SoundBoard();
const input = new Input(canvas);

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

let view = fitCanvas();
window.addEventListener('resize', () => {
  view = fitCanvas();
  if (world) {
    world.viewW = view.w;
    world.viewH = view.h;
  }
});

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

let world;
if (shot) {
  // Deterministic staging: simulate the scene, freeze it, render it.
  world = stageScene(shot, seed);
  world.viewW = view.w;
  world.viewH = view.h;
  world.saveInfo = loadSave();
  setStatus(`Solmar Bay — staged scene "${shot}" (seed ${seed})`);
  render(ctx, world, view.w, view.h);
  window.__shotReady = true;
  // Keep repainting the same frozen frame so the shot never changes.
  const repaint = () => {
    render(ctx, world, view.w, view.h);
    requestAnimationFrame(repaint);
  };
  requestAnimationFrame(repaint);
} else {
  world = createWorld(seed, sound);
  world.viewW = view.w;
  world.viewH = view.h;
  world.saveInfo = loadSave();
  if (world.saveInfo) applySave(world, world.saveInfo);
  setStatus('Solmar Bay — press Enter to play');
  runGame(world);
}

function runGame(S) {
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;

    // One-shot keys, handled by screen.
    if (S.screen === 'title') {
      if (input.wasPressed('enter')) {
        sound.ensure();
        sound.resume();
        sound.playStation(stationById(S.radioStation));
        S.screen = 'play';
        setStatus('Solmar Bay — Rico is on the streets');
      }
      render(ctx, S, view.w, view.h);
      input.endFrame();
      return;
    }
    if (S.screen === 'pause') {
      if (input.wasPressed('escape') || input.wasPressed('enter')) {
        if (input.wasPressed('enter')) saveGame(S);
        S.screen = 'play';
      }
      if (input.wasPressed('m')) {
        startMission(S, S.missionIdx);
        S.screen = 'play';
      }
      render(ctx, S, view.w, view.h);
      input.endFrame();
      return;
    }
    if (S.screen === 'end') {
      if (input.wasPressed('enter')) {
        saveGame(S);
        const fresh = createWorld(seed, sound);
        fresh.viewW = view.w;
        fresh.viewH = view.h;
        fresh.saveInfo = loadSave();
        Object.assign(S, fresh);
        S.screen = 'play';
      }
      render(ctx, S, view.w, view.h);
      input.endFrame();
      return;
    }

    // Play screen.
    if (input.wasPressed('escape')) {
      S.screen = 'pause';
      saveGame(S);
      render(ctx, S, view.w, view.h);
      input.endFrame();
      return;
    }
    if (input.wasPressed('q')) switchWeapon(S, 1);
    if (input.wasPressed('r')) {
      S.radioStation = nextStationId(S.radioStation);
      sound.playStation(stationById(S.radioStation));
      S.messages.push(`Radio: ${stationById(S.radioStation).name}`);
    }
    if (input.wasPressed('m') && S.missionState === 'failed') startMission(S, S.missionIdx);
    if (input.wasPressed('1')) callCrew(S, 0);
    if (input.wasPressed('2')) callCrew(S, 1);
    if (input.wasPressed('3')) callCrew(S, 2);

    // Enter/exit is a one-shot action: fire it on the first step only, so a
    // single keypress can never enter and exit in the same frame.
    const enterPressed = input.wasPressed('e');

    acc += elapsed;
    let steps = 0;
    while (acc >= CFG.step && steps < 5) {
      const simInput = {
        up: input.held('w') || input.held('arrowup'),
        down: input.held('s') || input.held('arrowdown'),
        left: input.held('a') || input.held('arrowleft'),
        right: input.held('d') || input.held('arrowright'),
        run: input.held('shift'),
        enter: enterPressed && steps === 0,
        shoot: false,
        aimAngle: 0,
      };
      // Shooting: mouse aim + click (or Space for fists).
      if (input.mouseDown || input.held(' ')) {
        simInput.aimAngle = aimAngle(S, input.mouseX, input.mouseY, view.w, view.h);
        fireWeapon(S, simInput.aimAngle);
      }
      stepWorld(S, simInput, CFG.step);
      acc -= CFG.step;
      steps++;
      if (S.screen !== 'play') break;
    }
    if (S.missionState === 'done' && currentMission(S)) saveGame(S);
    render(ctx, S, view.w, view.h);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
