// Solmar Bay's street grid, blocks and buildings. Roads run on a regular
// grid; every block between four roads holds at most one building (some
// blocks stay parks). All geometry is derived from the seed, never from
// hand-placed coordinates, so the city is identical for a given seed.
import { CFG } from './config.js';

export function roadLines(count, size) {
  const lines = [];
  for (let i = 0; i <= count; i += 1) lines.push(i * CFG.GRID);
  // clamp the last line inside the world so roads never sit on the border
  lines[lines.length - 1] = size - CFG.GRID / 2;
  return lines;
}

export function buildCity(rng) {
  const roadsX = roadLines(Math.floor(CFG.WORLD_W / CFG.GRID), CFG.WORLD_W);
  const roadsY = roadLines(Math.floor(CFG.WORLD_H / CFG.GRID), CFG.WORLD_H);
  const buildings = [];
  const parks = [];
  const roofColors = [
    CFG.PALETTE.buildingRoof,
    CFG.PALETTE.buildingRoof2,
    CFG.PALETTE.buildingRoof3,
    CFG.PALETTE.buildingRoof4,
  ];
  for (let ix = 0; ix < roadsX.length - 1; ix += 1) {
    for (let iy = 0; iy < roadsY.length - 1; iy += 1) {
      const x0 = roadsX[ix] + CFG.ROAD_W / 2 + 12;
      const x1 = roadsX[ix + 1] - CFG.ROAD_W / 2 - 12;
      const y0 = roadsY[iy] + CFG.ROAD_W / 2 + 12;
      const y1 = roadsY[iy + 1] - CFG.ROAD_W / 2 - 12;
      if (x1 - x0 < 56 || y1 - y0 < 56) continue;
      if (rng.chance(0.16)) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        continue;
      }
      const w = rng.range(60, x1 - x0);
      const h = rng.range(60, y1 - y0);
      const x = x0 + rng.range(0, x1 - x0 - w);
      const y = y0 + rng.range(0, y1 - y0 - h);
      buildings.push({
        x, y, w, h,
        color: rng.pick(roofColors),
        tall: rng.chance(0.3),
      });
    }
  }
  // The helipad sits in a park block near the marina; the garage sits on a
  // road corner in the south of town. Both are picked from real geometry.
  const padPark = parks.length > 0 ? parks[Math.floor(parks.length / 2)] : null;
  const helipad = padPark
    ? { x: padPark.x + padPark.w / 2, y: padPark.y + padPark.h / 2, r: 42 }
    : { x: CFG.WORLD_W / 2, y: CFG.WORLD_H / 2, r: 42 };
  const garage = {
    x: roadsX[3],
    y: roadsY[roadsY.length - 2],
    w: 120,
    h: 84,
  };
  return { roadsX, roadsY, buildings, parks, helipad, garage };
}

export function pointBlocked(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) {
      return true;
    }
  }
  return false;
}

export function nearestRoadX(city, x) {
  let best = city.roadsX[0];
  let bestD = Infinity;
  for (const rx of city.roadsX) {
    const d = Math.abs(rx - x);
    if (d < bestD) { bestD = d; best = rx; }
  }
  return { value: best, dist: bestD };
}

export function nearestRoadY(city, y) {
  let best = city.roadsY[0];
  let bestD = Infinity;
  for (const ry of city.roadsY) {
    const d = Math.abs(ry - y);
    if (d < bestD) { bestD = d; best = ry; }
  }
  return { value: best, dist: bestD };
}

// Snap a point to the closest point on any road centre line.
export function nearestRoadPoint(city, x, y) {
  const nx = nearestRoadX(city, x);
  const ny = nearestRoadY(city, y);
  if (nx.dist <= ny.dist) return { x: nx.value, y, axis: 'v' };
  return { x, y: ny.value, axis: 'h' };
}

export function onRoad(city, x, y) {
  const nx = nearestRoadX(city, x);
  const ny = nearestRoadY(city, y);
  return nx.dist <= CFG.ROAD_W / 2 || ny.dist <= CFG.ROAD_W / 2;
}

// A random point on a road centre line, away from the given point.
export function randomRoadPoint(city, rng, awayFrom, minDist = 300) {
  for (let tries = 0; tries < 40; tries += 1) {
    const horizontal = rng.chance(0.5);
    let x;
    let y;
    if (horizontal) {
      y = rng.pick(city.roadsY);
      x = rng.range(CFG.GRID, CFG.WORLD_W - CFG.GRID);
    } else {
      x = rng.pick(city.roadsX);
      y = rng.range(CFG.GRID, CFG.WORLD_H - CFG.GRID);
    }
    if (awayFrom && Math.hypot(x - awayFrom.x, y - awayFrom.y) < minDist) continue;
    return { x, y };
  }
  return { x: city.roadsX[2], y: city.roadsY[2] };
}

// The intersection (road crossing) closest to a point.
export function nearestIntersection(city, x, y) {
  const nx = nearestRoadX(city, x);
  const ny = nearestRoadY(city, y);
  return { x: nx.value, y: ny.value };
}
