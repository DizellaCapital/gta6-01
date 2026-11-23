// Combat: three weapon slots, ammo, bullets, health and armor.

export const WEAPONS = [
  { name: 'Fists', damage: 12, rate: 0.35, range: 420, ammo: Infinity, auto: false },
  { name: 'Pistol', damage: 26, rate: 0.28, range: 700, ammo: 60, auto: false },
  { name: 'SMG', damage: 14, rate: 0.09, range: 620, ammo: 120, auto: true },
];

export function createCombat() {
  return {
    slot: 1, // start on the pistol
    ammo: [Infinity, 60, 120],
    cooldown: 0,
    shotsFired: 0,
  };
}

export function currentWeapon(combat) {
  return WEAPONS[combat.slot];
}

// Fire toward (tx, ty) in world space. Returns true when a shot went out.
export function tryShoot(world, tx, ty) {
  const c = world.combat;
  const w = currentWeapon(c);
  if (c.cooldown > 0) return false;
  if (c.ammo[c.slot] <= 0) {
    world.message = `${w.name} is empty — pick another slot (1/2/3)`;
    c.cooldown = 0.3;
    return false;
  }
  const p = world.player;
  const angle = Math.atan2(ty - p.y, tx - p.x);
  world.bullets.push({
    x: p.x + Math.cos(angle) * 22,
    y: p.y + Math.sin(angle) * 22,
    angle,
    speed: 900,
    life: w.range / 900,
    damage: w.damage,
    fromPlayer: true,
  });
  if (c.ammo[c.slot] !== Infinity) c.ammo[c.slot] -= 1;
  c.cooldown = w.rate;
  c.shotsFired += 1;
  world.shotsFired += 1;
  return true;
}

export function stepBullets(world, dt) {
  for (const b of world.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
  // Player bullets can hit police cars and peds.
  for (const b of world.bullets) {
    if (!b.fromPlayer) continue;
    for (const car of world.cars) {
      if (car.kind !== 'police') continue;
      const dx = car.x - b.x;
      const dy = car.y - b.y;
      if (dx * dx + dy * dy < 26 * 26) {
        car.cond -= b.damage;
        b.life = 0;
        if (car.cond <= 0) {
          car.kind = 'wreck';
          world.rp += 25;
          world.message = 'Police unit disabled — +25 RP';
        }
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
}

export function damagePlayer(world, amount) {
  const p = world.player;
  let left = amount;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, left);
    p.armor -= absorbed;
    left -= absorbed;
  }
  p.hp -= left;
  if (p.hp <= 0) {
    p.hp = 0;
    world.screen = 'over';
    world.overKind = 'wasted';
  }
}
