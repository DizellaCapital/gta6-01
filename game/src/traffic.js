// Traffic AI: cars cruise along roads, turn at intersections, slow down
// for the car ahead, and never enter buildings.
import { CONFIG } from './config.js';
import { nearestRoadX, nearestRoadY, isOnRoad } from './city.js';
import { range, int, pick } from './random.js';

const CAR_NAMES = ['Sunrise', 'Comet', 'Bison', 'Marlin', 'Vortex', 'Pinto', 'Falcon', 'Dune'];
const CAR_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#7f8c8d', '#16a085', '#f39c12'];

export function makeTrafficCar(rng, x, y, angle) {
  return {
    id: 0,
    x, y,
    angle: angle ?? pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
    speed: range(rng, 90, 170),
    cruise: range(rng, 100, 180),
    color: pick(rng, CAR_COLORS),
    kind: 'traffic',
    name: pick(rng, CAR_NAMES),
    health: 100,
    driver: 'traffic',
    turnCooldown: 0,
  };
}

function carAhead(world, car) {
  const ux = Math.cos(car.angle);
  const uy = Math.sin(car.angle);
  for (const o of world.cars) {
    if (o === car || o.kind === 'parked') continue;
    const dx = o.x - car.x;
    const dy = o.y - car.y;
    const along = dx * ux + dy * uy;
    const side = Math.abs(-dx * uy + dy * ux);
    if (along > 0 && along < 90 && side < 26) return true;
  }
  return false;
}

export function updateTraffic(world, dt) {
  const rng = world.rng;
  for (const car of world.cars) {
    if (car.kind !== 'traffic') continue;
    car.turnCooldown -= dt;
    // Slow for the car ahead.
    const blocked = carAhead(world, car);
    const target = blocked ? 0 : car.cruise;
    car.speed += Math.max(-260 * dt, Math.min(140 * dt, target - car.speed));
    // At an intersection, sometimes turn left/right.
    const nx = nearestRoadX(car.x);
    const ny = nearestRoadY(car.y);
    const atX = nx.dist < 12;
    const atY = ny.dist < 12;
    if (atX && atY && car.turnCooldown <= 0 && rng() < 0.35) {
      const turn = pick(rng, [-Math.PI / 2, Math.PI / 2]);
      car.angle += turn;
      car.turnCooldown = 2;
    }
    // Snap back onto the road centreline if drifted.
    const ux = Math.cos(car.angle);
    const uy = Math.sin(car.angle);
    car.x += ux * car.speed * dt;
    car.y += uy * car.speed * dt;
    if (Math.abs(ux) > 0.7) car.y += (ny.line - car.y) * Math.min(1, 3 * dt);
    else car.x += (nx.line - car.x) * Math.min(1, 3 * dt);
    // Wrap around the map edges so traffic never runs out.
    if (car.x < 40) car.x = CONFIG.WORLD_W - 40;
    if (car.x > CONFIG.WORLD_W - 40) car.x = 40;
    if (car.y < 40) car.y = CONFIG.WORLD_H - 40;
    if (car.y > CONFIG.WORLD_H - 40) car.y = 40;
    if (!isOnRoad(car.x, car.y)) {
      // Pushed off-road somehow: steer back to the nearest road point.
      const px = nearestRoadX(car.x).line;
      const py = nearestRoadY(car.y).line;
      car.angle = Math.atan2(py - car.y, px - car.x);
    }
  }
}

// Keep a healthy number of traffic cars alive.
export function maintainTraffic(world) {
  const traffic = world.cars.filter((c) => c.kind === 'traffic').length;
  if (traffic < 14) {
    const xs = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
    const ys = [200, 600, 1000, 1400, 1800, 2200];
    const vertical = world.rng() < 0.5;
    const car = makeTrafficCar(
      world.rng,
      vertical ? xs[int(world.rng, 0, xs.length - 1)] : int(world.rng, 200, 3000),
      vertical ? int(world.rng, 200, 2200) : ys[int(world.rng, 0, ys.length - 1)],
      vertical ? (world.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (world.rng() < 0.5 ? 0 : Math.PI),
    );
    car.id = world.nextCarId++;
    world.cars.push(car);
  }
}
