// Circular minimap: roads, the player, police, the mission target and
// the helicopter, drawn inside a round frame.

import { CONFIG } from './config.js';
import { missionTarget } from './missions.js';

export function drawMinimap(ctx, world, cx, cy, radius) {
  const scale = (radius * 2) / Math.max(CONFIG.WORLD_W, CONFIG.WORLD_H);
  const toMap = (x, y) => ({
    x: cx - radius + x * scale,
    y: cy - radius + y * scale,
  });

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Sea + land.
  ctx.fillStyle = '#274b5e';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.fillStyle = '#3f6b45';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2 - 260 * scale);

  // Roads.
  ctx.strokeStyle = '#5a5e66';
  ctx.lineWidth = Math.max(1, CONFIG.ROAD_W * scale);
  for (const rx of world.city.roadsX) {
    const a = toMap(rx, 0);
    const b = toMap(rx, CONFIG.WORLD_H);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const ry of world.city.roadsY) {
    const a = toMap(0, ry);
    const b = toMap(CONFIG.WORLD_W, ry);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Mission target.
  if (!world.missionDone) {
    const t = missionTarget(world);
    const m = toMap(t.x, t.y);
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Police cars.
  ctx.fillStyle = '#4a90e2';
  for (const c of world.cars) {
    if (c.kind !== 'police') continue;
    const m = toMap(c.x, c.y);
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Police helicopter.
  if (world.police.heli) {
    const m = toMap(world.police.heli.x, world.police.heli.y);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player arrow.
  const p = toMap(world.player.x, world.player.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(world.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // Round frame.
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
}
