// Pedestrians stroll the sidewalks, pause at corners, and run when gunfire
// or a high wanted level turns the street dangerous.
import { CFG } from './config.js';
import { isBlocked, nearestRoadPoint } from './city.js';
import { pick, chance, range } from './random.js';

export function updatePeds(world, dt) {
  const { city, rng } = world;
  for (const p of world.peds) {
    p.think -= dt;
    const danger = world.wanted >= 3 || world.recentShot > world.time - 2;
    if (p.think <= 0) {
      p.think = range(rng, 1.5, 4);
      if (danger) {
        // Flee away from the player.
        const a = Math.atan2(p.y - world.player.y, p.x - world.player.x) + range(rng, -0.6, 0.6);
        p.dirX = Math.cos(a); p.dirY = Math.sin(a);
        p.speed = 150;
      } else if (chance(rng, 0.25)) {
        p.dirX = 0; p.dirY = 0; p.speed = 0; // idle
      } else {
        // Walk along a sidewalk: pick a road, walk parallel to it.
        const rp = nearestRoadPoint(city, p.x, p.y);
        const alongRoad = Math.abs(rp.x - p.x) < Math.abs(rp.y - p.y);
        const dir = chance(rng, 0.5) ? 1 : -1;
        p.dirX = alongRoad ? dir : 0;
        p.dirY = alongRoad ? 0 : dir;
        p.speed = range(rng, 35, 70);
      }
    }
    const nx = p.x + p.dirX * p.speed * dt;
    const ny = p.y + p.dirY * p.speed * dt;
    if (!isBlocked(city, nx, ny) && nx > 30 && nx < CFG.worldW - 30 && ny > 30 && ny < CFG.worldH - 30) {
      p.x = nx; p.y = ny;
    } else {
      p.dirX = -p.dirX; p.dirY = -p.dirY;
    }
    if (p.hp !== undefined && p.hp <= 0) p.dead = true;
  }
  world.peds = world.peds.filter((p) => !p.dead);
  // Keep the streets populated.
  while (world.peds.length < 26) {
    const rp = nearestRoadPoint(city, 200 + rng() * (CFG.worldW - 400), 200 + rng() * (CFG.worldH - 400));
    world.peds.push({
      x: rp.x + range(rng, -40, 40), y: rp.y + range(rng, -40, 40),
      dirX: 0, dirY: 0, speed: 0, think: 0, hp: 100,
      color: pick(rng, ['#e8e0d0', '#c96a5a', '#5a7ac9', '#e8c85a', '#7ac95a', '#c95aa0']),
    });
  }
}
