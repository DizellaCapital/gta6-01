// Drawing only: the world state and the current screen in, pixels out.
// The 1280x720 camera window is scaled to fit the browser window and
// centred. Top-down sun-soaked Solmar Bay: roads, buildings, parks,
// beach and water, cars, pedestrians, police, HUD with a live minimap.
import { FIELD, FONT, PALETTE, ROADS_H, ROADS_V, ROAD_W, WORLD } from './config.js';
import { missionLabel } from './missions.js';
import { drawMinimap } from './minimap.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

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
  if (isPlayer) {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(-car.length / 2 - 4, -car.width / 2 - 4, car.length + 8, car.width + 8);
  }
  ctx.restore();
}

function drawPed(ctx, ped) {
  const bob = Math.sin(ped.walkPhase) * 2;
  ctx.save();
  ctx.translate(ped.x, ped.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs, body, head.
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
  // Direction tick.
  ctx.strokeStyle = 'rgba(74,222,128,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22);
  ctx.stroke();
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

  function drawCity(state) {
    const { city } = state;
    const cam = state.camera;
    const x0 = cam.x - FIELD.width / 2 - 40;
    const y0 = cam.y - FIELD.height / 2 - 40;
    const x1 = cam.x + FIELD.width / 2 + 40;
    const y1 = cam.y + FIELD.height / 2 + 40;
    // Grass base.
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
    // Top bar.
    context.fillStyle = 'rgba(10,18,26,0.82)';
    context.fillRect(0, 0, FIELD.width, 64);
    text(`$${s.money}`, 20, 42, 30, '#4ade80', 'left');
    text(`Debt $2,000 — jobs done: ${s.missions.done.length}/5`, 200, 40, 18, PALETTE.muted, 'left');
    // Health bar.
    context.fillStyle = '#334155';
    context.fillRect(560, 22, 160, 16);
    context.fillStyle = s.health > 40 ? '#4ade80' : '#ef4444';
    context.fillRect(560, 22, 160 * Math.max(0, s.health / 100), 16);
    text('HP', 530, 38, 16, PALETTE.text, 'left');
    text(`${Math.ceil(s.health)}`, 728, 38, 16, PALETTE.text, 'left');
    // Wanted stars.
    for (let i = 0; i < 5; i += 1) {
      context.fillStyle = i < s.wanted ? '#f2c94c' : 'rgba(255,255,255,0.2)';
      const cx = 800 + i * 30;
      const cy = 30;
      context.beginPath();
      for (let k = 0; k < 5; k += 1) {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
        const a2 = a + Math.PI / 5;
        context.lineTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11);
        context.lineTo(cx + Math.cos(a2) * 5, cy + Math.sin(a2) * 5);
      }
      context.closePath();
      context.fill();
    }
    // Speed + ammo.
    const speed = s.player.car ? Math.round(Math.abs(s.player.car.speed) * 0.24) : 0;
    text(s.player.car ? `${speed} mph` : 'On foot', 1000, 40, 20, PALETTE.text, 'left');
    text(`Ammo ${s.ammo}`, 1130, 40, 18, PALETTE.text, 'left');
    // Mission objective line.
    context.fillStyle = 'rgba(10,18,26,0.7)';
    context.fillRect(0, 64, FIELD.width, 34);
    text(missionLabel(s.missions), 20, 88, 18, PALETTE.gold, 'left');
    const hour = Math.floor(s.dayTime) % 24;
    const min = Math.floor((s.dayTime % 1) * 60);
    text(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}  SOLMAR BAY`, FIELD.width - 20, 88, 16, PALETTE.muted, 'right');
    // Centre message.
    if (s.messageTimer > 0 && s.message) {
      context.fillStyle = 'rgba(10,18,26,0.75)';
      const w = Math.min(760, 40 + s.message.length * 8);
      context.fillRect((FIELD.width - w) / 2, 118, w, 40);
      text(s.message, FIELD.width / 2, 145, 18, PALETTE.text, 'center');
    }
    // Controls hint, bottom-left.
    text('WASD drive/walk · E enter car · Space punch/brake · X shoot · P pause · M mute', 20, FIELD.height - 14, 14, 'rgba(244,241,232,0.75)', 'left');
    drawMinimap(context, s);
    if (screen === SCREEN_PAUSED) {
      context.fillStyle = 'rgba(10,18,26,0.6)';
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      text('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10, 52, PALETTE.text, 'center');
      text('Press P to resume · progress auto-saves after each job', FIELD.width / 2, FIELD.height / 2 + 30, 20, PALETTE.muted, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const w = 680;
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
    // Night falls after 19:00, dawn before 07:00: a cool tint over the city.
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
    // Camera transform: world -> 1280x720 window centred on the player.
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
        'Rico Solano owes $2,000. Drive, steal cars, dodge the police, finish 5 jobs.',
        'WASD walk & drive · E steal / exit a car · Space punch · X shoot · P pause',
        info && info.hasSave ? 'Save found — press L to continue, Enter for a new game.' : 'No save yet — your progress auto-saves after each job.',
      ], 'Press Enter to start');
      return;
    }
    drawHud(state, screen);
    if (screen === SCREEN_OVER) {
      const title = state.overReason === 'busted' ? 'BUSTED!' : 'WASTED!';
      drawPanel(title, [
        `Money kept: $${state.money} · Jobs done: ${state.missions.done.length}/5`,
        state.overReason === 'busted' ? 'The Solmar Bay Police caught you. The debt is still waiting.' : 'Rico went down. The city keeps moving without you.',
      ], 'Press Enter to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
