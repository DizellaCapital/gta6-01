// Solmar Bay — boot and the one loop. Input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Screens: title, play, paused, game over.
//
// ?seed=N fixes the city and traffic. ?shot=start|play|chase|end (with
// &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
//
// Controls: WASD/arrows walk & drive, E enter/exit a car or the heli,
// Space punch (on foot) / brake (in a car) / climb (in the heli),
// C descend (heli), X or click shoot, Q switch weapon, R radio,
// G garage / street race, 1/2/3 crew abilities, P pause, M mute.
import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER } from './world.js';
import {
  ACTION_CONFIRM, ACTION_ENTER, ACTION_LOAD, ACTION_MUTE, ACTION_PAUSE,
  ACTION_PUNCH, ACTION_SHOOT, ACTION_RADIO, ACTION_WEAPON,
  ACTION_CREW1, ACTION_CREW2, ACTION_CREW3, ACTION_GARAGE,
  createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
// Debug handle for automated play-tests (read-only from the console).
window.__solmar = world;
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    const s = world.state;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: s.money, health: s.health, armor: s.armor, rp: s.rp,
      ammo: s.weapons.list[1].ammo, smgAmmo: s.weapons.list[2].ammo,
      radioStation: s.radio.station,
      missionsDone: s.missions.done, missionIndex: s.missions.index,
      x: s.player.x, y: s.player.y, dayTime: s.dayTime,
    }));
  } catch { /* storage can be off; the game still plays */ }
}

function applySave(save) {
  const s = world.state;
  s.money = save.money ?? s.money;
  s.health = save.health ?? s.health;
  s.armor = save.armor ?? s.armor;
  s.rp = save.rp ?? s.rp;
  if (save.ammo !== undefined) s.weapons.list[1].ammo = save.ammo;
  if (save.smgAmmo !== undefined) s.weapons.list[2].ammo = save.smgAmmo;
  if (save.radioStation !== undefined) s.radio.station = save.radioStation;
  s.missions.done = save.missionsDone || [];
  s.missions.index = save.missionIndex || 0;
  if (save.x !== undefined) { s.player.x = save.x; s.player.y = save.y; }
  if (save.dayTime !== undefined) s.dayTime = save.dayTime;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.info);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let save = readSave();
  let accumulator = 0;
  let last = performance.now();
  let lastMissionCount = 0;
  let lastRadioStation = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    if (fresh) {
      world.reset();
      try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      save = null;
    } else if (save) {
      world.reset();
      applySave(save);
    } else {
      world.reset();
    }
    lastMissionCount = world.state.missions.done.length;
    lastRadioStation = world.state.radio.station;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Solmar Bay. Follow the gold marker.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.setSiren(false);
    audio.setRadio(false, 0, false);
    announce(world.state.overReason === 'busted' ? 'Busted.' : 'Wasted.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions0 = input.takeActions();
    let actions = actions0;
    const mouse = input.takeMouse();
    const clickedOnce = mouse.clicked;
    if (clickedOnce) actions |= ACTION_SHOOT;
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(true);
      else if (actions & ACTION_LOAD && save) startGame(false);
    } else if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame(true);
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (screen === SCREEN_PLAY) {
      const vec = input.vector();
      const aim = mouse.clicked
        ? Math.atan2(
          (mouse.y / (canvas.getBoundingClientRect().height || 1)) * 720 - 360,
          (mouse.x / (canvas.getBoundingClientRect().width || 1)) * 1280 - 640,
        )
        : undefined;
      const crew = actions & ACTION_CREW1 ? 'tito'
        : actions & ACTION_CREW2 ? 'lena'
        : actions & ACTION_CREW3 ? 'mara' : null;
      while (accumulator >= STEP) {
        const result = world.step(STEP, {
          x: vec.x, y: vec.y,
          enter: Boolean(actions & ACTION_ENTER),
          punch: Boolean(actions & ACTION_PUNCH),
          shoot: Boolean(actions & ACTION_SHOOT),
          brake: Boolean(actions & ACTION_PUNCH),
          aimAngle: aim,
          run: true,
          radio: Boolean(actions & ACTION_RADIO),
          weapon: Boolean(actions & ACTION_WEAPON),
          crew,
          garage: Boolean(actions & ACTION_GARAGE),
          climb: input.heldClimb(),
          descend: input.heldDescend(),
        });
        accumulator -= STEP;
        // One-shot flags are consumed by the first step only.
        actions &= ~(ACTION_ENTER | ACTION_PUNCH | ACTION_SHOOT | ACTION_RADIO | ACTION_WEAPON | ACTION_CREW1 | ACTION_CREW2 | ACTION_CREW3 | ACTION_GARAGE);
        if (result.events & EVENT_OVER) { endGame(); break; }
        if (world.state.missions.done.length > lastMissionCount) {
          lastMissionCount = world.state.missions.done.length;
          writeSave();
          audio.mission();
        }
      }
      // Sound follows the world every frame.
      const s = world.state;
      audio.engine(s.engineSpeed || 0, !s.player.onFoot);
      audio.setSiren(s.wanted >= 2);
      if (s.radio.station !== lastRadioStation) {
        lastRadioStation = s.radio.station;
        audio.radioJingle(s.radio.station);
      }
      audio.setRadio(s.radio.on, s.radio.station, !s.player.onFoot);
    } else {
      accumulator = 0;
      audio.engine(0, false);
      audio.setSiren(false);
      audio.setRadio(false, 0, false);
    }
    renderer.draw(world.state, screen, { hasSave: Boolean(save) });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  document.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  announce('Solmar Bay. Press Enter to start, L to continue a save.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
