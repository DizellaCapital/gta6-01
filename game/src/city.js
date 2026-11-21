// Solmar Bay — the city grid. Roads run on a regular lattice; each block
// between four roads holds one or two buildings. Everything is generated
// from a seeded generator so the map is identical for a given seed.
import { CONFIG } from './config.js';
import { makeRng, range, intRange } from './random.js';

export function buildCity(seed) {
  const rng = makeRng(seed);
  const roadsX = [];
  const roadsY = [];
  for (let x = CONFIG.roadSpacing; x < CONFIG.worldWidth; x += CONFIG.roadSpacing) roadsX.push(x);
  for (let y = CONFIG.roadSpacing; y < CONFIG.worldHeight; y += CONFIG.roadSpacing) roadsY.push(y);

  const buildings = [];
  for (let ix = 0; ix <= roadsX.length; ix++) {
    for (let iy = 0; iy <= roadsY.length; iy++) {
      const x0 = (ix === 0 ? 0 : roadsX[ix - 1]) + CONFIG.blockInset;
      const x1 = (ix === roadsX.length ? CONFIG.worldWidth : roadsX[ix]) - CONFIG.blockInset;
      const y0 = (iy === 0 ? 0 : roadsY[iy - 1]) + CONFIG.blockInset;
      const y1 = (iy === roadsY.length ? CONFIG.worldHeight : roadsY[iy]) - CONFIG.blockInset;
      // The south-west corner is the beach; leave it open sand and parkland.
      const beach = x0 < 900 && y0 > CONFIG.worldHeight - 1100;
      if (beach && rng() < 0.7) continue;
      const count = rng() < 0.35 ? 2 : 1;
      for (let b = 0; b < count; b++) {
        const w = range(rng, 90, Math.max(100, (x1 - x0) / count - 30));
        const h = range(rng, 80, Math.max(90, y1 - y0 - 30));
        const bx = x0 + (count === 1 ? (x1 - x0 - w) / 2 : b * ((x1 - x0) / 2) + 10);
        const by = y0 + (y1 - y0 - h) / 2 + range(rng, -12, 12);
        const shade = intRange(rng, 0, 2);
        buildings.push({
          x: bx, y: by, w, h,
          roof: shade === 0 ? CONFIG.palette.buildingRoof : shade === 1 ? CONFIG.palette.buildingRoofAlt : CONFIG.palette.buildingRoofWarm,
          height: intRange(rng, 1, 4),
        });
      }
    }
  }

  const city = { seed, roadsX, roadsY, buildings };
  return city;
}

// True when the point (with a small radius) sits inside any building.
export function pointBlocked(city, x, y, radius) {
  for (const b of city.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return true;
  }
  return false;
}

// Nearest point on the road lattice to (x, y).
export function nearestRoadPoint(city, x, y) {
  let bestX = city.roadsX[0];
  let bestY = city.roadsY[0];
  for (const rx of city.roadsX) if (Math.abs(rx - x) < Math.abs(bestX - x)) bestX = rx;
  for (const ry of city.roadsY) if (Math.abs(ry - y) < Math.abs(bestY - y)) bestY = ry;
  return { x: bestX, y: bestY };
}

// True when the point is on a road (within half the road width of a line).
export function onRoad(city, x, y) {
  const half = CONFIG.roadWidth / 2;
  for (const rx of city.roadsX) if (Math.abs(x - rx) < half) return true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) < half) return true;
  return false;
}
