// Traffic + parked cars. Traffic cars follow the road grid: they drive
// along one road, turn at intersections, and slow for the car ahead.
// Parked cars sit at the roadside and can be stolen.
import { CAR, ROADS_H, ROADS_V, ROAD_W, WORLD } from './config.js';
import { nearestRoadPoint, onRoad } from './city.js';

const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#e67e22', '#16a085', '#9b59b6', '#7f8c8d', '#d35400'];
const PARKED_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#16a085', '#e67e22'];
const CAR_NAMES = [
  'Comet GT', 'Bay Runner', 'Solmar Cruiser', 'Palm Coupe', 'Harbor Hauler',
  'Marina GT', 'Sunset Sedan', 'Coral Cab', 'Tide Van', 'Reef Roadster',
];

let nextCarId = 1;

export function makeCar(x, y, angle, color, kind) {
  return {
    x, y, angle, speed: 0, color, kind: kind || 'traffic',
    dir: 0, // 0:+x 1:+y 2:-x 3:-y along a road
    targetSpeed: 130, length: CAR.length, width: CAR.width,
    driver: kind === 'traffic', stolen: false, id: nextCarId++, ramCd: 0,
    name: kind === 'police' ? 'SBPD Interceptor'
      : kind === 'courier' ? 'Ghost Courier'
      : CAR_NAMES[Math.floor(Math.random() * CAR_NAMES.length)],
    condition: 100, plate: `SB-${1000 + Math.floor(Math.random() * 9000)}`,
  };
}

/** Give a car a fresh original plate (Tito's clean-plates job). */
export function freshPlate(car) {
  car.plate = `SB-${1000 + Math.floor(Math.random() * 9000)}`;
  return car.plate;
}

export function spawnTraffic(random, city, playerPos, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = random() < 0.5;
    const road = vertical ? ROADS_V[Math.floor(random() * ROADS_V.length)] : ROADS_H[Math.floor(random() * ROADS_H.length)];
    const along = 100 + random() * (vertical ? WORLD.height - 200 : WORLD.width - 200);
    const lane = (random() < 0.5 ? -1 : 1) * 22;
    const x = vertical ? road + lane : along;
    const y = vertical ? along : road + lane;
    const dir = vertical ? (lane > 0 ? 1 : 3) : (lane > 0 ? 0 : 2);
    const car = makeCar(x, y, (dir * Math.PI) / 2, CAR_COLORS[Math.floor(random() * CAR_COLORS.length)], 'traffic');
    car.dir = dir;
    car.targetSpeed = 110 + random() * 70;
    car.speed = car.targetSpeed;
    cars.push(car);
  }
  return cars;
}

export function spawnParked(random, city, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = random() < 0.5;
    const road = vertical ? ROADS_V[Math.floor(random() * ROADS_V.length)] : ROADS_H[Math.floor(random() * ROADS_H.length)];
    const along = 150 + random() * (vertical ? WORLD.height - 300 : WORLD.width - 300);
    const side = random() < 0.5 ? -1 : 1;
    const x = vertical ? road + side * (ROAD_W / 2 - 12) : along;
    const y = vertical ? along : road + side * (ROAD_W / 2 - 12);
    const angle = vertical ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI);
    const car = makeCar(x, y, angle, PARKED_COLORS[Math.floor(random() * PARKED_COLORS.length)], 'parked');
    car.driver = false;
    cars.push(car);
  }
  return cars;
}

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/** Steer a traffic car along the grid; returns nothing, mutates the car. */
export function updateTrafficCar(car, dt, random, cars) {
  const [dx, dy] = DIRS[car.dir];
  // Slow for the car ahead on the same road.
  let ahead = Infinity;
  for (const other of cars) {
    if (other === car || other.kind === 'parked') continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const along = ox * dx + oy * dy;
    const side = Math.abs(ox * dy - oy * dx);
    if (along > 0 && along < 90 && side < 30) ahead = Math.min(ahead, along);
  }
  const want = ahead < 70 ? 0 : car.targetSpeed;
  car.speed += Math.max(-260 * dt, Math.min(180 * dt, want - car.speed));
  car.x += dx * car.speed * dt;
  car.y += dy * car.speed * dt;
  car.angle = Math.atan2(dy, dx);
  // At an intersection, sometimes turn onto the crossing road.
  if (onRoad(car.x, car.y)) {
    const nearV = ROADS_V.some((rx) => Math.abs(car.x - rx) < 14);
    const nearH = ROADS_H.some((ry) => Math.abs(car.y - ry) < 14);
    if (nearV && nearH && random() < 0.012) {
      const vertical = car.dir === 1 || car.dir === 3;
      const turn = random() < 0.5 ? -1 : 1;
      if (vertical) car.dir = turn > 0 ? 0 : 2;
      else car.dir = turn > 0 ? 1 : 3;
      // Snap onto the crossing road centre + lane.
      const rp = nearestRoadPoint(car.x, car.y);
      if (rp) { car.x = rp.x; car.y = rp.y; }
    }
  }
  // Wrap around the world edges so traffic never runs out.
  if (car.x < -60) car.x = WORLD.width + 50;
  if (car.x > WORLD.width + 60) car.x = -50;
  if (car.y < -60) car.y = WORLD.height + 50;
  if (car.y > WORLD.height + 60) car.y = -50;
}

/** Keep traffic near the player: recycle cars that drifted far away. */
export function recycleTraffic(cars, random, playerPos) {
  for (const car of cars) {
    if (car.kind !== 'traffic') continue;
    const dx = car.x - playerPos.x;
    const dy = car.y - playerPos.y;
    if (dx * dx + dy * dy > 1100 * 1100) {
      const fresh = spawnTraffic(random, null, playerPos, 1)[0];
      // Place the fresh car on a road near the player instead of anywhere.
      const rp = nearestRoadPoint(playerPos.x + (random() - 0.5) * 700, playerPos.y + (random() - 0.5) * 700);
      if (rp) { fresh.x = rp.x; fresh.y = rp.y; }
      Object.assign(car, fresh);
    }
  }
}
