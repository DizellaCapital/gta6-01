// Traffic AI. Cars drive on road centre lines, one lane offset to the right,
// turn at intersections and slow down for the car ahead. Directions are the
// four compass headings so cars never cut across a block.
import { CFG } from './config.js';
import { nearestRoadX, nearestRoadY } from './city.js';

const DIRS = [
  { dx: 1, dy: 0, angle: 0 },
  { dx: 0, dy: 1, angle: Math.PI / 2 },
  { dx: -1, dy: 0, angle: Math.PI },
  { dx: 0, dy: -1, angle: -Math.PI / 2 },
];

function dirIndex(angle) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < DIRS.length; i += 1) {
    let d = Math.abs(angle - DIRS[i].angle);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

export function makeTrafficCar(city, rng) {
  const horizontal = rng.chance(0.5);
  const dir = rng.chance(0.5) ? 0 : 2;
  let x;
  let y;
  let angle;
  if (horizontal) {
    y = rng.pick(city.roadsY);
    x = rng.range(CFG.GRID, CFG.WORLD_W - CFG.GRID);
    angle = dir === 0 ? 0 : Math.PI;
  } else {
    x = rng.pick(city.roadsX);
    y = rng.range(CFG.GRID, CFG.WORLD_H - CFG.GRID);
    angle = dir === 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  const lane = CFG.LANE;
  if (angle === 0) y += lane;
  if (angle === Math.PI) y -= lane;
  if (angle === Math.PI / 2) x -= lane;
  if (angle === -Math.PI / 2) x += lane;
  return {
    kind: 'traffic',
    x, y,
    angle,
    speed: rng.range(90, 150),
    topSpeed: rng.range(120, 170),
    color: rng.pick(CFG.CAR_COLORS),
    name: rng.pick(['Sunrise Sedan', 'Coastal Coupe', 'Bay Taxi', 'Harbor Van', 'Palm Runner']),
    condition: rng.int(55, 98),
    owned: false,
    driver: true,
    w: 34,
    h: 17,
  };
}

function atIntersection(city, car) {
  const nx = nearestRoadX(city, car.x);
  const ny = nearestRoadY(city, car.y);
  const di = dirIndex(car.angle);
  const movingH = DIRS[di].dy === 0;
  // On a horizontal road we cross a vertical road when close to its line.
  if (movingH) return { near: nx.dist < 14, cross: nx.value };
  return { near: ny.dist < 14, cross: ny.value };
}

function carAhead(cars, car) {
  const di = dirIndex(car.angle);
  const d = DIRS[di];
  let best = null;
  let bestGap = Infinity;
  for (const other of cars) {
    if (other === car || other.kind === 'parked') continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const along = ox * d.dx + oy * d.dy;
    const side = Math.abs(ox * d.dy - oy * d.dx);
    if (along > 0 && along < 70 && side < 22 && along < bestGap) {
      bestGap = along;
      best = other;
    }
  }
  return best;
}

export function stepTraffic(city, cars, dt, rng) {
  for (const car of cars) {
    if (car.kind !== 'traffic') continue;
    const ahead = carAhead(cars, car);
    const target = ahead ? Math.max(0, ahead.speed * 0.6) : car.topSpeed;
    car.speed += Math.sign(target - car.speed) * 140 * dt;
    if (car.speed < 0) car.speed = 0;
    const info = atIntersection(city, car);
    if (info.near && rng.chance(0.35)) {
      // Turn left or right (never reverse) at this crossing.
      const di = dirIndex(car.angle);
      const turn = rng.chance(0.5) ? 1 : 3; // +90 or -90 degrees
      const ni = (di + turn) % 4;
      const nd = DIRS[ni];
      // Snap onto the crossing road centre line, keeping the lane offset.
      if (nd.dy === 0) {
        car.y = info.cross + (nd.dx > 0 ? CFG.LANE : -CFG.LANE);
        car.x = car.x; // stays on the vertical road line
      } else {
        car.x = info.cross + (nd.dy > 0 ? -CFG.LANE : CFG.LANE);
      }
      car.angle = nd.angle;
    }
    const di = dirIndex(car.angle);
    car.x += DIRS[di].dx * car.speed * dt;
    car.y += DIRS[di].dy * car.speed * dt;
    if (car.x < 30) { car.x = 30; car.angle = 0; }
    if (car.x > CFG.WORLD_W - 30) { car.x = CFG.WORLD_W - 30; car.angle = Math.PI; }
    if (car.y < 30) { car.y = 30; car.angle = Math.PI / 2; }
    if (car.y > CFG.WORLD_H - 30) { car.y = CFG.WORLD_H - 30; car.angle = -Math.PI / 2; }
  }
}
