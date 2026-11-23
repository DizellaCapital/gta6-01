// Central game state and the simulation step. The world owns the player,
// cars, pedestrians, police, missions, combat, crew, radio and the save
// file. Everything the renderer draws comes from here, and everything the
// staging driver runs goes through stepWorld().
import { CFG } from './config.js';
import { makeRng } from './random.js';
import { buildCity, pointBlocked, nearestRoadPoint, randomRoadPoint } from './city.js';
import { districtAt, standingLabel } from './districts.js';
import { makeTrafficCar, stepTraffic } from './traffic.js';
import { makePed, stepPeds } from './pedestrians.js';
import { createPolice, stepPolice, dispatchRows } from './police.js';
import {
  buildMissions, createMissionState, currentMission, currentStage,
  missionTarget, stepMissions, jobLabel,
} from './missions.js';
import { createCombat, tryShoot, stepBullets, damagePlayer, currentWeapon } from './combat.js';
import { createCrew, stepCrew, useCrew } from './crew.js';
import { createRadio, nextStation, stepRadio, currentStation, currentSong } from './radio.js';
import { createAudio } from './audio.js';

const SAVE_KEY = 'solmarbay-save-v2';

function makePlayerCar(city, rng) {
  return {
    kind: 'player',
    x: city.roadsX[4],
    y: city.roadsY[4] + CFG.LANE,
    angle: 0,
    speed: 0,
    topSpeed: CFG.CAR_TOP,
    color: CFG.PALETTE.playerCar,
    name: 'Sunrise Sedan',
    condition: 100,
    owned: true,
    driver: false,
    w: 34,
    h: 17,
  };
}

function makeParkedCar(city, rng) {
  const spot = randomRoadPoint(city, rng, null, 0);
  return {
    kind: 'parked',
    x: spot.x,
    y: spot.y,
    angle: rng.chance(0.5) ? 0 : Math.PI / 2,
    speed: 0,
    topSpeed: 320,
    color: rng.pick(CFG.CAR_COLORS),
    name: rng.pick(['Coastal Coupe', 'Palm Runner', 'Bay Taxi', 'Harbor Van']),
    condition: rng.int(40, 95),
    owned: false,
    driver: false,
    w: 34,
    h: 17,
  };
}

export function createWorld(seed) {
  const rng = makeRng(seed);
  const city = buildCity(rng);
  const playerCar = makePlayerCar(city, rng);
  const world = {
    seed,
    rng,
    city,
    time: 0,
    screen: 'title',
    endReason: null,
    player: {
      x: playerCar.x,
      y: playerCar.y + 40,
      angle: 0,
      speed: 0,
      onFoot: false,
      inHeli: false,
      car: playerCar,
      heli: null,
      hp: 100,
      armor: 50,
      money: 250,
      wanted: 0,
      crimeTimer: 0,
      fadeTimer: 0,
      rp: 0,
      rank: 'Wheelman',
      aimAngle: 0,
    },
    cars: [playerCar],
    peds: [],
    police: createPolice(),
    missions: buildMissions(city),
    missionState: createMissionState(),
    combat: createCombat(),
    crew: createCrew(),
    radio: createRadio(),
    audio: createAudio(),
    messages: [],
    dialog: null,
    dialogTimer: 0,
    heli: null,
    stats: { jobsDone: 0, carsStolen: 0, starsPeak: 0 },
    saveInfo: null,
  };
  for (let i = 0; i < CFG.TRAFFIC_COUNT; i += 1) world.cars.push(makeTrafficCar(city, rng));
  for (let i = 0; i < 6; i += 1) world.cars.push(makeParkedCar(city, rng));
  for (let i = 0; i < CFG.PED_COUNT; i += 1) world.peds.push(makePed(city, rng));
  // The player's own helicopter waits on the helipad.
  world.heli = {
    kind: 'player-heli',
    x: city.helipad.x,
    y: city.helipad.y,
    angle: 0,
    rotor: 0,
    altitude: 0,
  };
  world.nearestRoadSpot = (x, y) => {
    const p = nearestRoadPoint(city, x, y);
    return { x: p.x, y: p.y };
  };
  world.pushMessage = (text) => {
    world.messages.unshift(text);
    if (world.messages.length > 4) world.messages.pop();
  };
  world.showDialog = (speaker, text, seconds) => {
    world.dialog = { speaker, text };
    world.dialogTimer = seconds || 6;
  };
  return world;
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
  world.screen = 'play';
}

function moveWithCollision(world, entity, nx, ny, radius) {
  // Axis-separated movement so the player slides along walls instead of
  // sticking to them.
  if (!pointBlocked(world.city, nx, entity.y, radius)) entity.x = nx;
  if (!pointBlocked(world.city, entity.x, ny, radius)) entity.y = ny;
}

function nearestCar(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of world.cars) {
    if (car.kind === 'police') continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(world, car) {
  const p = world.player;
  if (car.kind === 'traffic' && car.driver) {
    // Stealing a driven car is a crime.
    p.wanted = Math.min(CFG.WANTED_MAX, p.wanted + 1);
    p.crimeTimer = CFG.CRIME_MEMORY;
    world.stats.carsStolen += 1;
    world.pushMessage(`Stole a ${car.name} — wanted level up!`);
    car.driver = false;
    car.kind = 'player';
  } else if (car.kind === 'parked') {
    p.wanted = Math.min(CFG.WANTED_MAX, p.wanted + 1);
    p.crimeTimer = CFG.CRIME_MEMORY;
    world.stats.carsStolen += 1;
    world.pushMessage(`Stole a parked ${car.name} — wanted level up!`);
    car.kind = 'player';
  }
  if (p.car && p.car !== car) {
    p.car.kind = 'parked';
    p.car.driver = false;
  }
  p.car = car;
  p.onFoot = false;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
}

function exitCar(world) {
  const p = world.player;
  if (!p.car) return;
  p.onFoot = true;
  p.x = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * 26;
  p.y = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * 26;
  p.car.speed = 0;
}

function driveCar(world, car, input, dt) {
  const accel = input.is('KeyW') || input.is('ArrowUp') ? 1 : 0;
  const brake = input.is('KeyS') || input.is('ArrowDown') ? 1 : 0;
  const left = input.is('KeyA') || input.is('ArrowLeft') ? 1 : 0;
  const right = input.is('KeyD') || input.is('ArrowRight') ? 1 : 0;
  if (accel) car.speed += CFG.CAR_ACCEL * dt;
  if (brake) {
    car.speed -= (car.speed > 0 ? CFG.CAR_BRAKE : CFG.CAR_ACCEL) * dt;
  }
  if (!accel && !brake) car.speed -= Math.sign(car.speed) * 120 * dt;
  if (Math.abs(car.speed) < 4 && !accel && !brake) car.speed = 0;
  car.speed = Math.max(-CFG.CAR_REVERSE, Math.min(car.topSpeed, car.speed));
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const grip = Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * CFG.CAR_TURN * grip * Math.sign(car.speed || 1) * dt;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = { x: car.x, y: car.y };
  moveWithCollision(world, car, nx, ny, 20);
  if (Math.hypot(car.x - before.x, car.y - before.y) < 0.5 && Math.abs(car.speed) > 40) {
    car.speed *= 0.4;
    car.condition = Math.max(0, car.condition - 0.4);
  }
  // Bumping traffic cars slows both down.
  for (const other of world.cars) {
    if (other === car || other.kind === 'parked') continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < 30 && d > 0.01) {
      const push = (30 - d) / 2;
      other.x += (dx / d) * push;
      other.y += (dy / d) * push;
      car.speed *= 0.85;
      other.speed *= 0.7;
    }
  }
}

function walkPlayer(world, input, dt) {
  const p = world.player;
  let mx = 0;
  let my = 0;
  if (input.is('KeyW') || input.is('ArrowUp')) my -= 1;
  if (input.is('KeyS') || input.is('ArrowDown')) my += 1;
  if (input.is('KeyA') || input.is('ArrowLeft')) mx -= 1;
  if (input.is('KeyD') || input.is('ArrowRight')) mx += 1;
  if (mx === 0 && my === 0) return;
  const len = Math.hypot(mx, my);
  mx /= len;
  my /= len;
  p.angle = Math.atan2(my, mx);
  const nx = p.x + mx * CFG.WALK_SPEED * dt;
  const ny = p.y + my * CFG.WALK_SPEED * dt;
  moveWithCollision(world, p, nx, ny, 8);
}

function flyHeli(world, input, dt) {
  const p = world.player;
  const heli = p.heli;
  heli.rotor += dt * 26;
  let mx = 0;
  let my = 0;
  if (input.is('KeyW') || input.is('ArrowUp')) my -= 1;
  if (input.is('KeyS') || input.is('ArrowDown')) my += 1;
  if (input.is('KeyA') || input.is('ArrowLeft')) mx -= 1;
  if (input.is('KeyD') || input.is('ArrowRight')) mx += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    heli.angle = Math.atan2(my / len, mx / len);
    heli.x += (mx / len) * CFG.HELI_SPEED * dt;
    heli.y += (my / len) * CFG.HELI_SPEED * dt;
  }
  heli.altitude = Math.min(1, heli.altitude + dt * 0.8);
  heli.x = Math.max(40, Math.min(CFG.WORLD_W - 40, heli.x));
  heli.y = Math.max(40, Math.min(CFG.WORLD_H - 40, heli.y));
  p.x = heli.x;
  p.y = heli.y;
  p.angle = heli.angle;
}

function updateWanted(world, dt) {
  const p = world.player;
  world.stats.starsPeak = Math.max(world.stats.starsPeak, p.wanted);
  if (p.crimeTimer > 0) {
    p.crimeTimer -= dt;
    p.fadeTimer = CFG.WANTED_FADE;
    return;
  }
  if (p.wanted > 0) {
    // Fade only while no police unit is close enough to see the player.
    const seen = world.police.units.some((u) => Math.hypot(u.x - p.x, u.y - p.y) < 260);
    if (!seen) {
      p.fadeTimer -= dt;
      if (p.fadeTimer <= 0) {
        p.wanted -= 1;
        p.fadeTimer = CFG.WANTED_FADE;
        world.pushMessage('The heat is cooling off…');
      }
    }
  }
}

function updateRank(player) {
  const rp = player.rp;
  player.rank = rp >= 900 ? 'Kingpin' : rp >= 600 ? 'Shot Caller' : rp >= 360 ? 'Hustler' : rp >= 120 ? 'Wheelman' : 'Small Timer';
}

export function stepWorld(world, input, dt) {
  world.time += dt;
  const p = world.player;

  if (world.screen === 'play') {
    // Screen flow keys.
    if (input.wasPressed('Escape') || input.wasPressed('KeyP')) {
      world.screen = 'pause';
      return;
    }
    // Radio.
    if (input.wasPressed('KeyQ')) {
      nextStation(world.radio);
      world.pushMessage(`Radio: ${currentStation(world.radio).name} — ${currentSong(world.radio)}`);
    }
    // Crew.
    for (let i = 0; i < 3; i += 1) {
      if (input.wasPressed(world.crew.members[i].key)) {
        const msg = useCrew(world.crew, i, world);
        if (msg) world.pushMessage(msg);
      }
    }
    // Weapons: C cycles the weapon slot.
    if (input.wasPressed('KeyC')) {
      world.combat.slot = (world.combat.slot + 1) % world.combat.weapons.length;
      world.pushMessage(`Weapon: ${currentWeapon(world.combat).name}`);
    }
    // Enter / exit vehicles and the helicopter.
    if (input.wasPressed('KeyE')) {
      if (p.inHeli) {
        p.inHeli = false;
        p.heli.altitude = 0;
        p.heli = null;
        p.onFoot = true;
        world.heli.x = p.x;
        world.heli.y = p.y;
      } else if (!p.onFoot && p.car) {
        exitCar(world);
      } else if (p.onFoot) {
        const nearHeli = Math.hypot(world.heli.x - p.x, world.heli.y - p.y) < 60;
        if (nearHeli) {
          p.inHeli = true;
          p.heli = world.heli;
          p.onFoot = false;
          world.pushMessage('Airborne — Rico is flying the chopper.');
        } else {
          const car = nearestCar(world, p.x, p.y, 64);
          if (car) enterCar(world, car);
        }
      }
    }
    // Shooting: mouse aim, Space fires toward the facing direction.
    if (input.mouse.down || input.is('Space')) {
      const aim = input.mouse.down
        ? Math.atan2(input.mouse.y - (input.centerY || 300), input.mouse.x - (input.centerX || 400))
        : p.angle;
      p.aimAngle = aim;
      if (tryShoot(world.combat, p.x, p.y, aim)) {
        if (world.combat.weapons[world.combat.slot].name !== 'Fists') {
          p.wanted = Math.min(CFG.WANTED_MAX, p.wanted + 1);
          p.crimeTimer = CFG.CRIME_MEMORY;
        }
      }
    }
    // Movement.
    if (p.inHeli) flyHeli(world, input, dt);
    else if (p.onFoot) walkPlayer(world, input, dt);
    else if (p.car) {
      driveCar(world, p.car, input, dt);
      p.x = p.car.x;
      p.y = p.car.y;
      p.angle = p.car.angle;
      p.speed = p.car.speed;
    }

    // World life.
    stepTraffic(world.city, world.cars, dt, world.rng);
    stepPeds(world.city, world.peds, dt, world.rng);
    stepPolice(world.police, world.city, world.rng, p, dt, p.wanted);
    stepBullets(world.combat, world, dt);
    stepCrew(world.crew, dt);
    stepRadio(world.radio, dt);
    updateWanted(world, dt);
    updateRank(p);

    // Police contact: a cruiser ramming the player hard hurts.
    for (const u of world.police.units) {
      if (Math.hypot(u.x - p.x, u.y - p.y) < 26) {
        damagePlayer(p, 6 * dt * 10);
        if (p.car) p.car.condition = Math.max(0, p.car.condition - 2 * dt);
      }
    }

    // Missions.
    const event = stepMissions(world.missions, world.missionState, p, dt, world);
    if (event === 'stage') {
      const stage = currentStage(world.missions, world.missionState);
      world.pushMessage(stage ? `Next: ${stage.text}` : '');
    } else if (event === 'job') {
      const done = world.missions[world.missionState.index - 1];
      world.stats.jobsDone += 1;
      world.pushMessage(`Job done: ${done.name} — $${done.reward} banked.`);
      const next = currentMission(world.missions, world.missionState);
      if (next) world.showDialog('Mara Voss', next.intro, 7);
      saveGame(world);
    } else if (event === 'all-done') {
      world.stats.jobsDone += 1;
      world.pushMessage('All eight jobs done. Solmar Bay is yours, Rico.');
      world.showDialog('Mara Voss', 'Legend status. The city is ours now.', 8);
      saveGame(world);
    } else if (event === 'timeout') {
      world.pushMessage('Too slow — the job window closed. Try the next stage.');
      world.missionState.failed = false;
      world.missionState.timer = 0;
      // Restart the current job from its first stage.
      world.missionState.stage = 0;
    }

    if (world.dialogTimer > 0) {
      world.dialogTimer -= dt;
      if (world.dialogTimer <= 0) world.dialog = null;
    }

    // Busted / wasted.
    if (p.hp <= 0) {
      world.screen = 'end';
      world.endReason = 'wasted';
      saveGame(world);
    } else if (p.wanted >= 4 && world.police.units.some((u) => Math.hypot(u.x - p.x, u.y - p.y) < 30) && p.onFoot) {
      world.screen = 'end';
      world.endReason = 'busted';
      saveGame(world);
    }
  } else if (world.screen === 'title') {
    // The city stays alive behind the title screen.
    stepTraffic(world.city, world.cars, dt, world.rng);
    stepPeds(world.city, world.peds, dt, world.rng);
  }
}

export function saveGame(world) {
  try {
    const data = {
      money: world.player.money,
      jobsDone: world.stats.jobsDone,
      rp: world.player.rp,
      rank: world.player.rank,
      carsStolen: world.stats.carsStolen,
      starsPeak: world.stats.starsPeak,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    world.saveInfo = data;
  } catch (err) {
    // Storage may be unavailable; the game plays on regardless.
  }
}

export function loadSave(world) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    world.saveInfo = data;
    return data;
  } catch (err) {
    return null;
  }
}

export function hudData(world) {
  const p = world.player;
  const d = districtAt(p.x, p.y);
  return {
    money: p.money,
    wanted: p.wanted,
    hp: p.hp,
    armor: p.armor,
    speed: p.inHeli ? Math.round(CFG.HELI_SPEED * 0.6) : Math.round(Math.abs(p.speed || 0) * 2.2),
    carName: p.inHeli ? 'SBPD Chopper' : p.car ? p.car.name : 'On foot',
    carCondition: p.inHeli ? 100 : p.car ? Math.round(p.car.condition) : 0,
    district: d.name,
    standing: `${standingLabel(d.standing)} (${d.standing})`,
    rank: p.rank,
    rp: p.rp,
    job: jobLabel(world.missionState),
    stage: currentStage(world.missions, world.missionState),
    mission: currentMission(world.missions, world.missionState),
    missionState: world.missionState,
    dispatch: dispatchRows(world.police),
    roadblock: world.police.roadblocks.length > 0,
    heli: Boolean(world.police.heli),
    weapon: currentWeapon(world.combat),
    weapons: world.combat.weapons,
    slot: world.combat.slot,
    crew: world.crew.members,
    station: currentStation(world.radio),
    song: currentSong(world.radio),
    messages: world.messages,
    dialog: world.dialog,
  };
}
