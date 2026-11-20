// Solmar Bay — the world: one state, one fixed step. All systems
// (player, heli, traffic, pedestrians, police + dispatch, missions,
// street race, garage, crew, radio, combat) are stepped here in order,
// so a frame is deterministic from the seed and the inputs. No drawing
// and no browser APIs in this file.
import { CAR, FIELD, PLAYER, STEP, WORLD, WANTED_MAX, HELIPAD, GARAGE, GARAGE_REPAIR_COST, HELI, HELI_NAME, RACE_START } from './config.js';
import { createCity, collideBuildings, pointInBuilding, roadPoint } from './city.js';
import { createRandom } from './random.js';
import { makeCar, freshPlate, spawnTraffic, spawnParked, updateTrafficCar, recycleTraffic } from './traffic.js';
import { spawnPedestrians, updatePedestrian, scarePedestrians } from './pedestrians.js';
import {
  addWanted, spawnPoliceCar, spawnPoliceFoot, spawnPoliceHeli, updatePoliceHeli,
  spawnRoadblock, updateRoadblocks, dispatchList, updatePoliceCar, updatePoliceFoot,
  wantedPoliceCount,
} from './police.js';
import { createMissions, currentMission, missionTarget, tryStartMission, updateMission, REWARDS } from './missions.js';
import { makeBullet, updateBullets, spawnPickups, punchHit, createWeapons, currentWeapon, cycleWeapon } from './combat.js';
import { createRadio, nextStation, tickRadio, currentStation, currentSong } from './radio.js';
import { createCrew, crewUse, tickCrew } from './crew.js';
import { districtFor, standingFor } from './districts.js';

export const EVENT_OVER = 1;
export const EVENT_PICKUP = 2;
export const EVENT_CRIME = 4;
export const EVENT_MISSION = 8;

const PED_BARKS = [
  'Nice ride, mister!', 'The cops are everywhere today.', 'Did you see the race last night?',
  'Palm Court is the place to be.', 'I heard Mara is hiring drivers.', 'Watch the road!',
  'The Bay Credit Union never sleeps.', 'Somebody stole my parking spot again.',
];

export const RANKS = [
  { min: 0, name: 'D · STREET' },
  { min: 1000, name: 'C · HUSTLER' },
  { min: 2500, name: 'B · FIXER' },
  { min: 5000, name: 'A · KINGPIN' },
  { min: 8000, name: 'S · LEGEND OF THE BAY' },
];

export function rankFor(rp) {
  let rank = RANKS[0];
  for (const r of RANKS) if (rp >= r.min) rank = r;
  const next = RANKS.find((r) => r.min > rp);
  return { name: rank.name, rp, nextMin: next ? next.min : null };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const RACE_CHECKPOINTS = [
  { x: 2800, y: 850 }, { x: 2800, y: 1850 }, { x: 1000, y: 1850 }, { x: 400, y: 350 },
];

export function createWorld(random) {
  const city = createCity(random);
  const state = {
    random, city,
    time: 0, dayTime: 10.5, // late morning, sun-soaked
    money: 40, health: PLAYER.health, armor: 0, rp: 0,
    wanted: 0, crimeTimer: 99, wantedTimer: 0, lastDamage: -99,
    player: { x: 1600, y: 1850, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null, heli: null, punchCd: 0, invuln: 0 },
    cars: [], peds: [], policeCars: [], policeFoot: [],
    bullets: [], particles: [], skids: [], pickups: [],
    courierCar: null, courierHits: 0,
    helis: [], policeHeli: null, roadblocks: [], dispatch: [],
    race: null, raceTimer: 0,
    camera: { x: 1600, y: 1850 },
    missions: createMissions(),
    missionTarget: null,
    message: '', messageTimer: 0,
    dialog: null, dialogTimer: 0, barkTimer: 14,
    radio: createRadio(),
    crew: createCrew(),
    weapons: createWeapons(),
    nearGarage: false, nearRace: false, nearHeli: false,
    over: false, overReason: '',
    skidTimer: 0, engineSpeed: 0,
  };

  function say(text, seconds) {
    state.message = text;
    state.messageTimer = seconds || 4;
  }

  function sayDialog(speaker, text, seconds) {
    state.dialog = { speaker, text };
    state.dialogTimer = seconds || 5;
  }

  function addRp(n) { state.rp += n; }

  function makeHeli() {
    return {
      x: HELIPAD.x, y: HELIPAD.y, angle: -Math.PI / 2, speed: 0, alt: 0,
      kind: 'heli', name: HELI_NAME, color: '#f59e0b', id: 9001,
      length: HELI.length, width: HELI.width, condition: 100,
    };
  }

  function reset() {
    const start = roadPoint(city, 1600, 1850, random);
    state.time = 0;
    state.dayTime = 10.5;
    state.money = 40;
    state.health = PLAYER.health;
    state.armor = 0;
    state.rp = 0;
    state.wanted = 0;
    state.crimeTimer = 99;
    state.wantedTimer = 0;
    state.lastDamage = -99;
    state.player.x = start.x;
    state.player.y = start.y;
    state.player.angle = -Math.PI / 2;
    state.player.speed = 0;
    state.player.onFoot = true;
    state.player.car = null;
    state.player.heli = null;
    state.player.punchCd = 0;
    state.player.invuln = 0;
    state.cars = [...spawnParked(random, city, 14), ...spawnTraffic(random, city, null, 12)];
    state.peds = spawnPedestrians(random, 26);
    state.policeCars = [];
    state.policeFoot = [];
    state.bullets = [];
    state.particles = [];
    state.skids = [];
    state.pickups = spawnPickups(random, 10);
    state.courierCar = null;
    state.courierHits = 0;
    state.helis = [makeHeli()];
    state.policeHeli = null;
    state.roadblocks = [];
    state.dispatch = [];
    state.race = null;
    state.raceTimer = 0;
    state.camera.x = start.x;
    state.camera.y = start.y;
    state.missions = createMissions();
    state.missionTarget = missionTarget(state.missions);
    state.message = 'Welcome to Solmar Bay, Rico. Follow the gold marker.';
    state.messageTimer = 5;
    state.dialog = { speaker: 'Mara Voss', text: 'Rico, you owe the Credit Union $2,000. Eight jobs and we are even. First one is at Palm Court.' };
    state.dialogTimer = 7;
    state.barkTimer = 14;
    state.radio = createRadio();
    state.crew = createCrew();
    state.weapons = createWeapons();
    state.nearGarage = false;
    state.nearRace = false;
    state.nearHeli = false;
    state.over = false;
    state.overReason = '';
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random() * Math.PI * 2;
      const s = (0.3 + random() * 0.7) * (speed || 120);
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + random() * 0.4, color });
    }
    if (state.particles.length > 220) state.particles.splice(0, state.particles.length - 220);
  }

  function damagePlayer(amount) {
    if (state.player.invuln > 0 || state.over) return;
    // Armor soaks 60% of a hit first.
    let rest = amount;
    if (state.armor > 0) {
      const soaked = Math.min(state.armor, amount * 0.6);
      state.armor -= soaked;
      rest = amount - soaked;
    }
    state.health -= rest;
    state.lastDamage = state.time;
    state.player.invuln = 1.0;
    burst(state.player.x, state.player.y, '#e5534b', 8, 140);
    if (state.health <= 0) {
      state.health = 0;
      state.over = true;
      state.overReason = 'wasted';
    }
  }

  function damageCar(car, amount) {
    if (!car || car.kind === 'heli') return;
    car.condition = Math.max(5, (car.condition ?? 100) - amount);
  }

  function enterNearestCar() {
    const p = state.player;
    // Helicopter first: it sits on the helipad away from road cars.
    for (const heli of state.helis) {
      const d = Math.hypot(heli.x - p.x, heli.y - p.y);
      if (d < 80) {
        p.heli = heli;
        p.onFoot = false;
        p.x = heli.x;
        p.y = heli.y;
        p.angle = heli.angle;
        say('Skyhawk-9 ready. W/S thrust, A/D turn, SPACE climb, C descend, E to land & exit.', 5);
        sayDialog('Tito Reyes', 'She flies like a dream, Rico. Just don\'t clip the rooftops.', 4);
        return true;
      }
    }
    let best = null;
    let bestD = 70;
    for (const car of state.cars) {
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < bestD) { best = car; bestD = d; }
    }
    if (!best) return false;
    if (best.kind === 'traffic' && best.driver) {
      // Steal it: the driver bails out as a pedestrian.
      best.driver = false;
      state.peds.push({ x: best.x + 30, y: best.y + 30, angle: 0, speed: 60, walkPhase: 0, shirt: '#e74c3c', pants: '#2c3e50', panic: 3, alive: true });
      addWanted(state, 1);
      say('Car stolen! The driver ran off — the cops noticed.', 4);
    }
    best.stolen = true;
    p.car = best;
    p.onFoot = false;
    p.x = best.x;
    p.y = best.y;
    p.angle = best.angle;
    return true;
  }

  function exitCar() {
    const p = state.player;
    if (p.heli) {
      if (p.heli.alt > 15) {
        say('Too high to jump! Land first — hold C to descend.', 3);
        return;
      }
      p.heli.speed = 0;
      p.heli = null;
      p.onFoot = true;
      p.speed = 0;
      return;
    }
    const car = p.car;
    if (!car) return;
    const side = { x: car.x + Math.cos(car.angle + Math.PI / 2) * 34, y: car.y + Math.sin(car.angle + Math.PI / 2) * 34 };
    p.x = clamp(side.x, 20, WORLD.width - 20);
    p.y = clamp(side.y, 20, WORLD.height - 20);
    p.angle = car.angle;
    p.speed = 0;
    p.onFoot = true;
    p.car = null;
    car.speed = 0;
  }

  function stepHeli(dt, input) {
    const p = state.player;
    const heli = p.heli;
    const throttle = input.y < -0.1 ? 1 : 0;
    const reverse = input.y > 0.1 ? 1 : 0;
    const yaw = clamp(input.x, -1, 1);
    heli.angle += yaw * HELI.turn * dt * (heli.speed > 20 ? 1 : 0.6);
    if (throttle) heli.speed += HELI.accel * dt;
    else if (reverse) heli.speed -= HELI.accel * 0.6 * dt;
    else heli.speed -= Math.sign(heli.speed) * 120 * dt;
    heli.speed = clamp(heli.speed, -120, HELI.maxSpeed);
    if (input.climb) heli.alt = clamp(heli.alt + HELI.climb * dt, 0, HELI.maxAlt);
    if (input.descend) heli.alt = clamp(heli.alt - HELI.climb * 1.2 * dt, 0, HELI.maxAlt);
    // No lift, no fly: the heli settles back to the pad.
    if (heli.alt < 5 && Math.abs(heli.speed) < 10 && !input.climb) heli.alt = 0;
    heli.x += Math.cos(heli.angle) * heli.speed * dt;
    heli.y += Math.sin(heli.angle) * heli.speed * dt;
    heli.x = clamp(heli.x, 20, WORLD.width - 20);
    heli.y = clamp(heli.y, 20, WORLD.height - 20);
    // Rooftop clearance: only low flight clips buildings.
    if (heli.alt < 40 && collideBuildings(city, heli, 26)) {
      if (Math.abs(heli.speed) > 120) {
        burst(heli.x, heli.y, '#f2c94c', 8, 120);
        damageCar(heli, 0);
      }
      heli.speed *= 0.4;
    }
    p.x = heli.x;
    p.y = heli.y;
    p.angle = heli.angle;
    p.speed = Math.abs(heli.speed);
    state.engineSpeed = Math.abs(heli.speed) / HELI.maxSpeed;
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    if (p.punchCd > 0) p.punchCd -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (state.weapons.cooldown > 0) state.weapons.cooldown -= dt;
    if (input.enter) {
      if (p.onFoot) enterNearestCar();
      else exitCar();
    }
    if (p.heli) { stepHeli(dt, input); return; }
    if (p.onFoot) {
      const mag = Math.hypot(input.x, input.y);
      if (mag > 0.01) {
        const nx = input.x / Math.max(1, mag);
        const ny = input.y / Math.max(1, mag);
        p.angle = Math.atan2(ny, nx);
        const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
        p.x += nx * speed * dt;
        p.y += ny * speed * dt;
        p.speed = speed;
      } else {
        p.speed = 0;
      }
      p.x = clamp(p.x, 20, WORLD.width - 20);
      p.y = clamp(p.y, 20, WORLD.height - 20);
      collideBuildings(city, p, PLAYER.radius);
      if (input.punch && p.punchCd <= 0) {
        p.punchCd = PLAYER.punchCooldown;
        const hit = punchHit(state, p, PLAYER.punchRange + 14, PLAYER.punchDamage);
        if (hit) {
          burst(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30, '#f2c94c', 6, 100);
          addWanted(state, hit.kind === 'officer' ? 2 : 1);
        }
      }
      if (input.shoot) fireWeapon(input.aimAngle);
    } else if (p.car) {
      const car = p.car;
      const throttle = input.y < -0.1 ? 1 : 0;
      const reverse = input.y > 0.1 ? 1 : 0;
      const steer = clamp(input.x, -1, 1);
      // Worn cars are slower: condition shapes the top speed.
      const topSpeed = CAR.maxSpeed * (0.45 + (car.condition ?? 100) / 100 * 0.55);
      if (throttle) car.speed += CAR.accel * dt;
      else if (reverse) car.speed -= CAR.brake * 0.7 * dt;
      else car.speed -= Math.sign(car.speed) * 140 * dt;
      if (input.brake) car.speed -= Math.sign(car.speed) * CAR.brake * dt;
      car.speed = clamp(car.speed, -CAR.reverseMax, topSpeed);
      if (Math.abs(car.speed) > 5 || throttle) {
        car.angle += steer * CAR.steer * dt * clamp(Math.abs(car.speed) / 160, 0.3, 1) * (car.speed < 0 ? -1 : 1);
      }
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      car.x = clamp(car.x, 20, WORLD.width - 20);
      car.y = clamp(car.y, 20, WORLD.height - 20);
      if (collideBuildings(city, car, 24)) {
        if (Math.abs(car.speed) > 120) {
          burst(car.x, car.y, '#f2c94c', 8, 120);
          damageCar(car, 8);
        }
        car.speed *= 0.4;
      }
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      p.speed = Math.abs(car.speed);
      state.engineSpeed = Math.abs(car.speed) / CAR.maxSpeed;
      if (Math.abs(steer) > 0.7 && Math.abs(car.speed) > 220) {
        state.skidTimer -= dt;
        if (state.skidTimer <= 0) {
          state.skidTimer = 0.06;
          state.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 6 });
          if (state.skids.length > 200) state.skids.shift();
        }
      }
      // Running over a pedestrian is a crime.
      for (const ped of state.peds) {
        if (!ped.alive) continue;
        const d = Math.hypot(ped.x - car.x, ped.y - car.y);
        if (d < 30 && Math.abs(car.speed) > 60) {
          ped.alive = false;
          burst(ped.x, ped.y, '#e5534b', 10, 150);
          addWanted(state, 1);
          say('You hit a pedestrian! Wanted level up.', 3);
        }
      }
      if (input.shoot) fireWeapon(input.aimAngle);
    }
  }

  function fireWeapon(aimAngle) {
    const w = state.weapons;
    const weapon = currentWeapon(w);
    if (w.cooldown > 0) return;
    const p = state.player;
    if (weapon.id === 'fists') {
      if (p.punchCd > 0) return;
      p.punchCd = PLAYER.punchCooldown;
      const hit = punchHit(state, p, PLAYER.punchRange + 14, PLAYER.punchDamage);
      if (hit) {
        burst(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30, '#f2c94c', 6, 100);
        addWanted(state, hit.kind === 'officer' ? 2 : 1);
      }
      return;
    }
    if (weapon.ammo <= 0) {
      say(`${weapon.name} is dry — grab ammo (yellow A pickups) or press Q.`, 3);
      w.cooldown = 0.3;
      return;
    }
    weapon.ammo -= 1;
    w.cooldown = weapon.rate;
    const a = aimAngle !== undefined ? aimAngle : p.angle;
    state.bullets.push(makeBullet(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, a, 'player'));
    if (weapon.id === 'smg') {
      state.bullets.push(makeBullet(p.x + Math.cos(a + 0.06) * 20, p.y + Math.sin(a + 0.06) * 20, a + 0.06, 'player'));
    }
    scarePedestrians(state.peds, p.x, p.y, 320);
    addWanted(state, 1);
  }

  function useCrew(id) {
    const member = crewUse(state.crew, id);
    if (!member) {
      const m = state.crew.members.find((x) => x.id === id);
      if (m) say(`${m.name} is not ready — ${Math.ceil(m.cd)}s left.`, 2);
      return;
    }
    if (id === 'tito') {
      const before = state.wanted;
      state.wanted = Math.max(0, state.wanted - 2);
      if (state.player.car) freshPlate(state.player.car);
      say(`Tito swapped the plates (${state.player.car ? state.player.car.plate : '—'}). Wanted ${before} → ${state.wanted} stars.`, 4);
      sayDialog('Tito Reyes', 'Fresh plates, fresh start. They\'ll never match that car now.', 4);
    } else if (id === 'lena') {
      const car = state.player.car || state.player.heli;
      if (car) {
        car.condition = Math.min(100, (car.condition ?? 100) + 50);
        say(`Lena patched the ${car.name || 'ride'} — condition ${Math.round(car.condition)}%.`, 4);
      } else {
        state.health = Math.min(PLAYER.health, state.health + 25);
        say('Lena patched you up — health +25.', 4);
      }
      sayDialog('Lena Park', 'Good as new. Try not to fold it around a lamppost this time.', 4);
    } else if (id === 'mara') {
      say('Mara is watching the streets — roadblocks and units marked for 15s.', 4);
      sayDialog('Mara Voss', 'Eyes out, Rico. Roadblock on Harbor Row — go around, not through.', 4);
    }
  }

  function useGarage() {
    const p = state.player;
    const d = Math.hypot(p.x - GARAGE.x, p.y - GARAGE.y);
    if (d > GARAGE.r) {
      const rd = Math.hypot(p.x - RACE_START.x, p.y - RACE_START.y);
      if (rd < 90 && !state.race && !state.missions.active) {
        startRace();
        return;
      }
      if (rd < 90) { say('Race start — get clear of the mission first.', 3); return; }
      say('No garage or race start nearby.', 2);
      return;
    }
    if (!p.car) { say('Bring a car into the garage to repair and repaint it.', 3); return; }
    const car = p.car;
    if (state.money < GARAGE_REPAIR_COST && car.condition < 100) {
      say(`Repair costs $${GARAGE_REPAIR_COST} — you have $${state.money}.`, 3);
      return;
    }
    if (car.condition >= 100) {
      // Repaint only.
      const colors = ['#c0392b', '#2980b9', '#f1c40f', '#16a085', '#e67e22', '#9b59b6'];
      car.color = colors[Math.floor(random() * colors.length)];
      say(`Fresh paint on the ${car.name} — looking sharp.`, 3);
      return;
    }
    state.money -= GARAGE_REPAIR_COST;
    car.condition = 100;
    const colors = ['#c0392b', '#2980b9', '#f1c40f', '#16a085', '#e67e22', '#9b59b6'];
    car.color = colors[Math.floor(random() * colors.length)];
    say(`Garage: ${car.name} repaired + repainted for $${GARAGE_REPAIR_COST}. Condition 100%.`, 4);
    sayDialog('Lena Park', 'She\'s showroom fresh. That\'ll be fifty — put it on Rico\'s tab.', 4);
  }

  function startRace() {
    const rivals = [];
    for (let i = 0; i < 2; i += 1) {
      const c = makeCar(RACE_START.x - 60 - i * 60, RACE_START.y + 40, 0, ['#8e44ad', '#16a085'][i], 'racer');
      c.targetSpeed = 320;
      c.speed = 120;
      c.raceIndex = 0;
      rivals.push(c);
    }
    state.race = { checkpoints: RACE_CHECKPOINTS, index: 0, timer: 60, rivals, reward: 200 };
    state.raceTimer = 60;
    say('STREET RACE! Hit the 4 gold gates in order — beat the clock and the rivals.', 5);
    sayDialog('Tito Reyes', 'Two rivals, four gates. First to the last gate takes the pot!', 4);
  }

  function stepRace(dt) {
    const race = state.race;
    if (!race) return null;
    race.timer -= dt;
    state.raceTimer = race.timer;
    if (race.timer <= 0) {
      state.race = null;
      say('Race over — out of time.', 3);
      return 'fail';
    }
    const target = race.checkpoints[race.index];
    const d = Math.hypot(state.player.x - target.x, state.player.y - target.y);
    if (d < 80) {
      race.index += 1;
      if (race.index >= race.checkpoints.length) {
        state.money += race.reward;
        addRp(300);
        state.race = null;
        say(`Race won! +$${race.reward}.`, 5);
        sayDialog('Tito Reyes', 'You smoked them, Rico! The Harbor Sprint is yours.', 4);
        return 'win';
      }
      say(`Gate ${race.index}/${race.checkpoints.length} — next!`, 2);
    }
    // Rivals chase the same gates.
    for (const r of race.rivals) {
      const rt = race.checkpoints[Math.min(r.raceIndex, race.checkpoints.length - 1)];
      const dx = rt.x - r.x;
      const dy = rt.y - r.y;
      const dist = Math.hypot(dx, dy) || 1;
      const want = Math.atan2(dy, dx);
      let diff = want - r.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.angle += clamp(diff, -1, 1) * 2.4 * dt;
      r.speed = Math.min(330, r.speed + 220 * dt);
      r.x += Math.cos(r.angle) * r.speed * dt;
      r.y += Math.sin(r.angle) * r.speed * dt;
      r.x = clamp(r.x, 20, WORLD.width - 20);
      r.y = clamp(r.y, 20, WORLD.height - 20);
      if (dist < 80) {
        r.raceIndex += 1;
        if (r.raceIndex >= race.checkpoints.length) {
          state.race = null;
          say('A rival took the race. Run it back at the start line.', 4);
          return 'lose';
        }
      }
    }
    return null;
  }

  function step(dt, input) {
    if (state.over) return { events: EVENT_OVER, mission: null };
    let events = 0;
    state.time += dt;
    state.dayTime = (10.5 + state.time * 0.004) % 24;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.dialogTimer > 0) state.dialogTimer -= dt;
    if (state.crimeTimer < 999) state.crimeTimer += dt;
    tickCrew(state.crew, dt);
    tickRadio(state.radio, dt, !state.player.onFoot);
    // Proximity flags for HUD hints.
    state.nearGarage = Math.hypot(state.player.x - GARAGE.x, state.player.y - GARAGE.y) < GARAGE.r;
    state.nearRace = Math.hypot(state.player.x - RACE_START.x, state.player.y - RACE_START.y) < 90;
    state.nearHeli = state.helis.some((h) => Math.hypot(state.player.x - h.x, state.player.y - h.y) < 80);
    // Wanted decay: lie low and the heat fades — faster inside the garage,
    // frozen while the police spotlight has you.
    const spotlightOn = state.policeHeli && state.policeHeli.spotlight > 0.5;
    if (state.wanted > 0 && state.crimeTimer > 10 && !spotlightOn) {
      state.wantedTimer += dt * (state.nearGarage ? 3 : 1);
      if (state.wantedTimer > 8) {
        state.wantedTimer = 0;
        state.wanted -= 1;
        if (state.wanted === 0) say('You lost the cops. Heat is off.', 3);
      }
    }

    // One-shot inputs.
    if (input.radio) {
      const st = nextStation(state.radio);
      say(`Radio: ${st.name} — ${currentSong(state.radio).title}`, 3);
    }
    if (input.weapon) {
      const w = cycleWeapon(state.weapons);
      say(`Weapon: ${w.name}${w.ammo === Infinity ? '' : ` — ${w.ammo} rounds`}.`, 2);
    }
    if (input.crew) useCrew(input.crew);
    if (input.garage) useGarage();

    stepPlayer(dt, input || { x: 0, y: 0 });

    // Car-to-car bumps: the player's car shoves traffic aside, and traffic
    // can knock down a player on foot.
    for (const car of state.cars) {
      if (car === state.player.car) continue;
      const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
      if (state.player.car) {
        if (d < 48 && d > 0.01) {
          const push = (48 - d) / 2;
          const nx = (state.player.x - car.x) / d;
          const ny = (state.player.y - car.y) / d;
          state.player.car.x += nx * push;
          state.player.car.y += ny * push;
          car.x -= nx * push;
          car.y -= ny * push;
          if (Math.abs(state.player.car.speed) > 150) {
            burst(car.x, car.y, '#f2c94c', 5, 100);
            state.player.car.speed *= 0.75;
            damageCar(state.player.car, 4);
            if (car.kind === 'traffic') car.speed *= 0.5;
          }
        }
      } else if (car.kind === 'traffic' && d < 22 && d > 0.01 && Math.abs(car.speed) > 80 && !state.player.heli) {
        damagePlayer(10);
        state.player.x += (state.player.x - car.x) / d * 30;
        state.player.y += (state.player.y - car.y) / d * 30;
      }
    }

    // Traffic + pedestrians.
    for (const car of state.cars) {
      if (car.kind === 'traffic') updateTrafficCar(car, dt, random, state.cars);
    }
    recycleTraffic(state.cars, random, state.player);
    for (const ped of state.peds) updatePedestrian(ped, dt, random, state.player);
    state.peds = state.peds.filter((p) => p.alive || random() > 0.002);
    // Random pedestrian barks keep the streets alive.
    state.barkTimer -= dt;
    if (state.barkTimer <= 0) {
      state.barkTimer = 14 + random() * 10;
      const near = state.peds.find((pd) => pd.alive && Math.hypot(pd.x - state.player.x, pd.y - state.player.y) < 220);
      if (near && state.dialogTimer <= 0) {
        sayDialog('Local', PED_BARKS[Math.floor(random() * PED_BARKS.length)], 3.5);
      }
    }

    // Police: spawn to match the wanted level, chase, ram, arrest.
    const wantPolice = state.wanted > 0 ? wantedPoliceCount(state.wanted) : 0;
    while (state.policeCars.length < wantPolice) {
      // Roadblock cars count toward the pool but never chase.
      if (state.roadblocks.some((b) => b.cars.length > 0) && state.policeCars.length >= wantPolice) break;
      spawnPoliceCar(state, random);
    }
    while (state.policeCars.length > wantPolice) {
      const i = state.policeCars.findIndex((c) => c.task !== 'Roadblock');
      if (i < 0) break;
      state.policeCars.splice(i, 1);
    }
    for (const car of state.policeCars) {
      if (car.task === 'Roadblock') continue; // holds the line, never chases
      car.ramCd = Math.max(0, (car.ramCd || 0) - dt);
      const rammed = updatePoliceCar(car, dt, state.player, state.player.car || state.player.heli);
      if (rammed && car.ramCd <= 0) {
        const speed = Math.abs(car.speed);
        if (speed > 90) {
          damagePlayer(Math.min(5, 2 + speed * 0.01));
          if (state.player.car) damageCar(state.player.car, 5);
          burst(car.x, car.y, '#f2c94c', 6, 110);
          car.speed *= 0.5;
          car.ramCd = 1.5;
        }
      }
      collideBuildings(city, car, 24);
    }
    // Air support at 3+ stars, roadblocks at 4+ stars.
    if (state.wanted >= 3 && !state.policeHeli) {
      spawnPoliceHeli(state);
      say('SBPD Air-1 is overhead — spotlight on the streets!', 4);
    }
    if (state.wanted < 3) state.policeHeli = null;
    if (state.policeHeli) updatePoliceHeli(state.policeHeli, dt, state.player);
    if (state.wanted >= 4 && state.roadblocks.length < 2 && random() < 0.01) {
      spawnRoadblock(state, random);
      say('SBPD roadblock ahead! Go around it.', 3);
    }
    updateRoadblocks(state, dt);
    state.dispatch = dispatchList(state);
    if (state.wanted >= 3 && state.player.onFoot && state.policeFoot.length < 2) {
      if (random() < 0.01) spawnPoliceFoot(state, random);
    }
    for (const off of state.policeFoot) {
      if (updatePoliceFoot(off, dt, state.player, state.player.car)) {
        state.over = true;
        state.overReason = 'busted';
        say('Busted by the Solmar Bay Police.', 5);
        return { events: EVENT_OVER, mission: null };
      }
    }
    state.policeFoot = state.policeFoot.filter((o) => o.alive);

    // Bullets.
    updateBullets(state, dt);
    for (const b of state.bullets) {
      for (const ped of state.peds) {
        if (ped.alive && Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
          ped.alive = false;
          b.life = 0;
          burst(ped.x, ped.y, '#e5534b', 8, 130);
          addWanted(state, 1);
        }
      }
      for (const off of state.policeFoot) {
        if (off.alive && Math.hypot(off.x - b.x, off.y - b.y) < 16) {
          off.alive = false;
          b.life = 0;
          addWanted(state, 2);
        }
      }
      if (state.courierCar && Math.hypot(state.courierCar.x - b.x, state.courierCar.y - b.y) < 30) {
        b.life = 0;
        state.courierHits += 1;
        burst(b.x, b.y, '#f2c94c', 6, 110);
      }
    }
    // Ramming the courier counts too (once per second at most).
    if (state.courierCar && state.player.car && (state.courierCar.ramCd || 0) <= 0) {
      const d = Math.hypot(state.courierCar.x - state.player.car.x, state.courierCar.y - state.player.car.y);
      if (d < 52 && Math.abs(state.player.car.speed) > 140) {
        state.courierHits = Math.min(3, state.courierHits + 1);
        state.player.car.speed *= 0.6;
        state.courierCar.speed = 60;
        burst(state.courierCar.x, state.courierCar.y, '#f2c94c', 10, 140);
        state.courierCar.ramCd = 1;
      }
    }
    if (state.courierCar) {
      state.courierCar.ramCd = Math.max(0, (state.courierCar.ramCd || 0) - dt);
      // Courier flees away from the player.
      const c = state.courierCar;
      const dx = c.x - state.player.x;
      const dy = c.y - state.player.y;
      const d = Math.hypot(dx, dy) || 1;
      const want = Math.atan2(dy, dx);
      let diff = want - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.angle += clamp(diff, -1, 1) * 2.2 * dt;
      c.speed = Math.min(380, c.speed + 200 * dt);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      c.x = clamp(c.x, 20, WORLD.width - 20);
      c.y = clamp(c.y, 20, WORLD.height - 20);
      collideBuildings(city, c, 24);
    }

    // Pickups.
    for (const p of state.pickups) {
      if (p.taken) continue;
      const d = Math.hypot(p.x - state.player.x, p.y - state.player.y);
      if (d < 32) {
        p.taken = true;
        events |= EVENT_PICKUP;
        if (p.kind === 'cash') { state.money += 25; say('Picked up $25.', 2); }
        if (p.kind === 'health') { state.health = Math.min(PLAYER.health, state.health + 30); say('Health +30.', 2); }
        if (p.kind === 'armor') { state.armor = Math.min(100, state.armor + 50); say('Armor +50.', 2); }
        if (p.kind === 'ammo') {
          state.weapons.list[1].ammo += 12;
          state.weapons.list[2].ammo += 12;
          say('Ammo +12 pistol, +12 SMG.', 2);
        }
      }
    }
    if (state.pickups.every((p) => p.taken)) state.pickups = spawnPickups(random, 8);

    // Street race (free mode).
    stepRace(dt);

    // Missions.
    const started = tryStartMission(state.missions, state.player);
    if (started) {
      say(`${started.name} — ${started.brief}`, 6);
      sayDialog(started.giver, started.dialog, 6);
      events |= EVENT_MISSION;
      if (started.chase) {
        const c = makeCar(started.start.x + 120, started.start.y, 0, '#8e44ad', 'courier');
        c.targetSpeed = 360;
        c.speed = 200;
        state.courierCar = c;
        state.courierHits = 0;
      }
      if (started.needWanted) addWanted(state, 2);
    }
    const target = missionTarget(state.missions);
    state.missionTarget = state.race ? state.race.checkpoints[state.race.index] : target;
    let missionResult = null;
    if (state.missions.active && target && !state.race) {
      const d = Math.hypot(state.player.x - target.x, state.player.y - target.y);
      const result = updateMission(state.missions, {
        atTarget: d < 80,
        courierHits: state.courierHits,
        wanted: state.wanted,
        inHeli: Boolean(state.player.heli),
      });
      if (result === 'complete') {
        missionResult = 'complete';
        events |= EVENT_MISSION;
        const finished = state.missions.done[state.missions.done.length - 1];
        const reward = REWARDS[finished] || 100;
        state.money += reward;
        addRp(reward * 2);
        say(`Job done! +$${reward} · +${reward * 2} RP.`, 5);
        sayDialog('Mara Voss', `Clean work, Rico. ${state.missions.done.length} of 8 jobs down.`, 4);
        if (state.missions.done.length >= 8) {
          state.message = 'Story complete! You paid off the $2,000 debt — Solmar Bay is yours.';
          state.messageTimer = 8;
        }
        state.courierCar = null;
      } else if (result === 'fail') {
        missionResult = 'fail';
        events |= EVENT_MISSION;
        say('Job failed. Head to the next gold marker.', 5);
        state.courierCar = null;
      } else if (result === 'pickup') {
        missionResult = 'pickup';
        say('Got it — now get to the gold marker.', 4);
      } else if (result === 'need-heat') {
        missionResult = 'need-heat';
        say('You need heat on you for this one — cause some trouble first.', 4);
      } else if (result === 'need-heli') {
        missionResult = 'need-heli';
        say('This leg needs the helicopter — get the Skyhawk-9 at the helipad.', 4);
      } else if (result === 'checkpoint') {
        missionResult = 'checkpoint';
        say('Gate hit — next one!', 2);
      }
    }

    // Health regen after a quiet spell.
    if (state.time - state.lastDamage > 8 && state.health > 0 && state.health < PLAYER.health) {
      state.health = Math.min(PLAYER.health, state.health + 3 * dt);
    }

    // Particles + skids age.
    for (const pt of state.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const s of state.skids) s.life -= dt;
    state.skids = state.skids.filter((s) => s.life > 0);

    // Camera follows the player, clamped to the city.
    const tx = clamp(state.player.x, FIELD.width / 2, WORLD.width - FIELD.width / 2);
    const ty = clamp(state.player.y, FIELD.height / 2, WORLD.height / 2);
    state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);

    if (state.over) return { events: EVENT_OVER | events, mission: missionResult };
    return { events, mission: missionResult };
  }

  reset();
  return {
    state,
    reset,
    step,
    enterNearestCar,
    exitCar,
    say,
    sayDialog,
    addWanted: (n) => addWanted(state, n),
    spawnPoliceCar: () => spawnPoliceCar(state, random),
    district: () => districtFor(state.player.x, state.player.y),
    standing: () => standingFor(state.missions.done.length, state.wanted),
    rank: () => rankFor(state.rp),
    startRace,
    useCrew,
    useGarage,
  };
}

// A world from a seed, for the screenshot stager.
export function createWorldWithSeed(seed) {
  return createWorld(createRandom(seed));
}
