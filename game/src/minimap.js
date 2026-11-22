// Circular minimap: roads, the player, police, and the mission target.
import { CFG } from './config.js';
import { currentStage } from './missions.js';

export function drawMinimap(ctx, world, cx, cy, r) {
  const sx = r * 2 / CFG.worldW;
  const sy = r * 2 / CFG.worldH;
  const toMap = (x, y) => [cx - r + x * sx, cy - r + y * sy];
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 28, 20, 0.85)';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
  ctx.lineWidth = 1.5;
  for (const rx of world.city.xs) {
    const [x0] = toMap(rx, 0);
    ctx.beginPath(); ctx.moveTo(x0, cy - r); ctx.lineTo(x0, cy + r); ctx.stroke();
  }
  for (const ry of world.city.ys) {
    const [, y0] = toMap(0, ry);
    ctx.beginPath(); ctx.moveTo(cx - r, y0); ctx.lineTo(cx + r, y0); ctx.stroke();
  }
  // Mission target.
  if (!world.mission.done) {
    const t = currentStage(world.mission).target;
    const [tx, ty] = toMap(t.x, t.y);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI * 2); ctx.stroke();
  }
  // Police.
  ctx.fillStyle = '#4a90ff';
  for (const cop of world.police) {
    const [x, y] = toMap(cop.x, cop.y);
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  if (world.policeHeli.active) {
    const [x, y] = toMap(world.policeHeli.x, world.policeHeli.y);
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Player.
  const [px, py] = toMap(world.player.x, world.player.y);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Rim + north tick.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - r - 6);
}
