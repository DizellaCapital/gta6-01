// Combat. Three weapon slots — fists, pistol, SMG — with ammo, bullets that
// fly in straight lines, and player health + armour. Bullets stop at
// buildings and at the end of their range.
import { CFG } from './config.js';
import { pointBlocked } from './city.js';

export function createCombat() {
  return {
    slot: 0,
    weapons: [
      { name: 'Fists', ammo: Infinity, damage: 12, rate: 0.35, cooldown: 0 },
      { name: 'Pistol', ammo: 36, damage: 26, rate: 0.28, cooldown: 0 },
      { name: 'SMG', ammo: 120, damage: 14, rate: 0.09, cooldown: 0 },
    ],
    bullets: [],
  };
}

export function currentWeapon(combat) {
  return combat.weapons[combat.slot];
}

export function cycleWeapon(combat) {
  combat.slot = (combat.slot + 1) % combat.weapons.length;
}

export function tryShoot(combat, x, y, angle) {
  const w = currentWeapon(combat);
  if (w.cooldown > 0) return false;
  if (w.name === 'Fists') {
    w.cooldown = w.rate;
    combat.bullets.push({
      melee: true,
      x: x + Math.cos(angle) * 26,
      y: y + Math.sin(angle) * 26,
      vx: 0, vy: 0,
      life: 0.12,
      damage: w.damage,
    });
    return true;
  }
  if (w.ammo <= 0) return false;
  w.ammo -= 1;
  w.cooldown = w.rate;
  combat.bullets.push({
    melee: false,
    x: x + Math.cos(angle) * 22,
    y: y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * CFG.BULLET_SPEED,
    vy: Math.sin(angle) * CFG.BULLET_SPEED,
    life: CFG.BULLET_RANGE / CFG.BULLET_SPEED,
    damage: w.damage,
  });
  return true;
}

function hitTest(list, bx, by, radius) {
  for (const t of list) {
    const dx = t.x - bx;
    const dy = t.y - by;
    if (dx * dx + dy * dy < radius * radius) return t;
  }
  return null;
}

export function stepBullets(combat, world, dt) {
  for (const w of combat.weapons) {
    if (w.cooldown > 0) w.cooldown -= dt;
  }
  const keep = [];
  for (const b of combat.bullets) {
    b.life -= dt;
    if (b.life <= 0) continue;
    if (!b.melee) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 0 || b.x > CFG.WORLD_W || b.y < 0 || b.y > CFG.WORLD_H) continue;
      if (pointBlocked(world.city, b.x, b.y, 0)) continue;
    }
    const ped = hitTest(world.peds, b.x, b.y, 12);
    if (ped) {
      ped.flee = 3;
      world.player.wanted = Math.min(CFG.WANTED_MAX, world.player.wanted + 1);
      world.player.crimeTimer = CFG.CRIME_MEMORY;
      continue;
    }
    const cop = hitTest(world.police.units, b.x, b.y, 20);
    if (cop) {
      cop.speed = Math.max(0, cop.speed - 120);
      world.player.wanted = Math.min(CFG.WANTED_MAX, world.player.wanted + 1);
      world.player.crimeTimer = CFG.CRIME_MEMORY;
      continue;
    }
    const car = hitTest(world.cars, b.x, b.y, 22);
    if (car && car !== world.player.car) {
      car.condition = Math.max(0, (car.condition || 80) - b.damage / 4);
      continue;
    }
    keep.push(b);
  }
  combat.bullets = keep;
}

// Damage the player: armour absorbs first, then health.
export function damagePlayer(player, amount) {
  let left = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, left);
    player.armor -= absorbed;
    left -= absorbed;
  }
  player.hp = Math.max(0, player.hp - left);
}
