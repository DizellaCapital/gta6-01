// Solmar Bay — combat. Three weapons, ammo, bullets, and damage. Shooting
// near the law raises heat; hurting people raises it faster.
export const WEAPONS = [
  { name: 'Fists', slot: 1, damage: 12, rate: 0.35, range: 46, ammo: Infinity },
  { name: 'Pistol', slot: 2, damage: 34, rate: 0.28, range: 520, ammo: 24 },
  { name: 'SMG', slot: 3, damage: 18, rate: 0.09, range: 460, ammo: 90 },
];

export function fireWeapon(state) {
  const p = state.player;
  const w = WEAPONS[p.weapon];
  if (state.time - p.lastShot < w.rate) return;
  if (w.ammo !== Infinity && p.ammo[p.weapon] <= 0) {
    state.message = 'Out of ammo — find a gun shop pickup.';
    state.messageTimer = 2;
    return;
  }
  p.lastShot = state.time;
  if (w.ammo !== Infinity) p.ammo[p.weapon]--;
  const aimX = state.camera.x + state.input.mouseX;
  const aimY = state.camera.y + state.input.mouseY;
  const angle = Math.atan2(aimY - p.y, aimX - p.x);
  const speed = 900;
  state.bullets.push({ x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: w.range / speed, damage: w.damage });
  state.audio?.shoot?.();
  addWanted(state, 0.4);
}

export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // Hit a pedestrian.
    for (const ped of state.peds) {
      if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
        b.life = 0;
        ped.hit = true;
        addWanted(state, 1);
        state.message = 'A pedestrian is down — the SBPD is coming.';
        state.messageTimer = 3;
      }
    }
    // Hit a cop car.
    for (const cop of state.cops) {
      if (Math.hypot(cop.x - b.x, cop.y - b.y) < 22) {
        b.life = 0;
        cop.condition -= b.damage;
        if (cop.condition <= 0) {
          state.cops.splice(state.cops.indexOf(cop), 1);
          addWanted(state, 1);
        }
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.peds = state.peds.filter((ped) => !ped.hit);
}

// Wanted rises in whole stars on crime, capped at five.
export function addWanted(state, amount) {
  const p = state.player;
  p.wantedHeat = (p.wantedHeat || 0) + amount;
  while (p.wantedHeat >= 1 && p.wanted < 5) {
    p.wantedHeat -= 1;
    p.wanted++;
    state.message = `Wanted level ${p.wanted} — SBPD dispatch responding.`;
    state.messageTimer = 3;
  }
  p.wantedHeat = Math.min(p.wantedHeat, 0.99);
  p.quietTimer = 0;
}
