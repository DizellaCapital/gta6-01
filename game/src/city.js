// Solmar Bay's street grid: vertical and horizontal roads every block, with
// one or two buildings inside each block. All geometry is derived from the
// seed, so every session with the same seed builds the same city.
import { CFG, PALETTE } from './config.js';
import { makeRng, range, pick } from './random.js';

export function buildCity(seed) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const roadsX = [];
  const roadsY = [];
  for (let x = 0; x <= CFG.worldWidth; x += CFG.blockSize) roadsX.push(x);
  for (let y = 0; y <= CFG.worldHeight; y += CFG.blockSize) roadsY.push(y);

  const buildings = [];
  const roofColors = [PALETTE.buildingRoof, PALETTE.buildingRoof2, PALETTE.buildingRoof3];
  for (let bx = 0; bx < roadsX.length - 1; bx++) {
    for (let by = 0; by < roadsY.length - 1; by++) {
      const x0 = roadsX[bx] + CFG.roadHalf + 14;
      const y0 = roadsY[by] + CFG.roadHalf + 14;
      const x1 = roadsX[bx + 1] - CFG.roadHalf - 14;
      const y1 = roadsY[by + 1] - CFG.roadHalf - 14;
      // Keep the marina block (south-west corner) open as a plaza.
      if (bx === 0 && by === roadsY.length - 2) continue;
      // Keep the garage lot block open (south, second from the west).
      if (bx === 1 && by === roadsY.length - 2) continue;
      // Keep the helipad block (north-east corner) open.
      if (bx === roadsX.length - 2 && by === 0) continue;
      const split = rng() < 0.45;
      if (split) {
        const cut = x0 + (x1 - x0) * range(rng, 0.4, 0.6);
        buildings.push(makeBuilding(rng, x0, y0, cut - 6, y1, pick(rng, roofColors)));
        buildings.push(makeBuilding(rng, cut + 6, y0, x1, y1, pick(rng, roofColors)));
      } else {
        buildings.push(makeBuilding(rng, x0, y0, x1, y1, pick(rng, roofColors)));
      }
    }
  }

  return {
    seed,
    roadsX,
    roadsY,
    buildings,
    helipad: { x: CFG.worldWidth - 100, y: 100, r: 62 },
    garage: { x: 210, y: 2240, w: 170, h: 120 },
    marina: { x: 100, y: CFG.worldHeight - 100, r: 90 },
  };
}

function makeBuilding(rng, x0, y0, x1, y1, roof) {
  const w = x1 - x0;
  const h = y1 - y0;
  const windows = [];
  const cols = Math.max(1, Math.floor(w / 26));
  const rows = Math.max(1, Math.floor(h / 26));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (rng() < 0.5) windows.push({ x: x0 + 10 + c * 26, y: y0 + 10 + r * 26 });
    }
  }
  return { x0, y0, x1, y1, roof, windows, lit: rng() < 0.6 };
}

export function nearestRoadX(city, x) {
  let best = city.roadsX[0];
  for (const rx of city.roadsX) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

export function nearestRoadY(city, y) {
  let best = city.roadsY[0];
  for (const ry of city.roadsY) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}

export function onRoad(city, x, y) {
  const dx = Math.abs(x - nearestRoadX(city, x));
  const dy = Math.abs(y - nearestRoadY(city, y));
  return dx <= CFG.roadHalf + 6 || dy <= CFG.roadHalf + 6;
}

export function isBlocked(city, x, y) {
  if (x < 8 || y < 8 || x > CFG.worldWidth - 8 || y > CFG.worldHeight - 8) return true;
  for (const b of city.buildings) {
    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true;
  }
  return false;
}

// The closest drivable point: snap onto the nearest road centre line.
export function nearestRoadPoint(city, x, y) {
  const rx = nearestRoadX(city, x);
  const ry = nearestRoadY(city, y);
  if (Math.abs(x - rx) <= Math.abs(y - ry)) return { x: rx, y };
  return { x, y: ry };
}

export function randomRoadPoint(rng, city, margin = 120) {
  const rx = pick(rng, city.roadsX.slice(1, -1));
  const ry = pick(rng, city.roadsY.slice(1, -1));
  const vertical = rng() < 0.5;
  if (vertical) return { x: rx + range(rng, -14, 14), y: range(rng, margin, CFG.worldHeight - margin) };
  return { x: range(rng, margin, CFG.worldWidth - margin), y: ry + range(rng, -14, 14) };
}
