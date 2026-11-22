// Solmar Bay central state + simulation step. Everything the game simulates
// lives here; rendering and input only read and poke this state.
import { CFG } from './config.js';
import { makeRng, pick, range } from './random.js';
import { buildCity, isBlocked, nearestRoadPoint, spawnPoint, randomRoadPoint } from './city.js';
import { districtAt } from './districts.js';
import { updateTraffic } from './traffic.js';
import { updatePeds } from './pedestrians.js';
import { updatePolice } from './police.js';
import { currentMission, currentStage, createMissionState, MISSIONS } from './missions.js';
import { createArsenal, tryShoot, currentWeapon } from './combat.js';
import { createRadio, tickRadio } from './radio.js';
import { createCrewState } from './crew.js';
import { sfx } from './audio.js';

export const CAR_NAMES = ['Comet GT', 'Sunrise Sedan', 'Bay Cruiser', 'Dune Buggy', 'Harbor Van', 'Palm Coupe'];
export const CAR_COLORS = ['#c94f42', '#4a7ac9', '#e8b73a', '#5aa06b', '#8a5ac9', '#d0d0d0'];
export const HELIPAD = { x: 576, y: 2592 };
export const GARAGE = { x: 2016, y: 432 };
export const SAVE_KEY = 'solmarbay-save-v2';

export function makeCar(world, x, y, color, parked) {
  const rng = world.rng;
  const vertical = rng() < 0.5;
  return {
    x, y, angle: vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
    speed: 0, dirX: vertical ? 0 : 1, dirY: vertical ? 1 : 0,
    cruise: range(rng, 120, 220), color,
    parked: !!parked, player: false, police: false,
    health: 100, hp: 100, name: pick(rng, CAR_NAMES), tuned: false,
  };
}

export function createWorld(seed = 1) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const spawn = spawnPoint(city, rng);
  const world = {
    seed, rng, city,
    time: 0,
    player: {
      x: spawn.x, y: spawn.y, angle: -Math.PI / 2, speed: 0,
      hp: 100, armor: 50, onFoot: true, car: null, heli: null,
    },
    cars: [], peds: [], police: [],
    policeHeli: { active: false, x: 0, y: 0, angle: 0, spotX: 0, spotY: 0 },
    roadblock: false, roadblockAt: null,
    wanted: 0, lastCrime: -999, crimeCount: 0,
    money: 250, rp: 0, rank: 1,
    mission: createMissionState(),
    arsenal: createArsenal(),
    radio: createRadio(),
    crew: createCrewState(),
    dialog: '', dialogUntil: 0,
    message: '', messageUntil: 0,
    recentShot: -999,
    garage: [],
    bustedTimer: 0,
    over: null, // 'busted' | 'wasted'
    stats: { distance: 0, carsStolen: 0, missionsDone: 0 },
    aimAngle: 0,
    shotFx: null,
  };
  // Parked cars along the roads.
  for (let i = 0; i < 10; i++) {
    const p = randomRoadPoint(city, rng);
    const c = makeCar(world, p.x + range(rng, -20, 20), p.y + range(rng, -20, 20), pick(rng, CAR_COLORS), true);
    world.cars.push(c);
  }
  // Moving traffic.
  for (let i = 0; i < 14; i++) {
    const p = randomRoadPoint(city, rng);
    const c = makeCar(world, p.x, p.y, pick(rng, CAR_COLORS), false);
    c.speed = c.cruise;
    world.cars.push(c);
  }
  // The player's starter car, parked near spawn. It is Rico's own car,
  // so taking it is not a crime.
  const starter = makeCar(world, spawn.x + 70, spawn.y, '#c94f42', true);
  starter.name = 'Sunrise Sedan';
  starter.owned = true;
  world.cars.push(starter);
  // Pedestrians.
  for (let i = 0; i < 26; i++) {
    const rp = nearestRoadPoint(city, 200 + rng() * (CFG.worldW - 400), 200 + rng() * (CFG.worldH - 400));
    world.peds.push({
      x: rp.x + range(rng, -40, 40), y: rp.y + range(rng, -40, 40),
      dirX: 0, dirY: 0, speed: 0, think: 0, hp: 100,
      color: pick(rng, ['#e8e0d0', '#c96a5a', '#5a7ac9', '#e8c85a', '#7ac95a', '#c95aa0']),
    });
  }
  startMission(world);
  return world;
}

export function startMission(world) {
  const m = currentMission(world.mission);
  world.mission.started = true;
  world.mission.timer = currentStage(world.mission).time;
  world.dialog = m.intro;
  world.dialogUntil = world.time + 6;
}

function commitCrime(world, stars) {
  world.wanted = Math.min(CFG.wantedMax, world.wanted + stars);
  world.lastCrime = world.time;
  world.crimeCount++;
}

export function addWanted(world, stars) { commitCrime(world, stars); }

function nearestCar(world, x, y, maxD) {
  let best = null;
  let bestD = maxD;
  for (const c of world.cars) {
    if (c.police) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function moveWithCollision(world, e, dx, dy) {
  const nx = e.x + dx;
  if (!isBlocked(world.city, nx, e.y)) e.x = nx;
  const ny = e.y + dy;
  if (!isBlocked(world.city, e.x, ny)) e.y = ny;
  e.x = Math.max(30, Math.min(CFG.worldW - 30, e.x));
  e.y = Math.max(30, Math.min(CFG.worldH - 30, e.y));
}

export function stepWorld(world, input, dt) {
  if (world.over) return;
  world.time += dt;
  const p = world.player;
  tickRadio(world.radio, dt);

  // Wanted cools off after a quiet stretch.
  if (world.wanted > 0 && world.time - world.lastCrime > CFG.wantedCool) {
    world.wanted--;
    world.lastCrime = world.time;
  }

  // --- mission stage timer / progress ---
  const ms = world.mission;
  if (!ms.done) {
    ms.timer -= dt;
    if (ms.timer <= 0) {
      ms.timer = currentStage(ms).time;
      world.message = 'Too slow — Mara is not happy. Stage restarted.';
      world.messageUntil = world.time + 4;
    }
    const stage = currentStage(ms);
    const d = Math.hypot(p.x - stage.target.x, p.y - stage.target.y);
    if (d < stage.radius) {
      ms.stage++;
      sfx('pickup');
      const m = currentMission(ms);
      if (ms.stage >= m.stages.length) {
        world.money += m.pay;
        world.stats.missionsDone++;
        world.rp += 150;
        world.message = `Job done: ${m.name} — $${m.pay.toLocaleString('en-US')}.`;
        world.messageUntil = world.time + 5;
        sfx('mission');
        ms.index++;
        ms.stage = 0;
        if (ms.index >= MISSIONS.length) {
          ms.done = true;
          world.dialog = 'Mara: That was the big one, Rico. Solmar Bay is ours.';
          world.dialogUntil = world.time + 8;
        } else {
          startMission(world);
        }
      } else {
        ms.timer = currentStage(ms).time;
        world.message = `Stage clear — next: ${currentStage(ms).text}`;
        world.messageUntil = world.time + 4;
      }
    }
  }

  // --- player movement ---
  if (p.heli) {
    const h = p.heli;
    if (input.left) h.angle -= 2.2 * dt;
    if (input.right) h.angle += 2.2 * dt;
    if (input.up) h.speed = Math.min(CFG.heliSpeed, h.speed + 500 * dt);
    if (input.down) h.speed = Math.max(0, h.speed - 600 * dt);
    h.x += Math.cos(h.angle) * h.speed * dt;
    h.y += Math.sin(h.angle) * h.speed * dt;
    h.x = Math.max(40, Math.min(CFG.worldW - 40, h.x));
    h.y = Math.max(40, Math.min(CFG.worldH - 40, h.y));
    p.x = h.x; p.y = h.y; p.angle = h.angle;
    world.stats.distance += h.speed * dt;
    if (input.action && h.speed < 40 && Math.hypot(h.x - HELIPAD.x, h.y - HELIPAD.y) < 160) {
      p.heli = null; p.onFoot = true; p.x = HELIPAD.x; p.y = HELIPAD.y + 60;
      world.message = 'Heli parked at the Marina helipad.';
      world.messageUntil = world.time + 3;
    }
  } else if (p.car) {
    const car = p.car;
    if (input.up) car.speed = Math.min(CFG.carMaxSpeed, car.speed + CFG.carAccel * dt);
    else if (input.down) car.speed = Math.max(-CFG.carReverseMax, car.speed - CFG.carBrake * dt);
    else car.speed *= Math.max(0, 1 - 1.4 * dt);
    if (input.brake) car.speed *= Math.max(0, 1 - 4 * dt);
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const dir = car.speed >= 0 ? 1 : -1;
    car.angle += steer * CFG.carTurn * dt * dir * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
    const dx = Math.cos(car.angle) * car.speed * dt;
    const dy = Math.sin(car.angle) * car.speed * dt;
    const ox = car.x; const oy = car.y;
    moveWithCollision(world, car, dx, dy);
    if ((car.x === ox && Math.abs(dx) > 0.1) || (car.y === oy && Math.abs(dy) > 0.1)) {
      if (Math.abs(car.speed) > 240) { car.health -= 6; sfx('crash'); }
      car.speed *= 0.4;
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    world.stats.distance += Math.abs(car.speed) * dt;
    world.rp += Math.abs(car.speed) * dt * 0.002;
    if (car.health <= 0) {
      world.message = 'Your car is wrecked. Get out and find another.';
      world.messageUntil = world.time + 4;
      p.car = null; p.onFoot = true;
      car.player = false; car.parked = true;
    }
    if (input.action) {
      p.car = null; p.onFoot = true;
      car.player = false;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      sfx('enter');
    }
  } else {
    // On foot.
    const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      p.angle = Math.atan2(my / len, mx / len);
      moveWithCollision(world, p, (mx / len) * CFG.walkSpeed * dt, (my / len) * CFG.walkSpeed * dt);
    }
    if (input.action) {
      const helipadD = Math.hypot(p.x - HELIPAD.x, p.y - HELIPAD.y);
      if (helipadD < 110) {
        p.heli = { x: HELIPAD.x, y: HELIPAD.y, angle: -Math.PI / 2, speed: 0 };
        p.onFoot = false;
        world.message = 'Airborne. Mara is watching the convoy.';
        world.messageUntil = world.time + 3;
        sfx('enter');
      } else {
        const car = nearestCar(world, p.x, p.y, 64);
        if (car) {
          p.car = car; p.onFoot = false;
          car.player = true; car.parked = false;
          if (!car.owned) {
            car.owned = true;
            world.stats.carsStolen++;
            commitCrime(world, 1);
            world.message = `Stole a ${car.name} — the SBPD noticed.`;
            world.messageUntil = world.time + 3;
          } else {
            world.message = `In the ${car.name}.`;
            world.messageUntil = world.time + 2;
          }
          sfx('enter');
        }
      }
    }
  }

  // Garage: store the current car (KeyG, near the Junction garage).
  if (input.pressed && input.pressed.KeyG && p.car) {
    const gd = Math.hypot(p.x - GARAGE.x, p.y - GARAGE.y);
    if (gd < 160 && world.garage.length < 3) {
      world.garage.push({ name: p.car.name, color: p.car.color, condition: Math.round(p.car.health) });
      world.cars = world.cars.filter((c) => c !== p.car);
      p.car = null; p.onFoot = true;
      world.message = 'Car stored in the garage. Press G near the garage to swap back.';
      world.messageUntil = world.time + 4;
    }
    input.pressed.KeyG = false;
  }
  // Repair at the garage (KeyR).
  if (input.pressed && input.pressed.KeyR && p.car) {
    const gd = Math.hypot(p.x - GARAGE.x, p.y - GARAGE.y);
    if (gd < 160 && world.money >= 100) {
      world.money -= 100;
      p.car.health = 100;
      world.message = 'Garage repaired your car ($100).';
      world.messageUntil = world.time + 3;
    }
    input.pressed.KeyR = false;
  }

  // --- shooting ---
  if (input.shoot && !p.heli) {
    const shot = tryShoot(world, world.arsenal, p.x, p.y, world.aimAngle);
    if (shot) {
      world.shotFx = { x: p.x, y: p.y, x2: shot.x, y2: shot.y, until: world.time + 0.08 };
      if (shot.hit) {
        world.recentShot = world.time;
        if (shot.kind === 'cop' || shot.kind === 'ped') commitCrime(world, 1);
        if (shot.ref && shot.ref.hp <= 0) {
          if (shot.kind === 'cop') world.message = 'Cop down. The SBPD will answer for that.';
          else world.message = 'Bystander down. Witnesses are calling it in.';
          world.messageUntil = world.time + 3;
        }
      }
    }
  }

  // --- busted / wasted ---
  if (p.hp <= 0) {
    world.over = 'wasted';
    sfx('busted');
  } else if (p.onFoot && world.wanted > 0) {
    let near = false;
    for (const cop of world.police) {
      if (Math.hypot(cop.x - p.x, cop.y - p.y) < 42) { near = true; break; }
    }
    if (near) {
      world.bustedTimer += dt;
      if (world.bustedTimer > 1.2) { world.over = 'busted'; sfx('busted'); }
    } else world.bustedTimer = 0;
  }

  if (p.hp < 100) p.hp = Math.min(100, p.hp + 1.2 * dt);
  world.rank = 1 + Math.floor(world.rp / 500);

  // The action key is edge-triggered: consume it so one press cannot
  // enter and immediately exit a car in the next fixed step.
  input.action = false;

  updateTraffic(world, dt);
  updatePeds(world, dt);
  updatePolice(world, dt);
}

export function districtOf(world) {
  return districtAt(world.player.x, world.player.y);
}

export function saveGame(world) {
  try {
    const data = {
      money: world.money, rp: world.rp,
      missionIndex: world.mission.index, missionStage: world.mission.stage,
      garage: world.garage, hp: world.player.hp, armor: world.player.armor,
      time: world.time,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function applySave(world, save) {
  if (!save) return;
  world.money = save.money ?? world.money;
  world.rp = save.rp ?? world.rp;
  world.mission.index = Math.min(save.missionIndex ?? 0, MISSIONS.length - 1);
  world.mission.stage = save.missionStage ?? 0;
  world.garage = save.garage ?? [];
  world.player.hp = save.hp ?? 100;
  world.player.armor = save.armor ?? 50;
  startMission(world);
}
