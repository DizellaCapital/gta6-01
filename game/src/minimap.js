// Solmar Bay — the round minimap: roads, the player, police, the mission
// target, and the helipad, all scaled from the world into a small circle.
import { CONFIG } from './config.js';

export function drawMinimap(ctx, state, cx, cy, radius) {
  const scale = (radius * 2) / Math.max(CONFIG.worldWidth, CONFIG.worldHeight);
  const toMap = (x, y) => ({ x: cx + (x - CONFIG.worldWidth / 2) * scale, y: cy + (y - CONFIG.worldHeight / 2) * scale });
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 40, 30, 0.92)';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  // Sea strip on the west edge, sand on the south-west beach.
  ctx.fillStyle = '#2e6f8e';
  ctx.fillRect(cx - radius, cy - radius, 10, radius * 2);
  ctx.fillStyle = '#c9b078';
  ctx.fillRect(cx - radius, cy + radius * 0.55, radius * 0.5, radius * 0.45);
  ctx.strokeStyle = 'rgba(200,200,200,0.55)';
  ctx.lineWidth = 2;
  for (const rx of state.city.roadsX) {
    const a = toMap(rx, 0);
    const b = toMap(rx, CONFIG.worldHeight);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const ry of state.city.roadsY) {
    const a = toMap(0, ry);
    const b = toMap(CONFIG.worldWidth, ry);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // Helipad.
  const hp = toMap(3600, 2800);
  ctx.fillStyle = '#e8b400';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('H', hp.x, hp.y + 4);
  // Mission target.
  const stage = state.missionStageTarget;
  if (stage) {
    const t = toMap(stage.target.x, stage.target.y);
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath(); ctx.arc(t.x, t.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffdd00';
    ctx.beginPath(); ctx.arc(t.x, t.y, 8 + Math.sin(state.time * 4) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  // Police.
  ctx.fillStyle = '#4d7cff';
  for (const cop of state.cops) {
    const m = toMap(cop.x, cop.y);
    ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Player arrow.
  const pm = toMap(state.player.x, state.player.y);
  ctx.save();
  ctx.translate(pm.x, pm.y);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
}
