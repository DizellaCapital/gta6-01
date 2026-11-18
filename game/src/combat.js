// Combat: fists, a pistol with ammo, bullets, and pickups
// (cash, health, ammo) scattered around Solmar Bay.
export function makeBullet(x, y, angle, from) {
  return { x, y, vx: Math.cos(angle) * 720, vy: Math.sin(angle) * 720, life: 0.9, from };
}

export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}

export function spawnPickups(random, count) {
  const kinds = ['cash', 'health', 'ammo'];
  const pickups = [];
  for (let i = 0; i < count; i += 1) {
    pickups.push({
      x: 150 + random() * 2900,
      y: 150 + random() * 2050,
      kind: kinds[i % kinds.length],
      bob: random() * 6,
      taken: false,
    });
  }
  return pickups;
}

export function punchHit(state, attacker, range, damage) {
  // Hit the nearest damageable thing in front of the attacker.
  let best = null;
  let bestD = range;
  const fx = Math.cos(attacker.angle);
  const fy = Math.sin(attacker.angle);
  const targets = [];
  for (const ped of state.peds) if (ped.alive) targets.push({ x: ped.x, y: ped.y, kind: 'ped', ref: ped });
  for (const off of state.policeFoot) if (off.alive) targets.push({ x: off.x, y: off.y, kind: 'officer', ref: off });
  for (const t of targets) {
    const dx = t.x - attacker.x;
    const dy = t.y - attacker.y;
    const d = Math.hypot(dx, dy);
    if (d < bestD && dx * fx + dy * fy > 0) { best = t; bestD = d; }
  }
  if (!best) return null;
  if (best.kind === 'ped') { best.ref.alive = false; return { kind: 'ped', damage }; }
  best.ref.alive = false;
  return { kind: 'officer', damage };
}
