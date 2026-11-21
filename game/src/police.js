// SBPD dispatch: police units that spawn off-screen, chase and ram the
// player, set roadblocks at wanted 3+, and send a helicopter with a
// spotlight at wanted 4–5. Units get named roles and distances for the HUD.
import { CFG } from './config.js';
import { nearestRoadX, nearestRoadY, randomRoadPoint } from './city.js';
import { range } from './random.js';

export const UNIT_ROLES = ['Intercept', 'Roadblock', 'Spotlight', 'Flanking', 'Closing In', 'Pursuit'];

export function unitCountFor(wanted) {
  return wanted <= 0 ? 0 : wanted * 2;
}

export function spawnPoliceUnit(S, role) {
  const p = randomRoadPoint(S.rng, S.city);
  // Spawn away from the player so units drive in instead of appearing.
  let tries = 0;
  while (Math.hypot(p.x - S.player.x, p.y - S.player.y) < 700 && tries++ < 8) {
    const q = randomRoadPoint(S.rng, S.city);
    p.x = q.x;
    p.y = q.y;
  }
  return {
    id: S.nextId++,
    kind: 'police',
    x: p.x, y: p.y,
    angle: Math.atan2(S.player.y - p.y, S.player.x - p.x),
    speed: 0,
    model: 'Interceptor', color: '#e8eef7', top: CFG.policeSpeed,
    condition: 100, role: role || 'Pursuit', flash: 0, siren: 0,
  };
}

export function updatePolice(S, dt) {
  const want = unitCountFor(S.player.wanted);
  while (S.police.length < want) {
    const role = UNIT_ROLES[S.police.length % UNIT_ROLES.length];
    S.police.push(spawnPoliceUnit(S, role));
  }
  while (S.police.length > want) S.police.pop();

  const px = S.player.x;
  const py = S.player.y;
  for (const unit of S.police) {
    const dx = px - unit.x;
    const dy = py - unit.y;
    const dist = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - unit.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    unit.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    const targetSpeed = dist > 60 ? CFG.policeSpeed : 120;
    unit.speed += Math.max(-420 * dt, Math.min(300 * dt, targetSpeed - unit.speed));
    unit.x += Math.cos(unit.angle) * unit.speed * dt;
    unit.y += Math.sin(unit.angle) * unit.speed * dt;
    unit.flash += dt;
    unit.siren += dt;
    // Ramming the player hurts: car condition or health.
    if (dist < 34) {
      if (S.player.car) {
        S.player.car.condition = Math.max(0, S.player.car.condition - 14 * dt);
        if (S.player.car.condition <= 0) S.player.hp -= 20 * dt;
      } else {
        S.player.hp -= 26 * dt;
      }
      S.shake = Math.min(8, S.shake + 6 * dt);
    }
  }

  // Roadblock at wanted 3+: two police cars parked across the road ahead.
  if (S.player.wanted >= 3) {
    if (!S.roadblock) {
      const aheadX = px + Math.cos(S.player.angle) * 320;
      const aheadY = py + Math.sin(S.player.angle) * 320;
      S.roadblock = {
        x: Math.max(80, Math.min(CFG.worldWidth - 80, aheadX)),
        y: Math.max(80, Math.min(CFG.worldHeight - 80, aheadY)),
        angle: S.player.angle + Math.PI / 2,
      };
    }
  } else {
    S.roadblock = null;
  }

  // Helicopter with spotlight at wanted 4–5.
  if (S.player.wanted >= 4) {
    if (!S.heli) {
      S.heli = {
        x: px - 140, y: py - 160, angle: 0, alt: 120,
        spotX: px, spotY: py, rotor: 0,
      };
    }
    const h = S.heli;
    h.rotor += dt * 22;
    const tx = px - 90;
    const ty = py - 110;
    h.x += (tx - h.x) * Math.min(1, dt * 0.8);
    h.y += (ty - h.y) * Math.min(1, dt * 0.8);
    h.spotX += (px - h.spotX) * Math.min(1, dt * 2.2);
    h.spotY += (py - h.spotY) * Math.min(1, dt * 2.2);
  } else {
    S.heli = null;
  }
}

export function dispatchRows(S) {
  return S.police.map((u) => ({
    id: u.id,
    role: u.role,
    dist: Math.round(Math.hypot(u.x - S.player.x, u.y - S.player.y)),
  }));
}
