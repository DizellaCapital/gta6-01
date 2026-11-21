// Circular minimap: roads, the player, police, the mission target and the
// helipad, drawn inside a ring in the corner of the HUD.
import { PALETTE } from './config.js';
import { currentStage } from './missions.js';

export function drawMinimap(ctx, S, cx, cy, radius) {
  const W = 3200;
  const H = 2400;
  const scale = (radius * 2) / Math.max(W, H);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#101c10';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Roads.
  ctx.strokeStyle = '#5a5a62';
  ctx.lineWidth = 2;
  for (const rx of S.city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(cx + (rx - W / 2) * scale, cy - radius);
    ctx.lineTo(cx + (rx - W / 2) * scale, cy + radius);
    ctx.stroke();
  }
  for (const ry of S.city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + (ry - H / 2) * scale);
    ctx.lineTo(cx + radius, cy + (ry - H / 2) * scale);
    ctx.stroke();
  }

  const dot = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + (x - W / 2) * scale, cy + (y - H / 2) * scale, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Mission target.
  const stage = currentStage(S);
  const target = stage?.at || null;
  if (target) {
    const pulse = 3 + Math.sin(S.time * 4) * 1.5;
    dot(target.x, target.y, PALETTE.marker, pulse + 2);
  }
  // Helipad.
  dot(S.city.helipad.x, S.city.helipad.y, '#7dd0ff', 3);
  // Police.
  for (const u of S.police) dot(u.x, u.y, PALETTE.policeBlue, 2.5);
  if (S.heli) dot(S.heli.x, S.heli.y, '#ff8c42', 3.5);
  // Player: white triangle pointing along the heading.
  const px = cx + (S.player.x - W / 2) * scale;
  const py = cy + (S.player.y - H / 2) * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(S.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}
