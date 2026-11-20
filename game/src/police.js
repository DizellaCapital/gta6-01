// Wanted system + Solmar Bay Police Department (SBPD). Crime raises the
// wanted level (1-5 stars); police cars spawn and chase, officers on foot
// chase a player on foot, and a slow player caught by police is busted.
// Escalation: 3+ stars brings the police helicopter with a spotlight,
// 4+ stars brings roadblocks on the roads ahead. Dispatch entries feed
// the HUD panel (unit name, assignment, distance to the player).
import { CAR, WANTED_MAX } from './config.js';
import { makeCar } from './traffic.js';
import { nearestRoadPoint } from './city.js';

const UNIT_NAMES = ['SBPD-07', 'SBPD-12', 'SBPD-19', 'SBPD-23', 'SBPD-31', 'SBPD-44'];
const UNIT_TASKS = ['Pursuit', 'Intercept', 'Roadblock', 'Search', 'Backup'];

export function wantedPoliceCount(wanted) {
  return Math.min(6, wanted + 1);
}

export function addWanted(state, amount) {
  state.wanted = Math.max(0, Math.min(WANTED_MAX, state.wanted + amount));
  state.crimeTimer = 0;
  state.wantedTimer = 0;
}

export function spawnPoliceCar(state, random) {
  const rp = nearestRoadPoint(
    state.player.x + (random() < 0.5 ? -1 : 1) * (350 + random() * 250),
    state.player.y + (random() < 0.5 ? -1 : 1) * (350 + random() * 250),
  );
  const car = makeCar(rp.x, rp.y, 0, '#1c2733', 'police');
  car.targetSpeed = CAR.policeMaxSpeed;
  car.speed = 200;
  car.unit = UNIT_NAMES[state.policeCars.length % UNIT_NAMES.length];
  car.task = UNIT_TASKS[Math.floor(random() * 2)]; // Pursuit / Intercept
  state.policeCars.push(car);
  return car;
}

export function spawnPoliceFoot(state, random) {
  const a = random() * Math.PI * 2;
  state.policeFoot.push({
    x: state.player.x + Math.cos(a) * 320,
    y: state.player.y + Math.sin(a) * 320,
    speed: 175, arrest: 0, alive: true,
  });
}

/** SBPD Air-1: a police helicopter that shadows the player from above. */
export function spawnPoliceHeli(state) {
  state.policeHeli = {
    x: state.player.x - 260, y: state.player.y - 260, angle: 0,
    alt: 240, speed: 0, spotlight: 0, name: 'SBPD Air-1',
  };
  return state.policeHeli;
}

export function updatePoliceHeli(heli, dt, player) {
  if (!heli) return;
  const dx = player.x - heli.x;
  const dy = player.y - heli.y;
  const dist = Math.hypot(dx, dy) || 1;
  const want = Math.atan2(dy, dx);
  let diff = want - heli.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  heli.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
  const target = dist > 320 ? 400 : dist < 180 ? 280 : 350;
  heli.speed += Math.max(-300 * dt, Math.min(300 * dt, target - heli.speed));
  heli.x += Math.cos(heli.angle) * heli.speed * dt;
  heli.y += Math.sin(heli.angle) * heli.speed * dt;
  // Spotlight sweeps onto the player when close.
  heli.spotlight = dist < 520 ? Math.min(1, heli.spotlight + dt * 2) : Math.max(0, heli.spotlight - dt);
}

/** Roadblocks: two parked SBPD cars + barriers across the road ahead. */
export function spawnRoadblock(state, random) {
  const ahead = nearestRoadPoint(
    state.player.x + Math.cos(state.player.angle) * 520,
    state.player.y + Math.sin(state.player.angle) * 520,
  );
  if (!ahead) return null;
  const horizontal = ahead.axis === 'h';
  const block = {
    x: ahead.x, y: ahead.y, angle: horizontal ? 0 : Math.PI / 2,
    cars: [], life: 25,
  };
  for (const off of [-34, 34]) {
    const car = makeCar(
      ahead.x + (horizontal ? 0 : off), ahead.y + (horizontal ? off : 0),
      block.angle, '#1c2733', 'police',
    );
    car.unit = 'SBPD-RB';
    car.task = 'Roadblock';
    car.speed = 0;
    block.cars.push(car);
    state.policeCars.push(car);
  }
  state.roadblocks.push(block);
  return block;
}

export function updateRoadblocks(state, dt) {
  for (const b of state.roadblocks) b.life -= dt;
  state.roadblocks = state.roadblocks.filter((b) => b.life > 0);
  if (state.wanted < 4) {
    // Heat off: roadblock crews stand down (their cars leave the chase pool).
    for (const b of state.roadblocks) {
      for (const c of b.cars) {
        const i = state.policeCars.indexOf(c);
        if (i >= 0) state.policeCars.splice(i, 1);
      }
    }
    state.roadblocks = [];
  }
}

/** Dispatch board for the HUD: unit, assignment, distance in metres. */
export function dispatchList(state) {
  const list = [];
  for (const car of state.policeCars.slice(0, 3)) {
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    list.push({ unit: car.unit || 'SBPD', task: car.task || 'Pursuit', dist: Math.round(d * 0.4) });
  }
  if (state.policeHeli) {
    const d = Math.hypot(state.policeHeli.x - state.player.x, state.policeHeli.y - state.player.y);
    list.push({ unit: 'SBPD Air-1', task: state.policeHeli.spotlight > 0.5 ? 'Spotlight on you' : 'Air support', dist: Math.round(d * 0.4) });
  }
  for (const b of state.roadblocks.slice(0, 1)) {
    const d = Math.hypot(b.x - state.player.x, b.y - state.player.y);
    list.push({ unit: 'SBPD-RB', task: 'Roadblock ahead', dist: Math.round(d * 0.4) });
  }
  return list.slice(0, 4);
}

/** Steer a police car toward the player; returns true if it rammed them. */
export function updatePoliceCar(car, dt, player, playerCar) {
  const tx = playerCar ? playerCar.x : player.x;
  const ty = playerCar ? playerCar.y : player.y;
  const dx = tx - car.x;
  const dy = ty - car.y;
  const dist = Math.hypot(dx, dy) || 1;
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  car.angle += steer * 2.9 * dt * (car.speed > 40 ? 1 : 0.4);
  const target = dist > 700 ? CAR.policeMaxSpeed : dist < 150 ? 180 : CAR.policeMaxSpeed * 0.92;
  car.speed += Math.max(-420 * dt, Math.min(380 * dt, target - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return dist < 46;
}

/** A foot officer runs at the player; arrest builds while touching them. */
export function updatePoliceFoot(officer, dt, player, playerCar) {
  if (playerCar) return false; // Officers cannot arrest a driver at speed.
  const dx = player.x - officer.x;
  const dy = player.y - officer.y;
  const dist = Math.hypot(dx, dy) || 1;
  officer.x += (dx / dist) * officer.speed * dt;
  officer.y += (dy / dist) * officer.speed * dt;
  if (dist < 30) {
    officer.arrest += dt;
    return officer.arrest > 1.6;
  }
  officer.arrest = Math.max(0, officer.arrest - dt);
  return false;
}
