// Circular minimap: roads, player, police, mission target, helipad.
import { CONFIG } from './config.js';
import { roadXs, roadYs } from './city.js';
import { missionTarget } from './world.js';

export function drawMinimap(ctx, world, cx, cy, r) {
  const scale = (r * 2) / Math.max(CONFIG.WORLD_W, CONFIG.WORLD_H);
  const toX = (x) => cx - r + x * scale;
  const toY = (y) => cy - r + y * scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  // Background.
  ctx.fillStyle = 'rgba(20, 40, 24, 0.92)';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Sea on the west edge.
  ctx.fillStyle = 'rgba(46, 111, 142, 0.9)';
  ctx.fillRect(cx - r, cy - r, 90 * scale + 4, r * 2);
  // Roads.
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.75)';
  ctx.lineWidth = 2;
  for (const x of roadXs()) {
    ctx.beginPath();
    ctx.moveTo(toX(x), cy - r);
    ctx.lineTo(toX(x), cy + r);
    ctx.stroke();
  }
  for (const y of roadYs()) {
    ctx.beginPath();
    ctx.moveTo(cx - r, toY(y));
    ctx.lineTo(cx + r, toY(y));
    ctx.stroke();
  }
  // Helipad.
  ctx.fillStyle = '#e8b73a';
  ctx.fillRect(toX(world.helipad.x) - 3, toY(world.helipad.y) - 3, 6, 6);
  // Mission target.
  const t = missionTarget(world);
  if (t && !world.missions.done) {
    const pulse = 4 + Math.sin(world.time * 4) * 1.5;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(toX(t.x), toY(t.y), pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police units.
  ctx.fillStyle = '#4d9fff';
  for (const u of world.police) {
    if (u.dead) continue;
    ctx.beginPath();
    ctx.arc(toX(u.x), toY(u.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.heliPolice) {
    ctx.fillStyle = '#4d9fff';
    ctx.beginPath();
    ctx.arc(toX(world.heliPolice.x), toY(world.heliPolice.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const p = world.player;
  ctx.save();
  ctx.translate(toX(p.x), toY(p.y));
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // Rim + label.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', cx, cy + r + 13);
}
