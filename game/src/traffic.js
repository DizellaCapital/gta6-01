// Traffic AI: civilian cars cruise the road grid, turn at intersections,
// and brake when something is right in front of them.

import { CONFIG } from './config.js';
import { randomRoadPoint, roadAxisAt, nearestRoadPoint } from './city.js';
import { range, pick, chance } from './random.js';

const TRAFFIC_COLORS = ['#c9ced6', '#e8b4b8', '#a8c3a0', '#d9c27a', '#8fb8d8', '#d8d8d8'];
const TRAFFIC_NAMES = ['Sunrise Sedan', 'Bay Cruiser', 'Palm Taxi', 'Dune Pickup', 'Harbor Van'];

export function spawnTrafficCar(city, rng) {
  const p = randomRoadPoint(city, rng);
  const axis = roadAxisAt(city, p.x, p.y);
  const angle = axis === 'v' ? (chance(rng, 0.5) ? Math.PI / 2 : -Math.PI / 2) : (chance(rng, 0.5) ? 0 : Math.PI);
  return {
    kind: 'traffic',
    x: p.x,
    y: p.y,
    angle,
    speed: range(rng, CONFIG.TRAFFIC_SPEED * 0.7, CONFIG.TRAFFIC_SPEED),
    color: pick(rng, TRAFFIC_COLORS),
    name: pick(rng, TRAFFIC_NAMES),
    cond: rangeInt(rng, 55, 98),
    w: 34,
    h: 18,
    turnCooldown: 0,
  };
}

function rangeInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// Is anything solid within `dist` ahead of (x, y) along `angle`?
function blockedAhead(world, x, y, angle, dist) {
  const ax = x + Math.cos(angle) * dist;
  const ay = y + Math.sin(angle) * dist;
  for (const c of world.cars) {
    if (c.kind === 'parked') continue;
    const dx = c.x - ax;
    const dy = c.y - ay;
    if (dx * dx + dy * dy < 34 * 34) return true;
  }
  const p = world.player;
  if (p.onFoot) {
    const dx = p.x - ax;
    const dy = p.y - ay;
    if (dx * dx + dy * dy < 26 * 26) return true;
  }
  return false;
}

export function stepTraffic(world, dt) {
  const { city, rng } = world;
  for (const car of world.cars) {
    if (car.kind !== 'traffic') continue;
    car.turnCooldown -= dt;
    const axis = roadAxisAt(city, car.x, car.y);
    // At an intersection, sometimes pick a new direction.
    if (axis === 'both' && car.turnCooldown <= 0 && chance(rng, 0.5)) {
      const options = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      const current = Math.round(car.angle / (Math.PI / 2)) % 4;
      const next = options[(current + (chance(rng, 0.5) ? 1 : 3) + 4) % 4];
      car.angle = next;
      car.turnCooldown = range(rng, 2, 5);
    }
    // Keep the car on its road: nudge back to the centreline.
    const snap = nearestRoadPoint(city, car.x, car.y);
    const movingV = Math.abs(Math.sin(car.angle)) > 0.7;
    if (movingV) {
      car.x += (snap.x - car.x) * Math.min(1, dt * 3);
    } else {
      car.y += (snap.y - car.y) * Math.min(1, dt * 3);
    }
    const want = blockedAhead(world, car.x, car.y, car.angle, 52)
      ? 0
      : CONFIG.TRAFFIC_SPEED;
    car.speed += (want - car.speed) * Math.min(1, dt * 2);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = Math.max(20, Math.min(CONFIG.WORLD_W - 20, car.x));
    car.y = Math.max(20, Math.min(CONFIG.WORLD_H - 20, car.y));
  }
}
