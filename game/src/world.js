// Solmar Bay — central world state and the simulation step. Everything
// the other modules do hangs off this object.

import { CONFIG } from './config.js';
import { makeRng, range, pick } from './random.js';
import { buildCity, pointInBuilding, nearestRoadPoint } from './city.js';
import { districtAt } from './districts.js';
import { stepTraffic, spawnTrafficCar } from './traffic.js';
import { stepPedestrians, spawnPedestrian } from './pedestrians.js';
import { stepPolice, createPolice } from './police.js';
import { stepMissions, startMission, currentMission, currentStage } from './missions.js';
import { createCombat, tryShoot, stepBullets, damagePlayer } from './combat.js';
import { createCrew, stepCrew, callCrew } from './crew.js';
import { createRadio, stepRadio, nextStation } from './radio.js';
import { sfxPickup, sfxShoot, sfxCrash } from './audio.js';

const SAVE_KEY = 'solmar-bay-save-v1';
const HELIPAD = { x: 1800, y: 200 };
const GARAGE = { x: 1400, y: 1400 };

const RANKS = [
  { rp: 0, name: 'Rookie' },
  { rp: 200, name: 'Street' },
  { rp: 500, name: 'Hustler' },
  { rp: 1000, name: 'Wheelman' },
  { rp: 2000, name: 'Kingpin' },
  { rp: 3500, name: 'Solmar King' },
];

export function rankName(world) {
  let name = RANKS[0].name;
  for (const r of RANKS) if (world.rp >= r.rp) name = r.name;
  return name;
}

export function createWorld(seed = 1) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const world = {
    seed,
    rng,
    city,
    time: 0,
    screen: 'title',
    overKind: null,
    money: CONFIG.START_MONEY,
    rp: 0,
    wanted: 0,
    wantedHeat: 0,
    hideTimer: 0,
    player: {
      x: 600, y: 600, angle: 0, speed: 0,
      onFoot: true, car: null, hp: CONFIG.PLAYER_HP, armor: CONFIG.PLAYER_ARMOR,
    },
    playerHeli: null,
    cars: [],
    peds: [],
    bullets: [],
    police: createPolice(),
    combat: createCombat(),
    crew: createCrew(),
    radio: createRadio(),
    missionIndex: 0,
    missionStage: 0,
    missionTimer: 120,
    missionDone: false,
    message: 'Welcome to Solmar Bay.',
    messageTimer: 6,
    dialog: null,
    dialogTimer: 0,
    cam: { x: 600, y: 600 },
    shotsFired: 0,
    hpTimer: 0,
    garageCar: null,
    saveTimer: 0,
    hasSave: false,
  };
  resetWorld(world);
  return world;
}

export function resetWorld(world) {
  const { rng, city } = world;
  world.time = 0;
  world.money = CONFIG.START_MONEY;
  world.rp = 0;
  world.wanted = 0;
  world.wantedHeat = 0;
  world.missionIndex = 0;
  world.missionStage = 0;
  world.missionDone = false;
  world.overKind = null;
  world.bullets = [];
  world.police = createPolice();
  world.combat = createCombat();
  world.crew = createCrew();
  world.radio = createRadio();
  world.shotsFired = 0;
  world.garageCar = null;
  world.player = {
    x: 600, y: 600, angle: -Math.PI / 2, speed: 0,
    onFoot: true, car: null, hp: CONFIG.PLAYER_HP, armor: CONFIG.PLAYER_ARMOR,
  };
  world.playerHeli = null;
  world.cam = { x: 600, y: 600 };

  // Parked cars near the spawn, on roads.
  world.cars = [];
  const parkedSpots = [
    { x: 640, y: 200, angle: 0, color: '#e63946', name: 'Sunrise Sedan' },
    { x: 200, y: 640, angle: Math.PI / 2, color: '#8fb8d8', name: 'Bay Cruiser' },
    { x: 1000, y: 640, angle: -Math.PI / 2, color: '#d9c27a', name: 'Dune Pickup' },
    { x: 1400, y: 200, angle: 0, color: '#a8c3a0', name: 'Palm Taxi' },
    { x: 1800, y: 640, angle: Math.PI / 2, color: '#c9ced6', name: 'Harbor Van' },
  ];
  for (const s of parkedSpots) {
    world.cars.push({
      kind: 'parked', x: s.x, y: s.y, angle: s.angle, speed: 0,
      color: s.color, name: s.name, cond: range(rng, 70, 100), w: 34, h: 18,
    });
  }
  for (let i = 0; i < 14; i++) world.cars.push(spawnTrafficCar(city, rng));
  world.peds = [];
  for (let i = 0; i < 26; i++) world.peds.push(spawnPedestrian(city, rng));
  startMission(world, 0);
  world.dialogTimer = 8;
  world.message = 'Mara Voss has a job for you. Follow the yellow marker.';
  world.messageTimer = 8;
}

export function addWanted(world, n) {
  world.wanted = Math.min(CONFIG.WANTED_MAX, world.wanted + n);
  world.wantedHeat = CONFIG.WANTED_DECAY_SECONDS;
  world.hideTimer = 0;
}

function nearestCar(world, maxDist) {
  let best = null;
  let bd = maxDist;
  for (const c of world.cars) {
    if (c.kind === 'police' || c.kind === 'wreck') continue;
    const d = Math.hypot(c.x - world.player.x, c.y - world.player.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function enterCar(world) {
  const p = world.player;
  if (!p.onFoot) return false;
  // Helipad first: board the player helicopter.
  const dh = Math.hypot(HELIPAD.x - p.x, HELIPAD.y - p.y);
  if (dh < 70 && !world.playerHeli) {
    world.playerHeli = { x: HELIPAD.x, y: HELIPAD.y, angle: -Math.PI / 2, alt: 0 };
    p.onFoot = false;
    world.message = 'Helicopter ready — WASD to fly, E to land.';
    return true;
  }
  const car = nearestCar(world, 70);
  if (!car) return false;
  if (car.kind === 'traffic') {
    addWanted(world, 1);
    world.message = `Stole a ${car.name}! SBPD is on to you.`;
  } else {
    world.message = `You took the ${car.name}.`;
  }
  car.kind = 'player';
  p.car = car;
  p.onFoot = false;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  return true;
}

export function exitCar(world) {
  const p = world.player;
  if (p.onFoot) return false;
  if (world.playerHeli) {
    const h = world.playerHeli;
    if (h.alt > 30) {
      world.message = 'Too high to jump out — land first.';
      return false;
    }
    p.x = h.x + 40;
    p.y = h.y + 40;
    p.onFoot = true;
    world.playerHeli = null;
    return true;
  }
  if (p.car) {
    p.x = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * 34;
    p.y = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * 34;
    p.car.kind = 'parked';
    p.car.speed = 0;
    p.car = null;
    p.onFoot = true;
    p.speed = 0;
    return true;
  }
  return false;
}

function stepPlayerOnFoot(world, input, dt) {
  const p = world.player;
  let mx = 0;
  let my = 0;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  const len = Math.hypot(mx, my);
  const speed = input.sprint ? CONFIG.WALK_SPRINT : CONFIG.WALK_SPEED;
  if (len > 0) {
    mx /= len;
    my /= len;
    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;
    if (!pointInBuilding(world.city, nx, p.y, 12)) p.x = nx;
    if (!pointInBuilding(world.city, p.x, ny, 12)) p.y = ny;
    p.angle = Math.atan2(my, mx);
    p.speed = speed;
  } else {
    p.speed = 0;
  }
  p.x = Math.max(16, Math.min(CONFIG.WORLD_W - 16, p.x));
  p.y = Math.max(16, Math.min(CONFIG.WORLD_H - 16, p.y));
}

function stepPlayerCar(world, input, dt) {
  const p = world.player;
  const car = p.car;
  if (!car) return;
  const forward = input.up ? 1 : 0;
  const reverse = input.down ? 1 : 0;
  if (forward) car.speed += CONFIG.CAR_ACCEL * dt;
  else if (reverse) car.speed -= (car.speed > 0 ? CONFIG.CAR_BRAKE : CONFIG.CAR_ACCEL * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  car.speed = Math.max(-CONFIG.CAR_REVERSE_MAX, Math.min(CONFIG.CAR_MAX_SPEED, car.speed));
  if (input.brake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), CONFIG.CAR_BRAKE * dt);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  // A stopped car must still be able to turn, or it can never start a
  // U-turn: keep a floor on the turn factor.
  const turnFactor = Math.max(0.3, Math.min(1, Math.abs(car.speed) / 120));
  car.angle += steer * CONFIG.CAR_TURN * dt * turnFactor * dir;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Building collision with a generous radius so corners never clip.
  // Slide along a wall when only one axis is blocked.
  if (!pointInBuilding(world.city, nx, ny, 16)) {
    car.x = nx;
    car.y = ny;
  } else if (!pointInBuilding(world.city, nx, car.y, 16)) {
    car.x = nx;
  } else if (!pointInBuilding(world.city, car.x, ny, 16)) {
    car.y = ny;
  } else {
    if (Math.abs(car.speed) > 120) sfxCrash();
    car.speed *= 0.4;
  }
  // Centreline pull: when the car is near a road and moving along it,
  // ease it back to the centreline so turns never drift it into the
  // sidewalk strip where a building corner can wedge it.
  const snap = nearestRoadPoint(world.city, car.x, car.y);
  if (Math.abs(Math.sin(car.angle)) > 0.7 && Math.abs(snap.x - car.x) < 70) {
    car.x += (snap.x - car.x) * Math.min(1, dt * 3);
  } else if (Math.abs(Math.cos(car.angle)) > 0.7 && Math.abs(snap.y - car.y) < 70) {
    car.y += (snap.y - car.y) * Math.min(1, dt * 3);
  }
  // Safety net: a car centre must never sit inside a building.
  const hit = pointInBuilding(world.city, car.x, car.y, 0);
  if (hit) {
    const left = car.x - hit.x;
    const right = hit.x + hit.w - car.x;
    const top = car.y - hit.y;
    const bottom = hit.y + hit.h - car.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) car.x = hit.x - 1;
    else if (m === right) car.x = hit.x + hit.w + 1;
    else if (m === top) car.y = hit.y - 1;
    else car.y = hit.y + hit.h + 1;
  }
  car.x = Math.max(20, Math.min(CONFIG.WORLD_W - 20, car.x));
  car.y = Math.max(20, Math.min(CONFIG.WORLD_H - 20, car.y));
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = Math.abs(car.speed);
  // Hitting a pedestrian at speed is a crime.
  for (const ped of world.peds) {
    const dx = ped.x - car.x;
    const dy = ped.y - car.y;
    if (dx * dx + dy * dy < 26 * 26 && Math.abs(car.speed) > 100) {
      ped.panic = 2;
      addWanted(world, 1);
    }
  }
}

function stepPlayerHeli(world, input, dt) {
  const h = world.playerHeli;
  if (!h) return;
  let mx = 0;
  let my = 0;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    h.angle = Math.atan2(my, mx);
    h.x += (mx / len) * CONFIG.HELI_SPEED * dt;
    h.y += (my / len) * CONFIG.HELI_SPEED * dt;
  }
  h.alt = Math.min(140, h.alt + CONFIG.HELI_CLIMB * dt);
  h.x = Math.max(20, Math.min(CONFIG.WORLD_W - 20, h.x));
  h.y = Math.max(20, Math.min(CONFIG.WORLD_H - 20, h.y));
  const p = world.player;
  p.x = h.x;
  p.y = h.y;
  p.angle = h.angle;
  p.speed = len > 0 ? CONFIG.HELI_SPEED : 0;
}

export function stepWorld(world, input, dt) {
  world.time += dt;
  // Ambient city life always runs, even under the title screen.
  stepTraffic(world, dt);
  stepPedestrians(world, dt);
  if (world.screen !== 'play') {
    world.cam.x += (world.player.x - world.cam.x) * Math.min(1, dt * 2);
    world.cam.y += (world.player.y - world.cam.y) * Math.min(1, dt * 2);
    return;
  }

  // Player.
  const p = world.player;
  if (world.playerHeli) stepPlayerHeli(world, input, dt);
  else if (p.onFoot) stepPlayerOnFoot(world, input, dt);
  else stepPlayerCar(world, input, dt);

  // Enter / exit vehicle.
  if (input.action) {
    if (p.onFoot) enterCar(world);
    else exitCar(world);
  }

  // Shooting: aim with the mouse, fire on click.
  if (input.shoot && world.aim) {
    const w = world.cam;
    const tx = world.aim.x + w.x - world.viewW / 2;
    const ty = world.aim.y + w.y - world.viewH / 2;
    if (tryShoot(world, tx, ty)) sfxShoot();
  }
  if (world.combat.cooldown > 0) world.combat.cooldown -= dt;

  stepBullets(world, dt);
  stepPolice(world, dt);
  stepMissions(world, dt);
  stepCrew(world.crew, dt);
  stepRadio(world.radio, dt);

  // Wanted decay while the player stays out of trouble.
  if (world.wanted > 0) {
    world.wantedHeat -= dt;
    if (world.wantedHeat <= 0) {
      world.wanted -= 1;
      world.wantedHeat = CONFIG.WANTED_DECAY_SECONDS;
      if (world.wanted === 0) world.message = 'You lost the cops. Clean — for now.';
    }
  }

  // Garage: parking the car here stores it and repairs it for $100.
  if (p.car) {
    const dg = Math.hypot(GARAGE.x - p.x, GARAGE.y - p.y);
    if (dg < 110) {
      world.garageCar = { name: p.car.name, cond: Math.round(p.car.cond) };
      if (p.car.cond < 100 && world.money >= 100) {
        world.money -= 100;
        p.car.cond = 100;
        world.message = 'Garage: car repaired for $100 and stored.';
      }
    }
  }

  // Dialog + message timers.
  if (world.dialogTimer > 0) {
    world.dialogTimer -= dt;
    if (world.dialogTimer <= 0) world.dialog = null;
  }
  if (world.messageTimer > 0) world.messageTimer -= dt;

  // Camera follows the player.
  world.cam.x += (p.x - world.cam.x) * Math.min(1, dt * 4);
  world.cam.y += (p.y - world.cam.y) * Math.min(1, dt * 4);

  // Autosave.
  world.saveTimer += dt;
  if (world.saveTimer > 10) {
    world.saveTimer = 0;
    saveGame(world);
  }
}

export function saveGame(world) {
  try {
    const data = {
      money: world.money,
      rp: world.rp,
      missionIndex: world.missionIndex,
      wanted: 0,
      px: world.player.x,
      py: world.player.y,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    world.hasSave = true;
    return true;
  } catch {
    return false;
  }
}

export function loadGame(world) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    world.money = data.money ?? world.money;
    world.rp = data.rp ?? world.rp;
    world.missionIndex = data.missionIndex ?? 0;
    world.missionStage = 0;
    const m = currentMission(world);
    world.missionTimer = m.stages[0].timer;
    world.player.x = data.px ?? world.player.x;
    world.player.y = data.py ?? world.player.y;
    world.cam.x = world.player.x;
    world.cam.y = world.player.y;
    world.hasSave = true;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}
