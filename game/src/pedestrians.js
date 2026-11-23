// Pedestrian AI: people stroll the sidewalks, pause at corners, and
// scatter when a car or a gunshot comes too close.

import { CONFIG } from './config.js';
import { nearestRoadPoint, onRoad } from './city.js';
import { range, pick, chance } from './random.js';

const SHIRTS = ['#e07a5f', '#81b29a', '#f2cc8f', '#6d9dc5', '#b5838d', '#e9c46a'];

export function spawnPedestrian(city, rng) {
  const p = nearestRoadPoint(city, range(rng, 100, CONFIG.WORLD_W - 100), range(rng, 100, CONFIG.WORLD_H - 100));
  return {
    x: p.x + (p.axis === 'v' ? (chance(rng, 0.5) ? 44 : -44) : 0),
    y: p.y + (p.axis === 'h' ? (chance(rng, 0.5) ? 44 : -44) : 0),
    angle: pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
    speed: range(rng, CONFIG.PED_SPEED * 0.6, CONFIG.PED_SPEED * 1.3),
    shirt: pick(rng, SHIRTS),
    panic: 0,
    pause: range(rng, 0, 3),
  };
}

export function stepPedestrians(world, dt) {
  const { city, rng, player } = world;
  for (const ped of world.peds) {
    if (ped.panic > 0) ped.panic -= dt;
    // Panic: run away from the player / the noise.
    const dxp = ped.x - player.x;
    const dyp = ped.y - player.y;
    const dp = Math.hypot(dxp, dyp);
    if (dp < 90 && (player.speed > 200 || world.shotsFired > 0)) ped.panic = 1.5;
    if (ped.panic > 0) {
      const runAngle = Math.atan2(dyp, dxp);
      ped.x += Math.cos(runAngle) * CONFIG.PED_SPEED * 2.4 * dt;
      ped.y += Math.sin(runAngle) * CONFIG.PED_SPEED * 2.4 * dt;
      ped.angle = runAngle;
      continue;
    }
    if (ped.pause > 0) {
      ped.pause -= dt;
      continue;
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    // Reached the end of a sidewalk stretch: turn or pause.
    if (!onRoad(city, ped.x, ped.y)) {
      const snap = nearestRoadPoint(city, ped.x, ped.y);
      ped.x = snap.x + (snap.axis === 'v' ? 44 : 0);
      ped.y = snap.y + (snap.axis === 'h' ? 44 : 0);
      ped.angle = pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      ped.pause = range(rng, 0.5, 3);
    }
    ped.x = Math.max(16, Math.min(CONFIG.WORLD_W - 16, ped.x));
    ped.y = Math.max(16, Math.min(CONFIG.WORLD_H - 16, ped.y));
  }
}
