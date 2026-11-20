// Drawing only: the world state and the current screen in, pixels out.
// The 1280x720 camera window is scaled to fit the browser window and
// centred. Top-down sun-soaked Solmar Bay: roads, buildings, parks,
// beach and water, cars, helicopters, pedestrians, police, and a dense
// HUD — mission panel, SBPD dispatch, weapon slots, crew cards, radio,
// speed + car condition, money, wanted stars, circular minimap,
// health/armor, district + standing, rank/RP, NPC dialogue.
import { FIELD, FONT, PALETTE, ROADS_H, ROADS_V, ROAD_W, WORLD, GARAGE, HELIPAD, RACE_START } from './config.js';
import { missionInfo } from './missions.js';
import { drawMinimap } from './minimap.js';
import { currentStation, currentSong } from './radio.js';
import { districtFor, standingFor } from './districts.js';
import { rankFor } from './world.js';
import { currentWeapon } from './combat.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function panel(ctx, x, y, w, h, title) {
  ctx.fillStyle = 'rgba(10,18,26,0.86)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(242,201,76,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (title) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, x + 10, y + 17);
  }
}

function drawCar(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-car.length / 2 + 3, -car.width / 2 + 4, car.length, car.width);
  ctx.fillStyle = car.color;
  ctx.fillRect(-car.length / 2, -car.width / 2, car.length, car.width);
  // Cabin + windshield.
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(-6, -car.width / 2 + 4, 16, car.width - 8);
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.fillRect(10, -car.width / 2 + 5, 5, car.width - 10);
  // Headlights.
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(car.length / 2 - 3, -car.width / 2 + 2, 3, 5);
  ctx.fillRect(car.length / 2 - 3, car.width / 2 - 7, 3, 5);
  if (car.kind === 'police') {
    const flash = Math.floor(performance.now() / 250) % 2 === 0;
    ctx.fillStyle = flash ? '#3b82f6' : '#ef4444';
    ctx.fillRect(-4, -car.width / 2 - 2, 8, 5);
    ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
    ctx.fillRect(-4, car.width / 2 - 3, 8, 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  if (car.kind === 'racer') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RACE', 0, 3);
  }
  if (car.kind === 'courier') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COURIER', 0, 3);
  }
  // Damage smoke for battered cars.
  if ((car.condition ?? 100) < 40) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(-car.length / 2, 0, 6 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (isPlayer) {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(-car.length / 2 - 4, -car.width / 2 - 4, car.length + 8, car.width + 8);
  }
  ctx.restore();
}

function drawHeli(ctx, heli, isPlayer, isPolice, time) {
  const alt = heli.alt || 0;
  // Ground shadow shrinks and fades as the heli climbs.
  const shScale = Math.max(0.45, 1 - alt / 500);
  ctx.save();
  ctx.translate(heli.x + alt * 0.25, heli.y + alt * 0.35);
  ctx.fillStyle = `rgba(0,0,0,${0.3 * shScale})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30 * shScale, 16 * shScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  // The heli itself draws offset up-left by altitude (pseudo-3D lift).
  ctx.translate(heli.x - alt * 0.25, heli.y - alt * 0.35);
  ctx.rotate(heli.angle);
  ctx.fillStyle = isPolice ? '#1e3a8a' : heli.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, heli.length / 2, heli.width / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(14, 0, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail boom.
  ctx.fillStyle = isPolice ? '#172554' : '#b45309';
  ctx.fillRect(-heli.length / 2 - 16, -4, 18, 8);
  // Rotor: spins faster with speed.
  ctx.strokeStyle = 'rgba(30,30,30,0.85)';
  ctx.lineWidth = 3;
  const rotor = time * (6 + (heli.speed || 0) / 60);
  ctx.beginPath();
  ctx.moveTo(Math.cos(rotor) * 38, Math.sin(rotor) * 38);
  ctx.lineTo(-Math.cos(rotor) * 38, -Math.sin(rotor) * 38);
  ctx.moveTo(Math.cos(rotor + Math.PI / 2) * 30, Math.sin(rotor + Math.PI / 2) * 30);
  ctx.lineTo(-Math.cos(rotor + Math.PI / 2) * 30, -Math.sin(rotor + Math.PI / 2) * 30);
  ctx.stroke();
  if (isPolice) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -heli.width / 2 - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, heli.width / 2 + 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (isPlayer) {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, heli.length / 2 + 5, heli.width / 2 + 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Label.
  ctx.fillStyle = isPolice ? '#93c5fd' : '#fde68a';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isPolice ? 'SBPD AIR-1' : heli.name, heli.x - alt * 0.25, heli.y - alt * 0.35 - 42);
  // Altitude readout for the player's heli.
  if (isPlayer && alt > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`ALT ${Math.round(alt)}m`, heli.x - alt * 0.25, heli.y - alt * 0.35 + 40);
  }
}

function drawPed(ctx, ped) {
  const bob = Math.sin(ped.walkPhase) * 2;
  ctx.save();
  ctx.translate(ped.x, ped.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.pants;
  ctx.fillRect(-3, 2, 3, 7);
  ctx.fillRect(1, 2, 3, 7);
  ctx.fillStyle = ped.shirt;
  ctx.fillRect(-5, -5, 10, 8);
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(0, -9, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerOnFoot(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 7, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rico Solano: teal jacket, dark jeans.
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-6, -4, 5, 8);
  ctx.fillRect(-6, 4, 5, 8);
  ctx.fillStyle = '#14b8a6';
  ctx.fillRect(-8, -7, 16, 14);
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(10, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(10, -2, 6, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(74,222,128,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22);
  ctx.stroke();
}

function drawStar(ctx, cx, cy, r, filled) {
  ctx.fillStyle = filled ? '#f2c94c' : 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  for (let k = 0; k < 5; k += 1) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function bar(x, y, w, h, frac, color, bg) {
    context.fillStyle = bg || '#334155';
    context.fillRect(x, y, w, h);
    context.fillStyle = color;
    context.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  }

  function drawCity(state) {
    const { city } = state;
    const cam = state.camera;
    const x0 = cam.x - FIELD.width / 2 - 40;
    const y0 = cam.y - FIELD.height / 2 - 40;
    const x1 = cam.x + FIELD.width / 2 + 40;
    const y1 = cam.y + FIELD.height / 2 + 40;
    context.fillStyle = PALETTE.grass;
    context.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Beach + water at the south edge.
    context.fillStyle = PALETTE.sand;
    context.fillRect(x0, 2240, x1 - x0, 110);
    context.fillStyle = PALETTE.water;
    context.fillRect(x0, 2340, x1 - x0, 80);
    context.fillStyle = PALETTE.deepWater;
    for (let i = 0; i < 8; i += 1) {
      const wx = x0 + ((i * 397) % Math.max(1, x1 - x0));
      context.fillRect(wx, 2360 + (i % 3) * 12, 90, 3);
    }
    // Parks.
    for (const park of city.parks) {
      context.fillStyle = PALETTE.park;
      context.fillRect(park.x, park.y, park.w, park.h);
    }
    // Sidewalks + roads.
    context.fillStyle = PALETTE.sidewalk;
    for (const rx of ROADS_V) context.fillRect(rx - ROAD_W / 2 - 10, y0, ROAD_W + 20, y1 - y0);
    for (const ry of ROADS_H) context.fillRect(x0, ry - ROAD_W / 2 - 10, x1 - x0, ROAD_W + 20);
    context.fillStyle = PALETTE.road;
    for (const rx of ROADS_V) context.fillRect(rx - ROAD_W / 2, y0, ROAD_W, y1 - y0);
    for (const ry of ROADS_H) context.fillRect(x0, ry - ROAD_W / 2, x1 - x0, ROAD_W);
    // Lane dashes.
    context.fillStyle = PALETTE.lane;
    for (const rx of ROADS_V) {
      for (let y = Math.floor(y0 / 44) * 44; y < y1; y += 44) context.fillRect(rx - 2, y, 4, 22);
    }
    for (const ry of ROADS_H) {
      for (let x = Math.floor(x0 / 44) * 44; x < x1; x += 44) context.fillRect(x, ry - 2, 22, 4);
    }
    // Trees.
    for (const t of city.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      context.fillStyle = '#2f7d32';
      context.beginPath();
      context.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#43a047';
      context.beginPath();
      context.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
      context.fill();
    }
    // Buildings with roofs + windows.
    for (const b of city.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      context.fillStyle = 'rgba(0,0,0,0.25)';
      context.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      context.fillStyle = b.color;
      context.fillRect(b.x, b.y, b.w, b.h);
      context.fillStyle = 'rgba(255,255,255,0.25)';
      context.fillRect(b.x, b.y, b.w, 6);
      context.fillStyle = PALETTE.roof;
      if (b.roof) context.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      context.fillStyle = 'rgba(30,41,59,0.55)';
      const cols = Math.max(1, Math.floor(b.w / 22));
      const rows = Math.max(1, Math.floor(b.h / 24));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          context.fillRect(b.x + 8 + c * 22, b.y + 10 + r * 24, 10, 12);
        }
      }
    }
    // Garage zone (green dashed square) + label.
    context.save();
    context.strokeStyle = '#4ade80';
    context.lineWidth = 2;
    context.setLineDash([8, 6]);
    context.strokeRect(GARAGE.x - GARAGE.r, GARAGE.y - GARAGE.r, GARAGE.r * 2, GARAGE.r * 2);
    context.setLineDash([]);
    context.fillStyle = '#4ade80';
    context.font = 'bold 13px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText('◆ GARAGE — repair $50 · G', GARAGE.x, GARAGE.y - GARAGE.r - 8);
    // Helipad (yellow H circle) + label.
    context.strokeStyle = '#f2c94c';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(HELIPAD.x, HELIPAD.y, 46, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#f2c94c';
    context.font = 'bold 28px system-ui, sans-serif';
    context.fillText('H', HELIPAD.x, HELIPAD.y + 10);
    context.font = 'bold 12px system-ui, sans-serif';
    context.fillText('HELIPAD — SKYHAWK-9', HELIPAD.x, HELIPAD.y - 56);
    // Race start (checkered flag) + label.
    context.fillStyle = '#fff';
    context.fillRect(RACE_START.x - 14, RACE_START.y - 14, 28, 28);
    context.fillStyle = '#111';
    for (let i = 0; i < 4; i += 1) {
      context.fillRect(RACE_START.x - 14 + (i % 2) * 14, RACE_START.y - 14 + Math.floor(i / 2) * 14, 7, 7);
      context.fillRect(RACE_START.x - 7 + (i % 2) * 14, RACE_START.y - 7 + Math.floor(i / 2) * 14, 7, 7);
    }
    context.fillStyle = '#f97316';
    context.font = 'bold 12px system-ui, sans-serif';
    context.fillText('STREET RACE — G to join', RACE_START.x, RACE_START.y - 24);
    context.restore();
    // Skid marks.
    context.strokeStyle = 'rgba(20,20,20,0.55)';
    context.lineWidth = 4;
    for (const s of state.skids) {
      context.beginPath();
      context.moveTo(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14);
      context.lineTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
      context.stroke();
    }
    // Pickups.
    for (const p of state.pickups) {
      if (p.taken) continue;
      const bob = Math.sin(state.time * 3 + p.bob) * 3;
      context.save();
      context.translate(p.x, p.y + bob);
      if (p.kind === 'cash') {
        context.fillStyle = '#4ade80';
        context.fillRect(-11, -7, 22, 14);
        context.fillStyle = '#166534';
        context.font = 'bold 11px system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('$', 0, 4);
      } else if (p.kind === 'health') {
        context.fillStyle = '#fff';
        context.fillRect(-9, -9, 18, 18);
        context.fillStyle = '#ef4444';
        context.fillRect(-2, -7, 4, 14);
        context.fillRect(-7, -2, 14, 4);
      } else if (p.kind === 'armor') {
        context.fillStyle = '#3b82f6';
        context.fillRect(-9, -9, 18, 18);
        context.fillStyle = '#fff';
        context.font = 'bold 10px system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('A+', 0, 3);
      } else {
        context.fillStyle = '#f2c94c';
        context.beginPath();
        context.arc(0, 0, 9, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#111';
        context.font = 'bold 10px system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('A', 0, 3);
      }
      context.restore();
    }
    // Roadblocks: striped barriers between the parked SBPD cars.
    for (const b of state.roadblocks) {
      context.save();
      context.translate(b.x, b.y);
      context.rotate(b.angle);
      context.fillStyle = '#f97316';
      context.fillRect(-40, -8, 80, 16);
      context.fillStyle = '#fff';
      for (let i = -3; i <= 3; i += 2) context.fillRect(i * 11, -8, 11, 16);
      context.restore();
      context.fillStyle = '#f97316';
      context.font = 'bold 11px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('! ROADBLOCK !', b.x, b.y - 52);
    }
    // Race gates (numbered).
    if (state.race) {
      state.race.checkpoints.forEach((cp, i) => {
        const done = i < state.race.index;
        const current = i === state.race.index;
        context.save();
        context.translate(cp.x, cp.y);
        context.fillStyle = done ? 'rgba(74,222,128,0.3)' : current ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.15)';
        context.beginPath();
        context.arc(0, 0, 40, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = current ? '#f97316' : '#fff';
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = current ? '#f97316' : '#fff';
        context.font = 'bold 16px system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(String(i + 1), 0, 6);
        context.restore();
      });
    }
    // Mission marker (pulsing gold diamond + beacon).
    if (state.missionTarget) {
      const t = state.missionTarget;
      const pulse = 1 + Math.sin(state.time * 4) * 0.15;
      context.save();
      context.translate(t.x, t.y);
      context.fillStyle = 'rgba(242,201,76,0.25)';
      context.beginPath();
      context.arc(0, 0, 44 * pulse, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.gold;
      context.rotate(Math.PI / 4);
      context.fillRect(-13, -13, 26, 26);
      context.restore();
      context.fillStyle = PALETTE.gold;
      context.font = 'bold 13px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('◆ MISSION', t.x, t.y - 52);
    }
    // Courier car (purple, for the chase mission).
    if (state.courierCar) drawCar(context, state.courierCar, false);
  }

  function drawEntities(state) {
    for (const car of state.cars) drawCar(context, car, state.player.car === car);
    for (const car of state.policeCars) drawCar(context, car, false);
    for (const heli of state.helis) drawHeli(context, heli, state.player.heli === heli, false, state.time);
    // Police heli spotlight cone (drawn under the heli, over the ground).
    if (state.policeHeli && state.policeHeli.spotlight > 0.05) {
      const h = state.policeHeli;
      const a = state.policeHeli.spotlight;
      const hx = h.x - h.alt * 0.25;
      const hy = h.y - h.alt * 0.35;
      const px = state.player.x;
      const py = state.player.y;
      const dx = px - hx;
      const dy = py - hy;
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d;
      const ny = dx / d;
      context.save();
      context.globalAlpha = 0.28 * a;
      context.fillStyle = '#fef9c3';
      context.beginPath();
      context.moveTo(hx, hy);
      context.lineTo(px + nx * 70, py + ny * 70);
      context.lineTo(px - nx * 70, py - ny * 70);
      context.closePath();
      context.fill();
      context.globalAlpha = 0.5 * a;
      context.beginPath();
      context.arc(px, py, 46, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.fillStyle = '#fef9c3';
      context.font = 'bold 11px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('SPOTLIGHT ON YOU', px, py - 56);
    }
    if (state.policeHeli) drawHeli(context, state.policeHeli, false, true, state.time);
    // Race rivals.
    if (state.race) {
      for (const r of state.race.rivals) drawCar(context, r, false);
    }
    for (const ped of state.peds) if (ped.alive) drawPed(context, ped);
    for (const off of state.policeFoot) {
      if (!off.alive) continue;
      context.fillStyle = '#1e3a8a';
      context.beginPath();
      context.arc(off.x, off.y, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff';
      context.font = 'bold 9px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('PD', off.x, off.y + 3);
    }
    if (state.player.onFoot) drawPlayerOnFoot(context, state.player);
    for (const b of state.bullets) {
      context.fillStyle = '#fef08a';
      context.beginPath();
      context.arc(b.x, b.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    for (const pt of state.particles) {
      context.globalAlpha = Math.max(0, pt.life * 2);
      context.fillStyle = pt.color;
      context.fillRect(pt.x - 3, pt.y - 3, 6, 6);
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, screen) {
    const s = state;
    const info = missionInfo(s.missions);
    const rank = rankFor(s.rp);
    const district = districtFor(s.player.x, s.player.y);
    const standing = standingFor(s.missions.done.length, s.wanted);
    const hour = Math.floor(s.dayTime) % 24;
    const min = Math.floor((s.dayTime % 1) * 60);
    const clock = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    // ---- Top bar.
    context.fillStyle = 'rgba(10,18,26,0.85)';
    context.fillRect(0, 0, FIELD.width, 56);
    text(`$${s.money}`, 16, 38, 28, '#4ade80', 'left');
    text(`${rank.name} · ${s.rp} RP${rank.nextMin ? ` → ${rank.nextMin}` : ' · MAX'}`, 150, 24, 13, PALETTE.muted, 'left');
    text(`Debt $2,000 · Jobs ${s.missions.done.length}/8`, 150, 42, 13, PALETTE.muted, 'left');
    // Health + armor bars.
    text('HP', 470, 26, 12, PALETTE.text, 'left');
    bar(498, 14, 130, 12, s.health / 100, s.health > 40 ? '#4ade80' : '#ef4444');
    text(`${Math.ceil(s.health)}`, 634, 26, 12, PALETTE.text, 'left');
    text('ARMOR', 470, 46, 12, PALETTE.text, 'left');
    bar(498, 34, 130, 12, s.armor / 100, '#3b82f6');
    text(`${Math.round(s.armor)}`, 634, 46, 12, PALETTE.text, 'left');
    // Wanted stars.
    for (let i = 0; i < 5; i += 1) drawStar(context, 700 + i * 26, 28, 11, i < s.wanted);
    text(s.wanted > 0 ? `WANTED ${s.wanted}` : 'CLEAN', 690, 50, 11, s.wanted > 0 ? '#f2c94c' : PALETTE.muted, 'left');
    // Clock + district + standing.
    text(`${clock}`, 1060, 26, 18, PALETTE.text, 'left');
    text(`${district.toUpperCase()} · ${standing.toUpperCase()}`, 1060, 46, 12, PALETTE.gold, 'left');

    // ---- Mission panel (top-left).
    const jobsDone = s.missions.done.length;
    panel(context, 12, 64, 308, 108, s.missions.active ? `JOB ${jobsDone + 1}/8 — ${info.name.toUpperCase()}` : `NEXT JOB — ${info.name.toUpperCase()}`);
    text(`Stage: ${info.stage}`, 24, 104, 14, PALETTE.text, 'left');
    if (s.missions.active) {
      const def = s.missions.active.def;
      bar(24, 112, 284, 8, info.timer / def.time, '#f2c94c');
      text(`${info.timer}s left`, 24, 136, 13, '#f2c94c', 'left');
      text(`$${info.reward}`, 296, 136, 13, '#4ade80', 'right');
    } else {
      text(s.missions.done.length >= 8 ? 'Story complete!' : 'Go to the gold ◆ marker', 24, 132, 13, PALETTE.muted, 'left');
    }
    text(`NEXT: ${info.objective}`, 24, 158, 12, PALETTE.muted, 'left');
    if (s.race) {
      text(`RACE: gate ${s.race.index + 1}/4 — ${Math.ceil(s.raceTimer)}s`, 24, 158, 12, '#f97316', 'left');
    }

    // ---- Dispatch panel (top-right).
    const dispatch = s.dispatch || [];
    panel(context, 960, 64, 308, 26 + dispatch.length * 20 + 14, `SBPD DISPATCH — ${dispatch.length} UNIT${dispatch.length === 1 ? '' : 'S'}${s.wanted >= 3 ? ' · AIR-1 UP' : ''}`);
    if (dispatch.length === 0) {
      text('No units assigned — streets are quiet.', 972, 102, 13, PALETTE.muted, 'left');
    } else {
      dispatch.forEach((u, i) => {
        const y = 112 + i * 20;
        text(u.unit, 972, y, 13, '#93c5fd', 'left');
        text(u.task, 1060, y, 13, u.task.includes('Spotlight') || u.task.includes('Roadblock') ? '#f97316' : PALETTE.text, 'left');
        text(`${u.dist}m`, 1248, y, 13, PALETTE.muted, 'right');
      });
    }

    // ---- Centre message (not on the title screen — the panel covers it).
    if (screen !== SCREEN_TITLE && s.messageTimer > 0 && s.message) {
      context.fillStyle = 'rgba(10,18,26,0.78)';
      const w = Math.min(780, 40 + s.message.length * 8);
      context.fillRect((FIELD.width - w) / 2, 182, w, 36);
      text(s.message, FIELD.width / 2, 206, 17, PALETTE.text, 'center');
    }

    // ---- Context prompt (garage / race / heli).
    let prompt = '';
    if (s.nearGarage && s.player.car) prompt = 'G — Garage: repair + repaint $50';
    else if (s.nearGarage) prompt = 'Garage: bring a car in to repair it (G)';
    else if (s.nearRace && !s.race) prompt = 'G — Join the street race (4 gates, $200)';
    else if (s.nearHeli && s.player.onFoot) prompt = 'E — Fly the Skyhawk-9 (SPACE climb · C descend)';
    else if (s.player.heli) prompt = 'SPACE climb · C descend · E land & exit';
    if (prompt && screen !== SCREEN_TITLE) {
      context.fillStyle = 'rgba(10,18,26,0.78)';
      const w = 40 + prompt.length * 7.5;
      context.fillRect((FIELD.width - w) / 2, 226, w, 30);
      text(prompt, FIELD.width / 2, 246, 15, '#4ade80', 'center');
    }

    // ---- Crew card (bottom-left).
    panel(context, 12, 448, 240, 118, 'CREW — 1/2/3 TO CALL');
    s.crew.members.forEach((m, i) => {
      const y = 486 + i * 26;
      const ready = m.cd <= 0;
      text(`[${m.key}] ${m.name} — ${m.role}`, 22, y, 12, ready ? PALETTE.text : PALETTE.muted, 'left');
      text(`${m.ability}`, 22, y + 13, 11, PALETTE.muted, 'left');
      text(ready ? 'READY' : `${Math.ceil(m.cd)}s`, 240, y + 6, 12, ready ? '#4ade80' : '#f97316', 'right');
    });

    // ---- Weapon slots (bottom-left, under crew card).
    const weapon = currentWeapon(s.weapons);
    s.weapons.list.forEach((w, i) => {
      const x = 12 + i * 82;
      const active = s.weapons.index === i;
      context.fillStyle = active ? 'rgba(242,201,76,0.9)' : 'rgba(10,18,26,0.86)';
      context.fillRect(x, 578, 74, 44);
      context.strokeStyle = active ? '#f2c94c' : 'rgba(255,255,255,0.25)';
      context.strokeRect(x + 0.5, 578.5, 73, 43);
      text(w.name, x + 37, 596, 12, active ? '#111' : PALETTE.text, 'center');
      text(w.ammo === Infinity ? '∞' : `${w.ammo} rds`, x + 37, 613, 11, active ? '#111' : PALETTE.muted, 'center');
    });
    text('Q — switch weapon', 12, 636, 11, PALETTE.muted, 'left');

    // ---- Radio bar (bottom-left, under weapons): station line + song line.
    panel(context, 12, 644, 300, 40, '');
    text(`♪ ${currentStation(s.radio).name}`, 22, 662, 13, '#fde68a', 'left');
    const song = currentSong(s.radio);
    const songLine = `${song.title} — ${song.artist}`;
    text(songLine.length > 40 ? `${songLine.slice(0, 39)}…` : songLine, 22, 678, 11, PALETTE.muted, 'left');

    // ---- Speed + car panel (bottom-right, above minimap; hidden on title).
    if (screen !== SCREEN_TITLE) {
      const car = s.player.car;
      const heli = s.player.heli;
      const speed = car ? Math.round(Math.abs(car.speed) * 0.24)
        : heli ? Math.round(Math.abs(heli.speed) * 0.24) : 0;
      panel(context, 960, 436, 308, 76, heli ? 'SKYHAWK-9 · HELICOPTER' : car ? `${(car.name || 'CAR').toUpperCase()} · ${car.plate || ''}` : 'ON FOOT — RICO SOLANO');
      if (car || heli) {
        const cond = Math.round((car || heli).condition ?? 100);
        text(`${speed} km/h`, 972, 478, 22, PALETTE.text, 'left');
        bar(1080, 466, 176, 10, cond / 100, cond < 40 ? '#ef4444' : '#4ade80');
        text(`Condition ${cond}% ${cond < 40 ? '· DENTED' : cond < 70 ? '· SCRATCHED' : '· CLEAN'}`, 972, 498, 12, cond < 40 ? '#ef4444' : PALETTE.muted, 'left');
      } else {
        text('Find a car (E) or the heli at the helipad (H).', 972, 480, 12, PALETTE.muted, 'left');
      }
    }

    // ---- Dialogue box (bottom-centre).
    if (s.dialogTimer > 0 && s.dialog) {
      const dx = 340;
      const dw = 600;
      context.fillStyle = 'rgba(16,24,32,0.92)';
      context.fillRect(dx, 616, dw, 64);
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 1.5;
      context.strokeRect(dx + 0.5, 616.5, dw - 1, 63);
      text(s.dialog.speaker.toUpperCase(), dx + 14, 640, 12, PALETTE.gold, 'left');
      text(s.dialog.text, dx + 14, 662, 14, PALETTE.text, 'left');
    }

    // Controls hint, bottom-left corner.
    text('WASD drive/walk · E enter · Space punch/brake · X shoot · Q weapon · R radio · G garage/race · 1/2/3 crew · P pause · M mute', 12, FIELD.height - 8, 12, 'rgba(244,241,232,0.7)', 'left');
    drawMinimap(context, s);
    if (screen === SCREEN_PAUSED) {
      context.fillStyle = 'rgba(10,18,26,0.6)';
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      text('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10, 52, PALETTE.text, 'center');
      text('Press P to resume · progress auto-saves after each job', FIELD.width / 2, FIELD.height / 2 + 30, 20, PALETTE.muted, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const w = 720;
    const h = 150 + lines.length * 32;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, w, h);
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.strokeRect(x, y, w, h);
    text(title, FIELD.width / 2, y + 66, 46, PALETTE.gold, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 112 + i * 32, 20, PALETTE.text, 'center');
    }
    text(prompt, FIELD.width / 2, y + h - 26, 20, PALETTE.gold, 'center');
  }

  function dayTint(state) {
    const h = state.dayTime;
    let alpha = 0;
    if (h >= 19 || h < 6) alpha = 0.28;
    else if (h >= 18) alpha = 0.14;
    if (alpha > 0) {
      context.fillStyle = `rgba(10,20,60,${alpha})`;
      context.fillRect(state.camera.x - FIELD.width / 2, state.camera.y - FIELD.height / 2, FIELD.width, FIELD.height);
    }
  }

  function draw(state, screen, info) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.save();
    context.translate(FIELD.width / 2 - state.camera.x, FIELD.height / 2 - state.camera.y);
    drawCity(state);
    drawEntities(state);
    dayTint(state);
    context.restore();
    if (screen === SCREEN_TITLE) {
      drawHud(state, screen);
      drawPanel('SOLMAR BAY', [
        'An open-world crime game in the spirit of GTA 6.',
        'Rico Solano owes $2,000. 8 jobs, a helicopter, street races, a garage and a crew.',
        'WASD walk & drive · E steal a car / fly the heli · Space punch · X shoot · R radio',
        'Q weapons · G garage & races · 1/2/3 crew abilities · P pause · M mute',
        info && info.hasSave ? 'Save found — press L to continue, Enter for a new game.' : 'No save yet — your progress auto-saves after each job.',
      ], 'Press Enter to start');
      return;
    }
    drawHud(state, screen);
    if (screen === SCREEN_OVER) {
      const title = state.overReason === 'busted' ? 'BUSTED!' : 'WASTED!';
      drawPanel(title, [
        `Money kept: $${state.money} · Jobs done: ${state.missions.done.length}/8 · RP: ${state.rp}`,
        state.overReason === 'busted' ? 'The Solmar Bay Police caught you. The debt is still waiting.' : 'Rico went down. The city keeps moving without you.',
      ], 'Press Enter to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
