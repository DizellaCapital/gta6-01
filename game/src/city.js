// Solmar Bay street grid + buildings. Roads run on a regular grid; every block
// between four roads holds either a building, a park, or a plaza.
import { CFG } from './config.js';
import { makeRng, pick, chance } from './random.js';

export function roadXs() {
  const xs = [];
  for (let x = CFG.roadFirst; x < CFG.worldW; x += CFG.block) xs.push(x);
  return xs;
}

export function roadYs() {
  const ys = [];
  for (let y = CFG.roadFirst; y < CFG.worldH; y += CFG.block) ys.push(y);
  return ys;
}

function nearest(list, v) {
  let best = list[0];
  for (const n of list) if (Math.abs(n - v) < Math.abs(best - v)) best = n;
  return best;
}

export function buildCity(seed) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const xs = roadXs();
  const ys = roadYs();
  const buildings = [];
  const parks = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + CFG.roadW / 2 + 26;
      const y0 = ys[j] + CFG.roadW / 2 + 26;
      const x1 = xs[i + 1] - CFG.roadW / 2 - 26;
      const y1 = ys[j + 1] - CFG.roadW / 2 - 26;
      const roll = rng();
      if (roll < 0.16) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, kind: roll < 0.08 ? 'park' : 'plaza' });
      } else {
        buildings.push({
          x: x0, y: y0, w: x1 - x0, h: y1 - y0,
          color: pick(rng, CFG.buildingRoof),
          height: 1 + Math.floor(rng() * 3),
        });
      }
    }
  }
  return { xs, ys, buildings, parks, rng };
}

export function isOnRoad(city, x, y) {
  const half = CFG.roadW / 2;
  for (const rx of city.xs) if (Math.abs(x - rx) <= half) return true;
  for (const ry of city.ys) if (Math.abs(y - ry) <= half) return true;
  return false;
}

// True when the point sits inside a building footprint (with a small margin).
export function isBlocked(city, x, y) {
  for (const b of city.buildings) {
    if (x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4) return true;
  }
  return false;
}

// Closest point that lies on a road centreline.
export function nearestRoadPoint(city, x, y) {
  const nx = nearest(city.xs, x);
  const ny = nearest(city.ys, y);
  const dx = Math.abs(nx - x);
  const dy = Math.abs(ny - y);
  return dx <= dy ? { x: nx, y } : { x, y: ny };
}

export function randomRoadPoint(city, rng) {
  if (chance(rng, 0.5)) {
    return { x: pick(rng, city.xs), y: CFG.roadFirst + rng() * (CFG.worldH - 2 * CFG.roadFirst) };
  }
  return { x: CFG.roadFirst + rng() * (CFG.worldW - 2 * CFG.roadFirst), y: pick(rng, city.ys) };
}

// A spawn spot on a road, guaranteed not inside a building.
export function spawnPoint(city, rng) {
  for (let tries = 0; tries < 40; tries++) {
    const p = randomRoadPoint(city, rng);
    if (!isBlocked(city, p.x, p.y)) return p;
  }
  return { x: city.xs[2], y: city.ys[2] };
}

export { chance };
