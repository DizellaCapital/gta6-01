// Canvas renderer: the top-down city, every vehicle and person, the
// helicopter spotlight, and all HUD panels plus the title / pause /
// game-over screens.

import { CONFIG } from './config.js';
import { districtAt } from './districts.js';
import { missionTarget, currentMission, currentStage, MISSIONS } from './missions.js';
import { currentWeapon } from './combat.js';
import { currentStation, currentTrack } from './radio.js';
import { rankName } from './world.js';
import { drawMinimap } from './minimap.js';

const P = CONFIG.PALETTE;

function drawCar(ctx, x, y, angle, color, w = 34, h = 18, label = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  ctx.fillRect(-w / 6, -h / 2 + 3, w / 3, h - 6);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(w / 2 - 3, -h / 2 + 2, 2, 4);
  ctx.fillRect(w / 2 - 3, h / 2 - 6, 2, 4);
  ctx.restore();
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 16);
  }
}

function drawPerson(ctx, x, y, angle, shirt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(1, 2, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeli(ctx, x, y, angle, alt, color, spotlight) {
  const shadowScale = 1 - alt / 400;
  // Shadow on the ground.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + alt * 0.25, y + alt * 0.25, 16 * shadowScale + 4, 10 * shadowScale + 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (spotlight) {
    // Searchlight cone down toward the ground.
    const grad = ctx.createRadialGradient(x, y, 6, x + alt * 0.25, y + alt * 0.25, 130);
    grad.addColorStop(0, 'rgba(255,244,180,0.5)');
    grad.addColorStop(1, 'rgba(255,244,180,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x + alt * 0.25, y + alt * 0.25, 130, 0, Math.PI * 2);
    ctx.fill();
  }
  const sx = x - alt * 0.12;
  const sy = y - alt * 0.12;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.beginPath();
  ctx.arc(8, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  const rotor = (Date.now() / 40) % (Math.PI * 2);
  ctx.beginPath();
  ctx.moveTo(Math.cos(rotor) * -22, Math.sin(rotor) * -22);
  ctx.lineTo(Math.cos(rotor) * 22, Math.sin(rotor) * 22);
  ctx.stroke();
  ctx.restore();
}

function drawWorld(ctx, world, viewW, viewH) {
  const camX = world.cam.x - viewW / 2;
  const camY = world.cam.y - viewH / 2;
  ctx.save();
  ctx.translate(-camX, -camY);

  // Ground.
  ctx.fillStyle = P.grass;
  ctx.fillRect(camX - 40, camY - 40, viewW + 80, viewH + 80);
  // Beach + sea along the south edge.
  ctx.fillStyle = P.sand;
  ctx.fillRect(camX - 40, CONFIG.WORLD_H - 260, viewW + 80, 120);
  ctx.fillStyle = P.sea;
  ctx.fillRect(camX - 40, CONFIG.WORLD_H - 140, viewW + 80, 140);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(camX - 40, CONFIG.WORLD_H - 140);
  ctx.lineTo(camX + viewW + 40, CONFIG.WORLD_H - 140);
  ctx.stroke();

  // Parks.
  ctx.fillStyle = P.park;
  for (let i = 0; i < world.city.roadsX.length - 1; i++) {
    for (let j = 0; j < world.city.roadsY.length - 1; j++) {
      if ((i * 7 + j * 3) % 9 !== 4) continue;
      const x0 = world.city.roadsX[i] + CONFIG.ROAD_W / 2 + 26;
      const y0 = world.city.roadsY[j] + CONFIG.ROAD_W / 2 + 26;
      const x1 = world.city.roadsX[i + 1] - CONFIG.ROAD_W / 2 - 26;
      const y1 = world.city.roadsY[j + 1] - CONFIG.ROAD_W / 2 - 26;
      if (y1 > CONFIG.WORLD_H - 260) continue;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = '#2f5d2a';
      ctx.beginPath();
      ctx.arc(x0 + (x1 - x0) / 3, y0 + (y1 - y0) / 2, 16, 0, Math.PI * 2);
      ctx.arc(x0 + 2 * (x1 - x0) / 3, y0 + (y1 - y0) / 3, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.park;
    }
  }

  // Roads.
  ctx.fillStyle = P.sidewalk;
  for (const rx of world.city.roadsX) ctx.fillRect(rx - CONFIG.ROAD_W / 2 - CONFIG.SIDEWALK, camY - 40, CONFIG.ROAD_W + CONFIG.SIDEWALK * 2, viewH + 80);
  for (const ry of world.city.roadsY) ctx.fillRect(camX - 40, ry - CONFIG.ROAD_W / 2 - CONFIG.SIDEWALK, viewW + 80, CONFIG.ROAD_W + CONFIG.SIDEWALK * 2);
  ctx.fillStyle = P.road;
  for (const rx of world.city.roadsX) ctx.fillRect(rx - CONFIG.ROAD_W / 2, camY - 40, CONFIG.ROAD_W, viewH + 80);
  for (const ry of world.city.roadsY) ctx.fillRect(camX - 40, ry - CONFIG.ROAD_W / 2, viewW + 80, CONFIG.ROAD_W);
  // Centre dashes.
  ctx.strokeStyle = P.roadLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  for (const rx of world.city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(rx, camY - 40);
    ctx.lineTo(rx, camY + viewH + 40);
    ctx.stroke();
  }
  for (const ry of world.city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(camX - 40, ry);
    ctx.lineTo(camX + viewW + 40, ry);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Buildings.
  for (const b of world.city.buildings) {
    if (b.x > camX + viewW + 50 || b.x + b.w < camX - 50 || b.y > camY + viewH + 50 || b.y + b.h < camY - 50) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = P.building;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255,240,180,0.7)';
    for (let f = 0; f < b.floors; f++) {
      const wy = b.y + 16 + f * 16;
      if (wy > b.y + b.h - 12) break;
      for (let wx = b.x + 14; wx < b.x + b.w - 14; wx += 26) {
        ctx.fillRect(wx, wy, 10, 8);
      }
    }
  }

  // Helipad.
  ctx.fillStyle = '#4a4d52';
  ctx.beginPath();
  ctx.arc(1800, 200, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(1800, 200, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('H', 1800, 209);

  // Garage.
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(1400 - 60, 1400 - 44, 120, 88);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('GARAGE', 1400, 1404);

  // Mission marker (pulsing).
  if (!world.missionDone && world.screen !== 'title') {
    const t = missionTarget(world);
    const pulse = 1 + 0.25 * Math.sin(world.time * 4);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 26);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,214,10,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Roadblocks.
  for (const rb of world.police.roadblocks) {
    ctx.save();
    ctx.translate(rb.x, rb.y);
    ctx.rotate(rb.angle);
    ctx.fillStyle = '#ff5a3c';
    ctx.fillRect(-46, -10, 92, 20);
    ctx.fillStyle = '#fff';
    for (let i = -40; i < 44; i += 16) ctx.fillRect(i, -10, 8, 20);
    ctx.restore();
  }

  // Cars.
  for (const c of world.cars) {
    if (c.kind === 'player') continue;
    if (c.kind === 'wreck') {
      drawCar(ctx, c.x, c.y, c.angle, '#3a3a3a');
      continue;
    }
    drawCar(ctx, c.x, c.y, c.angle, c.color);
  }

  // Player car / player on foot.
  const p = world.player;
  if (world.playerHeli) {
    drawHeli(ctx, world.playerHeli.x, world.playerHeli.y, world.playerHeli.angle, world.playerHeli.alt, '#e63946', false);
  } else if (p.car) {
    drawCar(ctx, p.car.x, p.car.y, p.car.angle, p.car.color);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RICO', p.car.x, p.car.y - 18);
  } else {
    drawPerson(ctx, p.x, p.y, p.angle, '#e63946');
  }

  // Police cars on top, with labels.
  for (const c of world.cars) {
    if (c.kind !== 'police') continue;
    drawCar(ctx, c.x, c.y, c.angle, c.color, 34, 18, c.name);
  }

  // Police helicopter.
  if (world.police.heli) {
    const h = world.police.heli;
    drawHeli(ctx, h.x, h.y, h.angle, 120, '#1f2937', true);
  }

  // Pedestrians.
  for (const ped of world.peds) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt);

  // Bullets.
  ctx.fillStyle = '#ffe66d';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function panel(ctx, x, y, w, h, alpha = 0.78) {
  ctx.fillStyle = `rgba(12,16,24,${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function stars(ctx, x, y, wanted) {
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * 20, y);
  }
}

function drawHUD(ctx, world, viewW, viewH) {
  const p = world.player;
  const dist = districtAt(p.x, p.y);

  // Top-left: money, wanted, HP/armor, rank.
  panel(ctx, 12, 12, 250, 108);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${world.money.toLocaleString('en-US')}`, 24, 40);
  stars(ctx, 150, 40, world.wanted);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText('HP', 24, 64);
  ctx.fillStyle = '#333';
  ctx.fillRect(52, 54, 120, 10);
  ctx.fillStyle = '#e63946';
  ctx.fillRect(52, 54, 120 * (p.hp / 100), 10);
  ctx.fillStyle = '#fff';
  ctx.fillText('ARMOR', 24, 84);
  ctx.fillStyle = '#333';
  ctx.fillRect(52, 74, 120, 10);
  ctx.fillStyle = '#4a90e2';
  ctx.fillRect(52, 74, 120 * (p.armor / 50), 10);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${rankName(world)}  •  ${world.rp} RP`, 24, 106);

  // Top-centre: mission panel.
  const m = currentMission(world);
  const jobNo = Math.min(world.missionIndex + 1, MISSIONS.length);
  panel(ctx, viewW / 2 - 190, 12, 380, 86);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`JOB ${jobNo}/8 — ${m.name}`, viewW / 2 - 178, 34);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  const stage = world.missionDone ? { label: 'All jobs complete!' } : currentStage(world);
  ctx.fillText(`NEXT: ${stage.label}`, viewW / 2 - 178, 54);
  const stageCount = m.stages.length;
  const stageDone = Math.min(world.missionStage, stageCount);
  ctx.fillStyle = '#333';
  ctx.fillRect(viewW / 2 - 178, 62, 240, 8);
  ctx.fillStyle = '#7ee787';
  ctx.fillRect(viewW / 2 - 178, 62, 240 * (stageDone / stageCount), 8);
  ctx.fillStyle = '#fff';
  ctx.fillText(`Stage ${stageDone + 1}/${stageCount}`, viewW / 2 + 70, 70);
  ctx.fillStyle = world.missionTimer < 20 ? '#ff6b6b' : '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`⏱ ${Math.ceil(world.missionTimer)}s`, viewW / 2 + 130, 70);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Reward $${m.reward}`, viewW / 2 - 178, 88);

  // Top-right: minimap + district.
  drawMinimap(ctx, world, viewW - 86, 86, 72);
  panel(ctx, viewW - 196, 168, 184, 40);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(dist.name, viewW - 186, 186);
  ctx.fillStyle = '#9fb3c8';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Standing ${dist.standing}/100`, viewW - 186, 202);

  // Left-middle: dispatch panel.
  const units = world.police.units;
  panel(ctx, 12, 140, 210, 30 + units.length * 18);
  ctx.fillStyle = '#ff8a7a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SBPD DISPATCH', 24, 160);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  if (units.length === 0) {
    ctx.fillText('No units assigned', 24, 180);
  } else {
    units.forEach((u, i) => {
      ctx.fillText(`${u.name} — ${u.role} — ${u.dist}m`, 24, 180 + i * 18);
    });
  }

  // Bottom-left: weapons + crew.
  panel(ctx, 12, viewH - 162, 250, 150);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('WEAPONS', 24, viewH - 140);
  ctx.font = '12px sans-serif';
  const { combat } = world;
  for (let i = 0; i < 3; i++) {
    const w = combat.slot === i ? '▶ ' : '   ';
    const ammo = combat.ammo[i] === Infinity ? '∞' : String(combat.ammo[i]);
    ctx.fillStyle = combat.slot === i ? '#7ee787' : '#fff';
    ctx.fillText(`${w}[${i + 1}] ${['Fists', 'Pistol', 'SMG'][i]} — ${ammo}`, 24, viewH - 122 + i * 16);
  }
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('CREW', 24, viewH - 66);
  ctx.font = '12px sans-serif';
  world.crew.forEach((c, i) => {
    const ready = c.readyIn <= 0 ? 'READY' : `${Math.ceil(c.readyIn)}s`;
    ctx.fillStyle = c.readyIn <= 0 ? '#7ee787' : '#9fb3c8';
    ctx.fillText(`[${i + 1}] ${c.name} ${c.ability} — ${ready}`, 24, viewH - 50 + i * 15);
  });

  // Bottom-right: radio + speed.
  panel(ctx, viewW - 262, viewH - 132, 250, 120);
  const st = currentStation(world.radio);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`RADIO — ${st.name} [Q]`, viewW - 250, viewH - 110);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${st.genre}: ${currentTrack(world.radio)}`, viewW - 250, viewH - 92);
  const speedKmh = Math.round(Math.abs(p.speed) * 0.9);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`${speedKmh} km/h`, viewW - 250, viewH - 60);
  ctx.font = '12px sans-serif';
  if (p.car) {
    ctx.fillText(`${p.car.name} — Cond ${Math.round(p.car.cond)}%`, viewW - 250, viewH - 40);
  } else if (world.playerHeli) {
    ctx.fillText('SBPD-style Chopper — Alt ' + Math.round(world.playerHeli.alt) + 'm', viewW - 250, viewH - 40);
  } else {
    ctx.fillText('On foot — press E near a car', viewW - 250, viewH - 40);
  }
  if (world.garageCar) {
    ctx.fillStyle = '#9fb3c8';
    ctx.fillText(`Garage: ${world.garageCar.name} ${world.garageCar.cond}%`, viewW - 250, viewH - 22);
  }

  // Bottom-centre: dialog, message, hints.
  if (world.dialog) {
    const lines = wrapText(world.dialog.text, 68);
    const h = 36 + lines.length * 18;
    panel(ctx, viewW / 2 - 260, viewH - 140 - h, 520, h, 0.88);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(world.dialog.name, viewW / 2 - 248, viewH - 140 - h + 20);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, viewW / 2 - 248, viewH - 140 - h + 40 + i * 18);
    });
  }
  if (world.messageTimer > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, viewW / 2, viewH - 138);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD move/drive • E enter car • Mouse aim + click shoot • 1/2/3 crew • Q radio • P pause • M mute', viewW / 2, viewH - 8);
  ctx.textAlign = 'left';
}

function wrapText(text, max) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((`${cur} ${w}`).trim().length > max) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur += ` ${w}`;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 3);
}

function drawTitle(ctx, world, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,12,20,0.55)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SOLMAR BAY', viewW / 2, viewH / 2 - 90);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText('An open-world crime story in the sun', viewW / 2, viewH / 2 - 52);
  ctx.font = '16px sans-serif';
  ctx.fillText('Rico is back. Mara Voss has eight jobs. The SBPD has other plans.', viewW / 2, viewH / 2 - 22);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(world.hasSave ? 'Press ENTER to continue — save found' : 'Press ENTER to start', viewW / 2, viewH / 2 + 30);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD move & drive • E enter / steal car • Mouse aim, click to shoot • 1/2/3 call crew • Q radio', viewW / 2, viewH / 2 + 64);
  ctx.textAlign = 'left';
}

function drawPause(ctx, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,12,20,0.65)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', viewW / 2, viewH / 2 - 10);
  ctx.font = '16px sans-serif';
  ctx.fillText('Press P or ESC to resume', viewW / 2, viewH / 2 + 26);
  ctx.textAlign = 'left';
}

function drawOver(ctx, world, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,12,20,0.7)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  const busted = world.overKind === 'busted';
  ctx.fillStyle = busted ? '#4a90e2' : '#e63946';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(busted ? 'BUSTED' : 'WASTED', viewW / 2, viewH / 2 - 60);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText(
    busted ? 'The SBPD caught up with Rico.' : 'Rico went down in Solmar Bay.',
    viewW / 2, viewH / 2 - 24,
  );
  ctx.fillText(`Jobs done: ${world.missionIndex}/8   •   Cash: $${world.money}   •   RP: ${world.rp}`, viewW / 2, viewH / 2 + 12);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press ENTER to try again', viewW / 2, viewH / 2 + 52);
  ctx.textAlign = 'left';
}

export function render(ctx, world, viewW, viewH) {
  ctx.clearRect(0, 0, viewW, viewH);
  drawWorld(ctx, world, viewW, viewH);
  if (world.screen === 'play' || world.screen === 'pause') drawHUD(ctx, world, viewW, viewH);
  if (world.screen === 'title') drawTitle(ctx, world, viewW, viewH);
  if (world.screen === 'pause') drawPause(ctx, viewW, viewH);
  if (world.screen === 'over') drawOver(ctx, world, viewW, viewH);
}
