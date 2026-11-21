// Solmar Bay — central state and the simulation step. The world owns the
// player, the vehicles, the wanted level, the garage and the save; the
// feature modules (traffic, police, missions, combat, crew) update their
// own slice of it each step.
import { CONFIG } from './config.js';
import { buildCity, pointBlocked, nearestRoadPoint } from './city.js';
import { makeRng, pick, intRange } from './random.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { updatePolice } from './police.js';
import { currentMission, currentStage, updateMissions, startMissionTimer } from './missions.js';
import { fireWeapon, updateBullets, addWanted, WEAPONS } from './combat.js';
import { useCrew } from './crew.js';
import { nextStation } from './radio.js';
import { consumePress } from './input.js';

const PARKED_NAMES = ['Comet', 'Falcon', 'Dune', 'Marlin', 'Courier', 'Sable'];

export function createWorld(seed) {
  const state = {
    seed,
    rng: makeRng(seed),
    time: 0,
    screen: 'title',
    overReason: null,
    camera: { x: 0, y: 0 },
    city: buildCity(seed),
    player: {
      x: 420, y: 460, angle: 0, speed: 0,
      onFoot: true, health: 100, armor: 50,
      money: CONFIG.startMoney, wanted: 0, wantedHeat: 0, quietTimer: 0,
      rp: 0, rank: 'Wheelman', weapon: 1, ammo: [Infinity, 24, 90],
      lastShot: -10, vehicle: null, altitude: 0,
    },
    traffic: [],
    peds: [],
    parked: [],
    cops: [],
    roadblocks: [],
    copHeli: null,
    bullets: [],
    playerHeli: null,
    missionIndex: 0,
    missionStage: 0,
    missionTimer: 0,
    missionStageTarget: null,
    crewCooldown: [0, 0, 0],
    radioStation: 0,
    message: '', messageTimer: 0,
    dialog: null,
    stats: { missionsDone: 0, carsStolen: 0, distanceDriven: 0 },
    garage: { slots: [null, null, null] },
    garagePos: { x: 2000, y: 2000 },
    safehouse: { x: 800, y: 2800 },
    heliPad: { x: 3600, y: 2800 },
    bustedHold: 0,
    input: null,
    audio: null,
    auto: null,
  };
  spawnTraffic(state, 26);
  spawnPedestrians(state, 34);
  const prng = makeRng(seed + 55);
  for (let i = 0; i < 9; i++) {
    const spot = nearestRoadPoint(state.city, 300 + prng() * 4200, 300 + prng() * 3000);
    state.parked.push({
      id: 'park' + i, kind: 'parked',
      x: spot.x + (prng() < 0.5 ? 52 : -52), y: spot.y + (prng() < 0.5 ? 52 : -52),
      angle: prng() * Math.PI * 2, speed: 0,
      color: pick(prng, CONFIG.palette.trafficColors),
      name: pick(prng, PARKED_NAMES), condition: intRange(prng, 60, 99), maxSpeed: 420,
    });
  }
  state.playerHeli = {
    id: 'heli-player', kind: 'heli', x: state.heliPad.x, y: state.heliPad.y,
    angle: 0, speed: 0, color: '#e8b400', name: 'Seahawk Heli', condition: 100, maxSpeed: CONFIG.heliTopSpeed,
  };
  return state;
}

export function rankFor(rp) {
  if (rp >= 1500) return 'Kingpin';
  if (rp >= 750) return 'Hustler';
  if (rp >= 250) return 'Street Smart';
  return 'Wheelman';
}

function moveWithCollision(state, obj, nx, ny, radius) {
  // Slide along walls: try the full step, then each axis alone.
  if (!pointBlocked(state.city, nx, ny, radius)) { obj.x = nx; obj.y = ny; return false; }
  if (!pointBlocked(state.city, nx, obj.y, radius)) { obj.x = nx; return true; }
  if (!pointBlocked(state.city, obj.x, ny, radius)) { obj.y = ny; return true; }
  return true;
}

function nearestParked(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.parked) {
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function nearestTraffic(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.traffic) {
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterVehicle(state, car) {
  const p = state.player;
  p.vehicle = car;
  p.onFoot = false;
  p.altitude = 0;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = 0;
}

function exitVehicle(state) {
  const p = state.player;
  const car = p.vehicle;
  if (!car) return;
  p.vehicle = null;
  p.onFoot = true;
  p.speed = 0;
  p.altitude = 0;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  if (car.kind !== 'heli') {
    car.kind = 'parked';
    if (!state.parked.includes(car)) state.parked.push(car);
  }
}

export function stepWorld(state, dt) {
  const p = state.player;
  const input = state.input;
  state.time += dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.dialog) { state.dialog.timer -= dt; if (state.dialog.timer <= 0) state.dialog = null; }
  for (let i = 0; i < 3; i++) if (state.crewCooldown[i] > 0) state.crewCooldown[i] -= dt;
  state.missionStageTarget = currentStage(state);

  // The city stays alive behind the title and game-over screens.
  updateTraffic(state, dt);
  updatePedestrians(state, dt);
  if (state.screen !== 'play') {
    if (state.screen === 'title') {
      state.camera.x = 1200 + Math.sin(state.time * 0.05) * 500;
      state.camera.y = 900 + Math.cos(state.time * 0.04) * 300;
    }
    return;
  }

  // --- Action keys (edge-triggered) ---
  if (consumePress(input, 'q')) {
    p.weapon = (p.weapon + 1) % WEAPONS.length;
    state.message = `Weapon: ${WEAPONS[p.weapon].name}`;
    state.messageTimer = 1.5;
  }
  if (consumePress(input, 'r')) {
    state.message = nextStation(state);
    state.messageTimer = 2.5;
    state.audio?.musicTick?.(state.radioStation);
  }
  if (consumePress(input, '1')) { const m = useCrew(state, 0); if (m) { state.message = m; state.messageTimer = 3; } }
  if (consumePress(input, '2')) { const m = useCrew(state, 1); if (m) { state.message = m; state.messageTimer = 3; } }
  if (consumePress(input, '3')) { const m = useCrew(state, 2); if (m) { state.message = m; state.messageTimer = 3; } }
  if (consumePress(input, 'e')) {
    if (!p.onFoot) exitVehicle(state);
    else {
      const heliNear = Math.hypot(state.playerHeli.x - p.x, state.playerHeli.y - p.y) < 70;
      const parked = nearestParked(state, 60);
      const trafficCar = nearestTraffic(state, 60);
      if (heliNear) {
        enterVehicle(state, state.playerHeli);
        state.message = 'Helicopter — W/S fly, A/D turn, SPACE climb, SHIFT descend.';
        state.messageTimer = 4;
      } else if (parked) {
        state.parked.splice(state.parked.indexOf(parked), 1);
        parked.kind = 'car';
        enterVehicle(state, parked);
        state.message = `You took the ${parked.name}.`;
        state.messageTimer = 2;
      } else if (trafficCar) {
        state.traffic.splice(state.traffic.indexOf(trafficCar), 1);
        trafficCar.kind = 'car';
        enterVehicle(state, trafficCar);
        state.stats.carsStolen++;
        addWanted(state, 1);
        state.message = `You stole the ${trafficCar.name}! The driver called the SBPD.`;
        state.messageTimer = 3;
        state.audio?.pickup?.();
      }
    }
  }
  if (consumePress(input, 'g')) {
    const nearGarage = Math.hypot(p.x - state.garagePos.x, p.y - state.garagePos.y) < 140;
    if (nearGarage) {
      if (!p.onFoot && p.vehicle && p.vehicle.kind !== 'heli') {
        const slot = state.garage.slots.findIndex((s) => s === null);
        if (slot >= 0) {
          state.garage.slots[slot] = { name: p.vehicle.name, color: p.vehicle.color, condition: p.vehicle.condition };
          state.message = `${p.vehicle.name} stored in garage slot ${slot + 1}.`;
          state.messageTimer = 2.5;
          p.vehicle = null;
          p.onFoot = true;
        } else { state.message = 'Garage is full.'; state.messageTimer = 2; }
      } else if (p.onFoot) {
        const slot = state.garage.slots.findIndex((s) => s !== null);
        if (slot >= 0) {
          const saved = state.garage.slots[slot];
          state.garage.slots[slot] = null;
          const car = { id: 'garage' + Math.floor(state.time), kind: 'car', x: p.x + 60, y: p.y, angle: 0, speed: 0, color: saved.color, name: saved.name, condition: saved.condition, maxSpeed: 430 };
          enterVehicle(state, car);
          state.message = `Took the ${saved.name} out of the garage.`;
          state.messageTimer = 2.5;
        } else { state.message = 'Garage is empty — store a car here with G while driving.'; state.messageTimer = 3; }
      }
    }
  }
  if (consumePress(input, 'f')) {
    const nearGarage = Math.hypot(p.x - state.garagePos.x, p.y - state.garagePos.y) < 140;
    if (nearGarage && p.vehicle && p.money >= 150) {
      p.money -= 150;
      p.vehicle.condition = 100;
      state.message = 'Lena patched the ride up — $150, good as new.';
      state.messageTimer = 2.5;
    }
  }

  // --- Movement ---
  if (p.onFoot) {
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      const sp = CONFIG.walkSpeed * (input.sprint ? 1.5 : 1);
      p.angle = Math.atan2(my, mx);
      moveWithCollision(state, p, p.x + (mx / len) * sp * dt, p.y + (my / len) * sp * dt, 12);
    }
    p.speed = 0;
  } else if (p.vehicle) {
    const car = p.vehicle;
    const isHeli = car.kind === 'heli';
    if (isHeli) {
      if (input.left) car.angle -= 1.9 * dt;
      if (input.right) car.angle += 1.9 * dt;
      const thrust = input.up ? 1 : input.down ? -0.5 : 0;
      car.speed += (thrust * CONFIG.heliTopSpeed - car.speed) * Math.min(1, dt * 1.2);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (input.brake) p.altitude = Math.min(CONFIG.heliMaxAltitude, p.altitude + CONFIG.heliClimb * dt);
      if (input.sprint) p.altitude = Math.max(0, p.altitude - CONFIG.heliClimb * dt);
      car.x = Math.max(40, Math.min(CONFIG.worldWidth - 40, car.x));
      car.y = Math.max(40, Math.min(CONFIG.worldHeight - 40, car.y));
      p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
    } else {
      const top = car.maxSpeed || CONFIG.carTopSpeed;
      if (input.up) car.speed += CONFIG.carAccel * dt;
      if (input.down) car.speed -= CONFIG.carBrake * dt;
      if (input.brake) car.speed *= Math.max(0, 1 - 3 * dt);
      if (input.left) car.angle -= 2.1 * dt * Math.min(1, Math.abs(car.speed) / 120 + 0.25) * Math.sign(car.speed || 1);
      if (input.right) car.angle += 2.1 * dt * Math.min(1, Math.abs(car.speed) / 120 + 0.25) * Math.sign(car.speed || 1);
      car.speed = Math.max(-CONFIG.carReverseSpeed, Math.min(top, car.speed));
      car.speed *= Math.max(0, 1 - 0.35 * dt);
      if (Math.abs(car.speed) < 4 && !input.up && !input.down) car.speed = 0;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const hit = moveWithCollision(state, car, nx, ny, 16);
      if (hit && Math.abs(car.speed) > 200) {
        car.condition = Math.max(0, car.condition - 2);
        state.audio?.crash?.();
        car.speed *= -0.25;
      }
      p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
      state.stats.distanceDriven += Math.abs(car.speed) * dt;
    }
  }

  // --- Shooting ---
  if (input.shoot || input.mouseDown) fireWeapon(state);
  updateBullets(state, dt);

  // --- Wanted: heat cools off when Rico stays clean ---
  p.quietTimer += dt;
  if (p.quietTimer > CONFIG.wantedDecaySeconds && p.wanted > 0) {
    p.wanted--;
    p.quietTimer = 0;
    p.wantedHeat = 0;
    state.message = 'You laid low — wanted level dropped.';
    state.messageTimer = 2.5;
  }
  updatePolice(state, dt);

  // Busted: a cop holding Rico on foot for two seconds ends the run.
  let copNear = false;
  for (const cop of state.cops) if (Math.hypot(cop.x - p.x, cop.y - p.y) < 46) copNear = true;
  if (!copNear) state.bustedHold = 0;
  if (state.bustedHold > CONFIG.bustedHoldSeconds && p.onFoot) {
    state.screen = 'over';
    state.overReason = 'busted';
  }
  if (p.health <= 0) {
    state.screen = 'over';
    state.overReason = 'wasted';
  }
  if (p.armor < 0) p.armor = 0;

  // --- Missions ---
  const note = updateMissions(state, dt);
  if (note) { state.message = note; state.messageTimer = 3.5; state.audio?.pickup?.(); saveGame(state); }
  p.rank = rankFor(p.rp);

  // --- Camera follows the player ---
  const viewW = state.viewW || 1280;
  const viewH = state.viewH || 720;
  const tx = Math.max(viewW / 2, Math.min(CONFIG.worldWidth - viewW / 2, p.x));
  const ty = Math.max(viewH / 2, Math.min(CONFIG.worldHeight - viewH / 2, p.y));
  state.camera.x += (tx - viewW / 2 - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (ty - viewH / 2 - state.camera.y) * Math.min(1, dt * 5);

  // Ambient audio: engine hum and distant sirens.
  if (state.audio && state.audio.enabled) {
    if (!p.onFoot && Math.abs(p.speed) > 30 && Math.floor(state.time * 4) !== Math.floor((state.time - dt) * 4)) state.audio.engine(Math.abs(p.speed) / CONFIG.carTopSpeed);
    if (p.wanted >= 2 && Math.floor(state.time / 3) !== Math.floor((state.time - dt) / 3)) state.audio.siren();
    if (Math.floor(state.time / 2) !== Math.floor((state.time - dt) / 2)) state.audio.musicTick(state.radioStation);
  }
}

export function saveGame(state) {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify({
      money: state.player.money,
      missionIndex: state.missionIndex,
      rp: state.player.rp,
      missionsDone: state.stats.missionsDone,
      garage: state.garage.slots,
    }));
  } catch { /* storage unavailable — the game still plays */ }
}

export function loadGame(state) {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return false;
    const s = JSON.parse(raw);
    state.player.money = s.money ?? state.player.money;
    state.missionIndex = s.missionIndex ?? 0;
    state.player.rp = s.rp ?? 0;
    state.stats.missionsDone = s.missionsDone ?? 0;
    if (Array.isArray(s.garage)) state.garage.slots = s.garage;
    state.player.rank = rankFor(state.player.rp);
    startMissionTimer(state);
    return true;
  } catch {
    return false;
  }
}

export function missionBriefing(state) {
  const m = currentMission(state);
  if (!m) return null;
  state.dialog = { speaker: 'Mara Voss', text: m.briefing, timer: 8 };
  startMissionTimer(state);
  return m;
}
