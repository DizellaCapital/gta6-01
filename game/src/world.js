// Solmar Bay — the world: one state, one fixed step. All systems
// (player, traffic, pedestrians, police, missions, combat) are stepped
// here in order, so a frame is deterministic from the seed and the
// inputs. No drawing and no browser APIs in this file.
import { CAR, FIELD, PLAYER, STEP, WORLD, WANTED_MAX } from './config.js';
import { createCity, collideBuildings, pointInBuilding, roadPoint } from './city.js';
import { createRandom } from './random.js';
import { makeCar, spawnTraffic, spawnParked, updateTrafficCar, recycleTraffic } from './traffic.js';
import { spawnPedestrians, updatePedestrian, scarePedestrians } from './pedestrians.js';
import { addWanted, spawnPoliceCar, spawnPoliceFoot, updatePoliceCar, updatePoliceFoot, wantedPoliceCount } from './police.js';
import { createMissions, currentMission, missionTarget, tryStartMission, updateMission } from './missions.js';
import { makeBullet, updateBullets, spawnPickups, punchHit } from './combat.js';

export const EVENT_OVER = 1;
export const EVENT_PICKUP = 2;
export const EVENT_CRIME = 4;
export const EVENT_MISSION = 8;

const REWARDS = { taxi: 120, delivery: 150, getaway: 250, rescue: 200, courier: 300 };

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function createWorld(random) {
  const city = createCity(random);
  const state = {
    random, city,
    time: 0, dayTime: 10.5, // late morning, sun-soaked
    money: 40, health: PLAYER.health, ammo: 24,
    wanted: 0, crimeTimer: 99, wantedTimer: 0, lastDamage: -99,
    player: { x: 1600, y: 1850, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null, punchCd: 0, invuln: 0 },
    cars: [], peds: [], policeCars: [], policeFoot: [],
    bullets: [], particles: [], skids: [], pickups: [],
    courierCar: null, courierHits: 0,
    camera: { x: 1600, y: 1850 },
    missions: createMissions(),
    missionTarget: null,
    message: '', messageTimer: 0,
    over: false, overReason: '',
    skidTimer: 0, engineSpeed: 0,
  };

  function say(text, seconds) {
    state.message = text;
    state.messageTimer = seconds || 4;
  }

  function reset() {
    const start = roadPoint(city, 1600, 1850, random);
    state.time = 0;
    state.dayTime = 10.5;
    state.money = 40;
    state.health = PLAYER.health;
    state.ammo = 24;
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
    state.camera.x = start.x;
    state.camera.y = start.y;
    state.missions = createMissions();
    state.missionTarget = missionTarget(state.missions);
    state.message = 'Welcome to Solmar Bay, Rico. Follow the gold marker.';
    state.messageTimer = 5;
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
    state.health -= amount;
    state.lastDamage = state.time;
    state.player.invuln = 1.0;
    burst(state.player.x, state.player.y, '#e5534b', 8, 140);
    if (state.health <= 0) {
      state.health = 0;
      state.over = true;
      state.overReason = 'wasted';
    }
  }

  function enterNearestCar() {
    const p = state.player;
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

  function stepPlayer(dt, input) {
    const p = state.player;
    if (p.punchCd > 0) p.punchCd -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (input.enter) {
      if (p.onFoot) enterNearestCar();
      else exitCar();
    }
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
      if (input.shoot && state.ammo > 0) {
        state.ammo -= 1;
        const a = input.aimAngle !== undefined ? input.aimAngle : p.angle;
        state.bullets.push(makeBullet(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, a, 'player'));
        scarePedestrians(state.peds, p.x, p.y, 320);
        addWanted(state, 1);
      }
    } else if (p.car) {
      const car = p.car;
      const throttle = input.y < -0.1 ? 1 : 0;
      const reverse = input.y > 0.1 ? 1 : 0;
      const steer = clamp(input.x, -1, 1);
      if (throttle) car.speed += CAR.accel * dt;
      else if (reverse) car.speed -= CAR.brake * 0.7 * dt;
      else car.speed -= Math.sign(car.speed) * 140 * dt;
      if (input.brake) car.speed -= Math.sign(car.speed) * CAR.brake * dt;
      car.speed = clamp(car.speed, -CAR.reverseMax, CAR.maxSpeed);
      if (Math.abs(car.speed) > 5 || throttle) {
        car.angle += steer * CAR.steer * dt * clamp(Math.abs(car.speed) / 160, 0.3, 1) * (car.speed < 0 ? -1 : 1);
      }
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      car.x = clamp(car.x, 20, WORLD.width - 20);
      car.y = clamp(car.y, 20, WORLD.height - 20);
      if (collideBuildings(city, car, 24)) {
        if (Math.abs(car.speed) > 120) burst(car.x, car.y, '#f2c94c', 8, 120);
        car.speed *= 0.4;
      }
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      p.speed = Math.abs(car.speed);
      state.engineSpeed = Math.abs(car.speed) / CAR.maxSpeed;
      // Skid marks on hard turns at speed.
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
    }
  }

  function step(dt, input) {
    if (state.over) return { events: EVENT_OVER, mission: null };
    let events = 0;
    state.time += dt;
    state.dayTime = (10.5 + state.time * 0.004) % 24;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.crimeTimer < 999) state.crimeTimer += dt;
    // Wanted decay: lie low and the heat fades.
    if (state.wanted > 0 && state.crimeTimer > 10) {
      state.wantedTimer += dt;
      if (state.wantedTimer > 8) {
        state.wantedTimer = 0;
        state.wanted -= 1;
        if (state.wanted === 0) say('You lost the cops. Heat is off.', 3);
      }
    }

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
            if (car.kind === 'traffic') car.speed *= 0.5;
          }
        }
      } else if (car.kind === 'traffic' && d < 22 && d > 0.01 && Math.abs(car.speed) > 80) {
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

    // Police: spawn to match the wanted level, chase, ram, arrest.
    const wantPolice = state.wanted > 0 ? wantedPoliceCount(state.wanted) : 0;
    while (state.policeCars.length < wantPolice) spawnPoliceCar(state, random);
    while (state.policeCars.length > wantPolice) state.policeCars.pop();
    for (const car of state.policeCars) {
      car.ramCd = Math.max(0, (car.ramCd || 0) - dt);
      const rammed = updatePoliceCar(car, dt, state.player, state.player.car);
      if (rammed && car.ramCd <= 0) {
        const speed = Math.abs(car.speed);
        if (speed > 90) {
          damagePlayer(Math.min(5, 2 + speed * 0.01));
          burst(car.x, car.y, '#f2c94c', 6, 110);
          car.speed *= 0.5;
          car.ramCd = 1.5;
        }
      }
      collideBuildings(city, car, 24);
    }
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
        if (p.kind === 'ammo') { state.ammo += 12; say('Ammo +12.', 2); }
      }
    }
    if (state.pickups.every((p) => p.taken)) state.pickups = spawnPickups(random, 8);

    // Missions.
    const started = tryStartMission(state.missions, state.player);
    if (started) {
      say(`${started.name} — ${started.brief}`, 6);
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
    state.missionTarget = target;
    let missionResult = null;
    if (state.missions.active && target) {
      const d = Math.hypot(state.player.x - target.x, state.player.y - target.y);
      const result = updateMission(state.missions, {
        atTarget: d < 80,
        courierHits: state.courierHits,
        wanted: state.wanted,
      });
      if (result === 'complete') {
        missionResult = 'complete';
        events |= EVENT_MISSION;
        const finished = state.missions.done[state.missions.done.length - 1];
        const reward = REWARDS[finished] || 100;
        state.money += reward;
        say(`Job done! +$${reward}.`, 5);
        if (state.missions.done.length >= 5) {
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
    const ty = clamp(state.player.y, FIELD.height / 2, WORLD.height - FIELD.height / 2);
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
    addWanted: (n) => addWanted(state, n),
    spawnPoliceCar: () => spawnPoliceCar(state, random),
  };
}

// A world from a seed, for the screenshot stager.
export function createWorldWithSeed(seed) {
  return createWorld(createRandom(seed));
}
