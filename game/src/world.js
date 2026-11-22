// Central world state + the fixed-step simulation: player movement, vehicles,
// wanted decay, garage, save/load, and the per-frame update of every system.
import { CONFIG } from './config.js';
import { makeRng, range, int, pick } from './random.js';
import { roadPoint, nearestRoadPoint, isInBuilding, roadXs, roadYs } from './city.js';
import { makeDistricts, districtAt } from './districts.js';
import { makeTrafficCar, updateTraffic, maintainTraffic } from './traffic.js';
import { makePed, updatePeds, maintainPeds } from './pedestrians.js';
import { syncPolice, updatePolice } from './police.js';
import { makeMissions, tickMissions, stageTarget, currentMission } from './missions.js';
import { makeCombat, fireWeapon, cycleWeapon, addWanted } from './combat.js';
import { makeCrew, callCrew, tickCrew } from './crew.js';
import { makeRadio, nextStation, nextTrack, STATIONS } from './radio.js';
import { sfx, startMusic, stopMusic } from './audio.js';

const GARAGE_SPOT = { x: 2600, y: 1400 };

export function createWorld(seed) {
  const rng = makeRng(seed);
  const world = {
    seed,
    rng,
    time: 0,
    screen: 'title', // title | play | pause | over
    overReason: null, // busted | wasted | story
    player: {
      x: 600, y: 600, angle: 0, speed: 0,
      hp: 100, armor: 50, money: 150, wanted: 0, wantedTimer: 0,
      rp: 0, rank: 'ROOKIE',
      onFoot: true, carId: null, heliId: null,
      alive: true, busted: false,
    },
    cars: [],
    peds: [],
    police: [],
    roadblocks: [],
    heliPolice: null,
    playerHeli: null,
    helipad: { x: 600, y: 2200 },
    missions: makeMissions(),
    combat: makeCombat(),
    crew: makeCrew(),
    radio: makeRadio(),
    garage: [
      { id: 1, name: 'Sunrise', color: '#c0392b', condition: 100, stored: true },
    ],
    districts: makeDistricts(),
    tracers: [],
    message: 'Welcome to Solmar Bay. Find Mara Voss — follow the yellow marker.',
    messageT: 8,
    nextCarId: 1,
    stats: { stolen: 0, jobsDone: 0, distance: 0 },
    saveExists: false,
  };
  resetWorld(world);
  return world;
}

export function resetWorld(world) {
  const rng = world.rng;
  const p = world.player;
  const spawn = roadPoint(600, 600);
  p.x = spawn.x; p.y = spawn.y; p.angle = 0; p.speed = 0;
  p.hp = 100; p.armor = 50; p.money = 150; p.wanted = 0; p.wantedTimer = 0;
  p.rp = 0; p.rank = 'ROOKIE'; p.onFoot = true; p.carId = null; p.heliId = null;
  p.alive = true; p.busted = false;
  world.time = 0;
  world.cars = [];
  world.peds = [];
  world.police = [];
  world.roadblocks = [];
  world.heliPolice = null;
  world.playerHeli = null;
  world.tracers = [];
  world.missions = makeMissions();
  world.combat = makeCombat();
  world.crew = makeCrew();
  world.radio = makeRadio();
  world.messageT = 8;
  world.nextCarId = 1;
  // Parked cars along the roads.
  const spots = [
    [1000, 200, '#c0392b', 'Sunrise'], [1800, 600, '#2980b9', 'Comet'],
    [2200, 600, '#8e44ad', 'Comet'], [1400, 1000, '#27ae60', 'Bison'],
    [2600, 1400, '#d35400', 'Marlin'], [600, 1800, '#7f8c8d', 'Falcon'],
    [1800, 2200, '#16a085', 'Vortex'], [3000, 1000, '#f39c12', 'Dune'],
  ];
  for (const [x, y, color, name] of spots) {
    world.cars.push({
      id: world.nextCarId++, x, y, angle: rng() < 0.5 ? 0 : Math.PI / 2,
      speed: 0, color, kind: 'parked', name, health: 100, driver: null,
    });
  }
  // Traffic.
  for (let i = 0; i < 16; i++) {
    const xs = roadXs();
    const ys = roadYs();
    const vertical = rng() < 0.5;
    const car = makeTrafficCar(
      rng,
      vertical ? xs[int(rng, 0, xs.length - 1)] : int(rng, 200, 3000),
      vertical ? int(rng, 200, 2200) : ys[int(rng, 0, ys.length - 1)],
    );
    car.id = world.nextCarId++;
    world.cars.push(car);
  }
  // Pedestrians.
  for (let i = 0; i < 26; i++) {
    const xs = roadXs();
    const ys = roadYs();
    world.peds.push(makePed(
      rng,
      xs[int(rng, 0, xs.length - 1)] + (rng() < 0.5 ? 34 : -34),
      ys[int(rng, 0, ys.length - 1)] + (rng() < 0.5 ? 34 : -34),
    ));
  }
  // Player helicopter parked on the helipad.
  world.playerHeli = { id: world.nextCarId++, x: world.helipad.x, y: world.helipad.y, angle: 0, alt: 0, speed: 0, parked: true };
}

export function playerCar(world) {
  if (world.player.carId == null) return null;
  return world.cars.find((c) => c.id === world.player.carId) || null;
}

export function rankFor(rp) {
  if (rp >= 900) return 'KINGPIN';
  if (rp >= 600) return 'BOSS';
  if (rp >= 350) return 'HUSTLER';
  if (rp >= 150) return 'STREET';
  return 'ROOKIE';
}

function nearestCar(world, maxD) {
  const p = world.player;
  let best = null;
  let bestD = maxD;
  for (const c of world.cars) {
    if (c.kind === 'police') continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function tryEnterVehicle(world) {
  const p = world.player;
  // Helicopter first: near the helipad and the heli is parked there.
  const h = world.playerHeli;
  if (h && h.parked && Math.hypot(h.x - p.x, h.y - p.y) < 70) {
    p.onFoot = false;
    p.heliId = h.id;
    h.parked = false;
    world.message = 'Helicopter ready — W/S climb and dive, A/D steer.';
    sfx('heli');
    return;
  }
  const car = nearestCar(world, 64);
  if (!car) return;
  p.onFoot = false;
  p.carId = car.id;
  car.kind = 'player';
  if (car.driver === 'traffic') {
    car.driver = null;
    world.stats.stolen++;
    addWanted(world, 1);
    world.message = `You jacked a ${car.name}! A witness called it in — wanted +1.`;
  } else {
    world.message = `You are driving the ${car.name}.`;
  }
  sfx('door');
}

function exitVehicle(world) {
  const p = world.player;
  if (p.heliId != null) {
    const h = world.playerHeli;
    h.alt = 0;
    h.parked = true;
    p.heliId = null;
    p.onFoot = true;
    p.x = h.x + 40;
    p.y = h.y + 40;
    world.message = 'Landed the helicopter.';
    return;
  }
  const car = playerCar(world);
  if (!car) return;
  p.carId = null;
  p.onFoot = true;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  p.angle = car.angle;
  car.kind = car.driver ? 'traffic' : 'parked';
  car.speed = 0;
  // Garage: parking in the garage spot stores the car.
  if (Math.hypot(car.x - GARAGE_SPOT.x, car.y - GARAGE_SPOT.y) < 90) {
    const found = world.garage.find((g) => g.name === car.name && g.color === car.color);
    if (!found) {
      world.garage.push({ id: world.nextCarId, name: car.name, color: car.color, condition: Math.round(car.health), stored: true });
      world.message = `${car.name} stored in your garage.`;
    } else {
      found.condition = Math.round(car.health);
      world.message = `${car.name} parked in the garage. Condition ${found.condition}%.`;
    }
    world.cars = world.cars.filter((c) => c !== car);
  }
}

function stepPlayer(world, input, dt) {
  const p = world.player;
  if (!p.alive) return;
  if (p.heliId != null) {
    const h = world.playerHeli;
    if (input.up) h.alt = Math.min(220, h.alt + CONFIG.HELI_CLIMB * dt);
    if (input.down) h.alt = Math.max(0, h.alt - CONFIG.HELI_CLIMB * dt);
    if (input.left) h.angle -= 2.2 * dt;
    if (input.right) h.angle += 2.2 * dt;
    const throttle = input.up || input.down ? 1 : 0.6;
    h.speed = CONFIG.HELI_SPEED * (input.up ? 1 : 0.7) * throttle;
    h.x += Math.cos(h.angle) * h.speed * dt;
    h.y += Math.sin(h.angle) * h.speed * dt;
    h.x = Math.max(40, Math.min(CONFIG.WORLD_W - 40, h.x));
    h.y = Math.max(40, Math.min(CONFIG.WORLD_H - 40, h.y));
    p.x = h.x; p.y = h.y; p.angle = h.angle; p.speed = h.speed;
    world.stats.distance += h.speed * dt;
    return;
  }
  const car = playerCar(world);
  if (car) {
    if (input.up) car.speed = Math.min(CONFIG.CAR_MAX_SPEED, car.speed + CONFIG.CAR_ACCEL * dt);
    else if (input.down) car.speed = Math.max(-CONFIG.CAR_REVERSE_SPEED, car.speed - CONFIG.CAR_ACCEL * dt);
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 240 * dt);
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const dir = car.speed >= 0 ? 1 : -1;
    car.angle += steer * CONFIG.CAR_TURN * dt * dir * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    car.bumpCd = Math.max(0, (car.bumpCd || 0) - dt);
    car.rbCd = Math.max(0, (car.rbCd || 0) - dt);
    if (!isInBuilding(nx, ny, 12)) {
      car.x = nx;
      car.y = ny;
    } else if (!isInBuilding(nx, car.y, 12)) {
      // Slide along the wall instead of stopping dead.
      car.x = nx;
    } else if (!isInBuilding(car.x, ny, 12)) {
      car.y = ny;
    } else {
      car.speed *= 0.4;
      if (car.bumpCd <= 0) {
        car.health = Math.max(0, car.health - 4);
        car.bumpCd = 0.6;
        sfx('crash');
      }
    }
    car.x = Math.max(30, Math.min(CONFIG.WORLD_W - 30, car.x));
    car.y = Math.max(30, Math.min(CONFIG.WORLD_H - 30, car.y));
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
    world.stats.distance += Math.abs(car.speed) * dt;
    // Roadblock collision (cooldown so one barrier cannot shred the car).
    for (const rb of world.roadblocks) {
      if (Math.hypot(car.x - rb.x, car.y - rb.y) < 44 && Math.abs(car.speed) > 60 && car.rbCd <= 0) {
        car.speed *= -0.3;
        car.health = Math.max(0, car.health - 10);
        car.rbCd = 1.5;
        sfx('crash');
        world.message = 'You smashed through a roadblock!';
      }
    }
    if (car.health <= 0) {
      world.message = 'Your car is wrecked. Get out!';
      exitVehicle(world);
    }
    return;
  }
  // On foot.
  const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (mx || my) {
    const len = Math.hypot(mx, my);
    const nx = p.x + (mx / len) * CONFIG.WALK_SPEED * dt;
    const ny = p.y + (my / len) * CONFIG.WALK_SPEED * dt;
    if (!isInBuilding(nx, p.y, 8)) p.x = nx;
    if (!isInBuilding(p.x, ny, 8)) p.y = ny;
    p.angle = Math.atan2(my, mx);
    p.speed = CONFIG.WALK_SPEED;
    world.stats.distance += CONFIG.WALK_SPEED * dt;
  } else {
    p.speed = 0;
  }
  p.x = Math.max(20, Math.min(CONFIG.WORLD_W - 20, p.x));
  p.y = Math.max(20, Math.min(CONFIG.WORLD_H - 20, p.y));
}

function tryBusted(world) {
  const p = world.player;
  if (p.wanted <= 0 || !p.alive) return;
  // Busted when on foot, wanted, and a police unit is very close and slow.
  if (p.onFoot && p.heliId == null) {
    for (const u of world.police) {
      if (u.dead || u.stunned > 0) continue;
      const d = Math.hypot(u.x - p.x, u.y - p.y);
      if (d < 34 && u.speed < 60) {
        p.busted = true;
        p.alive = false;
        world.screen = 'over';
        world.overReason = 'busted';
        sfx('busted');
        return;
      }
    }
  }
}

export function stepWorld(world, input, dt) {
  if (world.screen !== 'play') return;
  world.time += dt;
  const p = world.player;

  // Edge-triggered actions.
  if (input.interact) {
    input.interact = false;
    if (p.onFoot) tryEnterVehicle(world);
    else exitVehicle(world);
  }
  if (input.weaponNext) {
    input.weaponNext = false;
    world.message = `Weapon: ${cycleWeapon(world.combat)}`;
  }
  if (input.radioNext) {
    input.radioNext = false;
    nextStation(world.radio);
    nextTrack(world.radio);
    startMusic(world.radio.station);
    const st = STATIONS[world.radio.station];
    world.message = `Radio: ${st.name} — ${st.genre}`;
  }
  if (input.crew1) { input.crew1 = false; callCrew(world, 0); }
  if (input.crew2) { input.crew2 = false; callCrew(world, 1); }
  if (input.crew3) { input.crew3 = false; callCrew(world, 2); }
  if (input.shoot) {
    const tx = p.x + Math.cos(p.angle) * 200;
    const ty = p.y + Math.sin(p.angle) * 200;
    const tracer = fireWeapon(world, tx, ty);
    if (tracer && !tracer.dry) {
      world.tracers.push({ ...tracer, t: 0.12 });
      sfx('shot');
    }
  }

  stepPlayer(world, input, dt);
  updateTraffic(world, dt);
  maintainTraffic(world);
  updatePeds(world, dt);
  maintainPeds(world);
  syncPolice(world);
  updatePolice(world, dt);
  tickCrew(world, dt);
  tickMissions(world, dt);

  // Wanted decay while hidden (no police unit close).
  if (p.wanted > 0) {
    let near = false;
    for (const u of world.police) {
      if (!u.dead && Math.hypot(u.x - p.x, u.y - p.y) < 420) { near = true; break; }
    }
    if (!near) {
      p.wantedTimer += dt;
      if (p.wantedTimer > CONFIG.WANTED_DECAY_SECONDS) {
        p.wanted--;
        p.wantedTimer = 0;
        world.message = p.wanted === 0 ? 'You lost the cops. Clean.' : `Heat dropping — wanted ${p.wanted}.`;
      }
    } else {
      p.wantedTimer = 0;
    }
  }

  // District standing ticks up slowly while jobs are done nearby.
  p.rank = rankFor(p.rp);
  if (world.missions.index > world.stats.jobsDone) {
    world.stats.jobsDone = world.missions.index;
    const d = districtAt(p.x, p.y);
    const rec = world.districts.find((x) => x.name === d);
    if (rec) rec.standing = Math.min(100, rec.standing + 12);
    sfx('cash');
  }

  for (const t of world.tracers) t.t -= dt;
  world.tracers = world.tracers.filter((t) => t.t > 0);
  if (world.messageT > 0) world.messageT -= dt;
  if (p.wanted > 0 && Math.floor(world.time * 2) !== Math.floor((world.time - dt) * 2)) {
    // Siren blip twice a second while wanted.
    if (Math.floor(world.time) % 2 === 0) sfx('siren');
  }
  tryBusted(world);
}

export function saveGame(world) {
  try {
    const data = {
      money: world.player.money,
      rp: world.player.rp,
      mission: world.missions.index,
      garage: world.garage,
      time: world.time,
    };
    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(data));
    world.saveExists = true;
    return true;
  } catch {
    return false;
  }
}

export function loadGame(world) {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    world.player.money = data.money ?? 150;
    world.player.rp = data.rp ?? 0;
    world.missions.index = Math.min(data.mission ?? 0, 7);
    if (Array.isArray(data.garage)) world.garage = data.garage;
    world.saveExists = true;
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(CONFIG.SAVE_KEY);
  } catch {
    return false;
  }
}

export function missionTarget(world) {
  return stageTarget(world.missions);
}

export { currentMission };
