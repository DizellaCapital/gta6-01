// Live minimap: the whole city shrunk into the HUD corner, with the
// player, traffic, police, pedestrians and the mission marker on it.
import { FIELD, ROADS_H, ROADS_V, WORLD } from './config.js';

export const MINIMAP = { w: 220, h: 165, x: FIELD.width - 236, y: FIELD.height - 181 };

export function drawMinimap(ctx, state) {
  const { x, y, w, h } = MINIMAP;
  const sx = w / WORLD.width;
  const sy = h / WORLD.height;
  ctx.save();
  ctx.fillStyle = 'rgba(10,18,26,0.85)';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
  // Water / beach at the south edge.
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(x, y + h - 10, w, 10);
  ctx.fillStyle = '#ecd9a0';
  ctx.fillRect(x, y + h - 16, w, 6);
  // Parks.
  ctx.fillStyle = '#5da24e';
  for (const park of state.city.parks) ctx.fillRect(x + park.x * sx, y + park.y * sy, park.w * sx, park.h * sy);
  // Roads.
  ctx.fillStyle = '#6b7280';
  for (const rx of ROADS_V) ctx.fillRect(x + rx * sx - 2, y, 4, h);
  for (const ry of ROADS_H) ctx.fillRect(x, y + ry * sy - 2, w, 4);
  // Mission marker.
  if (state.missionTarget) {
    ctx.fillStyle = '#f2c94c';
    const mx = x + state.missionTarget.x * sx;
    const my = y + state.missionTarget.y * sy;
    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Pickups.
  ctx.fillStyle = '#4ade80';
  for (const p of state.pickups) {
    if (p.taken) continue;
    ctx.fillRect(x + p.x * sx - 1, y + p.y * sy - 1, 2, 2);
  }
  // Traffic (white), police (flashing blue/red), pedestrians (grey).
  ctx.fillStyle = '#e5e7eb';
  for (const car of state.cars) ctx.fillRect(x + car.x * sx - 1.5, y + car.y * sy - 1.5, 3, 3);
  const flash = Math.floor(state.time * 4) % 2 === 0;
  ctx.fillStyle = flash ? '#3b82f6' : '#ef4444';
  for (const car of state.policeCars) ctx.fillRect(x + car.x * sx - 2, y + car.y * sy - 2, 4, 4);
  ctx.fillStyle = '#9ca3af';
  for (const ped of state.peds) {
    if (ped.alive) ctx.fillRect(x + ped.x * sx - 1, y + ped.y * sy - 1, 2, 2);
  }
  // Player: green ring + dot, and the camera view rectangle.
  const px = x + state.player.x * sx;
  const py = y + state.player.y * sy;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(px - 640 * sx, py - 360 * sy, 1280 * sx, 720 * sy);
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.arc(px, py, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#f4f1e8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('SOLMAR BAY', x, y - 16);
  ctx.restore();
}
