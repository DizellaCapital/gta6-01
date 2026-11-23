// Pedestrians. They stroll along the sidewalks (a fixed offset from the road
// centre line), pause now and then, and pick a new direction at crossings.
import { CFG } from './config.js';
import { nearestRoadX, nearestRoadY } from './city.js';

const SIDEWALK = CFG.ROAD_W / 2 + 10;

export function makePed(city, rng) {
  const horizontal = rng.chance(0.5);
  let x;
  let y;
  let axis;
  let dir;
  if (horizontal) {
    y = rng.pick(city.roadsY) + (rng.chance(0.5) ? SIDEWALK : -SIDEWALK);
    x = rng.range(CFG.GRID, CFG.WORLD_W - CFG.GRID);
    axis = 'h';
    dir = rng.chance(0.5) ? 1 : -1;
  } else {
    x = rng.pick(city.roadsX) + (rng.chance(0.5) ? SIDEWALK : -SIDEWALK);
    y = rng.range(CFG.GRID, CFG.WORLD_H - CFG.GRID);
    axis = 'v';
    dir = rng.chance(0.5) ? 1 : -1;
  }
  return {
    x, y, axis, dir,
    speed: rng.range(28, 62),
    pause: rng.range(0, 2),
    color: rng.pick(CFG.PED_COLORS),
    shirt: rng.pick(CFG.SHIRT_COLORS),
    r: 5,
  };
}

export function stepPeds(city, peds, dt, rng) {
  for (const p of peds) {
    if (p.pause > 0) {
      p.pause -= dt;
      continue;
    }
    p.x += p.axis === 'h' ? p.dir * p.speed * dt : 0;
    p.y += p.axis === 'v' ? p.dir * p.speed * dt : 0;
    // At a crossing, sometimes turn onto the other road.
    const nearX = nearestRoadX(city, p.x).dist < 10;
    const nearY = nearestRoadY(city, p.y).dist < 10;
    if (nearX && nearY && rng.chance(0.02)) {
      if (p.axis === 'h') {
        p.axis = 'v';
        p.dir = rng.chance(0.5) ? 1 : -1;
        p.x = nearestRoadX(city, p.x).value + (rng.chance(0.5) ? SIDEWALK : -SIDEWALK);
      } else {
        p.axis = 'h';
        p.dir = rng.chance(0.5) ? 1 : -1;
        p.y = nearestRoadY(city, p.y).value + (rng.chance(0.5) ? SIDEWALK : -SIDEWALK);
      }
    }
    if (rng.chance(0.0015)) p.pause = rng.range(0.5, 2.5);
    if (p.x < 24) { p.x = 24; p.dir = 1; }
    if (p.x > CFG.WORLD_W - 24) { p.x = CFG.WORLD_W - 24; p.dir = -1; }
    if (p.y < 24) { p.y = 24; p.dir = 1; }
    if (p.y > CFG.WORLD_H - 24) { p.y = CFG.WORLD_H - 24; p.dir = -1; }
  }
}
