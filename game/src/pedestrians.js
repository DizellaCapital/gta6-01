// Pedestrians: walkers on the sidewalks who stroll between random road
// points, pause at corners, and scatter when a car or a gunshot comes close.
import { CFG } from './config.js';
import { randomRoadPoint, isBlocked } from './city.js';
import { range, pick } from './random.js';

const SHIRTS = ['#e84a5f', '#f2c14e', '#4ea8e8', '#7dd069', '#c77dff', '#f2f2f2', '#ff8c42'];

export function spawnPed(rng, city, id) {
  const p = randomRoadPoint(rng, city);
  return {
    id, x: p.x, y: p.y, angle: range(rng, 0, Math.PI * 2),
    speed: range(rng, 35, CFG.pedSpeed), shirt: pick(rng, SHIRTS),
    tx: p.x, ty: p.y, pause: 0, hp: 30, scared: 0,
  };
}

export function updatePeds(S, dt) {
  const city = S.city;
  for (const ped of S.peds) {
    if (ped.hp <= 0) continue;
    if (ped.pause > 0) {
      ped.pause -= dt;
      continue;
    }
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) {
      const next = randomRoadPoint(S.rng, city);
      ped.tx = next.x;
      ped.ty = next.y;
      if (S.rng() < 0.3) ped.pause = range(S.rng, 0.5, 2.5);
      continue;
    }
    // Flee from the player when scared.
    let mx = dx / dist;
    let my = dy / dist;
    let sp = ped.speed;
    if (ped.scared > 0) {
      ped.scared -= dt;
      const px = ped.x - S.player.x;
      const py = ped.y - S.player.y;
      const pd = Math.hypot(px, py) || 1;
      mx = px / pd;
      my = py / pd;
      sp = ped.speed * 2.4;
    }
    const nx = ped.x + mx * sp * dt;
    const ny = ped.y + my * sp * dt;
    if (!isBlocked(city, nx, ny)) {
      ped.x = nx;
      ped.y = ny;
      ped.angle = Math.atan2(my, mx);
    } else {
      const next = randomRoadPoint(S.rng, city);
      ped.tx = next.x;
      ped.ty = next.y;
    }
  }
  S.peds = S.peds.filter((p) => p.hp > 0);
}
