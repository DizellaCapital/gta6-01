// Canvas renderer: top-down Solmar Bay, every HUD panel, and the title /
// pause / game-over screens.
import { CFG } from './config.js';
import { currentMission, currentStage, missionProgress } from './missions.js';
import { currentStation, currentTrack } from './radio.js';
import { currentWeapon, WEAPONS } from './combat.js';
import { CREW, crewCooldownLeft } from './crew.js';
import { districtOf } from './world.js';
import { standingLabel } from './districts.js';
import { drawMinimap } from './minimap.js';
import { dispatchSummary } from './police.js';
import { HELIPAD, GARAGE } from './world.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, x, y, angle, color, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const L = opts.len || 44;
  const W = opts.wid || 22;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, -L / 2 + 3, -W / 2 + 3, L, W, 6); ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, -L / 2, -W / 2, L, W, 6); ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  rr(ctx, -L / 2 + 10, -W / 2 + 3, 10, W - 6, 3); ctx.fill();
  ctx.fillStyle = '#222';
  rr(ctx, -L / 2 + 2, -W / 2 - 2, 8, 4, 2); ctx.fill();
  rr(ctx, -L / 2 + 2, W / 2 - 2, 8, 4, 2); ctx.fill();
  rr(ctx, L / 2 - 10, -W / 2 - 2, 8, 4, 2); ctx.fill();
  rr(ctx, L / 2 - 10, W / 2 - 2, 8, 4, 2); ctx.fill();
  if (opts.police) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -W / 2, 8, W);
    ctx.fillStyle = '#4a90ff';
    ctx.fillRect(-L / 2 + 2, -W / 2 + 2, 6, 5);
    ctx.fillRect(-L / 2 + 2, W / 2 - 7, 6, 5);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(L / 2 - 8, -W / 2 + 2, 6, 5);
  }
  if (opts.tuned) {
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
    rr(ctx, -L / 2, -W / 2, L, W, 6); ctx.stroke();
  }
  ctx.restore();
}

function drawHeli(ctx, x, y, angle, alt, policeHeli) {
  // Ground shadow first.
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(x + alt * 0.25, y + alt * 0.25, 26, 14, angle, 0, Math.PI * 2); ctx.fill();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = policeHeli ? '#1c2f4a' : '#c94f42';
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.9)';
  ctx.beginPath(); ctx.ellipse(10, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,40,0.9)'; ctx.lineWidth = 3;
  const rotor = (Date.now() % 200) < 100 ? 1 : -1;
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -rotor * 20); ctx.lineTo(0, rotor * 20); ctx.stroke();
  ctx.restore();
}

export function drawWorld(ctx, world, cam, w, h) {
  const { city } = world;
  ctx.fillStyle = CFG.grass;
  ctx.fillRect(0, 0, w, h);
  const toX = (wx) => wx - cam.x + w / 2;
  const toY = (wy) => wy - cam.y + h / 2;
  // Ocean + beach along the south edge of the map.
  ctx.fillStyle = CFG.sand;
  ctx.fillRect(toX(0), toY(CFG.worldH - 170), CFG.worldW, 170);
  ctx.fillStyle = CFG.water;
  ctx.fillRect(toX(0), toY(CFG.worldH - 90), CFG.worldW, 90);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(toX(0), toY(CFG.worldH - 90)); ctx.lineTo(toX(CFG.worldW), toY(CFG.worldH - 90)); ctx.stroke();
  // Parks and plazas.
  for (const pk of city.parks) {
    ctx.fillStyle = pk.kind === 'park' ? CFG.park : CFG.plaza;
    ctx.fillRect(toX(pk.x), toY(pk.y), pk.w, pk.h);
    if (pk.kind === 'park') {
      ctx.fillStyle = '#3f7a34';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(toX(pk.x + pk.w * (0.15 + i * 0.18)), toY(pk.y + pk.h * (0.3 + (i % 2) * 0.4)), 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Roads.
  ctx.fillStyle = CFG.road;
  for (const rx of city.xs) ctx.fillRect(toX(rx - CFG.roadW / 2), toY(0), CFG.roadW, CFG.worldH);
  for (const ry of city.ys) ctx.fillRect(toX(0), toY(ry - CFG.roadW / 2), CFG.worldW, CFG.roadW);
  // Sidewalks.
  ctx.strokeStyle = CFG.sidewalk; ctx.lineWidth = 5;
  for (const rx of city.xs) {
    ctx.beginPath(); ctx.moveTo(toX(rx - CFG.roadW / 2), toY(0)); ctx.lineTo(toX(rx - CFG.roadW / 2), toY(CFG.worldH)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toX(rx + CFG.roadW / 2), toY(0)); ctx.lineTo(toX(rx + CFG.roadW / 2), toY(CFG.worldH)); ctx.stroke();
  }
  // Centre dashes.
  ctx.strokeStyle = CFG.roadLine; ctx.lineWidth = 3; ctx.setLineDash([18, 22]);
  for (const rx of city.xs) {
    ctx.beginPath(); ctx.moveTo(toX(rx), toY(0)); ctx.lineTo(toX(rx), toY(CFG.worldH)); ctx.stroke();
  }
  for (const ry of city.ys) {
    ctx.beginPath(); ctx.moveTo(toX(0), toY(ry)); ctx.lineTo(toX(CFG.worldW), toY(ry)); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Buildings.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(toX(b.x) + 6, toY(b.y) + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(toX(b.x), toY(b.y), b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.strokeRect(toX(b.x), toY(b.y), b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(toX(b.x) + 12, toY(b.y) + 12, Math.min(60, b.w - 24), 8);
  }
  // Helipad + garage markers.
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.arc(toX(HELIPAD.x), toY(HELIPAD.y), 46, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(toX(HELIPAD.x), toY(HELIPAD.y), 46, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('H', toX(HELIPAD.x), toY(HELIPAD.y) + 9);
  ctx.fillStyle = 'rgba(40,40,40,0.9)';
  ctx.fillRect(toX(GARAGE.x) - 40, toY(GARAGE.y) - 24, 80, 48);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('GARAGE', toX(GARAGE.x), toY(GARAGE.y) + 4);
  // Mission target beacon.
  if (!world.mission.done) {
    const t = currentStage(world.mission).target;
    const pulse = 1 + 0.15 * Math.sin(world.time * 4);
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(toX(t.x), toY(t.y), 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 210, 63, 0.25)';
    ctx.beginPath(); ctx.arc(toX(t.x), toY(t.y), 60 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(toX(t.x), toY(t.y) - 14); ctx.lineTo(toX(t.x) + 10, toY(t.y) + 8);
    ctx.lineTo(toX(t.x) - 10, toY(t.y) + 8); ctx.closePath(); ctx.fill();
  }
  // Pedestrians.
  for (const p of world.peds) {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y) - 2, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Cars.
  for (const c of world.cars) drawCarShape(ctx, toX(c.x), toY(c.y), c.angle, c.color, { tuned: c.tuned });
  // Roadblock cruisers.
  if (world.roadblockAt) {
    const rb = world.roadblockAt;
    drawCarShape(ctx, toX(rb.x - 30), toY(rb.y), rb.angle, '#1c2f4a', { police: true });
    drawCarShape(ctx, toX(rb.x + 30), toY(rb.y), rb.angle, '#1c2f4a', { police: true });
  }
  // Police cars.
  for (const cop of world.police) {
    drawCarShape(ctx, toX(cop.x), toY(cop.y), cop.angle, '#1c2f4a', { police: true });
  }
  // Player helicopter (above traffic, with shadow).
  if (world.player.heli) {
    drawHeli(ctx, toX(world.player.heli.x), toY(world.player.heli.y), world.player.heli.angle, 90, false);
  }
  // Player on foot.
  if (world.player.onFoot && !world.player.heli) {
    const p = world.player;
    ctx.save();
    ctx.translate(toX(p.x), toY(p.y)); ctx.rotate(p.angle);
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(3, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 14, 0, Math.PI * 2); ctx.stroke();
  }
  // Police heli + spotlight cone.
  if (world.policeHeli.active) {
    const h = world.policeHeli;
    ctx.fillStyle = 'rgba(255, 240, 160, 0.20)';
    ctx.beginPath();
    ctx.moveTo(toX(h.x), toY(h.y));
    ctx.lineTo(toX(h.spotX) - 55, toY(h.spotY));
    ctx.lineTo(toX(h.spotX) + 55, toY(h.spotY));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 160, 0.35)';
    ctx.beginPath(); ctx.arc(toX(h.spotX), toY(h.spotY), 55, 0, Math.PI * 2); ctx.fill();
    drawHeli(ctx, toX(h.x), toY(h.y), h.angle, 110, true);
  }
  // Shot tracer.
  if (world.shotFx && world.time < world.shotFx.until) {
    ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(world.shotFx.x), toY(world.shotFx.y));
    ctx.lineTo(toX(world.shotFx.x2), toY(world.shotFx.y2));
    ctx.stroke();
  }
}

function panel(ctx, x, y, w, h, alpha = 0.72) {
  ctx.fillStyle = `rgba(12, 16, 22, ${alpha})`;
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
  rr(ctx, x, y, w, h, 8); ctx.stroke();
}

export function drawHUD(ctx, world, w, h) {
  const p = world.player;
  ctx.textAlign = 'left';
  // Top-left: money, wanted, health/armor.
  panel(ctx, 12, 12, 250, 96);
  ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`$${world.money.toLocaleString('en-US')}`, 24, 44);
  ctx.font = 'bold 20px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < world.wanted ? '★' : '☆';
  ctx.fillStyle = world.wanted >= 4 ? '#ff5a5a' : '#ffd23f';
  ctx.fillText(stars, 24, 72);
  ctx.fillStyle = '#666'; ctx.fillRect(24, 82, 150, 8);
  ctx.fillStyle = '#ff5a5a'; ctx.fillRect(24, 82, 150 * (p.hp / 100), 8);
  ctx.fillStyle = '#666'; ctx.fillRect(24, 94, 150, 6);
  ctx.fillStyle = '#4a90ff'; ctx.fillRect(24, 94, 150 * (p.armor / 100), 6);
  ctx.fillStyle = '#ccc'; ctx.font = '11px sans-serif';
  ctx.fillText('HP', 180, 90); ctx.fillText('ARMOR', 180, 100);
  // Top-right: mission panel.
  panel(ctx, w - 322, 12, 310, 118);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 14px sans-serif';
  if (world.mission.done) {
    ctx.fillText('ALL JOBS DONE — SOLMAR BAY IS YOURS', w - 310, 34);
  } else {
    const m = currentMission(world.mission);
    const st = currentStage(world.mission);
    ctx.fillText(`JOB ${missionProgress(world.mission)}: ${m.name.toUpperCase()}`, w - 310, 34);
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
    ctx.fillText(st.text, w - 310, 54);
    const stageTotal = m.stages.length;
    ctx.fillStyle = '#444'; ctx.fillRect(w - 310, 62, 286, 8);
    ctx.fillStyle = '#7dff8a'; ctx.fillRect(w - 310, 62, 286 * (world.mission.stage / stageTotal), 8);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
    ctx.fillText(`Stage ${world.mission.stage + 1}/${stageTotal}`, w - 310, 88);
    ctx.fillStyle = world.mission.timer < 30 ? '#ff5a5a' : '#ccc';
    ctx.fillText(`⏱ ${Math.ceil(world.mission.timer)}s`, w - 200, 88);
    ctx.fillStyle = '#ffd23f';
    const nextText = world.mission.stage + 1 < stageTotal
      ? m.stages[world.mission.stage + 1].text
      : 'Finish the job and collect your pay';
    ctx.fillText(`NEXT: ${nextText}`, w - 310, 108);
    ctx.fillStyle = '#7dff8a';
    ctx.fillText(`Pay $${m.pay.toLocaleString('en-US')}`, w - 310, 122);
  }
  // Dispatch panel (below mission panel).
  const disp = dispatchSummary(world);
  panel(ctx, w - 322, 138, 310, 110);
  ctx.fillStyle = '#ff8a5a'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`SBPD DISPATCH — ${disp.count} UNIT${disp.count === 1 ? '' : 'S'}`, w - 310, 160);
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
  if (disp.count === 0) {
    ctx.fillText('No units on you. Stay clean.', w - 310, 182);
  } else {
    disp.roles.slice(0, 3).forEach((role, i) => {
      ctx.fillText(`${role} — ${disp.dists[i]}m`, w - 310, 182 + i * 18);
    });
  }
  if (world.roadblock) {
    ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('⚠ ROADBLOCK AHEAD', w - 310, 182 + Math.min(3, disp.roles.length) * 18);
  }
  // Radio readout (top centre).
  const st = currentStation(world.radio);
  panel(ctx, w / 2 - 170, 12, 340, 44);
  ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`♪ ${st.name} — ${st.genre}`, w / 2 - 158, 30);
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
  ctx.fillText(currentTrack(world.radio), w / 2 - 158, 48);
  // Bottom-left: minimap.
  drawMinimap(ctx, world, 96, h - 96, 78);
  // Bottom-centre: district + standing + rank.
  const d = districtOf(world);
  panel(ctx, w / 2 - 150, h - 64, 300, 52);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${d.name} — ${standingLabel(d.standing)} (${d.standing})`, w / 2 - 138, h - 42);
  ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif';
  ctx.fillText(`${d.blurb}   •   RANK ${world.rank}  •  ${Math.floor(world.rp)} RP`, w / 2 - 138, h - 22);
  // Bottom-right: speed / vehicle + weapon slots + crew.
  panel(ctx, w - 322, h - 150, 310, 138);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
  if (p.heli) {
    ctx.fillText(`HELI — ${Math.round(p.heli.speed * 3.6)} km/h`, w - 310, h - 124);
    ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif';
    ctx.fillText('Marina Heli • E to land at helipad', w - 310, h - 104);
  } else if (p.car) {
    ctx.fillText(`${p.car.name.toUpperCase()} — ${Math.round(Math.abs(p.car.speed) * 3.6)} km/h`, w - 310, h - 124);
    ctx.fillStyle = '#666'; ctx.fillRect(w - 310, h - 114, 180, 7);
    ctx.fillStyle = p.car.health > 50 ? '#7dff8a' : p.car.health > 25 ? '#ffd23f' : '#ff5a5a';
    ctx.fillRect(w - 310, h - 114, 180 * (p.car.health / 100), 7);
    ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif';
    ctx.fillText(`Condition ${Math.round(p.car.health)}%  •  G garage  •  R repair $100`, w - 310, h - 96);
  } else {
    ctx.fillText('ON FOOT — RICO', w - 310, h - 124);
    ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif';
    ctx.fillText('E: enter car / heli   •   Walk to a car and press E', w - 310, h - 104);
  }
  // Weapon slots.
  ctx.font = '12px sans-serif';
  WEAPONS.forEach((wpn, i) => {
    const x = w - 310 + i * 100;
    ctx.fillStyle = world.arsenal.slot === i ? '#ffd23f' : '#888';
    const ammo = world.arsenal.ammo[i] === Infinity ? '∞' : String(world.arsenal.ammo[i]);
    ctx.fillText(`[${i + 1}] ${wpn.name} ${ammo}`, x, h - 74);
  });
  // Crew cards, one line each.
  CREW.forEach((member, i) => {
    const cd = crewCooldownLeft(world.crew, i, world.time);
    ctx.fillStyle = cd <= 0 ? '#7dff8a' : '#888';
    ctx.fillText(`[${i + 1}] ${member.name} — ${member.ability}${cd > 0 ? ` (${Math.ceil(cd)}s)` : ' READY'}`, w - 310, h - 56 + i * 14);
  });
  // Dialog box (Mara).
  if (world.dialog && world.time < world.dialogUntil) {
    panel(ctx, w / 2 - 260, h - 150, 520, 64, 0.85);
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText('MARA VOSS', w / 2 - 248, h - 126);
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
    wrapText(ctx, world.dialog, w / 2 - 248, h - 106, 496, 17);
  }
  // Message line.
  if (world.message && world.time < world.messageUntil) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(world.message, w / 2, 78);
    ctx.textAlign = 'left';
  }
  // Controls hint (under the money panel, clear of minimap and district bar).
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '11px sans-serif';
  ctx.fillText('WASD move/drive • E enter • Space shoot • Q radio • 1/2/3 crew • P pause • M mute', 14, 122);
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawTitle(ctx, world, w, h, save) {
  ctx.fillStyle = 'rgba(8, 12, 20, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SOLMAR BAY', w / 2, h / 2 - 90);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('An open-world crime story — drive, steal, fly, and work for Mara Voss.', w / 2, h / 2 - 52);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#7dff8a';
  ctx.fillText('Press ENTER to play', w / 2, h / 2 - 8);
  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif';
  ctx.fillText('WASD move / drive  •  E enter car or heli  •  Space shoot  •  Q radio  •  1/2/3 crew  •  P pause', w / 2, h / 2 + 28);
  ctx.fillText('8 story jobs  •  Wanted 1–5 stars  •  SBPD dispatch, roadblocks & police heli  •  Garage & crew', w / 2, h / 2 + 52);
  if (save) {
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`Save found: $${save.money.toLocaleString('en-US')} • Job ${(save.missionIndex ?? 0) + 1}/8 • ${Math.floor(save.rp ?? 0)} RP — press ENTER to continue`, w / 2, h / 2 + 84);
  } else {
    ctx.fillStyle = '#888'; ctx.font = '14px sans-serif';
    ctx.fillText('No save yet — a fresh start in Solmar Bay.', w / 2, h / 2 + 84);
  }
  ctx.textAlign = 'left';
}

export function drawPause(ctx, w, h) {
  ctx.fillStyle = 'rgba(8, 12, 20, 0.65)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText('P or Esc to resume  •  progress saves automatically', w / 2, h / 2 + 26);
  ctx.textAlign = 'left';
}

export function drawGameOver(ctx, world, w, h) {
  ctx.fillStyle = world.over === 'busted' ? 'rgba(20, 30, 80, 0.72)' : 'rgba(80, 10, 10, 0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 64px sans-serif';
  ctx.fillText(world.over === 'busted' ? 'BUSTED' : 'WASTED', w / 2, h / 2 - 30);
  ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
  ctx.fillText(
    world.over === 'busted'
      ? 'The SBPD caught Rico. Mara is already planning the bail.'
      : 'Rico went down in Solmar Bay. The city keeps moving.',
    w / 2, h / 2 + 8,
  );
  ctx.fillStyle = '#ccc'; ctx.font = '15px sans-serif';
  ctx.fillText(`Money $${world.money.toLocaleString('en-US')}  •  Jobs done ${world.stats.missionsDone}/8  •  Cars stolen ${world.stats.carsStolen}`, w / 2, h / 2 + 44);
  ctx.fillStyle = '#7dff8a';
  ctx.fillText('Press ENTER to start over', w / 2, h / 2 + 78);
  ctx.textAlign = 'left';
}
