// The screenshot scenes behind ?shot=start|play|chase|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot that drives along the road grid toward
// the mission marker, so the frame is what real play looks like and the
// same seed always gives the same frame.
import { ROADS_H, ROADS_V, STEP } from './config.js';
import { pointInBuilding, nearestRoadPoint } from './city.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 34;
const CHASE_SECONDS = 8;
const END_SECONDS = 24;

function nearest(list, v) {
  let best = list[0];
  for (const x of list) if (Math.abs(x - v) < Math.abs(best - v)) best = x;
  return best;
}

/** Next waypoint on the road grid toward the target (Manhattan routing).
 * Ride the road the car is already on to the nearest cross street, then
 * along that street to the target's avenue, then up the avenue — never
 * cut diagonally across a block. */
function waypoint(state, target) {
  const p = state.player;
  const vRoad = nearest(ROADS_V, p.x);
  const hRoad = nearest(ROADS_H, p.y);
  const onV = Math.abs(p.x - vRoad) < 48;
  const onH = Math.abs(p.y - hRoad) < 48;
  if (Math.abs(p.x - target.x) <= 70) return target;
  if (onV && !onH) return { x: vRoad, y: nearest(ROADS_H, p.y) };
  if (onH) return { x: target.x, y: hRoad };
  return { x: vRoad, y: hRoad };
}

/** Drive input steering the player's car (or feet) toward a target point. */
let escapeUntil = 0;
let lastPos = null;
let stuckTime = 0;
function resetAutopilot() {
  escapeUntil = 0;
  lastPos = null;
  stuckTime = 0;
}

function autopilot(state) {
  const p = state.player;
  const target = state.missionTarget || { x: 1600, y: 850 };
  let wp = p.onFoot ? target : waypoint(state, target);
  // If a building is dead ahead, steer back to the nearest road first.
  if (!p.onFoot) {
    const ax = p.x + Math.cos(p.angle) * 90;
    const ay = p.y + Math.sin(p.angle) * 90;
    if (pointInBuilding(state.city, ax, ay)) {
      const rp = nearestRoadPoint(p.x, p.y);
      if (rp) wp = { x: rp.x, y: rp.y };
    }
  }
  const dx = wp.x - p.x;
  const dy = wp.y - p.y;
  const want = Math.atan2(dy, dx);
  let diff = want - p.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.5));
  if (p.onFoot) {
    return { x: Math.cos(want), y: Math.sin(want), run: true };
  }
  // In a car: facing away from the waypoint, reverse to swing the nose
  // around instead of driving forward into whatever is behind the car.
  // On a hard turn, brake first, then creep-turn at low speed so the
  // turn stays on the road. Brake only when the waypoint IS the mission
  // target itself. Slow down approaching a waypoint so the turn stays
  // on the road.
  const speed = p.car ? Math.abs(p.car.speed) : 0;
  const isFinal = wp === target;
  const wpDist = Math.hypot(dx, dy);
  let out;
  if (Math.abs(diff) > 2.4) out = { x: -steer, y: 1, brake: false };
  else if (Math.abs(diff) > 0.9) {
    out = speed > 30
      ? { x: steer, y: 0, brake: true }
      : { x: steer, y: -1, brake: false };
  } else if (wpDist < 220 && speed > 160) out = { x: steer, y: 0, brake: true };
  else if (speed > 260) out = { x: steer, y: 0, brake: false };
  else out = { x: steer, y: -1, brake: isFinal && wpDist < 120 };
  // Stuck-escape: only counts while actually throttling forward yet
  // barely moving (wedged against a building), so slow turns and
  // braking never trip it.
  if (p.car) {
    if (state.time < escapeUntil) return { x: -steer, y: 1, brake: false };
    if (lastPos) {
      const moved = Math.hypot(p.x - lastPos.x, p.y - lastPos.y);
      if (out.y === -1 && speed < 10 && moved < 0.2) {
        stuckTime += STEP;
        if (stuckTime > 3) {
          escapeUntil = state.time + 1.0;
          stuckTime = 0;
          return { x: -steer, y: 1, brake: false };
        }
      } else stuckTime = 0;
    }
    lastPos = { x: p.x, y: p.y };
  }
  return out;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title over a living city. play: driving to the first job,
 * wanted 1. chase: wanted 4, police on the tail, mission live.
 * end: busted/wasted panel over a police surround (any other name: start).
 */
export function stageShot(name, world) {
  world.reset();
  resetAutopilot();
  const state = world.state;
  if (name !== 'play' && name !== 'chase' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { x: 0, y: 0 });
    }
    return { screen: SCREEN_TITLE, info: { hasSave: false } };
  }
  // Get into a car first: walk to the nearest parked car, then enter it.
  for (let i = 0; i < 8 / STEP; i += 1) {
    if (state.player.onFoot) {
      // Walk toward the nearest parked car (stationary, road-aligned).
      let best = null;
      let bestD = Infinity;
      for (const car of state.cars) {
        if (car.kind !== 'parked') continue;
        const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
        if (d < bestD) { best = car; bestD = d; }
      }
      if (best && bestD < 60) {
        world.step(STEP, { x: 0, y: 0, enter: true });
        break;
      }
      const want = best ? Math.atan2(best.y - state.player.y, best.x - state.player.x) : 0;
      world.step(STEP, { x: Math.cos(want), y: Math.sin(want), run: true });
    } else break;
  }
  if (state.player.onFoot) {
    // Fallback: put Rico in the nearest car directly (still a real state).
    world.enterNearestCar();
  }
  if (name === 'play') {
    world.addWanted(1);
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      world.step(STEP, autopilot(state));
      if (state.over) break;
    }
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, info: { hasSave: false } };
  }
  if (name === 'chase') {
    // Get moving on the road first, then bring the heat: the frame
    // catches the pursuit mid-chase instead of a pile-up.
    for (let i = 0; i < 6 / STEP; i += 1) {
      world.step(STEP, autopilot(state));
      if (state.over) break;
    }
    world.addWanted(4);
    for (let i = 0; i < CHASE_SECONDS / STEP; i += 1) {
      world.step(STEP, autopilot(state));
      if (state.over) break;
    }
    // Make sure police are visibly close for the shot.
    if (state.policeCars.length === 0) world.spawnPoliceCar();
    return { screen: SCREEN_PLAY, info: { hasSave: false } };
  }
  // end: high heat, low health, police closing in until busted/wasted.
  world.addWanted(5);
  state.health = 28;
  for (let i = 0; i < END_SECONDS / STEP; i += 1) {
    world.step(STEP, autopilot(state));
    if (state.over) break;
  }
  if (!state.over) {
    state.over = true;
    state.overReason = 'busted';
  }
  return { screen: SCREEN_OVER, info: { hasSave: false } };
}
