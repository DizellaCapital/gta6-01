// City grid: vertical + horizontal roads, blocks of buildings between them,
// collision tests and the nearest point on a road.
import { CONFIG } from './config.js';

const { WORLD_W, WORLD_H, ROAD_SPACING, ROAD_FIRST, ROAD_HALF, BLOCK_MARGIN } = CONFIG;

export function roadXs() {
  const xs = [];
  for (let x = ROAD_FIRST; x <= WORLD_W - ROAD_FIRST; x += ROAD_SPACING) xs.push(x);
  return xs;
}

export function roadYs() {
  const ys = [];
  for (let y = ROAD_FIRST; y <= WORLD_H - ROAD_FIRST; y += ROAD_SPACING) ys.push(y);
  return ys;
}

function nearestLine(v, lines) {
  let best = lines[0];
  let bestD = Math.abs(v - best);
  for (const l of lines) {
    const d = Math.abs(v - l);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return { line: best, dist: bestD };
}

export function nearestRoadX(x) {
  return nearestLine(x, roadXs());
}

export function nearestRoadY(y) {
  return nearestLine(y, roadYs());
}

export function isOnRoad(x, y) {
  return nearestRoadX(x).dist <= ROAD_HALF + 6 || nearestRoadY(y).dist <= ROAD_HALF + 6;
}

// Nearest point that lies on a road centreline.
export function nearestRoadPoint(x, y) {
  const nx = nearestRoadX(x);
  const ny = nearestRoadY(y);
  if (nx.dist <= ny.dist) return { x: nx.line, y };
  return { x, y: ny.line };
}

// Buildings: one or two per block, kept clear of roads and sidewalks.
export function buildingRects() {
  const rects = [];
  const xs = roadXs();
  const ys = roadYs();
  const colors = ['buildingA', 'buildingB', 'buildingC', 'buildingD'];
  let i = 0;
  for (let bx = 0; bx < xs.length - 1; bx++) {
    for (let by = 0; by < ys.length - 1; by++) {
      const x0 = xs[bx] + BLOCK_MARGIN;
      const y0 = ys[by] + BLOCK_MARGIN;
      const x1 = xs[bx + 1] - BLOCK_MARGIN;
      const y1 = ys[by + 1] - BLOCK_MARGIN;
      const w = x1 - x0;
      const h = y1 - y0;
      // Park in the south-west block, plaza in the centre-east block.
      if (bx === 0 && by === ys.length - 2) {
        rects.push({ x: x0, y: y0, w, h, kind: 'park', color: 'park' });
        continue;
      }
      if (bx === xs.length - 2 && by === 1) {
        rects.push({ x: x0, y: y0, w, h, kind: 'plaza', color: 'sidewalk' });
        continue;
      }
      const split = (bx + by) % 2 === 0;
      if (split) {
        rects.push({ x: x0, y: y0, w: w * 0.46, h: h * 0.6, kind: 'house', color: colors[i % 4] });
        rects.push({ x: x0 + w * 0.54, y: y0 + h * 0.3, w: w * 0.46, h: h * 0.6, kind: 'house', color: colors[(i + 1) % 4] });
      } else {
        rects.push({ x: x0 + w * 0.12, y: y0 + h * 0.1, w: w * 0.76, h: h * 0.8, kind: 'house', color: colors[(i + 2) % 4] });
      }
      i++;
    }
  }
  return rects;
}

let cachedRects = null;
export function allBuildings() {
  if (!cachedRects) cachedRects = buildingRects();
  return cachedRects;
}

export function isInBuilding(x, y, pad = 0) {
  for (const b of allBuildings()) {
    if (b.kind === 'house' && x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) {
      return true;
    }
  }
  return false;
}

// A point on a road, guaranteed outside any building.
export function roadPoint(x, y) {
  const p = nearestRoadPoint(x, y);
  if (isInBuilding(p.x, p.y, 4)) return { x: ROAD_FIRST, y: ROAD_FIRST };
  return p;
}
