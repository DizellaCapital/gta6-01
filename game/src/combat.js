// Combat: three weapons (fists, pistol, SMG), mouse aim, bullets, damage
// and health + armor. Shooting a civilian or a cop raises the wanted level.
import { CFG } from './config.js';

export const WEAPONS = [
  { id: 0, name: 'Fists', slot: 'Fists', damage: 12, range: 46, rate: 0.35, ammo: Infinity, auto: false },
  { id: 1, name: 'Pistol', slot: 'Pistol', damage: 26, range: 430, rate: 0.28, ammo: 24, auto: false },
  { id: 2, name: 'SMG', slot: 'SMG', damage: 13, range: 380, rate: 0.09, ammo: 90, auto: true },
];

export function weaponOf(S) {
  return WEAPONS[S.player.weapon];
}

export function switchWeapon(S, dir) {
  S.player.weapon = (S.player.weapon + dir + WEAPONS.length) % WEAPONS.length;
}

export function aimAngle(S, mouseX, mouseY, viewW, viewH) {
  const px = S.player.x - S.camera.x + viewW / 2;
  const py = S.player.y - S.camera.y + viewH / 2;
  return Math.atan2(mouseY - py, mouseX - px);
}

export function fireWeapon(S, angle) {
  const w = weaponOf(S);
  const now = S.time;
  if (now - S.player.lastShot < w.rate) return;
  if (w.ammo !== Infinity && S.player.ammo[w.id] <= 0) {
    S.messages.push(`${w.name} is empty — press Q to switch`);
    S.player.lastShot = now;
    return;
  }
  S.player.lastShot = now;
  if (w.ammo !== Infinity) S.player.ammo[w.id]--;
  S.sound?.gunshot();
  if (w.id === 0) {
    // Melee swing: hurt anything right in front of the player.
    const hx = S.player.x + Math.cos(angle) * 34;
    const hy = S.player.y + Math.sin(angle) * 34;
    hurtNear(S, hx, hy, 40, w.damage, 'fists');
    S.muzzle = 0.08;
    return;
  }
  S.bullets.push({
    x: S.player.x + Math.cos(angle) * 20,
    y: S.player.y + Math.sin(angle) * 20,
    angle,
    speed: CFG.bulletSpeed,
    life: w.range / CFG.bulletSpeed,
    damage: w.damage,
  });
  S.muzzle = 0.06;
}

function hurtNear(S, x, y, radius, damage, kind) {
  for (const ped of S.peds) {
    if (Math.hypot(ped.x - x, ped.y - y) < radius + 10) {
      ped.hp -= damage;
      ped.scared = 3;
      if (ped.hp <= 0) commitCrime(S, 1, 'assault');
    }
  }
  for (const cop of S.police) {
    if (Math.hypot(cop.x - x, cop.y - y) < radius + 16) {
      cop.condition -= damage;
      commitCrime(S, 1, 'attacking SBPD');
    }
  }
}

export function updateBullets(S, dt) {
  for (const b of S.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    for (const ped of S.peds) {
      if (ped.hp > 0 && Math.hypot(ped.x - b.x, ped.y - b.y) < 12) {
        ped.hp -= b.damage;
        ped.scared = 3;
        b.life = 0;
        if (ped.hp <= 0) commitCrime(S, 1, 'assault');
        break;
      }
    }
    for (const cop of S.police) {
      if (b.life > 0 && Math.hypot(cop.x - b.x, cop.y - b.y) < 18) {
        cop.condition -= b.damage;
        b.life = 0;
        commitCrime(S, 1, 'attacking SBPD');
        break;
      }
    }
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
}

export function commitCrime(S, stars, what) {
  S.player.wanted = Math.min(5, S.player.wanted + stars);
  S.player.hiddenTimer = 0;
  S.messages.push(`Wanted +${stars} — ${what}`);
}

export function hurtPlayer(S, amount) {
  if (S.player.armor > 0) {
    const absorbed = Math.min(S.player.armor, amount * 0.6);
    S.player.armor -= absorbed;
    amount -= absorbed;
  }
  S.player.hp -= amount;
  if (S.player.hp <= 0) {
    S.player.hp = 0;
    S.screen = 'end';
    S.endKind = S.player.wanted > 0 ? 'busted' : 'wasted';
  }
}
