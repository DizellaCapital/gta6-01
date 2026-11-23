// SBPD dispatch: police cars chase and ram the player, roadblocks appear
// at wanted 3+, and a helicopter with a spotlight hunts at wanted 4–5.

import { CONFIG } from './config.js';
import { randomRoadPoint, nearestRoadPoint } from './city.js';
import { range, pick } from './random.js';

const UNIT_NAMES = ['Unit 7', 'Unit 12', 'Unit 23', 'Unit 31', 'Unit 44', 'Unit 58'];
const UNIT_ROLES = ['Intercept', 'Flanking', 'Closing In', 'Roadblock', 'Spotlight', 'Pursuit'];

export function createPolice() {
  return {
    heli: null, // {x, y, angle, spotlight}
    roadblocks: [], // {x, y, angle}
    units: [], // dispatch list shown in the HUD
    spawnTimer: 0,
  };
}

function spawnPoliceCar(world) {
  const p = randomRoadPoint(world.city, world.rng);
  const car = {
    kind: 'police',
    x: p.x,
    y: p.y,
    angle: 0,
    speed: 0,
    color: CONFIG.PALETTE.police,
    name: pick(world.rng, UNIT_NAMES),
    role: pick(world.rng, UNIT_ROLES),
    cond: 100,
    w: 34,
    h: 18,
    flee: 0,
  };
  world.cars.push(car);
  return car;
}

function wantedCarCount(wanted) {
  return [0, 1, 2, 3, 4, 5][wanted] || 0;
}

export function stepPolice(world, dt) {
  const pol = world.police;
  const p = world.player;
  const wanted = world.wanted;

  // Keep the right number of pursuit cars on the road.
  const current = world.cars.filter((c) => c.kind === 'police').length;
  pol.spawnTimer -= dt;
  if (wanted > 0 && current < wantedCarCount(wanted) && pol.spawnTimer <= 0) {
    spawnPoliceCar(world);
    pol.spawnTimer = 1.2;
  }
  if (wanted === 0) {
    world.cars = world.cars.filter((c) => c.kind !== 'police');
    pol.heli = null;
    pol.roadblocks = [];
  }

  // Pursuit: steer toward the player, ram on contact.
  for (const car of world.cars) {
    if (car.kind !== 'police') continue;
    if (car.flee > 0) {
      car.flee -= dt;
      const away = Math.atan2(car.y - p.y, car.x - p.x);
      car.angle = away;
      car.speed = Math.min(car.speed + 200 * dt, 260);
    } else {
      const want = Math.atan2(p.y - car.y, p.x - car.x);
      let diff = want - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const target = 300 + wanted * 28;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
    }
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = Math.max(20, Math.min(CONFIG.WORLD_W - 20, car.x));
    car.y = Math.max(20, Math.min(CONFIG.WORLD_H - 20, car.y));
    // Ram the player, but only once per cooldown so a pile-up cannot
    // shred the car in a second.
    car.ramTimer = (car.ramTimer || 0) - dt;
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < 30 && car.flee <= 0 && car.ramTimer <= 0) {
      car.ramTimer = 0.6;
      if (p.car) {
        p.car.cond = Math.max(0, p.car.cond - 8);
        p.car.speed *= 0.85;
      } else {
        p.hp -= 12;
        if (p.hp <= 0) {
          p.hp = 0;
          world.screen = 'over';
          world.overKind = 'wasted';
        }
      }
    }
  }

  // Separation: keep pursuit cars from stacking on one point.
  const cops = world.cars.filter((c) => c.kind === 'police');
  for (let i = 0; i < cops.length; i++) {
    for (let j = i + 1; j < cops.length; j++) {
      const a = cops[i];
      const b = cops[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < 44) {
        const push = (44 - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }

  // Roadblocks at wanted 3+.
  if (wanted >= CONFIG.ROADBLOCK_MIN_WANTED && pol.roadblocks.length === 0) {
    for (let i = 0; i < 2; i++) {
      const ahead = nearestRoadPoint(world.city, p.x + range(world.rng, 300, 700) * (i === 0 ? 1 : -1), p.y);
      pol.roadblocks.push({ x: ahead.x, y: ahead.y, angle: ahead.axis === 'v' ? 0 : Math.PI / 2 });
    }
  }
  if (wanted < CONFIG.ROADBLOCK_MIN_WANTED) pol.roadblocks = [];

  // Helicopter at wanted 4–5.
  if (wanted >= CONFIG.HELI_MIN_WANTED && !pol.heli) {
    pol.heli = { x: p.x + 300, y: p.y - 300, angle: 0, spotlight: true };
  }
  if (wanted < CONFIG.HELI_MIN_WANTED) pol.heli = null;
  if (pol.heli) {
    const h = pol.heli;
    const want = Math.atan2(p.y - h.y, p.x - h.x);
    let diff = want - h.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    h.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    const dist = Math.hypot(p.x - h.x, p.y - h.y);
    const speed = dist > 260 ? CONFIG.HELI_SPEED : CONFIG.HELI_SPEED * 0.4;
    h.x += Math.cos(h.angle) * speed * dt;
    h.y += Math.sin(h.angle) * speed * dt;
  }

  // Dispatch list for the HUD: nearest units, role, distance in meters.
  const units = world.cars
    .filter((c) => c.kind === 'police')
    .map((c) => ({
      name: c.name,
      role: c.role,
      dist: Math.round(Math.hypot(c.x - p.x, c.y - p.y) / 10),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5);
  if (pol.heli) {
    units.unshift({
      name: 'Air 1',
      role: 'Spotlight',
      dist: Math.round(Math.hypot(pol.heli.x - p.x, pol.heli.y - p.y) / 10),
    });
  }
  pol.units = units;
}
