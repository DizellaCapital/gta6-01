// Solmar Bay — the canvas renderer: the top-down city, every vehicle and
// person, the police helicopter and its spotlight, and every HUD panel
// (money, wanted stars, health, speed, mission, dispatch, crew, radio,
// minimap, district, dialog). The canvas is always the full window.
import { CONFIG } from './config.js';
import { districtAt, standingFor } from './districts.js';
import { currentMission } from './missions.js';
import { WEAPONS } from './combat.js';
import { CREW } from './crew.js';
import { currentTrack } from './radio.js';
import { drawMinimap } from './minimap.js';

function drawCar(ctx, x, y, angle, color, opts) {
  const o = opts || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-19, -11, 38, 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-20, -11, 40, 22, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.beginPath();
  ctx.roundRect(-6, -9, 12, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(-14, -12, 7, 4);
  ctx.fillRect(-14, 8, 7, 4);
  ctx.fillRect(8, -12, 7, 4);
  ctx.fillRect(8, 8, 7, 4);
  if (o.cop) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -11, 8, 22);
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(-18, -4, 5, 8);
    ctx.fillStyle = '#2244ff';
    ctx.fillRect(13, -4, 5, 8);
  }
  if (o.headlights) {
    ctx.fillStyle = 'rgba(255,255,180,0.5)';
    ctx.beginPath();
    ctx.moveTo(20, -8); ctx.lineTo(70, -22); ctx.lineTo(70, 22); ctx.lineTo(20, 8);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawHeli(ctx, x, y, angle, color, altitude, rotor) {
  const lift = altitude * 0.35;
  const scale = 1 + altitude / 500;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 26 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y - lift);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(12, 0, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  const ra = rotor || 0;
  ctx.beginPath();
  ctx.moveTo(Math.cos(ra) * 34, Math.sin(ra) * 6);
  ctx.lineTo(-Math.cos(ra) * 34, -Math.sin(ra) * 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(Math.cos(ra + 1.2) * 34, Math.sin(ra + 1.2) * 6);
  ctx.lineTo(-Math.cos(ra + 1.2) * 34, -Math.sin(ra + 1.2) * 6);
  ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.fillRect(-30, -2, 12, 4);
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 2, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(5, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function bar(ctx, x, y, w, h, ratio, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, ratio)) * w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 4, y + h - 4);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 16, 24, 0.78)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export function drawWorld(ctx, state, viewW, viewH) {
  const cam = state.camera;
  const sx = (x) => x - cam.x;
  const sy = (y) => y - cam.y;
  // Ground: grass, sea on the west, sand on the south-west beach.
  ctx.fillStyle = CONFIG.palette.grass;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = CONFIG.palette.sea;
  ctx.fillRect(sx(0), sy(0), 130, viewH);
  ctx.fillStyle = CONFIG.palette.sand;
  ctx.fillRect(sx(0), sy(CONFIG.worldHeight - 700), 900, 700);
  // Parks.
  ctx.fillStyle = CONFIG.palette.park;
  ctx.fillRect(sx(2400), sy(400), 300, 300);
  ctx.fillRect(sx(800), sy(2400), 300, 300);
  // Roads.
  ctx.fillStyle = CONFIG.palette.road;
  for (const rx of state.city.roadsX) ctx.fillRect(sx(rx - CONFIG.roadWidth / 2), sy(0), CONFIG.roadWidth, CONFIG.worldHeight);
  for (const ry of state.city.roadsY) ctx.fillRect(sx(0), sy(ry - CONFIG.roadWidth / 2), CONFIG.worldWidth, CONFIG.roadWidth);
  ctx.strokeStyle = CONFIG.palette.roadLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  for (const rx of state.city.roadsX) {
    ctx.beginPath(); ctx.moveTo(sx(rx), sy(0)); ctx.lineTo(sx(rx), sy(CONFIG.worldHeight)); ctx.stroke();
  }
  for (const ry of state.city.roadsY) {
    ctx.beginPath(); ctx.moveTo(sx(0), sy(ry)); ctx.lineTo(sx(CONFIG.worldWidth), sy(ry)); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Sidewalks.
  ctx.strokeStyle = CONFIG.palette.sidewalk;
  ctx.lineWidth = 8;
  for (const rx of state.city.roadsX) {
    ctx.beginPath(); ctx.moveTo(sx(rx - 44), sy(0)); ctx.lineTo(sx(rx - 44), sy(CONFIG.worldHeight)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(rx + 44), sy(0)); ctx.lineTo(sx(rx + 44), sy(CONFIG.worldHeight)); ctx.stroke();
  }
  // Buildings with a simple shaded roof.
  for (const b of state.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx(b.x) + 5, sy(b.y) + 6, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(sx(b.x), sy(b.y), b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(sx(b.x), sy(b.y), b.w, 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeRect(sx(b.x), sy(b.y), b.w, b.h);
    if (b.height >= 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(sx(b.x) + 8, sy(b.y) + 10, b.w - 16, 3);
    }
  }
  // Garage and helipad markers on the ground.
  ctx.fillStyle = '#e8b400';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GARAGE', sx(state.garagePos.x), sy(state.garagePos.y) - 24);
  ctx.strokeStyle = '#e8b400';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx(state.garagePos.x) - 60, sy(state.garagePos.y) - 18, 120, 36);
  ctx.fillStyle = CONFIG.palette.heliPad;
  ctx.beginPath(); ctx.arc(sx(state.heliPad.x), sy(state.heliPad.y), 46, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e8b400';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(sx(state.heliPad.x), sy(state.heliPad.y), 46, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#e8b400';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('H', sx(state.heliPad.x), sy(state.heliPad.y) + 10);
  // Safehouse.
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('SAFEHOUSE', sx(state.safehouse.x), sy(state.safehouse.y) - 20);

  // Mission target marker: pulsing ring + beacon.
  const stage = state.missionStageTarget;
  if (stage && state.screen === 'play') {
    const pulse = 26 + Math.sin(state.time * 5) * 8;
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(sx(stage.target.x), sy(stage.target.y), pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,221,0,0.25)';
    ctx.beginPath(); ctx.arc(sx(stage.target.x), sy(stage.target.y), pulse * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath(); ctx.moveTo(sx(stage.target.x), sy(stage.target.y) - 34); ctx.lineTo(sx(stage.target.x) - 10, sy(stage.target.y) - 14); ctx.lineTo(sx(stage.target.x) + 10, sy(stage.target.y) - 14); ctx.closePath(); ctx.fill();
  }
  // Parked cars, traffic, pedestrians.
  for (const car of state.parked) drawCar(ctx, sx(car.x), sy(car.y), car.angle, car.color, {});
  for (const car of state.traffic) drawCar(ctx, sx(car.x), sy(car.y), car.angle, car.color, {});
  for (const ped of state.peds) drawPerson(ctx, sx(ped.x), sy(ped.y), ped.angle, ped.color);
  // Roadblocks.
  for (const rb of state.roadblocks) {
    drawCar(ctx, sx(rb.x - 30), sy(rb.y), rb.angle, CONFIG.palette.copCar, { cop: true });
    drawCar(ctx, sx(rb.x + 30), sy(rb.y), rb.angle, CONFIG.palette.copCar, { cop: true });
  }
  // Police cars.
  for (const cop of state.cops) drawCar(ctx, sx(cop.x), sy(cop.y), cop.angle, cop.color, { cop: true, headlights: true });
  // Player helicopter (parked or flying) and the police helicopter.
  const p = state.player;
  if (p.vehicle && p.vehicle.kind === 'heli') drawHeli(ctx, sx(p.x), sy(p.y), p.angle, p.vehicle.color, p.altitude, state.time * 22);
  else drawHeli(ctx, sx(state.playerHeli.x), sy(state.playerHeli.y), state.playerHeli.angle, state.playerHeli.color, 0, 0);
  if (state.copHeli) {
    const h = state.copHeli;
    // Spotlight cone from the police heli onto the player.
    const gx = sx(h.x);
    const gy = sy(h.y);
    const px = sx(p.x);
    const py = sy(p.y);
    const grad = ctx.createRadialGradient(px, py, 10, px, py, 150);
    grad.addColorStop(0, 'rgba(255,255,200,0.5)');
    grad.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(px, py, 150, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,200,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(px - 40, py - 40); ctx.moveTo(gx, gy); ctx.lineTo(px + 40, py + 40); ctx.stroke();
    drawHeli(ctx, gx, gy, h.angle, '#1d4ed8', h.z, h.rotor);
  }
  // Player car (or the player on foot).
  if (p.vehicle && p.vehicle.kind !== 'heli') drawCar(ctx, sx(p.x), sy(p.y), p.angle, p.vehicle.color, { headlights: true });
  if (p.onFoot) drawPerson(ctx, sx(p.x), sy(p.y), p.angle, '#e8b400');
  // Bullets.
  ctx.fillStyle = '#ffe27a';
  for (const b of state.bullets) {
    ctx.beginPath(); ctx.arc(sx(b.x), sy(b.y), 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHud(ctx, state, viewW, viewH) {
  const p = state.player;
  ctx.textAlign = 'left';
  // Top-left: money, wanted stars, rank/RP.
  panel(ctx, 12, 12, 250, 92);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('$' + p.money.toLocaleString('en-US'), 24, 40);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ffcc00';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < p.wanted ? '★' : '☆';
  ctx.fillText(stars, 24, 64);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Rank: ${p.rank}  •  RP ${p.rp}`, 24, 86);
  // District + standing, top centre.
  const d = districtAt(p.x, p.y);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${d.name} — ${standingFor(d, state.stats.missionsDone)}`, viewW / 2, 30);
  ctx.textAlign = 'left';
  // Mission panel, left under the money.
  const m = currentMission(state);
  panel(ctx, 12, 114, 250, 108);
  if (m) {
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`JOB ${state.missionIndex + 1}/8 — ${m.name}`, 22, 136);
    const stage = state.missionStageTarget;
    if (stage) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(stage.text, 22, 156, 230);
      const done = state.missionStage;
      const total = m.stages.length;
      bar(ctx, 22, 166, 230, 10, done / total, '#ffdd00');
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Stage ${done + 1}/${total}  •  Reward $${m.reward}`, 22, 194);
      if (m.timer) ctx.fillText(`Time left: ${Math.max(0, Math.ceil(state.missionTimer))}s`, 22, 212);
    }
  } else {
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('ALL JOBS DONE — Solmar Bay is yours!', 22, 140);
  }
  // Dispatch panel, right side.
  panel(ctx, viewW - 272, 12, 260, 118);
  ctx.fillStyle = '#7fb2ff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SBPD DISPATCH', viewW - 262, 32);
  if (state.cops.length === 0) {
    ctx.fillStyle = '#ccc';
    ctx.font = '12px sans-serif';
    ctx.fillText('No units responding.', viewW - 262, 54);
  } else {
    ctx.font = '12px sans-serif';
    state.cops.slice(0, 4).forEach((cop, i) => {
      ctx.fillStyle = '#fff';
      ctx.fillText(`${cop.name} — ${cop.role}`, viewW - 262, 54 + i * 18);
      ctx.fillStyle = '#9fb7d8';
      ctx.fillText(`${cop.dist ?? 0}m`, viewW - 62, 54 + i * 18);
    });
    if (state.cops.length > 4) {
      ctx.fillStyle = '#ccc';
      ctx.fillText(`+${state.cops.length - 4} more units`, viewW - 262, 54 + 4 * 18);
    }
  }
  // Minimap, top-right below dispatch.
  drawMinimap(ctx, state, viewW - 90, 210, 74);
  // Bottom-left: health/armor + vehicle.
  panel(ctx, 12, viewH - 108, 280, 96);
  bar(ctx, 22, viewH - 96, 260, 14, p.health / 100, '#e74c3c', 'HP ' + Math.ceil(p.health));
  bar(ctx, 22, viewH - 76, 260, 14, p.armor / 100, '#3498db', 'ARMOR ' + Math.ceil(p.armor));
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  if (p.vehicle) {
    const kmh = Math.round(Math.abs(p.speed) * 0.36);
    ctx.fillText(`${p.vehicle.name}  •  ${kmh} km/h  •  Condition ${Math.round(p.vehicle.condition)}%`, 22, viewH - 34);
    if (p.vehicle.kind === 'heli') ctx.fillText(`Altitude ${Math.round(p.altitude)}m`, 22, viewH - 18);
  } else {
    ctx.fillText('On foot — press E near a car to take it', 22, viewH - 34);
    ctx.fillText('E steal car  •  G garage  •  F repair $150', 22, viewH - 18);
  }
  // Bottom-centre: radio.
  const track = currentTrack(state);
  panel(ctx, viewW / 2 - 160, viewH - 52, 320, 40);
  ctx.fillStyle = '#ff9ff3';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`♪ ${track.station.name} ${track.station.freq}`, viewW / 2, viewH - 34);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`"${track.track}" — press R to change station`, viewW / 2, viewH - 18);
  ctx.textAlign = 'left';
  // Bottom-right: weapons + crew.
  panel(ctx, viewW - 272, viewH - 148, 260, 136);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('WEAPONS  (Q to switch)', viewW - 262, viewH - 130);
  ctx.font = '12px sans-serif';
  WEAPONS.forEach((w, i) => {
    const ammo = w.ammo === Infinity ? '∞' : String(p.ammo[i]);
    ctx.fillStyle = i === p.weapon ? '#ffdd00' : '#ddd';
    ctx.fillText(`${w.slot}. ${w.name} [${ammo}]`, viewW - 262 + i * 86, viewH - 110);
  });
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('CREW  (1/2/3)', viewW - 262, viewH - 90);
  ctx.font = '11px sans-serif';
  CREW.forEach((c, i) => {
    const cd = state.crewCooldown[i] > 0 ? ` (${Math.ceil(state.crewCooldown[i])}s)` : ' — ready';
    ctx.fillStyle = state.crewCooldown[i] > 0 ? '#999' : '#2ecc71';
    ctx.fillText(`${c.key}. ${c.name} — ${c.role}${cd}`, viewW - 262, viewH - 72 + i * 16);
  });
  // Message line.
  if (state.messageTimer > 0 && state.message) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, viewW / 2, viewH - 66);
    ctx.textAlign = 'left';
  }
  // Dialog box (Mara Voss).
  if (state.dialog) {
    panel(ctx, viewW / 2 - 260, viewH - 196, 520, 72);
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(state.dialog.speaker, viewW / 2 - 248, viewH - 172);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    wrapText(ctx, state.dialog.text, viewW / 2 - 248, viewH - 152, 496, 17);
  }
  // Controls hint, very bottom-left corner.
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '11px sans-serif';
  ctx.fillText('WASD move/drive  •  E enter car  •  Mouse aim + click shoot  •  Q weapon  •  R radio  •  1/2/3 crew  •  Esc pause', 12, viewH - 118);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

export function drawTitle(ctx, state, viewW, viewH) {
  drawWorld(ctx, state, viewW, viewH);
  ctx.fillStyle = 'rgba(4, 10, 16, 0.62)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('SOLMAR BAY', viewW / 2, viewH / 2 - 90);
  ctx.fillStyle = '#fff';
  ctx.font = '24px sans-serif';
  ctx.fillText('An open-world crime story — drive, steal, fly, and outrun the SBPD', viewW / 2, viewH / 2 - 48);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(state.saveLoaded ? 'Save found — press ENTER to continue Rico\'s story' : 'Press ENTER to start', viewW / 2, viewH / 2 + 8);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText('8 story jobs for Mara Voss  •  Street races  •  Garage  •  3-person crew  •  4 radio stations  •  5-star wanted', viewW / 2, viewH / 2 + 44);
  ctx.fillText('WASD move / drive   •   E steal & enter cars   •   Mouse aim, click to shoot   •   Q weapon   •   R radio   •   1/2/3 crew', viewW / 2, viewH / 2 + 74);
  ctx.textAlign = 'left';
}

export function drawPause(ctx, viewW, viewH) {
  ctx.fillStyle = 'rgba(4, 10, 16, 0.7)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', viewW / 2, viewH / 2 - 20);
  ctx.font = '18px sans-serif';
  ctx.fillText('Esc — resume    •    R — restart the story    •    Your progress is saved', viewW / 2, viewH / 2 + 24);
  ctx.textAlign = 'left';
}

export function drawGameOver(ctx, state, viewW, viewH) {
  ctx.fillStyle = 'rgba(10, 4, 6, 0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = state.overReason === 'busted' ? '#7fb2ff' : '#ff5a5a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(state.overReason === 'busted' ? 'BUSTED' : 'WASTED', viewW / 2, viewH / 2 - 40);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(state.overReason === 'busted' ? 'The SBPD caught Rico. The story pauses here.' : 'Rico went down. The story pauses here.', viewW / 2, viewH / 2 + 4);
  ctx.font = '16px sans-serif';
  ctx.fillText(`Jobs done: ${state.stats.missionsDone}/8   •   Cars stolen: ${state.stats.carsStolen}   •   Cash: $${state.player.money}`, viewW / 2, viewH / 2 + 40);
  ctx.fillText('Press R to start the story again', viewW / 2, viewH / 2 + 72);
  ctx.textAlign = 'left';
}

export function render(ctx, state, viewW, viewH) {
  if (state.screen === 'title') { drawTitle(ctx, state, viewW, viewH); return; }
  drawWorld(ctx, state, viewW, viewH);
  drawHud(ctx, state, viewW, viewH);
  if (state.screen === 'pause') drawPause(ctx, viewW, viewH);
  if (state.screen === 'over') drawGameOver(ctx, state, viewW, viewH);
}
