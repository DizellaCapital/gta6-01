// The world: central state, the fixed-step simulation, spawning, entering
// and stealing cars, the wanted ladder, the helicopter pad, the garage and
// save/load. Every other system plugs into the state built here.
import { CFG } from './config.js';
import { makeRng, range } from './random.js';
import { buildCity, isBlocked, nearestRoadPoint, randomRoadPoint, nearestRoadX, nearestRoadY } from './city.js';
import { buildDistricts, districtAt, nudgeStanding } from './districts.js';
import { updateTraffic, spawnTrafficCar, spawnParkedCar } from './traffic.js';
import { updatePeds, spawnPed } from './pedestrians.js';
import { updatePolice } from './police.js';
import { updateMissions, startMission, currentMission, currentStage } from './missions.js';
import { updateBullets, commitCrime, hurtPlayer } from './combat.js';
import { stationById, trackFor } from './radio.js';

export function createWorld(seed, sound) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const S = {
    seed,
    rng,
    sound: sound || null,
    city,
    districts: buildDistricts(),
    time: 0,
    screen: 'title',
    endKind: null,
    nextId: 1,
    player: {
      x: 300, y: CFG.worldHeight - 100, angle: -Math.PI / 2,
      speed: 0, hp: 100, armor: 50, money: 250, wanted: 0,
      hiddenTimer: 0, rp: 0, rank: 'Rookie',
      onFoot: true, car: null, heli: null, alt: 0,
      weapon: 1, ammo: { 0: Infinity, 1: 24, 2: 90 },
      lastShot: -1, flying: false,
    },
    cars: [],
    peds: [],
    police: [],
    heli: null,
    roadblock: null,
    bullets: [],
    missionIdx: 0,
    missionStage: 0,
    missionTimer: 0,
    missionState: 'idle',
    dialog: null,
    messages: [],
    messageLog: [],
    crewCooldowns: [0, 0, 0],
    radioStation: 0,
    garageCars: [],
    camera: { x: 300, y: CFG.worldHeight - 100 },
    shake: 0,
    muzzle: 0,
    stats: { stolen: 0, kills: 0, distance: 0 },
    viewW: 1280,
    viewH: 720,
  };

  // Parked cars the player can steal, spread across the city.
  for (let i = 0; i < 10; i++) {
    const p = randomRoadPoint(rng, city);
    const rp = nearestRoadPoint(city, p.x, p.y);
    const angle = Math.abs(p.x - rp.x) < Math.abs(p.y - rp.y) ? 0 : Math.PI / 2;
    S.cars.push(spawnParkedCar(rng, city, S.nextId++, rp.x + 26, rp.y + 26, angle));
  }
  // One fast car by the marina for mission 4, parked in the open garage lot.
  S.cars.push({
    id: S.nextId++, kind: 'parked', x: 340, y: CFG.worldHeight - 80, angle: 0,
    speed: 0, model: 'Kestrel', color: '#2fae7d', top: 200, condition: 92,
    vertical: false, lane: 0, turnAt: null, flash: 0,
  });
  for (let i = 0; i < 14; i++) S.cars.push(spawnTrafficCar(rng, city, S.nextId++));
  for (let i = 0; i < 26; i++) S.peds.push(spawnPed(rng, city, S.nextId++));

  startMission(S, 0);
  S.missionState = 'active';
  return S;
}

export function saveGame(S) {
  try {
    const data = {
      money: S.player.money,
      rp: S.player.rp,
      missionIdx: S.missionIdx,
      garageCars: S.garageCars.map((c) => ({ model: c.model, color: c.color, condition: c.condition })),
      time: S.time,
    };
    localStorage.setItem(CFG.saveKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function applySave(S, save) {
  if (!save) return;
  S.player.money = save.money ?? S.player.money;
  S.player.rp = save.rp ?? 0;
  if (typeof save.missionIdx === 'number' && save.missionIdx > 0 && save.missionIdx < 8) {
    startMission(S, save.missionIdx);
  }
  S.garageCars = (save.garageCars || []).map((c) => ({
    id: S.nextId++, kind: 'parked', x: 300, y: CFG.worldHeight - 100,
    angle: 0, speed: 0, model: c.model, color: c.color, top: 170,
    condition: c.condition ?? 100, vertical: false, lane: 0, turnAt: null, flash: 0,
  }));
}

// The nearest car the player could enter (parked or traffic, not police).
export function nearestEnterableCar(S, maxDist = 46) {
  let best = null;
  let bestD = maxDist;
  for (const car of S.cars) {
    if (car.kind === 'police') continue;
    const d = Math.hypot(car.x - S.player.x, car.y - S.player.y);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

export function enterCar(S, car) {
  if (!car) return;
  const wasParked = car.kind === 'parked';
  const wasTraffic = car.kind === 'traffic';
  car.kind = 'player';
  S.player.car = car;
  S.player.onFoot = false;
  S.player.x = car.x;
  S.player.y = car.y;
  S.player.angle = car.angle;
  if (wasParked || wasTraffic) {
    S.stats.stolen++;
    commitCrime(S, 1, `stole a ${car.model}`);
    S.messages.push(`Stole a ${car.model} — SBPD notified`);
    nudgeStanding(S.districts, car.x, car.y, -1);
  }
  S.sound?.pickup();
}

export function exitCar(S) {
  const car = S.player.car;
  if (!car) return;
  S.player.car = null;
  S.player.onFoot = true;
  S.player.speed = 0;
  car.speed = 0;
  car.kind = 'parked';
  // Step out to the side of the car.
  const sx = S.player.x - Math.sin(S.player.angle) * 26;
  const sy = S.player.y + Math.cos(S.player.angle) * 26;
  if (!isBlocked(S.city, sx, sy)) {
    S.player.x = sx;
    S.player.y = sy;
  }
}

export function toggleHeli(S) {
  const pad = S.city.helipad;
  const p = S.player;
  if (!p.flying) {
    const d = Math.hypot(p.x - pad.x, p.y - pad.y);
    if (d > pad.r + 30) {
      S.messages.push('Get to the helipad (north-east corner) to fly');
      return;
    }
    if (!p.onFoot) {
      S.messages.push('Get out of the car first');
      return;
    }
    p.flying = true;
    p.onFoot = false;
    p.alt = 0;
    S.messages.push('Rico takes the helicopter — WASD to fly, E to land');
    S.sound?.pickup();
  } else {
    p.flying = false;
    p.onFoot = true;
    p.alt = 0;
    S.messages.push('Landed. The heli stays on the pad.');
  }
}

// One fixed simulation step. Input is { up, down, left, right, enter, shoot,
// aimAngle, crew, radio, weapon } as plain booleans/values.
export function stepWorld(S, input, dt) {
  S.time += dt;
  const p = S.player;

  // Movement.
  if (p.flying) {
    const sp = CFG.heliSpeed;
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      p.x += (mx / len) * sp * dt;
      p.y += (my / len) * sp * dt;
      p.angle = Math.atan2(my, mx);
      p.alt = Math.min(CFG.maxHeliAlt, p.alt + CFG.heliClimb * dt);
      S.stats.distance += sp * dt;
    } else {
      p.alt = Math.max(30, p.alt - CFG.heliClimb * 0.4 * dt);
    }
    p.x = Math.max(40, Math.min(CFG.worldWidth - 40, p.x));
    p.y = Math.max(40, Math.min(CFG.worldHeight - 40, p.y));
  } else if (p.car) {
    const car = p.car;
    let steer = 0;
    if (input.left) steer -= 1;
    if (input.right) steer += 1;
    const moving = Math.abs(car.speed) > 5;
    if (moving) car.angle += steer * CFG.carTurn * dt * (car.speed >= 0 ? 1 : -1);
    if (input.up) car.speed += CFG.carAccel * dt;
    else if (input.down) car.speed -= CFG.carBrake * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 180 * dt);
    car.speed = Math.max(-CFG.carReverseMax, Math.min(CFG.carMaxSpeed, car.speed));
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!isBlocked(S.city, nx, ny)) {
      car.x = nx;
      car.y = ny;
      S.stats.distance += Math.abs(car.speed) * dt;
    } else {
      if (Math.abs(car.speed) > 120) {
        car.condition = Math.max(0, car.condition - 4);
        S.sound?.crash();
        S.shake = Math.min(10, S.shake + 4);
      }
      car.speed *= -0.25;
    }
    car.condition = Math.max(0, car.condition - Math.abs(car.speed) * dt * 0.0015);
    if (car.condition <= 0) {
      S.messages.push(`The ${car.model} broke down`);
      exitCar(S);
    }
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = car.speed;
    S.sound?.engine(true, Math.abs(car.speed) / CFG.carMaxSpeed);
  } else {
    const sp = input.run ? CFG.runSpeed : CFG.walkSpeed;
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      const nx = p.x + (mx / len) * sp * dt;
      const ny = p.y + (my / len) * sp * dt;
      if (!isBlocked(S.city, nx, p.y)) p.x = nx;
      if (!isBlocked(S.city, p.x, ny)) p.y = ny;
      p.angle = Math.atan2(my, mx);
      S.stats.distance += sp * dt;
    }
    p.speed = 0;
    S.sound?.engine(false, 0);
  }

  // Enter / exit vehicles.
  if (input.enter) {
    if (p.flying) toggleHeli(S);
    else if (p.car) exitCar(S);
    else {
      const nearPad = Math.hypot(p.x - S.city.helipad.x, p.y - S.city.helipad.y) < S.city.helipad.r + 30;
      if (nearPad) toggleHeli(S);
      else {
        const car = nearestEnterableCar(S);
        if (car) enterCar(S, car);
      }
    }
  }

  // Garage: driving in stores and repairs the car.
  const g = S.city.garage;
  if (p.car && p.x > g.x && p.x < g.x + g.w && p.y > g.y && p.y < g.y + g.h) {
    const car = p.car;
    if (!S.garageCars.includes(car)) {
      S.garageCars.push(car);
      car.condition = 100;
      S.messages.push(`Garage: ${car.model} stored and repaired`);
      S.player.money += 50;
      S.sound?.pickup();
    }
  }

  // Wanted decay: hide from every unit for a while and a star drops.
  if (p.wanted > 0) {
    let nearestCop = Infinity;
    for (const u of S.police) nearestCop = Math.min(nearestCop, Math.hypot(u.x - p.x, u.y - p.y));
    if (S.heli) nearestCop = Math.min(nearestCop, 400);
    if (nearestCop > 520) {
      p.hiddenTimer += dt;
      if (p.hiddenTimer >= CFG.wantedDecaySeconds) {
        p.wanted -= 1;
        p.hiddenTimer = 0;
        S.messages.push('Wanted level dropped — you lost them');
      }
    } else {
      p.hiddenTimer = 0;
    }
  }

  // Busted: a cop touches Rico on foot while wanted.
  if (p.onFoot && !p.flying && p.wanted > 0) {
    for (const u of S.police) {
      if (Math.hypot(u.x - p.x, u.y - p.y) < 30) {
        S.screen = 'end';
        S.endKind = 'busted';
        break;
      }
    }
  }

  // Pedestrian hit by the player's car.
  if (p.car && Math.abs(p.car.speed) > 60) {
    for (const ped of S.peds) {
      if (ped.hp > 0 && Math.hypot(ped.x - p.x, ped.y - p.y) < 24) {
        ped.hp = 0;
        S.stats.kills++;
        commitCrime(S, 1, 'hit a pedestrian');
        S.shake = Math.min(10, S.shake + 5);
      }
    }
  }

  updateTraffic(S, dt);
  updatePeds(S, dt);
  updatePolice(S, dt);
  updateMissions(S, dt);
  updateBullets(S, dt);

  // Timers and message log.
  if (S.muzzle > 0) S.muzzle -= dt;
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 22);
  if (S.dialog && S.time > S.dialog.until) S.dialog = null;
  while (S.messages.length > 0) {
    const m = S.messages.shift();
    S.messageLog.unshift({ text: m, at: S.time });
    if (S.messageLog.length > 4) S.messageLog.pop();
  }

  // Camera follows the player, clamped inside the world.
  const vw = S.viewW;
  const vh = S.viewH;
  const tx = Math.max(vw / 2 - 60, Math.min(CFG.worldWidth - vw / 2 + 60, p.x));
  const ty = Math.max(vh / 2 - 60, Math.min(CFG.worldHeight - vh / 2 + 60, p.y));
  S.camera.x += (tx - S.camera.x) * Math.min(1, dt * 5);
  S.camera.y += (ty - S.camera.y) * Math.min(1, dt * 5);
}

export function missionProgress(S) {
  const m = currentMission(S);
  if (!m) return null;
  return {
    name: m.name,
    index: S.missionIdx + 1,
    total: 8,
    stage: S.missionStage + 1,
    stages: m.stages.length,
    timer: S.missionTimer,
    next: currentStage(S)?.text || '',
    target: currentStage(S)?.at || null,
    state: S.missionState,
  };
}

export function radioNow(S) {
  const st = stationById(S.radioStation);
  return { name: st.name, track: trackFor(st, S.time) };
}
