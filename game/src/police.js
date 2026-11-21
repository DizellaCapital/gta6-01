// Solmar Bay — SBPD dispatch. The number of pursuing units grows with the
// wanted level; at 3 stars roadblocks appear, at 4–5 a police helicopter
// joins with a spotlight cone. Units have names and roles for the HUD.
import { CONFIG } from './config.js';
import { nearestRoadPoint, pointBlocked } from './city.js';

export const DISPATCH_ROLES = ['Roadblock', 'Intercept', 'Spotlight', 'Flanking', 'Closing In', 'Pursuit'];
const UNIT_NAMES = ['Unit 7', 'Unit 12', 'Unit 3', 'Unit 21', 'Unit 9', 'Unit 30', 'Unit 5', 'Unit 18'];

export function wantedUnitCount(wanted) {
  return wanted <= 0 ? 0 : wanted + 1;
}

export function updatePolice(state, dt) {
  const p = state.player;
  const want = wantedUnitCount(p.wanted);
  // Spawn units up to the wanted count, just off-screen from the player.
  while (state.cops.length < want) {
    const i = state.cops.length;
    const angle = (i / Math.max(1, want)) * Math.PI * 2 + state.time * 0.1;
    const spot = nearestRoadPoint(state.city, p.x + Math.cos(angle) * 900, p.y + Math.sin(angle) * 900);
    state.cops.push({
      id: 'cop' + i + '-' + Math.floor(state.time),
      kind: 'cop',
      x: spot.x, y: spot.y,
      angle: Math.atan2(p.y - spot.y, p.x - spot.x),
      speed: 0,
      color: CONFIG.palette.copCar,
      name: UNIT_NAMES[i % UNIT_NAMES.length],
      role: DISPATCH_ROLES[i % DISPATCH_ROLES.length],
      condition: 100,
    });
  }
  while (state.cops.length > want) state.cops.pop();

  for (const cop of state.cops) {
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const cruise = Math.min(CONFIG.copTopSpeed, 240 + p.wanted * 45);
    cop.speed += (cruise - cop.speed) * Math.min(1, dt * 1.5);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    if (!pointBlocked(state.city, nx, ny, 16)) { cop.x = nx; cop.y = ny; }
    else { cop.angle += Math.PI / 2 * dt * 4; }
    cop.dist = Math.round(dist);
    // Ramming the player hurts on foot and dents a driven car.
    if (dist < 34) {
      if (p.onFoot) { p.health -= 14 * dt; state.bustedHold += dt; }
      else if (p.vehicle) { p.vehicle.condition = Math.max(0, p.vehicle.condition - 6 * dt); p.health -= 3 * dt; }
    }
  }

  // Roadblocks at wanted 3+: static SBPD cars across the road ahead.
  if (p.wanted >= 3 && state.roadblocks.length < 2) {
    const ahead = nearestRoadPoint(state.city, p.x + Math.cos(p.angle) * 520, p.y + Math.sin(p.angle) * 520);
    state.roadblocks.push({ x: ahead.x, y: ahead.y, angle: p.angle + Math.PI / 2 });
  }
  if (p.wanted < 3) state.roadblocks = [];

  // Police helicopter at wanted 4–5, circling with a spotlight cone.
  if (p.wanted >= 4) {
    if (!state.copHeli) state.copHeli = { x: p.x + 300, y: p.y - 300, z: 220, angle: 0, rotor: 0 };
    const h = state.copHeli;
    h.rotor += dt * 22;
    const ta = Math.atan2(p.y - h.y, p.x - h.x);
    h.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, ta - h.angle));
    h.x += Math.cos(h.angle) * 260 * dt;
    h.y += Math.sin(h.angle) * 260 * dt;
  } else {
    state.copHeli = null;
  }
}
