// Weapons: fists, pistol, SMG. Shooting is hitscan toward the aim direction;
// hitting cops or bystanders raises the wanted level.
import { sfx } from './audio.js';

export const WEAPONS = [
  { name: 'Fists', slot: 1, damage: 12, range: 46, rate: 0.45, ammo: Infinity, auto: false },
  { name: 'Pistol', slot: 2, damage: 26, range: 420, rate: 0.32, ammo: 48, auto: false },
  { name: 'SMG', slot: 3, damage: 15, range: 360, rate: 0.09, ammo: 120, auto: true },
];

export function createArsenal() {
  return { slot: 0, ammo: [Infinity, 48, 120], cooldown: 0, lastShotAt: -10 };
}

export function currentWeapon(arsenal) {
  return WEAPONS[arsenal.slot];
}

export function switchWeapon(arsenal, slot) {
  if (slot >= 0 && slot < WEAPONS.length) arsenal.slot = slot;
}

// Returns a shot event {hit, x, y, kind} or null when on cooldown / out of ammo.
export function tryShoot(world, arsenal, fromX, fromY, angle) {
  const w = WEAPONS[arsenal.slot];
  if (world.time - arsenal.lastShotAt < w.rate) return null;
  if (arsenal.ammo[arsenal.slot] <= 0) return { hit: false, dry: true };
  arsenal.lastShotAt = world.time;
  if (arsenal.ammo[arsenal.slot] !== Infinity) arsenal.ammo[arsenal.slot]--;
  sfx(arsenal.slot === 0 ? 'punch' : 'shot');
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = null;
  let bestD = w.range;
  const targets = [];
  for (const p of world.police) targets.push({ x: p.x, y: p.y, kind: 'cop', ref: p, r: 22 });
  for (const p of world.peds) targets.push({ x: p.x, y: p.y, kind: 'ped', ref: p, r: 12 });
  for (const c of world.cars) {
    if (c.player) continue;
    targets.push({ x: c.x, y: c.y, kind: 'car', ref: c, r: 26 });
  }
  for (const t of targets) {
    const vx = t.x - fromX;
    const vy = t.y - fromY;
    const along = vx * dx + vy * dy;
    if (along < 0 || along > bestD) continue;
    const perp = Math.abs(vx * dy - vy * dx);
    if (perp < t.r + 6 && along < bestD) { bestD = along; best = t; }
  }
  if (!best) return { hit: false, x: fromX + dx * w.range, y: fromY + dy * w.range };
  best.ref.hp = (best.ref.hp ?? 100) - w.damage;
  return { hit: true, kind: best.kind, x: best.x, y: best.y, ref: best.ref };
}

export function addAmmo(arsenal, slot, n) {
  if (arsenal.ammo[slot] !== Infinity) arsenal.ammo[slot] += n;
}
