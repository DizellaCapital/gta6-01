// Solmar Bay — the city itself: roads, blocks, buildings, parks and beach,
// generated once from the seeded RNG so the same seed always builds the
// same city. No Rockstar map, names or assets: every street and district
// here is original.
import { ROADS_H, ROADS_V, ROAD_W, WORLD } from './config.js';

const BUILDING_COLORS = ['#e8b04b', '#d96a4a', '#4a90c2', '#8a6fb8', '#e8e0d0', '#6fb8a0', '#c25a7a'];

export function createCity(random) {
  const buildings = [];
  const trees = [];
  const parks = [];
  // Block rectangles between the roads (plus the border strips).
  const xs = [0, ...ROADS_V, WORLD.width];
  const ys = [0, ...ROADS_H, WORLD.height];
  for (let bi = 0; bi < xs.length - 1; bi += 1) {
    for (let bj = 0; bj < ys.length - 1; bj += 1) {
      const x0 = xs[bi] + (bi === 0 ? 20 : ROAD_W / 2 + 14);
      const x1 = xs[bi + 1] - (bi === xs.length - 2 ? 20 : ROAD_W / 2 + 14);
      const y0 = ys[bj] + (bj === 0 ? 20 : ROAD_W / 2 + 14);
      const y1 = ys[bj + 1] - (bj === ys.length - 2 ? 20 : ROAD_W / 2 + 14);
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // The southern strip is the beach, not buildings.
      if (y0 > 2150) continue;
      // Two park blocks: the central green and the marina park.
      const isPark = (bi === 2 && bj === 2) || (bi === 4 && bj === 1);
      if (isPark) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let t = 0; t < 14; t += 1) {
          trees.push({ x: x0 + 20 + random() * (x1 - x0 - 40), y: y0 + 20 + random() * (y1 - y0 - 40), r: 10 + random() * 8 });
        }
        continue;
      }
      // 1-3 buildings per block, with a gap for an alley / courtyard.
      const count = 1 + Math.floor(random() * 3);
      for (let b = 0; b < count; b += 1) {
        const bw = 70 + random() * 90;
        const bh = 60 + random() * 80;
        const bx = x0 + 8 + random() * Math.max(1, x1 - x0 - bw - 16);
        const by = y0 + 8 + random() * Math.max(1, y1 - y0 - bh - 16);
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: BUILDING_COLORS[Math.floor(random() * BUILDING_COLORS.length)],
          roof: random() < 0.5,
        });
      }
      for (let t = 0; t < 3; t += 1) {
        trees.push({ x: x0 + 16 + random() * (x1 - x0 - 32), y: y0 + 16 + random() * (y1 - y0 - 32), r: 8 + random() * 6 });
      }
    }
  }
  return { buildings, trees, parks };
}

export function onRoad(x, y) {
  for (const rx of ROADS_V) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of ROADS_H) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_V) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, axis: 'v' }; }
  }
  for (const ry of ROADS_H) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, axis: 'h' }; }
  }
  return best;
}

/** Push a circle out of every building it overlaps; returns true if it hit one. */
export function collideBuildings(city, e, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(e.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(e.y, b.y + b.h));
    const dx = e.x - cx;
    const dy = e.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        e.x = cx + (dx / d) * r;
        e.y = cy + (dy / d) * r;
      } else {
        e.x = b.x - r;
      }
    }
  }
  return hit;
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

/** A free (non-building) point near the given road intersection. */
export function roadPoint(city, rx, ry, random) {
  for (let tries = 0; tries < 20; tries += 1) {
    const x = rx + (random() - 0.5) * (ROAD_W - 30);
    const y = ry + (random() - 0.5) * (ROAD_W - 30);
    if (!pointInBuilding(city, x, y)) return { x, y };
  }
  return { x: rx, y: ry };
}
