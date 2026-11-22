// Traffic AI: civilian cars cruise the road grid, turn at intersections,
// and slow down for the car ahead.
import { CFG } from './config.js';
import { isBlocked } from './city.js';
import { pick, chance } from './random.js';

export function updateTraffic(world, dt) {
  const { city, rng } = world;
  for (const car of world.cars) {
    if (car.player || car.police || car.parked) continue;
    // At an intersection, sometimes pick a new direction.
    const nearX = Math.abs(car.x - nearest(city.xs, car.x)) < 14;
    const nearY = Math.abs(car.y - nearest(city.ys, car.y)) < 14;
    if (nearX && nearY && chance(rng, 0.02)) {
      const dirs = [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      ];
      const d = pick(rng, dirs);
      car.dirX = d.x; car.dirY = d.y;
    }
    // Slow for the car ahead.
    let targetSpeed = car.cruise;
    for (const other of world.cars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 70 && dx * car.dirX + dy * car.dirY > 0) { targetSpeed = 0; break; }
    }
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2);
    const nx = car.x + car.dirX * car.speed * dt;
    const ny = car.y + car.dirY * car.speed * dt;
    if (!isBlocked(city, nx, ny) && nx > 40 && nx < CFG.worldW - 40 && ny > 40 && ny < CFG.worldH - 40) {
      car.x = nx; car.y = ny;
    } else {
      // Turn around rather than drive into a wall.
      car.dirX = -car.dirX; car.dirY = -car.dirY;
    }
    car.angle = Math.atan2(car.dirY, car.dirX);
  }
}

function nearest(list, v) {
  let best = list[0];
  for (const n of list) if (Math.abs(n - v) < Math.abs(best - v)) best = n;
  return best;
}
