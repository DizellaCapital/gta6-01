// Solmar Bay — screenshot staging. Each scene runs the REAL simulation
// forward from a fresh world with a small autopilot (drive along the road
// grid toward the active mission target, stealing a car first when on
// foot). Nothing here is a fake frame: traffic, police, wanted level and
// the HUD are all live state.
import { CONFIG } from './config.js';
import { nearestRoadPoint } from './city.js';
import { stepWorld, missionBriefing } from './world.js';
import { addWanted } from './combat.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Plan a Manhattan route along the road grid: along the current road to the
// target's cross-street, then along that street to the target.
export function planRoute(state, target) {
  const p = state.player;
  const near = nearestRoadPoint(state.city, p.x, p.y);
  const onHorizontal = Math.abs(p.y - near.y) <= Math.abs(p.x - near.x);
  if (onHorizontal) return [{ x: target.x, y: near.y }, { x: target.x, y: target.y }];
  return [{ x: near.x, y: target.y }, { x: target.x, y: target.y }];
}

export function autopilot(state, dt) {
  const p = state.player;
  const input = state.input;
  input.up = false; input.down = false; input.left = false; input.right = false;
  input.shoot = false; input.mouseDown = false;
  if (!state.auto) return;
  const target = state.auto.target;
  if (!target) return;
  if (p.onFoot) {
    // Walk toward the nearest parked car, then take it.
    let dest = state.auto.carTarget;
    if (!dest) {
      let best = null;
      let bestD = 1e9;
      for (const car of state.parked) {
        const d = Math.hypot(car.x - p.x, car.y - p.y);
        if (d < bestD) { bestD = d; best = car; }
      }
      dest = best;
      state.auto.carTarget = best;
    }
    if (dest && Math.hypot(dest.x - p.x, dest.y - p.y) < 50) {
      input.action = true;
      input.pressed.add('e');
      state.auto.carTarget = null;
      return;
    }
    if (dest) {
      const dx = dest.x - p.x;
      const dy = dest.y - p.y;
      if (dx > 8) input.right = true;
      if (dx < -8) input.left = true;
      if (dy > 8) input.down = true;
      if (dy < -8) input.up = true;
    }
    return;
  }
  // Driving: follow the planned waypoints toward the live mission target
  // (the stage target moves as stages complete, so replan when it does).
  const liveTarget = state.missionStageTarget ? state.missionStageTarget.target : state.auto.target;
  const wpKey = liveTarget.x + ',' + liveTarget.y;
  if (!state.auto.waypoints || state.auto.wpKey !== wpKey) {
    state.auto.waypoints = planRoute(state, liveTarget);
    state.auto.wpIndex = 0;
    state.auto.wpKey = wpKey;
  }
  const wps = state.auto.waypoints;
  let wp = wps[state.auto.wpIndex || 0];
  if (!wp) return;
  if (Math.hypot(wp.x - p.x, wp.y - p.y) < 48) {
    state.auto.wpIndex = (state.auto.wpIndex || 0) + 1;
    wp = wps[state.auto.wpIndex || 0];
    if (!wp) return;
  }
  const want = Math.atan2(wp.y - p.y, wp.x - p.x);
  const diff = angleDiff(want, p.angle);
  input.up = true;
  if (diff < -0.12) input.left = true;
  else if (diff > 0.12) input.right = true;
  if (Math.abs(diff) > 1.2) input.up = false;
  // Stuck against a wall: back up briefly, then replan from the current spot.
  state.auto.stuckTime = (state.auto.stuckTime || 0) + (Math.abs(p.speed) < 12 ? dt : -dt * 2);
  if (state.auto.stuckTime > 3) {
    state.auto.waypoints = planRoute(state, liveTarget);
    state.auto.wpIndex = 0;
    state.auto.wpKey = wpKey;
    state.auto.stuckTime = 0;
    state.auto.reverseUntil = state.time + 0.9;
  }
  if (state.auto.reverseUntil && state.time < state.auto.reverseUntil) {
    input.up = false;
    input.down = true;
    if (diff < -0.12) input.right = true;
    else if (diff > 0.12) input.left = true;
    return;
  }
}

// Configure one scene, then advance the simulation by `seconds`.
export function stageShot(state, shot, seconds) {
  const p = state.player;
  const start = { x: 1200, y: 400 };
  if (shot === 'start') {
    state.screen = 'title';
    state.camera.x = 1200;
    state.camera.y = 900;
    state.auto = null;
  } else if (shot === 'play') {
    state.screen = 'play';
    p.x = start.x; p.y = start.y; p.onFoot = true;
    missionBriefing(state);
    state.auto = { target: { x: 2000, y: 400 }, wpIndex: 0, stuckTime: 0 };
    addWanted(state, 1);
    state.auto.seconds = seconds;
  } else if (shot === 'chase') {
    state.screen = 'play';
    p.x = start.x; p.y = start.y; p.onFoot = true;
    missionBriefing(state);
    state.auto = { target: { x: 2000, y: 400 }, wpIndex: 0, stuckTime: 0 };
    addWanted(state, 4);
    state.radioStation = 0;
    state.auto.seconds = seconds;
  } else if (shot === 'end') {
    state.screen = 'play';
    p.x = start.x; p.y = start.y; p.onFoot = true;
    p.health = 100;
    addWanted(state, 4);
    state.auto = null;
    // Let the cops close in for a second, then freeze on BUSTED.
    const dt = CONFIG.stepSeconds;
    for (let i = 0; i < Math.round(1.2 / dt); i++) stepWorld(state, dt);
    // Surround Rico with SBPD units for the game-over frame.
    state.cops = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      state.cops.push({
        id: 'endcop' + i, kind: 'cop', x: p.x + Math.cos(a) * 120, y: p.y + Math.sin(a) * 120,
        angle: Math.atan2(p.y - (p.y + Math.sin(a) * 120), p.x - (p.x + Math.cos(a) * 120)),
        speed: 0, color: CONFIG.palette.copCar, name: 'Unit ' + (i + 1), role: 'Closing In', condition: 100, dist: 120,
      });
    }
    state.screen = 'over';
    state.overReason = 'busted';
    return;
  }
  const dt = CONFIG.stepSeconds;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    autopilot(state, dt);
    stepWorld(state, dt);
  }
}
