// Canvas renderer: the top-down city, vehicles, helicopter + spotlight,
// pedestrians, mission marker, and every HUD panel plus the title, pause and
// end screens. All drawing is plain 2D canvas, no assets.
import { CFG, PALETTE } from './config.js';
import { districtAt, standingLabel } from './districts.js';
import { missionProgress, radioNow } from './world.js';
import { drawMinimap } from './minimap.js';
import { WEAPONS } from './combat.js';
import { CREW, crewReady } from './crew.js';
import { dispatchRows } from './police.js';
import { stationById } from './radio.js';

export function render(ctx, S, viewW, viewH) {
  ctx.save();
  ctx.clearRect(0, 0, viewW, viewH);
  const shakeX = S.shake ? (Math.random() - 0.5) * S.shake : 0;
  const shakeY = S.shake ? (Math.random() - 0.5) * S.shake : 0;
  const camX = S.camera.x - viewW / 2 + shakeX;
  const camY = S.camera.y - viewH / 2 + shakeY;
  ctx.translate(-camX, -camY);

  drawGround(ctx, S, camX, camY, viewW, viewH);
  drawRoads(ctx, S, camX, camY, viewW, viewH);
  drawLandmarks(ctx, S);
  drawMissionMarker(ctx, S);
  drawCars(ctx, S);
  drawPeds(ctx, S);
  drawPlayer(ctx, S);
  drawBullets(ctx, S);
  drawHeli(ctx, S);

  ctx.restore();

  if (S.screen === 'title') drawTitle(ctx, S, viewW, viewH);
  else if (S.screen === 'pause') { drawHud(ctx, S, viewW, viewH); drawPause(ctx, S, viewW, viewH); }
  else if (S.screen === 'end') { drawHud(ctx, S, viewW, viewH); drawEnd(ctx, S, viewW, viewH); }
  else drawHud(ctx, S, viewW, viewH);
}

function drawGround(ctx, S, camX, camY, viewW, viewH) {
  const x0 = Math.max(0, camX - 40);
  const y0 = Math.max(0, camY - 40);
  const x1 = Math.min(CFG.worldWidth, camX + viewW + 40);
  const y1 = Math.min(CFG.worldHeight, camY + viewH + 40);
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Mow stripes for a sun-soaked lawn feel.
  ctx.fillStyle = PALETTE.grassDark;
  const stripe = 100;
  for (let y = Math.floor(y0 / stripe) * stripe; y < y1; y += stripe * 2) {
    ctx.fillRect(x0, y, x1 - x0, stripe);
  }
  // Sand + sea along the south edge.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x0, CFG.worldHeight - 90, x1 - x0, 90);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(x0, CFG.worldHeight - 34, x1 - x0, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) {
    ctx.fillRect(x, CFG.worldHeight - 30, 46, 3);
  }
}

function drawRoads(ctx, S, camX, camY, viewW, viewH) {
  const x0 = camX - 60;
  const y0 = camY - 60;
  const x1 = camX + viewW + 60;
  const y1 = camY + viewH + 60;
  for (const rx of S.city.roadsX) {
    if (rx < x0 || rx > x1) continue;
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(rx - CFG.roadHalf - 8, y0, (CFG.roadHalf + 8) * 2, y1 - y0);
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(rx - CFG.roadHalf, y0, CFG.roadHalf * 2, y1 - y0);
    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    ctx.moveTo(rx, y0);
    ctx.lineTo(rx, y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const ry of S.city.roadsY) {
    if (ry < y0 || ry > y1) continue;
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(x0, ry - CFG.roadHalf - 8, x1 - x0, (CFG.roadHalf + 8) * 2);
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(x0, ry - CFG.roadHalf, x1 - x0, CFG.roadHalf * 2);
    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    ctx.moveTo(x0, ry);
    ctx.lineTo(x1, ry);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Buildings.
  for (const b of S.city.buildings) {
    if (b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1) continue;
    ctx.fillStyle = PALETTE.buildingEdge;
    ctx.fillRect(b.x0 - 3, b.y0 - 3, b.x1 - b.x0 + 6, b.y1 - b.y0 + 6);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.fillStyle = b.lit ? PALETTE.window : 'rgba(0,0,0,0.25)';
    for (const w of b.windows) ctx.fillRect(w.x, w.y, 10, 7);
  }
}

function drawLandmarks(ctx, S) {
  const pad = S.city.helipad;
  ctx.fillStyle = PALETTE.heliPad;
  ctx.beginPath();
  ctx.arc(pad.x, pad.y, pad.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(pad.x, pad.y, pad.r - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', pad.x, pad.y);

  const g = S.city.garage;
  ctx.fillStyle = PALETTE.garage;
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.strokeStyle = '#e8c832';
  ctx.lineWidth = 3;
  ctx.strokeRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = '#f2f5ff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('GARAGE', g.x + g.w / 2, g.y + g.h / 2);

  const m = S.city.marina;
  ctx.fillStyle = PALETTE.marina;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fc4e8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('MARINA', m.x, m.y);
}

function drawMissionMarker(ctx, S) {
  const mp = missionProgress(S);
  if (!mp || !mp.target || mp.state !== 'active') return;
  const t = mp.target;
  const pulse = 1 + Math.sin(S.time * 5) * 0.18;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = PALETTE.marker;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, 26);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Beacon line from the player to the marker.
  ctx.strokeStyle = 'rgba(255, 210, 62, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(S.player.x, S.player.y);
  ctx.lineTo(t.x, t.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCarShape(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const len = 44;
  const wid = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-len / 2 + 3, -wid / 2 + 4, len, wid);
  ctx.fillStyle = car.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  ctx.fillRect(-6, -wid / 2 + 3, 14, wid - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(len / 2 - 5, -wid / 2 + 2, 3, 5);
  ctx.fillRect(len / 2 - 5, wid / 2 - 7, 3, 5);
  if (isPlayer) {
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 2;
    roundRect(ctx, -len / 2 - 2, -wid / 2 - 2, len + 4, wid + 4, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCars(ctx, S) {
  for (const car of S.cars) {
    if (car.kind === 'player') continue;
    drawCarShape(ctx, car, false);
    if (car.kind === 'police') drawLightBar(ctx, car);
  }
  for (const cop of S.police) {
    drawCarShape(ctx, cop, false);
    drawLightBar(ctx, cop);
  }
  if (S.roadblock) {
    for (const off of [-34, 34]) {
      const a = S.roadblock.angle;
      drawCarShape(ctx, {
        x: S.roadblock.x + Math.cos(a) * off,
        y: S.roadblock.y + Math.sin(a) * off,
        angle: a, color: '#e8eef7',
      }, false);
    }
  }
}

function drawLightBar(ctx, car) {
  const on = Math.floor(car.flash * 6) % 2 === 0;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = on ? '#ff3b30' : '#2456d6';
  ctx.fillRect(-4, -12, 8, 5);
  ctx.fillStyle = on ? '#2456d6' : '#ff3b30';
  ctx.fillRect(-4, 7, 8, 5);
  ctx.restore();
}

function drawPeds(ctx, S) {
  for (const ped of S.peds) {
    if (ped.hp <= 0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(ped.x + 2, ped.y + 3, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(ped.x, ped.y - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, S) {
  const p = S.player;
  if (p.car) {
    drawCarShape(ctx, p.car, true);
    return;
  }
  if (p.flying) return; // the player helicopter is drawn by drawHeli
  // Rico on foot: a small figure with a direction tick.
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(Math.cos(p.angle) * 4, Math.sin(p.angle) * 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBullets(ctx, S) {
  ctx.fillStyle = '#ffe27a';
  for (const b of S.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (S.muzzle > 0) {
    const p = S.player;
    ctx.fillStyle = 'rgba(255, 220, 90, 0.9)';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHeli(ctx, S) {
  // Police helicopter with its spotlight cone.
  if (S.heli) {
    const h = S.heli;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#fff6b0';
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(h.spotX - 46, h.spotY - 20);
    ctx.lineTo(h.spotX + 46, h.spotY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 246, 176, 0.5)';
    ctx.beginPath();
    ctx.arc(h.spotX, h.spotY, 30, 0, Math.PI * 2);
    ctx.fill();
    drawHeliBody(ctx, h.x, h.y, h.rotor, '#e8eef7', true);
  }
  // The player's own helicopter.
  if (S.player.flying) {
    const p = S.player;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.alt * 0.5, p.y + p.alt * 0.5, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    drawHeliBody(ctx, p.x, p.y, S.time * 22, '#c22e2e', false);
  }
}

function drawHeliBody(ctx, x, y, rotor, color, police) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = police ? '#2456d6' : '#7a1616';
  ctx.fillRect(-20, -4, 12, 8);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  const r = rotor % Math.PI;
  ctx.beginPath();
  ctx.moveTo(Math.cos(r) * 34, Math.sin(r) * 34);
  ctx.lineTo(-Math.cos(r) * 34, -Math.sin(r) * 34);
  ctx.stroke();
  ctx.restore();
}

// ---------- HUD ----------

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hud;
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function text(ctx, str, x, y, size = 14, color = PALETTE.text, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(str, x, y);
}

function drawHud(ctx, S, viewW, viewH) {
  const p = S.player;
  const mp = missionProgress(S);
  const district = districtAt(S.districts, p.x, p.y);
  const radio = radioNow(S);

  // Top-left: cash, stars, rank.
  panel(ctx, 10, 10, 218, 86);
  text(ctx, `$${p.money}`, 22, 18, 22, '#58d977');
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < p.wanted ? '★' : '☆';
  text(ctx, stars, 22, 46, 18, p.wanted > 0 ? '#ffb02e' : '#b9c2d4');
  text(ctx, `Rank: ${p.rank}  •  RP ${p.rp}`, 22, 70, 13, PALETTE.dim, 'normal');

  // Top-centre: district + standing.
  const dLabel = `${district.name} — ${standingLabel(district)}`;
  ctx.font = 'bold 15px system-ui, sans-serif';
  const dW = ctx.measureText(dLabel).width + 28;
  panel(ctx, viewW / 2 - dW / 2, 10, dW, 30);
  text(ctx, dLabel, viewW / 2, 17, 15, PALETTE.text, 'bold', 'center');

  // Top-right: SBPD dispatch.
  const rows = dispatchRows(S);
  const dh = 30 + Math.max(1, rows.length) * 19 + (rows.length > 4 ? 18 : 0);
  panel(ctx, viewW - 238, 10, 228, Math.max(66, dh));
  text(ctx, 'SBPD DISPATCH', viewW - 226, 18, 13, '#7db4ff');
  if (rows.length === 0) {
    text(ctx, 'No units on you', viewW - 226, 40, 13, PALETTE.dim, 'normal');
  } else {
    rows.slice(0, 4).forEach((r, i) => {
      text(ctx, `Unit ${r.id} — ${r.role}`, viewW - 226, 40 + i * 19, 13, PALETTE.text, 'normal');
      text(ctx, `${r.dist}m`, viewW - 22, 40 + i * 19, 13, PALETTE.dim, 'normal', 'right');
    });
    if (rows.length > 4) text(ctx, `+${rows.length - 4} more units`, viewW - 226, 40 + 4 * 19, 13, PALETTE.dim, 'normal');
  }

  // Minimap (right, below dispatch).
  const mapR = 74;
  const mapCx = viewW - 92;
  const mapCy = 10 + Math.max(66, dh) + mapR + 16;
  drawMinimap(ctx, S, mapCx, mapCy, mapR);

  // Left: mission panel.
  if (mp) {
    panel(ctx, 10, 108, 250, 108);
    text(ctx, `JOB ${mp.index}/8 — ${mp.name}`, 22, 118, 14, PALETTE.gold);
    text(ctx, mp.next, 22, 140, 12, PALETTE.text, 'normal');
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(22, 162, 226, 8);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(22, 162, 226 * (mp.stage / mp.stages), 8);
    let sub = `Stage ${mp.stage}/${mp.stages}`;
    if (mp.timer > 0) sub += `  •  ${Math.ceil(mp.timer)}s left`;
    text(ctx, sub, 22, 176, 12, PALETTE.dim, 'normal');
    if (mp.state === 'failed') text(ctx, 'FAILED — press M to retry', 22, 194, 12, PALETTE.red);
  }

  // Bottom-left: health/armor + vehicle.
  panel(ctx, 10, viewH - 108, 250, 98);
  bar(ctx, 22, viewH - 96, 226, 16, p.hp / 100, '#ff5a4e', `HP ${Math.ceil(p.hp)}`);
  bar(ctx, 22, viewH - 74, 226, 12, p.armor / 100, '#5aa2ff', `ARMOR ${Math.ceil(p.armor)}`);
  if (p.flying) {
    text(ctx, `Helicopter  •  Alt ${Math.round(p.alt)}m`, 22, viewH - 56, 13, PALETTE.text, 'normal');
  } else if (p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.36);
    text(ctx, `${p.car.model}  •  ${kmh} km/h  •  Condition ${Math.round(p.car.condition)}%`, 22, viewH - 56, 13, PALETTE.text, 'normal');
  } else {
    text(ctx, 'On foot — find a car (E to steal)', 22, viewH - 56, 13, PALETTE.text, 'normal');
  }
  text(ctx, `Garage cars: ${S.garageCars.length}  •  Stolen: ${S.stats.stolen}`, 22, viewH - 36, 12, PALETTE.dim, 'normal');

  // Bottom-centre: radio (kept clear of the controls hint line).
  panel(ctx, viewW / 2 - 190, viewH - 96, 380, 46);
  text(ctx, `♪ ${radio.name}`, viewW / 2, viewH - 88, 14, '#e39bff', 'bold', 'center');
  text(ctx, `"${radio.track}" — press R to change station`, viewW / 2, viewH - 68, 12, PALETTE.dim, 'normal', 'center');

  // Bottom-right: weapons + crew.
  panel(ctx, viewW - 268, viewH - 148, 258, 138);
  text(ctx, 'WEAPONS  (Q to switch)', viewW - 256, viewH - 140, 12, PALETTE.dim);
  WEAPONS.forEach((w, i) => {
    const ammo = w.ammo === Infinity ? '∞' : String(S.player.ammo[w.id]);
    const active = S.player.weapon === i;
    text(ctx, `${i + 1}. ${w.name} [${ammo}]`, viewW - 256 + i * 86, viewH - 120, 13, active ? PALETTE.gold : PALETTE.text, active ? 'bold' : 'normal');
  });
  text(ctx, `CREW  (${CREW.filter((_, i) => crewReady(S, i)).length}/3)`, viewW - 256, viewH - 98, 12, PALETTE.dim);
  CREW.forEach((c, i) => {
    const ready = crewReady(S, i);
    const label = ready ? 'ready' : `${Math.ceil((S.crewCooldowns[i] || 0) - S.time)}s`;
    text(ctx, `${c.key}. ${c.name} — ${c.role} — ${label}`, viewW - 256, viewH - 80 + i * 16, 12, ready ? PALETTE.green : PALETTE.dim, 'normal');
  });

  // Dialog box.
  if (S.dialog) {
    panel(ctx, viewW / 2 - 260, viewH - 158, 520, 62);
    text(ctx, S.dialog.name, viewW / 2 - 246, viewH - 150, 13, PALETTE.gold);
    wrapText(ctx, S.dialog.text, viewW / 2 - 246, viewH - 130, 492, 13);
  }

  // Message log.
  S.messageLog.forEach((m, i) => {
    if (S.time - m.at > 6) return;
    text(ctx, m.text, 22, viewH - 132 - i * 18, 13, 'rgba(242,245,255,0.9)', 'normal');
  });

  // Controls hint (starts clear of the screen-reader status line).
  text(ctx, 'WASD move/drive  •  E enter car  •  Mouse aim + click shoot  •  Q weapon  •  R radio  •  1/2/3 crew  •  Esc pause', 300, viewH - 18, 12, 'rgba(242,245,255,0.75)', 'normal');
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 6, y + h / 2 + 0.5);
}

function wrapText(ctx, str, x, y, maxW, size) {
  ctx.font = `normal ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(line, x, yy);
      line = w;
      yy += size + 3;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(line, x, yy);
  }
}

function drawTitle(ctx, S, viewW, viewH) {
  ctx.fillStyle = 'rgba(6, 10, 24, 0.55)';
  ctx.fillRect(0, 0, viewW, viewH);
  text(ctx, 'SOLMAR BAY', viewW / 2, viewH * 0.2, 72, '#ffd23e', 'bold', 'center');
  text(ctx, 'An open-world crime story  •  Rico  •  Mara Voss  •  SBPD', viewW / 2, viewH * 0.2 + 84, 18, PALETTE.text, 'normal', 'center');
  const save = S.saveInfo;
  const saveLine = save
    ? `Save found: $${save.money}  •  JOB ${save.missionIdx + 1}/8  •  press Enter to continue`
    : 'No save yet — a fresh start in Solmar Bay';
  panel(ctx, viewW / 2 - 300, viewH * 0.38, 600, 150);
  text(ctx, saveLine, viewW / 2, viewH * 0.38 + 16, 15, PALETTE.text, 'normal', 'center');
  text(ctx, 'WASD move / drive      E enter or steal a car      Mouse aim, click to shoot', viewW / 2, viewH * 0.38 + 48, 14, PALETTE.dim, 'normal', 'center');
  text(ctx, 'Q switch weapon      R radio      1/2/3 call the crew      Esc pause', viewW / 2, viewH * 0.38 + 72, 14, PALETTE.dim, 'normal', 'center');
  text(ctx, '8 story jobs for Mara Voss  •  5-star wanted system  •  garage  •  flyable helicopter', viewW / 2, viewH * 0.38 + 96, 14, PALETTE.dim, 'normal', 'center');
  text(ctx, 'PRESS ENTER TO PLAY', viewW / 2, viewH * 0.38 + 122, 16, PALETTE.gold, 'bold', 'center');
  text(ctx, 'An original game. No Rockstar names, characters or assets.', viewW / 2, viewH - 34, 12, 'rgba(242,245,255,0.6)', 'normal', 'center');
}

function drawPause(ctx, S, viewW, viewH) {
  ctx.fillStyle = 'rgba(6, 10, 24, 0.6)';
  ctx.fillRect(0, 0, viewW, viewH);
  panel(ctx, viewW / 2 - 220, viewH / 2 - 110, 440, 220);
  text(ctx, 'PAUSED', viewW / 2, viewH / 2 - 92, 32, PALETTE.text, 'bold', 'center');
  text(ctx, `Cash $${S.player.money}   •   JOB ${S.missionIdx + 1}/8   •   Rank ${S.player.rank}`, viewW / 2, viewH / 2 - 44, 14, PALETTE.dim, 'normal', 'center');
  text(ctx, 'Esc — resume      Enter — save + resume', viewW / 2, viewH / 2 - 14, 14, PALETTE.text, 'normal', 'center');
  text(ctx, 'M — retry current job      R — change radio station', viewW / 2, viewH / 2 + 12, 14, PALETTE.text, 'normal', 'center');
  text(ctx, 'Progress auto-saves when a job is done.', viewW / 2, viewH / 2 + 42, 13, PALETTE.dim, 'normal', 'center');
}

function drawEnd(ctx, S, viewW, viewH) {
  ctx.fillStyle = 'rgba(10, 4, 8, 0.62)';
  ctx.fillRect(0, 0, viewW, viewH);
  const win = S.endKind === 'win';
  const title = win ? 'SOLMAR BAY IS YOURS' : S.endKind === 'busted' ? 'BUSTED' : 'WASTED';
  const color = win ? PALETTE.gold : PALETTE.red;
  panel(ctx, viewW / 2 - 260, viewH / 2 - 130, 520, 260);
  text(ctx, title, viewW / 2, viewH / 2 - 110, 44, color, 'bold', 'center');
  const sub = win
    ? 'Mara got the case. Rico owns the Bay — for now.'
    : S.endKind === 'busted'
      ? 'The SBPD took Rico in. The Bay keeps its secrets.'
      : 'Rico went down in Solmar Bay.';
  text(ctx, sub, viewW / 2, viewH / 2 - 52, 15, PALETTE.text, 'normal', 'center');
  text(ctx, `Cash $${S.player.money}   •   Jobs done ${S.missionIdx}/8   •   Cars stolen ${S.stats.stolen}`, viewW / 2, viewH / 2 - 18, 14, PALETTE.dim, 'normal', 'center');
  text(ctx, `Distance driven ${Math.round(S.stats.distance / 1000)} km   •   Rank ${S.player.rank}`, viewW / 2, viewH / 2 + 8, 14, PALETTE.dim, 'normal', 'center');
  text(ctx, 'PRESS ENTER TO PLAY AGAIN', viewW / 2, viewH / 2 + 48, 16, PALETTE.gold, 'bold', 'center');
  text(ctx, 'Your progress was saved.', viewW / 2, viewH / 2 + 78, 13, PALETTE.dim, 'normal', 'center');
}
