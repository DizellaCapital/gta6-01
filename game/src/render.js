// Canvas renderer: the top-down city, every vehicle and pedestrian, the
// police helicopter and its spotlight, the mission marker, all HUD panels,
// and the title / pause / game-over screens.
import { CFG } from './config.js';
import { districtAt } from './districts.js';
import { missionTarget } from './missions.js';
import { hudData } from './world.js';
import { drawMinimap } from './minimap.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = CFG.PALETTE.hudBg;
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = CFG.PALETTE.hudLine;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(255,255,255,0.18)';
  rr(ctx, x, y, w, h, 3);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = color;
    rr(ctx, x, y, Math.max(4, w * Math.min(1, frac)), h, 3);
    ctx.fill();
  }
}

function drawCarShape(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const w = car.w || 34;
  const h = car.h || 17;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  rr(ctx, -w / 2 + 2, -h / 2 + 3, w, h, 5);
  ctx.fill();
  // body
  ctx.fillStyle = car.color;
  rr(ctx, -w / 2, -h / 2, w, h, 5);
  ctx.fill();
  // cabin + windshield
  ctx.fillStyle = 'rgba(20, 30, 40, 0.85)';
  rr(ctx, -w / 2 + 8, -h / 2 + 3, 9, h - 6, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(w / 2 - 3, -h / 2 + 2, 2, 3);
  ctx.fillRect(w / 2 - 3, h / 2 - 5, 2, 3);
  if (car.kind === 'police' || car.kind === 'roadblock') {
    const flash = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2f7bff';
    ctx.fillRect(-4, -h / 2 - 1, 8, 4);
    ctx.fillStyle = flash ? '#2f7bff' : '#ff3b30';
    ctx.fillRect(-4, h / 2 - 3, 8, 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SBPD', 0, 3);
  }
  ctx.restore();
}

function drawHeliShape(ctx, heli, shadowOnly, time) {
  const alt = heli.altitude || 0;
  const lift = 26 + alt * 30;
  if (shadowOnly) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(heli.x + 14, heli.y + 18, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(heli.x, heli.y - lift * 0.4);
  ctx.rotate(heli.angle || 0);
  ctx.fillStyle = '#3c4650';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7d8aa0';
  ctx.fillRect(8, -3, 18, 6);
  ctx.fillStyle = 'rgba(180,220,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(6, 0, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const rotor = heli.rotor || 0;
  ctx.strokeStyle = 'rgba(20,20,20,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(rotor) * -26, Math.sin(rotor) * -26);
  ctx.lineTo(Math.cos(rotor) * 26, Math.sin(rotor) * 26);
  ctx.stroke();
  ctx.restore();
}

function drawWorld(ctx, world, cam, view) {
  const city = world.city;
  const P = CFG.PALETTE;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  // Ground.
  ctx.fillStyle = P.grass;
  ctx.fillRect(cam.x - 40, cam.y - 40, view.w + 80, view.h + 80);
  // Beach + water along the south edge of the map.
  ctx.fillStyle = P.sand;
  ctx.fillRect(0, CFG.WORLD_H - 58, CFG.WORLD_W, 58);
  ctx.fillStyle = P.water;
  ctx.fillRect(0, CFG.WORLD_H - 26, CFG.WORLD_W, 26);
  // Parks.
  ctx.fillStyle = P.park;
  for (const park of city.parks) ctx.fillRect(park.x, park.y, park.w, park.h);
  // Sidewalks, then asphalt, then dashes.
  ctx.fillStyle = P.sidewalk;
  for (const rx of city.roadsX) ctx.fillRect(rx - CFG.ROAD_W / 2 - 8, 0, CFG.ROAD_W + 16, CFG.WORLD_H);
  for (const ry of city.roadsY) ctx.fillRect(0, ry - CFG.ROAD_W / 2 - 8, CFG.WORLD_W, CFG.ROAD_W + 16);
  ctx.fillStyle = P.asphalt;
  for (const rx of city.roadsX) ctx.fillRect(rx - CFG.ROAD_W / 2, 0, CFG.ROAD_W, CFG.WORLD_H);
  for (const ry of city.roadsY) ctx.fillRect(0, ry - CFG.ROAD_W / 2, CFG.WORLD_W, CFG.ROAD_W);
  ctx.strokeStyle = P.dash;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  for (const rx of city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, CFG.WORLD_H);
    ctx.stroke();
  }
  for (const ry of city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(CFG.WORLD_W, ry);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Buildings.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
  }
  // Helipad.
  const pad = city.helipad;
  ctx.fillStyle = P.helipad;
  ctx.beginPath();
  ctx.arc(pad.x, pad.y, pad.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pad.x, pad.y, pad.r - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = P.accent;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', pad.x, pad.y);
  // Garage.
  const g = city.garage;
  ctx.fillStyle = P.garage;
  ctx.fillRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
  ctx.fillStyle = P.hudText;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('GARAGE', g.x, g.y);
  ctx.textBaseline = 'alphabetic';

  // Mission marker: pulsing diamond + beam.
  const target = missionTarget(world.missions, world.missionState);
  if (target && world.screen !== 'title') {
    const pulse = 1 + 0.18 * Math.sin(world.time * 5);
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.strokeStyle = P.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, target.r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = P.accent;
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 210, 62, 0.10)';
    ctx.fillRect(target.x - 3, -100, 6, CFG.WORLD_H + 200);
  }

  // Parked + traffic cars, then the player's car.
  for (const car of world.cars) {
    if (car === world.player.car) continue;
    drawCarShape(ctx, car, world.time);
  }
  if (world.player.car && !world.player.inHeli) {
    drawCarShape(ctx, world.player.car, world.time);
  }
  // Roadblocks.
  for (const rb of world.police.roadblocks) drawCarShape(ctx, rb, world.time);
  // Police cruisers.
  for (const u of world.police.units) drawCarShape(ctx, u, world.time);
  // Pedestrians.
  for (const ped of world.peds) {
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, ped.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player on foot.
  const p = world.player;
  if (p.onFoot && !p.inHeli) {
    ctx.fillStyle = '#e8b13c';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2f2f2f';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bullets.
  ctx.fillStyle = '#ffe14d';
  for (const b of world.combat.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.melee ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player helicopter shadow, then the police helicopter spotlight cone.
  if (world.heli && p.inHeli) drawHeliShape(ctx, p.heli, true, world.time);
  if (world.police.heli) {
    const heli = world.police.heli;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(heli.x + 12, heli.y + 16, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 90);
    grad.addColorStop(0, 'rgba(255, 240, 160, 0.55)');
    grad.addColorStop(1, 'rgba(255, 240, 160, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 160, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(heli.x, heli.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  if (world.heli && p.inHeli) drawHeliShape(ctx, p.heli, false, world.time);
  if (world.police.heli) {
    const heli = world.police.heli;
    ctx.save();
    ctx.translate(heli.x, heli.y);
    ctx.rotate(heli.angle || 0);
    ctx.fillStyle = '#20262e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9d4de';
    ctx.fillRect(7, -2, 16, 5);
    const rotor = heli.rotor || 0;
    ctx.strokeStyle = 'rgba(10,10,10,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(rotor) * -24, Math.sin(rotor) * -24);
    ctx.lineTo(Math.cos(rotor) * 24, Math.sin(rotor) * 24);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SBPD AIR-1', heli.x, heli.y - 26);
  }
  ctx.restore();
}

function drawHud(ctx, world, view) {
  const hud = hudData(world);
  const P = CFG.PALETTE;
  const w = view.w;
  const h = view.h;
  ctx.textBaseline = 'alphabetic';
  // Top-left: money, wanted, health, district, rank.
  panel(ctx, 12, 12, 258, 132);
  ctx.fillStyle = P.accent;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${hud.money.toLocaleString('en-US')}`, 24, 40);
  ctx.fillStyle = hud.wanted > 0 ? P.danger : P.hudDim;
  ctx.font = 'bold 18px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < hud.wanted ? '★' : '☆';
  ctx.fillText(stars, 24, 64);
  ctx.fillStyle = P.hudDim;
  ctx.font = '11px sans-serif';
  ctx.fillText('HP', 24, 84);
  bar(ctx, 52, 74, 100, 10, hud.hp / 100, '#58d68d');
  ctx.fillText('ARMOR', 160, 84);
  bar(ctx, 206, 74, 52, 10, hud.armor / 100, '#5aa2ff');
  ctx.fillStyle = P.hudText;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${hud.district} — ${hud.standing}`, 24, 104);
  ctx.fillStyle = P.hudDim;
  ctx.fillText(`${hud.rank} · ${hud.rp} RP`, 24, 122);

  // Top-right: circular minimap.
  drawMinimap(ctx, world, w - 92, 92, 76, missionTarget(world.missions, world.missionState));

  // Top-center: mission panel.
  const mw = 380;
  const mx = (w - mw) / 2;
  panel(ctx, mx, 12, mw, 86);
  ctx.fillStyle = P.accent;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  const missionName = hud.mission ? hud.mission.name : 'All jobs complete';
  ctx.fillText(`${hud.job} — ${missionName}`, mx + 14, 32);
  ctx.fillStyle = P.hudText;
  ctx.font = '12px sans-serif';
  const stageText = hud.stage ? hud.stage.text : 'Free roam — enjoy Solmar Bay.';
  ctx.fillText(`NEXT: ${stageText}`, mx + 14, 52);
  if (hud.mission) {
    const done = hud.missionState.stage;
    const total = hud.mission.stages.length;
    bar(ctx, mx + 14, 60, mw - 28, 8, done / total, P.accent);
    ctx.fillStyle = P.hudDim;
    ctx.font = '11px sans-serif';
    ctx.fillText(`Stage ${done + 1}/${total}`, mx + 14, 84);
  }
  if (hud.stage && hud.stage.time) {
    ctx.fillStyle = hud.missionState.timer < 15 ? P.danger : P.hudText;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(hud.missionState.timer)}s`, mx + mw - 14, 84);
    ctx.textAlign = 'left';
  }

  // Right side: dispatch panel.
  const dx = w - 262;
  const dy = 180;
  const rows = hud.dispatch;
  const dh = 30 + rows.length * 18 + (hud.roadblock ? 20 : 0) + (hud.heli ? 20 : 0);
  panel(ctx, dx, dy, 250, Math.max(64, dh));
  ctx.fillStyle = P.hudText;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`DISPATCH — ${rows.length} unit${rows.length === 1 ? '' : 's'}`, dx + 12, dy + 20);
  ctx.font = '11px sans-serif';
  let ry = dy + 40;
  for (const row of rows.slice(0, 7)) {
    ctx.fillStyle = '#8fb8ff';
    ctx.fillText(row.name, dx + 12, ry);
    ctx.fillStyle = P.hudText;
    ctx.fillText(row.role, dx + 82, ry);
    ctx.fillStyle = P.hudDim;
    ctx.textAlign = 'right';
    ctx.fillText(`${row.dist} m`, dx + 238, ry);
    ctx.textAlign = 'left';
    ry += 18;
  }
  if (hud.roadblock) {
    ctx.fillStyle = P.danger;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('⚠ ROADBLOCK AHEAD', dx + 12, ry);
    ry += 20;
  }
  if (hud.heli) {
    ctx.fillStyle = P.danger;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('✦ SBPD AIR-1 SPOTLIGHT', dx + 12, ry);
  }

  // Bottom-left: weapons + crew.
  const by = h - 108;
  panel(ctx, 12, by, 300, 96);
  ctx.fillStyle = P.hudText;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('WEAPONS  [C] switch', 24, by + 18);
  hud.weapons.forEach((wpn, i) => {
    const bx = 24 + i * 92;
    ctx.fillStyle = i === hud.slot ? 'rgba(255, 210, 62, 0.25)' : 'rgba(255,255,255,0.06)';
    rr(ctx, bx, by + 26, 84, 24, 4);
    ctx.fill();
    ctx.fillStyle = i === hud.slot ? P.accent : P.hudText;
    ctx.font = '11px sans-serif';
    const ammo = wpn.ammo === Infinity ? '∞' : String(wpn.ammo);
    ctx.fillText(`${wpn.name} ${ammo}`, bx + 6, by + 42);
  });
  ctx.fillStyle = P.hudText;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('CREW  [1/2/3] call', 24, by + 66);
  hud.crew.forEach((m, i) => {
    const bx = 24 + i * 92;
    ctx.fillStyle = m.cd > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(88, 214, 141, 0.18)';
    rr(ctx, bx, by + 72, 84, 20, 4);
    ctx.fill();
    ctx.fillStyle = m.cd > 0 ? P.hudDim : P.good;
    ctx.font = '10px sans-serif';
    ctx.fillText(`${i + 1} ${m.name} ${m.cd > 0 ? Math.ceil(m.cd) + 's' : 'READY'}`, bx + 6, by + 86);
  });

  // Bottom-right: radio + speed.
  panel(ctx, w - 262, h - 108, 250, 96);
  ctx.fillStyle = P.accent;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`♪ ${hud.station.name}`, w - 250, h - 86);
  ctx.fillStyle = P.hudText;
  ctx.font = '11px sans-serif';
  ctx.fillText(hud.song, w - 250, h - 68);
  ctx.fillStyle = P.hudDim;
  ctx.fillText(hud.station.tag, w - 250, h - 52);
  ctx.fillStyle = P.hudText;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${hud.speed} km/h`, w - 250, h - 28);
  ctx.fillStyle = P.hudDim;
  ctx.font = '11px sans-serif';
  ctx.fillText(`${hud.carName} — ${hud.carCondition}%`, w - 168, h - 28);

  // Bottom-center: dialog, messages, hints.
  const cx = w / 2;
  let my = h - 150;
  if (hud.dialog) {
    panel(ctx, cx - 260, my - 46, 520, 44);
    ctx.fillStyle = P.accent;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hud.dialog.speaker.toUpperCase(), cx, my - 28);
    ctx.fillStyle = P.hudText;
    ctx.font = 'italic 12px sans-serif';
    ctx.fillText(hud.dialog.text, cx, my - 12);
    ctx.textAlign = 'left';
    my -= 52;
  }
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  hud.messages.forEach((msg, i) => {
    ctx.fillStyle = i === 0 ? P.hudText : P.hudDim;
    ctx.fillText(msg, cx, my - i * 16);
  });
  ctx.fillStyle = P.hudDim;
  ctx.font = '11px sans-serif';
  ctx.fillText('WASD drive / walk · E enter & exit · Q radio · C weapon · 1-3 crew · SPACE shoot · ESC pause', cx, h - 8);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, world, view) {
  const w = view.w;
  const h = view.h;
  ctx.fillStyle = 'rgba(6, 10, 16, 0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = CFG.PALETTE.accent;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SOLMAR BAY', w / 2, h / 2 - 90);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText('An open-world crime story — drive, steal, run, survive.', w / 2, h / 2 - 52);
  ctx.fillStyle = CFG.PALETTE.hudDim;
  ctx.font = '15px sans-serif';
  ctx.fillText('Rico works for Mara Voss. Eight jobs stand between him and legend status.', w / 2, h / 2 - 26);
  const save = world.saveInfo;
  if (save) {
    ctx.fillStyle = CFG.PALETTE.good;
    ctx.font = '14px sans-serif';
    ctx.fillText(`Save found — $${save.money} · ${save.jobsDone} jobs done · rank ${save.rank}`, w / 2, h / 2 + 8);
  } else {
    ctx.fillStyle = CFG.PALETTE.hudDim;
    ctx.font = '14px sans-serif';
    ctx.fillText('No save yet — a fresh start in Solmar Bay.', w / 2, h / 2 + 8);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('PRESS ENTER TO START', w / 2, h / 2 + 52);
  ctx.fillStyle = CFG.PALETTE.hudDim;
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD move & drive · E enter / exit car · Q radio · C weapon · 1-3 crew · SPACE shoot · ESC pause', w / 2, h / 2 + 82);
  ctx.textAlign = 'left';
}

function drawPause(ctx, view) {
  const w = view.w;
  const h = view.h;
  ctx.fillStyle = 'rgba(6, 10, 16, 0.66)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 20);
  ctx.fillStyle = CFG.PALETTE.hudDim;
  ctx.font = '15px sans-serif';
  ctx.fillText('Your progress is saved when a job is finished.', w / 2, h / 2 + 12);
  ctx.fillStyle = CFG.PALETTE.accent;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('PRESS ESC TO RESUME', w / 2, h / 2 + 48);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, world, view) {
  const w = view.w;
  const h = view.h;
  const busted = world.endReason === 'busted';
  ctx.fillStyle = 'rgba(6, 10, 16, 0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = busted ? '#5aa2ff' : CFG.PALETTE.danger;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(busted ? 'BUSTED' : 'WASTED', w / 2, h / 2 - 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText(
    busted ? 'The SBPD finally boxed Rico in.' : 'Rico went down in the streets of Solmar Bay.',
    w / 2, h / 2 - 26,
  );
  const p = world.player;
  ctx.fillStyle = CFG.PALETTE.hudDim;
  ctx.font = '15px sans-serif';
  ctx.fillText(`$${p.money} · ${world.stats.jobsDone} jobs done · ${p.rp} RP · rank ${p.rank} · peak wanted ${world.stats.starsPeak}★`, w / 2, h / 2 + 8);
  ctx.fillStyle = CFG.PALETTE.accent;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('PRESS ENTER TO PLAY AGAIN', w / 2, h / 2 + 52);
  ctx.textAlign = 'left';
}

export function render(ctx, world, view) {
  const w = view.w;
  const h = view.h;
  let cam;
  if (world.screen === 'title') {
    // Slow drift over the city behind the title.
    const t = world.time * 0.02;
    cam = {
      x: CFG.WORLD_W / 2 - w / 2 + Math.cos(t) * 320,
      y: CFG.WORLD_H / 2 - h / 2 + Math.sin(t * 0.7) * 200,
    };
  } else {
    cam = {
      x: world.player.x - w / 2,
      y: world.player.y - h / 2,
    };
  }
  cam.x = Math.max(-80, Math.min(CFG.WORLD_W - w + 80, cam.x));
  cam.y = Math.max(-80, Math.min(CFG.WORLD_H - h + 80, cam.y));
  drawWorld(ctx, world, cam, view);
  if (world.screen === 'play' || world.screen === 'pause') drawHud(ctx, world, view);
  if (world.screen === 'title') drawTitle(ctx, world, view);
  if (world.screen === 'pause') drawPause(ctx, view);
  if (world.screen === 'end') drawEnd(ctx, world, view);
}
