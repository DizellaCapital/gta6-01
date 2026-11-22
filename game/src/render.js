// Canvas renderer: top-down city, vehicles, helicopters, pedestrians,
// mission markers, and every HUD panel plus the title / pause / game-over screens.
import { CONFIG } from './config.js';
import { allBuildings, roadXs, roadYs } from './city.js';
import { districtAt, standingLabel } from './districts.js';
import { drawMinimap } from './minimap.js';
import { currentMission, objectiveText, stageTarget } from './missions.js';
import { weaponName, weaponAmmo, WEAPONS } from './combat.js';
import { stationName, trackName } from './radio.js';
import { nearestUnitDistance } from './police.js';
import { playerCar } from './world.js';

const PAL = CONFIG.PALETTE;

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8, 12, 18, ${alpha ?? 0.72})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function text(ctx, s, x, y, size, color, align, bold) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(s, x, y);
}

function drawCarShape(ctx, x, y, angle, color, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, 7);
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(-w * 0.18, -h / 2 + 4, w * 0.36, h - 8);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(w / 2 - 3, -h / 2 + 3, 3, 5);
  ctx.fillRect(w / 2 - 3, h / 2 - 8, 3, 5);
  ctx.restore();
}

function drawHeliShape(ctx, x, y, angle, alt, color, spotlight, time) {
  const sh = Math.max(0.35, 1 - alt / 400);
  ctx.save();
  // Shadow on the ground.
  ctx.fillStyle = `rgba(0,0,0,${0.35 * sh})`;
  ctx.beginPath();
  ctx.ellipse(x + alt * 0.25, y + alt * 0.25, 26 * sh, 12 * sh, 0, 0, Math.PI * 2);
  ctx.fill();
  if (spotlight) {
    const g = ctx.createRadialGradient(spotlight.x, spotlight.y, 4, spotlight.x, spotlight.y, 90);
    g.addColorStop(0, 'rgba(255, 244, 180, 0.5)');
    g.addColorStop(1, 'rgba(255, 244, 180, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(spotlight.x, spotlight.y, 90, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2733';
  ctx.beginPath();
  ctx.ellipse(12, 0, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rotor (angle driven by world time so staged frames are deterministic).
  const rot = (time * 22) % (Math.PI * 2);
  ctx.strokeStyle = 'rgba(230,230,230,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(rot) * -34, Math.sin(rot) * -34);
  ctx.lineTo(Math.cos(rot) * 34, Math.sin(rot) * 34);
  ctx.stroke();
  ctx.restore();
}

export function drawWorld(ctx, world, view) {
  const { w, h } = view;
  const p = world.player;
  const camX = Math.max(w / 2, Math.min(CONFIG.WORLD_W - w / 2, p.x));
  const camY = Math.max(h / 2, Math.min(CONFIG.WORLD_H - h / 2, p.y));
  const ox = w / 2 - camX;
  const oy = h / 2 - camY;
  ctx.clearRect(0, 0, w, h);
  // Ground.
  ctx.fillStyle = PAL.grass;
  ctx.fillRect(0, 0, w, h);
  // Sea strip on the west edge.
  ctx.fillStyle = PAL.sea;
  ctx.fillRect(ox - 120, oy - 120, 150, CONFIG.WORLD_H + 240);
  ctx.fillStyle = PAL.sand;
  ctx.fillRect(ox + 20, oy - 120, 22, CONFIG.WORLD_H + 240);
  // Blocks / buildings.
  for (const b of allBuildings()) {
    const bx = b.x + ox;
    const by = b.y + oy;
    if (bx > w + 50 || by > h + 50 || bx + b.w < -50 || by + b.h < -50) continue;
    ctx.fillStyle = PAL[b.color] || '#888888';
    ctx.fillRect(bx, by, b.w, b.h);
    if (b.kind === 'house') {
      ctx.fillStyle = PAL.roof;
      ctx.fillRect(bx + 4, by + 4, b.w - 8, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(bx + 8, by + 22, 10, 12);
      ctx.fillRect(bx + b.w - 18, by + 22, 10, 12);
    } else if (b.kind === 'park') {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(bx + b.w / 2, by + b.h / 2, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Roads.
  ctx.fillStyle = PAL.road;
  for (const x of roadXs()) ctx.fillRect(x + ox - CONFIG.ROAD_HALF, oy - 120, CONFIG.ROAD_HALF * 2, CONFIG.WORLD_H + 240);
  for (const y of roadYs()) ctx.fillRect(ox - 120, y + oy - CONFIG.ROAD_HALF, CONFIG.WORLD_W + 240, CONFIG.ROAD_HALF * 2);
  // Centre dashes.
  ctx.fillStyle = PAL.roadLine;
  for (const x of roadXs()) {
    for (let y = 0; y < CONFIG.WORLD_H; y += 64) ctx.fillRect(x + ox - 2, y + oy, 4, 30);
  }
  for (const y of roadYs()) {
    for (let x = 0; x < CONFIG.WORLD_W; x += 64) ctx.fillRect(x + ox, y + oy - 2, 30, 4);
  }
  // Helipad.
  const hx = world.helipad.x + ox;
  const hy = world.helipad.y + oy;
  ctx.fillStyle = '#555c66';
  ctx.beginPath();
  ctx.arc(hx, hy, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8b73a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hx, hy, 34, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, 'H', hx, hy - 10, 26, '#e8b73a', 'center', true);
  // Garage marker.
  ctx.fillStyle = '#e8b73a';
  ctx.fillRect(2600 + ox - 14, 1400 + oy - 14, 28, 28);
  text(ctx, 'G', 2600 + ox, 1400 + oy - 10, 20, '#111111', 'center', true);
  // Mission marker.
  const t = world.missions.done ? null : stageTarget(world.missions);
  if (t) {
    const mx = t.x + ox;
    const my = t.y + oy;
    const pulse = 14 + Math.sin(world.time * 5) * 4;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mx, my, pulse + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(mx, my - 26);
    ctx.lineTo(mx + 10, my - 8);
    ctx.lineTo(mx - 10, my - 8);
    ctx.closePath();
    ctx.fill();
  }
  // Roadblocks.
  for (const rb of world.roadblocks) {
    ctx.save();
    ctx.translate(rb.x + ox, rb.y + oy);
    ctx.rotate(rb.angle);
    ctx.fillStyle = '#d35400';
    ctx.fillRect(-34, -8, 68, 16);
    ctx.fillStyle = '#ffffff';
    for (let i = -30; i < 30; i += 12) ctx.fillRect(i, -8, 6, 16);
    ctx.restore();
  }
  // Parked + traffic + police cars.
  for (const c of world.cars) {
    if (c.kind === 'player') continue;
    const col = c.kind === 'police' ? PAL.police : c.color;
    drawCarShape(ctx, c.x + ox, c.y + oy, c.angle, col, 40, 20);
    if (c.kind === 'police') {
      ctx.fillStyle = (Math.floor(world.time * 4) % 2 === 0) ? '#ff4444' : '#4488ff';
      ctx.fillRect(c.x + ox - 8, c.y + oy - 12, 16, 4);
    }
  }
  // Pedestrians.
  for (const ped of world.peds) {
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(ped.x + ox, ped.y + oy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(ped.x + ox, ped.y + oy - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tracers.
  ctx.strokeStyle = 'rgba(255, 220, 90, 0.9)';
  ctx.lineWidth = 2;
  for (const tr of world.tracers) {
    ctx.beginPath();
    ctx.moveTo(tr.x1 + ox, tr.y1 + oy);
    ctx.lineTo(tr.x2 + ox, tr.y2 + oy);
    ctx.stroke();
  }
  // Player helicopter or car or on-foot figure.
  if (world.playerHeli && !world.playerHeli.parked) {
    const hh = world.playerHeli;
    drawHeliShape(ctx, hh.x + ox, hh.y + oy, hh.angle, hh.alt, PAL.heli, null, world.time);
  } else if (world.playerHeli && world.playerHeli.parked) {
    const hh = world.playerHeli;
    drawHeliShape(ctx, hh.x + ox, hh.y + oy, hh.angle, 0, PAL.heli, null, world.time);
  }
  const car = playerCar(world);
  if (car) {
    drawCarShape(ctx, car.x + ox, car.y + oy, car.angle, PAL.player, 42, 21);
  } else if (world.playerHeli == null || world.playerHeli.parked || p.heliId == null) {
    if (p.onFoot) {
      ctx.fillStyle = '#e8b73a';
      ctx.beginPath();
      ctx.arc(p.x + ox, p.y + oy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + ox, p.y + oy);
      ctx.lineTo(p.x + ox + Math.cos(p.angle) * 14, p.y + oy + Math.sin(p.angle) * 14);
      ctx.stroke();
    }
  }
  // Police helicopter + spotlight.
  if (world.heliPolice) {
    const hp = world.heliPolice;
    drawHeliShape(ctx, hp.x + ox, hp.y + oy, hp.angle, hp.alt, '#3a6fd8', { x: hp.spotX + ox, y: hp.spotY + oy }, world.time);
    text(ctx, 'SBPD AIR-1', hp.x + ox, hp.y + oy - 34, 11, '#ffffff', 'center', true);
  }
  return { ox, oy };
}

export function drawHUD(ctx, world, view) {
  const { w, h } = view;
  const p = world.player;
  const mission = currentMission(world.missions);
  // Top-left: money + wanted stars + HP/armor.
  panel(ctx, 10, 10, 250, 92);
  text(ctx, `$${p.money.toLocaleString('en-US')}`, 20, 16, 22, '#7dff8a', 'left', true);
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < p.wanted ? '★' : '☆';
  text(ctx, stars, 20, 44, 20, p.wanted > 0 ? '#ffcc33' : '#888888');
  text(ctx, `RP ${p.rp}  •  ${p.rank}`, 20, 70, 12, '#cfe3ff');
  // HP / armor bars.
  ctx.fillStyle = '#333333';
  ctx.fillRect(150, 20, 100, 10);
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(150, 20, 100 * (p.hp / 100), 10);
  ctx.fillStyle = '#333333';
  ctx.fillRect(150, 36, 100, 10);
  ctx.fillStyle = '#42a5f5';
  ctx.fillRect(150, 36, 100 * (p.armor / 100), 10);
  text(ctx, 'HP', 132, 18, 10, '#ffffff');
  text(ctx, 'ARMOR', 108, 34, 10, '#ffffff');
  // Top-centre: district + standing.
  const dName = districtAt(p.x, p.y);
  const dRec = world.districts.find((d) => d.name === dName);
  panel(ctx, w / 2 - 130, 10, 260, 34);
  text(ctx, `${dName} — ${standingLabel(dRec ? dRec.standing : 0)}`, w / 2, 18, 14, '#ffffff', 'center', true);
  // Top-right: mission panel.
  panel(ctx, w - 290, 10, 280, 108);
  text(ctx, `JOB ${Math.min(world.missions.index + 1, 8)}/8 — ${mission.name}`, w - 280, 16, 13, '#ffd700', 'left', true);
  text(ctx, objectiveText(world.missions), w - 280, 38, 12, '#ffffff');
  // Stage bar.
  const stageCount = mission.stages.length;
  const stageDone = world.missions.done ? stageCount : world.missions.stage;
  ctx.fillStyle = '#333333';
  ctx.fillRect(w - 280, 58, 260, 8);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(w - 280, 58, 260 * (stageDone / stageCount), 8);
  text(ctx, `STAGE ${stageDone}/${stageCount}`, w - 280, 70, 11, '#cfe3ff');
  if (world.missions.timer > 0) {
    text(ctx, `TIMER ${Math.ceil(world.missions.timer)}s`, w - 60, 70, 12, '#ff8866', 'right', true);
  }
  text(ctx, `NEXT: ${world.missions.done ? '—' : (world.missions.stage + 1 < stageCount ? mission.stages[world.missions.stage + 1].text : 'Finish the job')}`, w - 280, 88, 11, '#9fb3c8');
  // Dispatch panel (right, under mission).
  if (p.wanted > 0) {
    const units = world.police.filter((u) => !u.dead);
    panel(ctx, w - 290, 126, 280, 30 + units.length * 18);
    text(ctx, `SBPD DISPATCH — ${units.length} unit${units.length === 1 ? '' : 's'} • nearest ${nearestUnitDistance(world)}m`, w - 280, 132, 12, '#ff9a9a', 'left', true);
    units.slice(0, 5).forEach((u, i) => {
      text(ctx, `${u.name} — ${u.role}`, w - 280, 152 + i * 18, 11, '#ffffff');
    });
    if (world.heliPolice) text(ctx, 'AIR-1 — Spotlight (heli)', w - 280, 152 + Math.min(units.length, 5) * 18, 11, '#ffd700');
  }
  // Bottom-left: vehicle + weapon + crew.
  panel(ctx, 10, h - 148, 300, 138);
  const carInfo = playerCar(world);
  if (p.heliId != null) {
    text(ctx, 'HELICOPTER — SBPD surplus', 20, h - 142, 13, '#ffffff', 'left', true);
    text(ctx, `ALT ${Math.round(world.playerHeli.alt)}m  •  SPD ${Math.round(p.speed * 0.22)} mph`, 20, h - 122, 12, '#cfe3ff');
  } else if (carInfo) {
    text(ctx, `${carInfo.name.toUpperCase()} — ${Math.round(p.speed * 0.22)} mph`, 20, h - 142, 13, '#ffffff', 'left', true);
    text(ctx, `CONDITION ${Math.round(carInfo.health)}%`, 20, h - 122, 12, '#cfe3ff');
    ctx.fillStyle = '#333333';
    ctx.fillRect(20, h - 104, 120, 7);
    ctx.fillStyle = carInfo.health > 50 ? '#4caf50' : '#ff7043';
    ctx.fillRect(20, h - 104, 120 * (carInfo.health / 100), 7);
  } else {
    text(ctx, 'ON FOOT — press E near a car to drive', 20, h - 142, 12, '#ffffff');
    text(ctx, `SPD ${Math.round(p.speed * 0.22)} mph`, 20, h - 122, 12, '#cfe3ff');
  }
  // Weapon slots.
  WEAPONS.forEach((wpn, i) => {
    const x = 20 + i * 92;
    const y = h - 92;
    ctx.fillStyle = world.combat.weapon === i ? 'rgba(255, 215, 0, 0.35)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, 84, 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(x + 0.5, y + 0.5, 84, 26);
    text(ctx, `${i + 1} ${wpn.name} ${wpn.ammo === Infinity ? '∞' : (world.combat.ammo[wpn.id] ?? 0)}`, x + 6, y + 7, 11, '#ffffff');
  });
  text(ctx, `WEAPON: ${weaponName(world.combat)}  AMMO ${weaponAmmo(world.combat)}   [Q] switch`, 20, h - 58, 11, '#cfe3ff');
  // Crew cards.
  world.crew.forEach((m, i) => {
    const x = 20 + i * 96;
    const y = h - 40;
    ctx.fillStyle = m.readyIn > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(66, 165, 245, 0.25)';
    ctx.fillRect(x, y, 90, 28);
    text(ctx, `${i + 1} ${m.name} ${m.readyIn > 0 ? Math.ceil(m.readyIn) + 's' : 'READY'}`, x + 5, y + 4, 10, '#ffffff');
    text(ctx, m.ability, x + 5, y + 16, 10, '#9fd0ff');
  });
  // Bottom-centre: radio readout + message line.
  panel(ctx, w / 2 - 190, h - 64, 380, 54);
  text(ctx, `${stationName(world.radio)} — ${trackName(world.radio)}`, w / 2, h - 58, 12, '#ffd700', 'center', true);
  text(ctx, world.messageT > 0 || world.message ? world.message : '', w / 2, h - 36, 12, '#ffffff', 'center');
  // Bottom-right: minimap.
  drawMinimap(ctx, world, w - 100, h - 100, 78);
  // Control hints (very bottom-left, small).
  text(ctx, 'WASD drive/walk • E enter car • SPACE shoot • Q weapon • R radio • 1/2/3 crew • P pause • M mute', 10, h - 14, 11, 'rgba(255,255,255,0.75)');
  // Dialog box (Mara Voss).
  if (world.missions.dialogT > 0 && world.missions.dialog) {
    panel(ctx, w / 2 - 260, h - 190, 520, 56, 0.85);
    text(ctx, 'MARA VOSS', w / 2 - 248, h - 184, 12, '#ffd700', 'left', true);
    text(ctx, world.missions.dialog, w / 2 - 248, h - 166, 12, '#ffffff');
  }
}

export function drawTitle(ctx, world, view) {
  const { w, h } = view;
  drawWorld(ctx, world, view);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, w, h);
  text(ctx, 'SOLMAR BAY', w / 2, h / 2 - 130, 64, '#ffd700', 'center', true);
  text(ctx, 'A sun-soaked open-world crime story — no kings, only Rico.', w / 2, h / 2 - 60, 16, '#ffffff', 'center');
  text(ctx, 'Rico works for Mara Voss. Eight jobs. One city. Make it yours.', w / 2, h / 2 - 34, 14, '#cfe3ff', 'center');
  text(ctx, world.saveExists ? 'SAVE FOUND — press ENTER to continue' : 'NO SAVE YET — press ENTER to start', w / 2, h / 2 + 10, 15, '#7dff8a', 'center', true);
  text(ctx, 'WASD move/drive • E enter car • SPACE shoot • Q weapon • R radio • 1/2/3 crew • P pause', w / 2, h / 2 + 44, 13, '#ffffff', 'center');
  text(ctx, 'Steal cars, lose the SBPD, finish all 8 jobs for Mara Voss.', w / 2, h / 2 + 68, 13, '#9fb3c8', 'center');
  text(ctx, 'Fan-made original. Not affiliated with Rockstar Games.', w / 2, h - 24, 11, 'rgba(255,255,255,0.6)', 'center');
}

export function drawPause(ctx, world, view) {
  const { w, h } = view;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);
  text(ctx, 'PAUSED', w / 2, h / 2 - 60, 44, '#ffffff', 'center', true);
  text(ctx, `Money $${world.player.money} • Jobs ${world.missions.index}/8 • RP ${world.player.rp}`, w / 2, h / 2, 15, '#cfe3ff', 'center');
  text(ctx, 'Garage:', w / 2, h / 2 + 30, 14, '#ffd700', 'center', true);
  world.garage.forEach((g, i) => {
    text(ctx, `${g.name} — condition ${g.condition}%`, w / 2, h / 2 + 52 + i * 18, 13, '#ffffff', 'center');
  });
  text(ctx, 'Press P to resume • S to save', w / 2, h / 2 + 110, 13, '#ffffff', 'center');
}

export function drawOver(ctx, world, view) {
  const { w, h } = view;
  drawWorld(ctx, world, view);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(0, 0, w, h);
  if (world.overReason === 'story') {
    text(ctx, 'SOLMAR BAY IS YOURS', w / 2, h / 2 - 70, 46, '#ffd700', 'center', true);
    text(ctx, 'All 8 jobs done. Mara Voss owns the city — and so do you.', w / 2, h / 2 - 10, 16, '#ffffff', 'center');
  } else if (world.overReason === 'busted') {
    text(ctx, 'BUSTED', w / 2, h / 2 - 70, 56, '#ff5252', 'center', true);
    text(ctx, 'The SBPD caught Rico. The city keeps its secrets — for now.', w / 2, h / 2 - 10, 16, '#ffffff', 'center');
  } else {
    text(ctx, 'WASTED', w / 2, h / 2 - 70, 56, '#ff5252', 'center', true);
    text(ctx, 'Rico went down. Solmar Bay forgets quickly.', w / 2, h / 2 - 10, 16, '#ffffff', 'center');
  }
  text(ctx, `Money $${world.player.money} • Jobs ${world.missions.index}/8 • RP ${world.player.rp} • Distance ${Math.round(world.stats.distance / 100)}m`, w / 2, h / 2 + 24, 14, '#cfe3ff', 'center');
  text(ctx, 'Press ENTER to play again', w / 2, h / 2 + 56, 14, '#7dff8a', 'center', true);
}
