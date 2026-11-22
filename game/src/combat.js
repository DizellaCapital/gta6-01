// Combat: fists / pistol / SMG, ammo, damage, player health + armor.
export const WEAPONS = [
  { id: 'fists', name: 'FISTS', damage: 12, range: 46, rate: 0.45, ammo: Infinity, auto: false },
  { id: 'pistol', name: 'PISTOL', damage: 22, range: 320, rate: 0.3, ammo: 24, auto: false },
  { id: 'smg', name: 'SMG', damage: 13, range: 260, rate: 0.09, ammo: 120, auto: true },
];

export function makeCombat() {
  return {
    weapon: 0,
    ammo: { pistol: 24, smg: 120 },
    cooldown: 0,
    lastShotAt: -10,
  };
}

export function weaponName(combat) {
  return WEAPONS[combat.weapon].name;
}

export function weaponAmmo(combat) {
  const w = WEAPONS[combat.weapon];
  if (w.ammo === Infinity) return '∞';
  return String(combat.ammo[w.id] ?? 0);
}

export function cycleWeapon(combat) {
  combat.weapon = (combat.weapon + 1) % WEAPONS.length;
  return WEAPONS[combat.weapon].name;
}

// Fire toward (tx, ty) from the player. Returns a tracer object or null.
// Shooting in the street raises wanted; hitting police raises it more.
export function fireWeapon(world, tx, ty) {
  const c = world.combat;
  const w = WEAPONS[c.weapon];
  if (world.time - c.lastShotAt < w.rate) return null;
  if (w.ammo !== Infinity) {
    if ((c.ammo[w.id] ?? 0) <= 0) return { dry: true };
    c.ammo[w.id]--;
  }
  c.lastShotAt = world.time;
  const p = world.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const ex = p.x + ux * Math.min(dist, w.range);
  const ey = p.y + uy * Math.min(dist, w.range);
  // Hit the first police unit or pedestrian inside the cone.
  let hit = null;
  for (const u of world.police) {
    const d = Math.hypot(u.x - p.x, u.y - p.y);
    if (d < w.range) {
      const dot = ((u.x - p.x) * ux + (u.y - p.y) * uy) / d;
      if (dot > 0.94) { hit = { kind: 'police', target: u, dist: d }; break; }
    }
  }
  if (!hit) {
    for (const ped of world.peds) {
      const d = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (d < w.range) {
        const dot = ((ped.x - p.x) * ux + (ped.y - p.y) * uy) / d;
        if (dot > 0.94) { hit = { kind: 'ped', target: ped, dist: d }; break; }
      }
    }
  }
  if (hit) {
    if (hit.kind === 'police') {
      hit.target.hp = (hit.target.hp ?? 100) - w.damage;
      if (hit.target.hp <= 0) {
        hit.target.dead = true;
        world.message = 'Officer down — SBPD is furious.';
      }
      addWanted(world, 1);
    } else {
      hit.target.flee = 4;
      addWanted(world, 1);
      world.message = 'Civilian hit! Witnesses called SBPD.';
    }
  } else if (w.id !== 'fists') {
    addWanted(world, 0); // firing alone does not raise wanted unless someone is hit
  }
  return { x1: p.x, y1: p.y, x2: ex, y2: ey, hit: !!hit };
}

export function addWanted(world, n) {
  if (n <= 0) return;
  const p = world.player;
  p.wanted = Math.min(5, p.wanted + n);
  p.wantedTimer = 0;
}

export function damagePlayer(world, dmg) {
  const p = world.player;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, dmg * 0.6);
    p.armor -= absorbed;
    p.hp -= (dmg - absorbed);
  } else {
    p.hp -= dmg;
  }
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    world.screen = 'over';
    world.overReason = 'wasted';
  }
}
