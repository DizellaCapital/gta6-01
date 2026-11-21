// Solmar Bay — traffic. Cars drive along the road lattice, turn at
// intersections, and slow down for the car ahead. They never leave a road,
// so they never need building collision checks.
import { CONFIG } from './config.js';
import { makeRng, pick, range, intRange } from './random.js';

export function spawnTraffic(state, count) {
  const rng = makeRng(state.seed + 77);
  state.traffic = [];
  for (let i = 0; i < count; i++) {
    const horizontal = rng() < 0.5;
    const road = horizontal
      ? pick(rng, state.city.roadsY)
      : pick(rng, state.city.roadsX);
    const along = range(rng, 100, (horizontal ? CONFIG.worldWidth : CONFIG.worldHeight) - 100);
    state.traffic.push({
      id: 't' + i,
      kind: 'traffic',
      horizontal,
      road,
      along,
      dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, CONFIG.trafficSpeed * 0.7, CONFIG.trafficSpeed * 1.2),
      color: pick(rng, CONFIG.palette.trafficColors),
      name: pick(rng, ['Comet', 'Falcon', 'Dune', 'Marlin', 'Courier', 'Sable']),
      condition: intRange(rng, 55, 98),
      x: horizontal ? along : road,
      y: horizontal ? road : along,
      angle: horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
    });
  }
}

function nearestCrossing(list, value) {
  let best = list[0];
  for (const v of list) if (Math.abs(v - value) < Math.abs(best - value)) best = v;
  return best;
}

export function updateTraffic(state, dt) {
  const rng = state.rng;
  for (const car of state.traffic) {
    // Slow down if another car is close ahead on the same road.
    let blocked = false;
    for (const other of state.traffic) {
      if (other === car || other.horizontal !== car.horizontal || other.road !== car.road) continue;
      const gap = (other.along - car.along) * car.dir;
      if (gap > 0 && gap < 90) { blocked = true; break; }
    }
    const speed = blocked ? car.speed * 0.25 : car.speed;
    car.along += car.dir * speed * dt;
    const limit = car.horizontal ? CONFIG.worldWidth : CONFIG.worldHeight;
    if (car.along < 60) { car.along = 60; car.dir = 1; }
    if (car.along > limit - 60) { car.along = limit - 60; car.dir = -1; }

    // At an intersection, sometimes turn onto the crossing road.
    const crossing = nearestCrossing(car.horizontal ? state.city.roadsX : state.city.roadsY, car.along);
    if (Math.abs(car.along - crossing) < 6 && rng() < 0.012) {
      car.horizontal = !car.horizontal;
      car.road = crossing;
      car.along = car.horizontal ? car.y : car.x;
      car.dir = rng() < 0.5 ? 1 : -1;
    }
    if (car.horizontal) { car.x = car.along; car.y = car.road + (car.dir > 0 ? 14 : -14); car.angle = car.dir > 0 ? 0 : Math.PI; }
    else { car.x = car.road + (car.dir > 0 ? 14 : -14); car.y = car.along; car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  }
}
