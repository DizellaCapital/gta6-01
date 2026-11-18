// Pedestrians: Solmar Bay locals walking the sidewalks, crossing at
// corners, and fleeing when a car screams past or a shot rings out.
import { ROADS_H, ROADS_V, ROAD_W, WORLD } from './config.js';

const SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22', '#9b59b6', '#ecf0f1', '#1abc9c'];
const PANTS = ['#2c3e50', '#34495e', '#7f8c8d', '#5d4037'];

export function spawnPedestrians(random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = random() < 0.5;
    const road = vertical ? ROADS_V[Math.floor(random() * ROADS_V.length)] : ROADS_H[Math.floor(random() * ROADS_H.length)];
    const along = 80 + random() * (vertical ? WORLD.height - 160 : WORLD.width - 160);
    const side = random() < 0.5 ? -1 : 1;
    const x = vertical ? road + side * (ROAD_W / 2 + 14) : along;
    const y = vertical ? along : road + side * (ROAD_W / 2 + 14);
    peds.push({
      x, y, angle: random() * Math.PI * 2,
      speed: 35 + random() * 30, walkPhase: random() * 10,
      shirt: SHIRTS[Math.floor(random() * SHIRTS.length)],
      pants: PANTS[Math.floor(random() * PANTS.length)],
      panic: 0, alive: true,
    });
  }
  return peds;
}

export function updatePedestrian(ped, dt, random, danger) {
  if (!ped.alive) return;
  ped.walkPhase += dt * 8;
  if (ped.panic > 0) {
    ped.panic -= dt;
    // Flee away from the danger point.
    const dx = ped.x - danger.x;
    const dy = ped.y - danger.y;
    const d = Math.hypot(dx, dy) || 1;
    ped.angle = Math.atan2(dy, dx);
    ped.x += (dx / d) * 150 * dt;
    ped.y += (dy / d) * 150 * dt;
  } else {
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    // At a block edge, turn onto a new heading (sidewalk grid).
    if (random() < 0.004) ped.angle += (random() < 0.5 ? -1 : 1) * (Math.PI / 2);
  }
  ped.x = Math.max(20, Math.min(WORLD.width - 20, ped.x));
  ped.y = Math.max(20, Math.min(WORLD.height - 20, ped.y));
}

export function scarePedestrians(peds, x, y, radius) {
  for (const ped of peds) {
    const dx = ped.x - x;
    const dy = ped.y - y;
    if (dx * dx + dy * dy < radius * radius) ped.panic = 2.5;
  }
}
