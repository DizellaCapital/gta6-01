// Pedestrians: walk the sidewalks, cross at intersections, flee from gunfire
// and from speeding cars.
import { nearestRoadX, nearestRoadY } from './city.js';
import { range, int, pick } from './random.js';

const PED_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#2ecc71'];

export function makePed(rng, x, y) {
  return {
    x, y,
    angle: pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
    speed: range(rng, 28, 55),
    color: pick(rng, PED_COLORS),
    flee: 0,
    panic: 0,
  };
}

export function updatePeds(world, dt) {
  const rng = world.rng;
  for (const ped of world.peds) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      // Run away from the player.
      const a = Math.atan2(ped.y - world.player.y, ped.x - world.player.x);
      ped.x += Math.cos(a) * 130 * dt;
      ped.y += Math.sin(a) * 130 * dt;
      continue;
    }
    // Panic: run away from a fast nearby car.
    let danger = null;
    for (const car of world.cars) {
      if (car.speed < 150) continue;
      const d = Math.hypot(car.x - ped.x, car.y - ped.y);
      if (d < 70) { danger = car; break; }
    }
    if (danger) {
      const a = Math.atan2(ped.y - danger.y, ped.x - danger.x);
      ped.x += Math.cos(a) * 120 * dt;
      ped.y += Math.sin(a) * 120 * dt;
      continue;
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    // Turn at intersections, stay near the sidewalk (just off the road line).
    const nx = nearestRoadX(ped.x);
    const ny = nearestRoadY(ped.y);
    const movingX = Math.abs(Math.cos(ped.angle)) > 0.7;
    if (movingX) {
      ped.y += (ny.line + (ped.y > ny.line ? 34 : -34) - ped.y) * Math.min(1, 2 * dt);
      if (nx.dist < 10 && rng() < 0.02) ped.angle = pick(rng, [Math.PI / 2, -Math.PI / 2]);
    } else {
      ped.x += (nx.line + (ped.x > nx.line ? 34 : -34) - ped.x) * Math.min(1, 2 * dt);
      if (ny.dist < 10 && rng() < 0.02) ped.angle = pick(rng, [0, Math.PI]);
    }
    // Wrap at map edges.
    if (ped.x < 30) ped.x = 3190;
    if (ped.x > 3190) ped.x = 30;
    if (ped.y < 30) ped.y = 2390;
    if (ped.y > 2390) ped.y = 30;
  }
}

export function maintainPeds(world) {
  if (world.peds.length < 26) {
    const xs = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
    const ys = [200, 600, 1000, 1400, 1800, 2200];
    const ped = makePed(
      world.rng,
      xs[int(world.rng, 0, xs.length - 1)] + (world.rng() < 0.5 ? 34 : -34),
      ys[int(world.rng, 0, ys.length - 1)] + (world.rng() < 0.5 ? 34 : -34),
    );
    world.peds.push(ped);
  }
}
