// SBPD dispatch: patrol cars that chase and ram, roadblocks at wanted 3+,
// and a police helicopter with a spotlight at wanted 4–5.
import { CFG } from './config.js';
import { nearestRoadPoint, isBlocked } from './city.js';
import { sfx } from './audio.js';

export const DISPATCH_ROLES = ['Intercept', 'Roadblock', 'Flanking', 'Spotlight', 'Closing In'];

export function updatePolice(world, dt) {
  const { rng } = world;
  const want = world.wanted;
  // Desired number of ground units scales with the wanted level.
  const wantUnits = want === 0 ? 0 : Math.min(2 + want, 7);
  while (world.police.length < wantUnits) {
    const a = rng() * Math.PI * 2;
    const d = 500 + rng() * 400;
    const x = world.player.x + Math.cos(a) * d;
    const y = world.player.y + Math.sin(a) * d;
    const rp = nearestRoadPoint(world.city, Math.max(80, Math.min(CFG.worldW - 80, x)), Math.max(80, Math.min(CFG.worldH - 80, y)));
    world.police.push({
      x: rp.x, y: rp.y, angle: 0, speed: 0, hp: 100,
      role: DISPATCH_ROLES[world.police.length % DISPATCH_ROLES.length],
      flee: false, siren: rng(),
    });
  }
  while (world.police.length > wantUnits) world.police.pop();

  const px = world.player.x;
  const py = world.player.y;
  for (const cop of world.police) {
    if (cop.flee) {
      const a = Math.atan2(cop.y - py, cop.x - px);
      cop.x += Math.cos(a) * 300 * dt;
      cop.y += Math.sin(a) * 300 * dt;
      cop.angle = a;
      continue;
    }
    // Chase: steer toward the player, ramming when close.
    const targetAngle = Math.atan2(py - cop.y, px - cop.x);
    let diff = targetAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
    const dist = Math.hypot(px - cop.x, py - cop.y);
    const speed = want >= 4 ? 520 : want >= 2 ? 460 : 380;
    cop.speed = dist < 60 ? speed * 0.4 : speed;
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    if (!isBlocked(world.city, nx, ny)) { cop.x = nx; cop.y = ny; }
    // Ram damage when touching the player.
    if (dist < 46 && world.player.car) {
      world.player.car.health = Math.max(0, world.player.car.health - 14 * dt);
      if (rng() < dt * 2) sfx('crash');
    }
    if (dist < 30 && !world.player.car && !world.player.heli) {
      world.player.hp -= 20 * dt;
    }
  }

  // Roadblock: two parked cruisers across the road ahead of the player.
  world.roadblock = want >= 3;
  if (world.roadblock) {
    const ahead = 320;
    const a = world.player.car ? world.player.car.angle : world.player.angle;
    const bx = px + Math.cos(a) * ahead;
    const by = py + Math.sin(a) * ahead;
    const rp = nearestRoadPoint(world.city, bx, by);
    world.roadblockAt = { x: rp.x, y: rp.y, angle: a + Math.PI / 2 };
  } else {
    world.roadblockAt = null;
  }

  // Police helicopter with spotlight at wanted 4–5.
  if (want >= 4) {
    if (!world.policeHeli.active) {
      world.policeHeli.active = true;
      world.policeHeli.x = px; world.policeHeli.y = py - 200;
      sfx('siren');
    }
    const h = world.policeHeli;
    h.x += (px - h.x) * Math.min(1, dt * 1.2);
    h.y += (py - h.y) * Math.min(1, dt * 1.2);
    h.angle += dt * 0.8;
    h.spotX = px; h.spotY = py;
  } else {
    world.policeHeli.active = false;
  }
}

// One-line dispatch summary for the HUD.
export function dispatchSummary(world) {
  const units = world.police.map((p) => p.role);
  const dists = world.police.map((p) => Math.round(Math.hypot(p.x - world.player.x, p.y - world.player.y)));
  return { count: world.police.length, roles: units, dists };
}
