// Live minimap: the whole city shrunk into a circular HUD dial, with the
// player, traffic, police, helicopters, mission marker and pickups on it.
// Roadblocks only show while Mara's lookout is active; the garage and
// helipad always show.
import { FIELD, ROADS_H, ROADS_V, WORLD, GARAGE, HELIPAD, RACE_START } from './config.js';

export const MINIMAP = { cx: FIELD.width - 112, cy: FIELD.height - 108, r: 96 };

export function drawMinimap(ctx, state) {
  const { cx, cy, r } = MINIMAP;
  const sx = (r * 2) / WORLD.width;
  const sy = (r * 2) / WORLD.height;
  const x = cx - r;
  const y = cy - r;
  const w = r * 2;
  const h = r * 2;
  ctx.save();
  // Circular clip.
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(10,18,26,0.9)';
  ctx.fillRect(x, y, w, h);
  // Water / beach at the south edge.
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(x, y + h - 8, w, 8);
  ctx.fillStyle = '#ecd9a0';
  ctx.fillRect(x, y + h - 13, w, 5);
  // Parks.
  ctx.fillStyle = '#5da24e';
  for (const park of state.city.parks) ctx.fillRect(x + park.x * sx, y + park.y * sy, park.w * sx, park.h * sy);
  // Roads.
  ctx.fillStyle = '#6b7280';
  for (const rx of ROADS_V) ctx.fillRect(x + rx * sx - 2, y, 4, h);
  for (const ry of ROADS_H) ctx.fillRect(x, y + ry * sy - 2, w, 4);
  // Garage (green) + helipad (yellow H) + race start (checkered).
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(x + GARAGE.x * sx - 3, y + GARAGE.y * sy - 3, 6, 6);
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.arc(x + HELIPAD.x * sx, y + HELIPAD.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + RACE_START.x * sx - 3, y + RACE_START.y * sy - 3, 6, 6);
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
  // Race gates.
  if (state.race) {
    ctx.fillStyle = '#f97316';
    for (const cp of state.race.checkpoints) {
      ctx.beginPath();
      ctx.arc(x + cp.x * sx, y + cp.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
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
  // Roadblocks — only while the lookout is watching.
  if (state.crew && state.crew.lookoutTimer > 0) {
    ctx.fillStyle = '#f97316';
    for (const b of state.roadblocks) ctx.fillRect(x + b.x * sx - 3, y + b.y * sy - 3, 6, 6);
  }
  // Civil heli (yellow) + police heli (flashing red).
  ctx.fillStyle = '#f2c94c';
  for (const heli of state.helis) ctx.fillRect(x + heli.x * sx - 2, y + heli.y * sy - 2, 4, 4);
  if (state.policeHeli) {
    ctx.fillStyle = flash ? '#ef4444' : '#f97316';
    ctx.beginPath();
    ctx.arc(x + state.policeHeli.x * sx, y + state.policeHeli.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.restore();
  // Ring.
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.stroke();
}
