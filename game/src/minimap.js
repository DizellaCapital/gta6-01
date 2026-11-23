// Circular minimap. Draws the road grid, the player, police units and the
// mission marker, all scaled into a clipped circle in the HUD corner.
import { CFG } from './config.js';

export function drawMinimap(ctx, world, cx, cy, r, target) {
  const scale = (r * 2) / Math.max(CFG.WORLD_W, CFG.WORLD_H);
  const ox = cx - (CFG.WORLD_W * scale) / 2;
  const oy = cy - (CFG.WORLD_H * scale) / 2;
  const toMap = (x, y) => ({ x: ox + x * scale, y: oy + y * scale });
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#1d2b1a';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;
  for (const rx of world.city.roadsX) {
    const a = toMap(rx, 0);
    const b = toMap(rx, CFG.WORLD_H);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const ry of world.city.roadsY) {
    const a = toMap(0, ry);
    const b = toMap(CFG.WORLD_W, ry);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Mission marker.
  if (target) {
    const m = toMap(target.x, target.y);
    ctx.fillStyle = CFG.PALETTE.accent;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police units.
  ctx.fillStyle = '#5aa2ff';
  for (const u of world.police.units) {
    const m = toMap(u.x, u.y);
    ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
  }
  // Player.
  const p = toMap(world.player.x, world.player.y);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // Rim + north tick.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = CFG.PALETTE.accent;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - r + 12);
}
