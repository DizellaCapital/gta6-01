// Solmar Bay city layout: a road grid, blocks between roads, buildings
// inside the blocks, plus collision and road-snapping helpers.

import { CONFIG } from './config.js';
import { makeRng, range, rangeInt, pick } from './random.js';

const ROOF_COLORS = ['#7a5c40', '#6b4f38', '#8a6a4d', '#5f6b7a', '#75604e'];

export function buildCity(seed) {
  const rng = makeRng(seed * 7919 + 13);
  const spacing = CONFIG.ROAD_SPACING;
  const roadsX = [];
  const roadsY = [];
  for (let x = spacing / 2; x < CONFIG.WORLD_W; x += spacing) roadsX.push(x);
  for (let y = spacing / 2; y < CONFIG.WORLD_H; y += spacing) roadsY.push(y);

  const buildings = [];
  // One block = the square between four neighbouring roads.
  for (let i = 0; i < roadsX.length - 1; i++) {
    for (let j = 0; j < roadsY.length - 1; j++) {
      const bx0 = roadsX[i] + CONFIG.ROAD_W / 2 + 26;
      const by0 = roadsY[j] + CONFIG.ROAD_W / 2 + 26;
      const bx1 = roadsX[i + 1] - CONFIG.ROAD_W / 2 - 26;
      const by1 = roadsY[j + 1] - CONFIG.ROAD_W / 2 - 26;
      // The south edge of the map is the beach; leave it open.
      if (by1 > CONFIG.WORLD_H - 260) continue;
      // A couple of blocks stay parks.
      if ((i * 7 + j * 3) % 9 === 4) continue;
      const count = rangeInt(rng, 1, 2);
      for (let k = 0; k < count; k++) {
        const w = range(rng, 110, 190);
        const h = range(rng, 90, 170);
        const x = count === 1
          ? bx0 + (bx1 - bx0 - w) / 2
          : bx0 + (k * (bx1 - bx0 - w)) / Math.max(1, count - 1);
        const y = by0 + range(rng, 0, Math.max(0, by1 - by0 - h));
        buildings.push({
          x, y, w, h,
          roof: pick(rng, ROOF_COLORS),
          floors: rangeInt(rng, 1, 6),
        });
      }
    }
  }
  return { roadsX, roadsY, buildings, seed };
}

// True when point (x, y) with radius r overlaps any building.
export function pointInBuilding(city, x, y, r = 0) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) {
      return b;
    }
  }
  return null;
}

// Snap a point to the centreline of the nearest road.
export function nearestRoadPoint(city, x, y) {
  let nx = city.roadsX[0];
  let nd = Infinity;
  for (const rx of city.roadsX) {
    const d = Math.abs(rx - x);
    if (d < nd) { nd = d; nx = rx; }
  }
  let ny = city.roadsY[0];
  nd = Infinity;
  for (const ry of city.roadsY) {
    const d = Math.abs(ry - y);
    if (d < nd) { nd = d; ny = ry; }
  }
  // Snap to whichever road axis is closer.
  if (Math.abs(nx - x) <= Math.abs(ny - y)) return { x: nx, y, axis: 'v' };
  return { x, y: ny, axis: 'h' };
}

// Is the point on a road surface (including the sidewalk edge)?
export function onRoad(city, x, y) {
  const half = CONFIG.ROAD_W / 2 + CONFIG.SIDEWALK;
  for (const rx of city.roadsX) if (Math.abs(x - rx) <= half) return true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) <= half) return true;
  return false;
}

// Which road axes pass under the point: 'v', 'h', 'both' or 'none'.
export function roadAxisAt(city, x, y) {
  const half = CONFIG.ROAD_W / 2;
  let v = false;
  let h = false;
  for (const rx of city.roadsX) if (Math.abs(x - rx) <= half) v = true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) <= half) h = true;
  if (v && h) return 'both';
  if (v) return 'v';
  if (h) return 'h';
  return 'none';
}

// Nearest intersection to a point.
export function nearestIntersection(city, x, y) {
  const p = nearestRoadPoint(city, x, y);
  let ix = city.roadsX[0];
  let d = Infinity;
  for (const rx of city.roadsX) {
    if (Math.abs(rx - p.x) < d) { d = Math.abs(rx - p.x); ix = rx; }
  }
  let iy = city.roadsY[0];
  d = Infinity;
  for (const ry of city.roadsY) {
    if (Math.abs(ry - p.y) < d) { d = Math.abs(ry - p.y); iy = ry; }
  }
  return { x: ix, y: iy };
}

// A random point on a road, away from buildings.
export function randomRoadPoint(city, rng) {
  const axis = rng() < 0.5 ? 'v' : 'h';
  if (axis === 'v') {
    return {
      x: pick(rng, city.roadsX),
      y: range(rng, 80, CONFIG.WORLD_H - 80),
    };
  }
  return {
    x: range(rng, 80, CONFIG.WORLD_W - 80),
    y: pick(rng, city.roadsY),
  };
}
