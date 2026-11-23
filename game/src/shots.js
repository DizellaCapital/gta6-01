// Screenshot staging. Each scene runs the REAL simulation forward from a
// fresh world with a simple autopilot (steer toward the mission target along
// the road grid, get into a car first when on foot) — never a faked frame.
// Deterministic: the same seed always gives the same frame.
import { CFG } from './config.js';
import { stepWorld } from './world.js';
import { missionTarget } from './missions.js';
import { nearestRoadX, nearestRoadY } from './city.js';

function makeAutoInput() {
  return {
    down: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
    centerX: 640,
    centerY: 360,
    is(code) { return this.down.has(code); },
    wasPressed(code) { return this.pressed.has(code); },
    set(keys, press) {
      this.down = new Set(keys);
      this.pressed = new Set(press || []);
    },
    clear() {
      this.down.clear();
      this.pressed.clear();
    },
  };
}

function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// Drive / walk toward a target point. Returns {keys, press} for one step.
function autopilot(world, target, state) {
  const p = world.player;
  const keys = [];
  const press = [];
  if (p.inHeli) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    if (dy < -30) keys.push('KeyW');
    if (dy > 30) keys.push('KeyS');
    if (dx < -30) keys.push('KeyA');
    if (dx > 30) keys.push('KeyD');
    return { keys, press };
  }
  if (p.onFoot) {
    // Walk to the nearest car, then get in.
    let best = null;
    let bestD = Infinity;
    for (const car of world.cars) {
      if (car.kind === 'police') continue;
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    if (best && bestD < 46) {
      press.push('KeyE');
      return { keys, press };
    }
    const tx = best ? best.x : target.x;
    const ty = best ? best.y : target.y;
    const dx = tx - p.x;
    const dy = ty - p.y;
    if (dy < -12) keys.push('KeyW');
    if (dy > 12) keys.push('KeyS');
    if (dx < -12) keys.push('KeyA');
    if (dx > 12) keys.push('KeyD');
    return { keys, press };
  }
  // In a car: follow the road grid toward the target.
  const car = p.car;
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  if (Math.abs(dx) < 50 && Math.abs(dy) < 50) return { keys, press };
  const nx = nearestRoadX(world.city, car.x);
  const ny = nearestRoadY(world.city, car.y);
  const onH = ny.dist <= CFG.ROAD_W / 2 + 6;
  const onV = nx.dist <= CFG.ROAD_W / 2 + 6;
  let desired;
  if (onH && !onV) {
    desired = Math.abs(dx) > 50 ? (dx > 0 ? 0 : Math.PI) : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  } else if (onV && !onH) {
    desired = Math.abs(dy) > 50 ? (dy > 0 ? Math.PI / 2 : -Math.PI / 2) : (dx > 0 ? 0 : Math.PI);
  } else if (onH && onV) {
    desired = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 0 : Math.PI)
      : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  } else {
    // Off the grid (mid-turn): steer back to the nearest road point.
    const spot = { x: nx.value, y: ny.value };
    desired = Math.atan2(spot.y - car.y, spot.x - car.x);
  }
  const diff = wrapAngle(desired - car.angle);
  // Stuck detection: barely moving while trying to drive.
  const moved = Math.hypot(car.x - state.lastX, car.y - state.lastY);
  if (moved < 2) {
    state.stuck += CFG.DT;
  } else {
    state.stuck = 0;
  }
  state.lastX = car.x;
  state.lastY = car.y;
  if (state.stuck > 1.2 && state.reverse < 0.9) {
    state.reverse += CFG.DT;
    keys.push('KeyS');
    return { keys, press };
  }
  state.reverse = 0;
  if (Math.abs(diff) > 0.25) keys.push(diff > 0 ? 'KeyD' : 'KeyA');
  if (Math.abs(diff) < 1.0 && Math.abs(car.speed) < 170) keys.push('KeyW');
  if (Math.abs(diff) > 1.4) keys.push('KeyS');
  return { keys, press };
}

function runSim(world, seconds, targetFn) {
  const input = makeAutoInput();
  const state = { lastX: world.player.x, lastY: world.player.y, stuck: 0, reverse: 0 };
  const steps = Math.round(seconds / CFG.DT);
  for (let i = 0; i < steps; i += 1) {
    const target = targetFn ? targetFn(world) : null;
    if (target) {
      const { keys, press } = autopilot(world, target, state);
      input.set(keys, press);
    } else {
      input.clear();
    }
    stepWorld(world, input, CFG.DT);
    input.clear();
  }
}

function missionTargetFn(world) {
  return () => {
    const t = missionTarget(world.missions, world.missionState);
    return t ? { x: t.x, y: t.y } : { x: world.player.x, y: world.player.y };
  };
}

export function stageScene(world, scene) {
  if (scene === 'start') {
    world.screen = 'title';
    runSim(world, 9, null);
    return;
  }
  if (scene === 'play') {
    world.screen = 'play';
    world.player.wanted = 1;
    world.player.crimeTimer = 60;
    world.showDialog('Mara Voss', world.missions[0].intro, 8);
    runSim(world, 12, missionTargetFn(world));
    return;
  }
  if (scene === 'chase') {
    world.screen = 'play';
    world.player.wanted = 4;
    world.player.crimeTimer = 120;
    world.showDialog('Mara Voss', world.missions[0].intro, 8);
    runSim(world, 9, missionTargetFn(world));
    // Make sure the money shot has everything in frame: heat stays at 4,
    // and the roadblock is re-placed ahead of the player right now (the one
    // from the start of the chase is long behind by now).
    world.player.wanted = 4;
    const p = world.player;
    const aheadX = p.x + Math.cos(p.angle) * 250;
    const aheadY = p.y + Math.sin(p.angle) * 250;
    const nx = nearestRoadX(world.city, aheadX);
    const ny = nearestRoadY(world.city, aheadY);
    const horizontal = Math.abs(Math.cos(p.angle)) > Math.abs(Math.sin(p.angle));
    const bx = horizontal ? aheadX : nx.value;
    const by = horizontal ? ny.value : aheadY;
    world.police.roadblocks = [];
    for (let i = -1; i <= 1; i += 1) {
      world.police.roadblocks.push({
        kind: 'roadblock',
        x: horizontal ? bx : bx + i * 30,
        y: horizontal ? by + i * 30 : by,
        angle: horizontal ? Math.PI / 2 : 0,
        speed: 0,
        color: CFG.PALETTE.police,
        w: 34,
        h: 17,
      });
    }
    return;
  }
  if (scene === 'end') {
    world.screen = 'play';
    world.player.wanted = 5;
    world.player.crimeTimer = 120;
    runSim(world, 4, () => ({ x: world.player.x, y: world.player.y }));
    // Freeze the bust: police ring around Rico, panel on top.
    world.screen = 'end';
    world.endReason = 'busted';
    world.player.wanted = 5;
    const p = world.player;
    world.police.units.length = 0;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      world.police.units.push({
        kind: 'police',
        name: `SBPD-${11 + i}`,
        role: i === 0 ? 'Closing In' : 'Intercept',
        x: p.x + Math.cos(a) * 78,
        y: p.y + Math.sin(a) * 78,
        angle: Math.atan2(p.y - (p.y + Math.sin(a) * 78), p.x - (p.x + Math.cos(a) * 78)),
        speed: 0,
        topSpeed: 330,
        color: CFG.PALETTE.police,
        condition: 100,
        owned: false,
        driver: false,
        w: 34,
        h: 17,
        dist: 8,
      });
    }
    return;
  }
  // Unknown scene name: just render the title.
  world.screen = 'title';
}
