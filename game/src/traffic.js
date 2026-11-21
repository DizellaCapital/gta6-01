// Traffic: civilian cars that cruise the road grid, turn at intersections
// and slow down for the car ahead. They are also the cars the player steals.
import { CFG } from './config.js';
import { nearestRoadX, nearestRoadY, isBlocked } from './city.js';
import { pick, range } from './random.js';

const MODELS = [
  { name: 'Marlin', color: '#3f7fd0', top: 150 },
  { name: 'Cortina', color: '#d0a23f', top: 140 },
  { name: 'Vela', color: '#7d3fd0', top: 165 },
  { name: 'Sunbeam', color: '#e8e4da', top: 145 },
  { name: 'Kestrel', color: '#2fae7d', top: 175 },
  { name: 'Dune', color: '#c25a2e', top: 155 },
];

export function modelByIndex(i) {
  return MODELS[i % MODELS.length];
}

export function spawnTrafficCar(rng, city, id) {
  const vertical = rng() < 0.5;
  let x;
  let y;
  let angle;
  if (vertical) {
    x = pick(rng, city.roadsX.slice(1, -1)) + (rng() < 0.5 ? -14 : 14);
    y = range(rng, 100, CFG.worldHeight - 100);
    angle = rng() < 0.5 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    y = pick(rng, city.roadsY.slice(1, -1)) + (rng() < 0.5 ? -14 : 14);
    x = range(rng, 100, CFG.worldWidth - 100);
    angle = rng() < 0.5 ? 0 : Math.PI;
  }
  const m = modelByIndex(Math.floor(rng() * MODELS.length));
  return {
    id, kind: 'traffic', x, y, angle, speed: range(rng, 90, CFG.trafficSpeed),
    model: m.name, color: m.color, top: m.top, condition: 100,
    vertical, lane: rng() < 0.5 ? -14 : 14, turnAt: null, flash: 0,
  };
}

export function updateTraffic(S, dt) {
  const city = S.city;
  for (const car of S.cars) {
    if (car.kind !== 'traffic') continue;
    // Slow for the car directly ahead on the same lane.
    let ahead = null;
    for (const other of S.cars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 90 || dist < 1) continue;
      const facing = Math.cos(car.angle) * (dx / dist) + Math.sin(car.angle) * (dy / dist);
      if (facing > 0.85) { ahead = other; break; }
    }
    const targetSpeed = ahead ? 0 : car.top;
    car.speed += Math.max(-260 * dt, Math.min(120 * dt, targetSpeed - car.speed));

    // At an intersection, sometimes turn onto the cross road.
    const rx = nearestRoadX(city, car.x);
    const ry = nearestRoadY(city, car.y);
    const atCross = Math.abs(car.x - rx) < 10 && Math.abs(car.y - ry) < 10;
    if (atCross && car.turnAt !== `${rx},${ry}`) {
      car.turnAt = `${rx},${ry}`;
      if (S.rng() < 0.3) {
        car.vertical = !car.vertical;
        const dir = S.rng() < 0.5 ? -1 : 1;
        car.angle = car.vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
        car.lane = S.rng() < 0.5 ? -14 : 14;
      }
    }

    // Ease the car back onto its lane centre.
    const wantX = car.vertical ? rx + car.lane : car.x;
    const wantY = car.vertical ? car.y : ry + car.lane;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!isBlocked(city, nx, ny)) {
      car.x = nx;
      car.y = ny;
    } else {
      car.speed = 0;
      car.angle += Math.PI / 2;
    }
    if (car.vertical) car.x += (wantX - car.x) * Math.min(1, dt * 2);
    else car.y += (wantY - car.y) * Math.min(1, dt * 2);
    if (car.flash > 0) car.flash -= dt;
  }
}

// A parked car the player can steal: placed on a road shoulder.
export function spawnParkedCar(rng, city, id, x, y, angle) {
  const m = modelByIndex(Math.floor(rng() * MODELS.length));
  return {
    id, kind: 'parked', x, y, angle, speed: 0,
    model: m.name, color: m.color, top: m.top, condition: Math.floor(range(rng, 55, 98)),
    vertical: false, lane: 0, turnAt: null, flash: 0,
  };
}
