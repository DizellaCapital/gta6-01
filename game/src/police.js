// SBPD dispatch: named units with roles, roadblocks at wanted 3+,
// and a police helicopter with a spotlight at wanted 4-5.
import { CONFIG } from './config.js';
import { nearestRoadPoint } from './city.js';
import { damagePlayer } from './combat.js';
import { pick } from './random.js';

const UNIT_NAMES = [
  'Unit 7 — Vega', 'Unit 12 — Ortiz', 'Unit 3 — Boone', 'Unit 21 — Kwan',
  'Unit 9 — Marsh', 'Unit 15 — Doyle', 'Unit 30 — Reyes', 'Unit 5 — Hale',
];
const ROLES = ['Intercept', 'Flanking', 'Roadblock', 'Spotlight', 'Closing In', 'Pursuit'];

export function wantedUnits(wanted) {
  return [0, 1, 2, 3, 4, 6][wanted] ?? 0;
}

export function spawnPoliceUnit(world, role) {
  const p = world.player;
  const a = world.rng() * Math.PI * 2;
  const d = 500 + world.rng() * 350;
  const spot = nearestRoadPoint(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
  world.unitSeq = (world.unitSeq || 0) + 1;
  const unitName = UNIT_NAMES[(world.unitSeq - 1) % UNIT_NAMES.length];
  const unit = {
    id: world.nextCarId++,
    x: spot.x,
    y: spot.y,
    angle: Math.atan2(p.y - spot.y, p.x - spot.x),
    speed: 0,
    maxSpeed: 300 + world.player.wanted * 22,
    color: '#2f6fd0',
    kind: 'police',
    name: unitName,
    role: role || pick(world.rng, ROLES),
    hp: 100,
    dead: false,
    stunned: 0,
    ramCooldown: 0,
  };
  world.police.push(unit);
  world.cars.push(unit);
  return unit;
}

export function syncPolice(world) {
  // Keep the number of live units matched to the wanted level.
  const want = wantedUnits(world.player.wanted);
  const live = world.police.filter((u) => !u.dead).length;
  if (live < want) {
    const role = world.player.wanted >= 3 && !world.roadblocks.length
      ? 'Roadblock'
      : pick(world.rng, ROLES);
    spawnPoliceUnit(world, role);
  }
  // Roadblocks at wanted 3+.
  if (world.player.wanted >= 3 && world.roadblocks.length === 0) {
    const p = world.player;
    for (let i = 0; i < 2; i++) {
      const a = (i * Math.PI * 2) / 2 + 0.6;
      const spot = nearestRoadPoint(p.x + Math.cos(a) * 260, p.y + Math.sin(a) * 260);
      world.roadblocks.push({ x: spot.x, y: spot.y, angle: a + Math.PI / 2 });
    }
    world.message = 'SBPD roadblock ahead! Wanted 3+ — find another route.';
  }
  if (world.player.wanted < 3) world.roadblocks = [];
  // Police helicopter at wanted 4-5.
  if (world.player.wanted >= 4 && !world.heliPolice) {
    world.heliPolice = { x: world.player.x - 260, y: world.player.y - 260, angle: 0, alt: 130 };
    world.message = 'SBPD Air-1 overhead with a spotlight. Lose them in the tunnels!';
  }
  if (world.player.wanted < 4) world.heliPolice = null;
}

export function updatePolice(world, dt) {
  const p = world.player;
  for (const u of world.police) {
    if (u.dead) continue;
    if (u.stunned > 0) {
      u.stunned -= dt;
      u.speed = Math.max(0, u.speed - 300 * dt);
      continue;
    }
    u.ramCooldown -= dt;
    // Chase: steer toward the player, faster at higher wanted.
    const want = Math.atan2(p.y - u.y, p.x - u.x);
    let diff = want - u.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    u.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const dist = Math.hypot(p.x - u.x, p.y - u.y);
    const target = dist > 120 ? u.maxSpeed : u.maxSpeed * 0.5;
    u.speed += Math.max(-320 * dt, Math.min(240 * dt, target - u.speed));
    u.x += Math.cos(u.angle) * u.speed * dt;
    u.y += Math.sin(u.angle) * u.speed * dt;
    // Ram the player on contact.
    if (dist < 42 && u.ramCooldown <= 0) {
      u.ramCooldown = 1.2;
      if (!p.onFoot) {
        const car = world.cars.find((c) => c.id === p.carId);
        if (car) car.health = Math.max(0, car.health - 4);
      } else {
        damagePlayer(world, 10);
      }
    }
  }
  // Remove dead units from the car list.
  world.police = world.police.filter((u) => !u.dead);
  world.cars = world.cars.filter((c) => !(c.kind === 'police' && c.dead));
  // Helicopter follows the player and keeps the spotlight on them.
  if (world.heliPolice) {
    const h = world.heliPolice;
    const want = Math.atan2(p.y - h.y, p.x - h.x);
    let diff = want - h.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    h.angle += Math.max(-1.8 * dt, Math.min(1.8 * dt, diff));
    const d = Math.hypot(p.x - h.x, p.y - h.y);
    const sp = d > 200 ? 300 : 140;
    h.x += Math.cos(h.angle) * sp * dt;
    h.y += Math.sin(h.angle) * sp * dt;
    h.spotX = p.x;
    h.spotY = p.y;
  }
}

// Distance in metres from the player to the nearest live unit (for the HUD).
export function nearestUnitDistance(world) {
  let best = Infinity;
  for (const u of world.police) {
    if (u.dead) continue;
    best = Math.min(best, Math.hypot(u.x - world.player.x, u.y - world.player.y));
  }
  return best === Infinity ? 0 : Math.round(best / 10);
}
