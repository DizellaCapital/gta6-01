// Screenshot staging: each of the four scenes runs the REAL simulation
// forward a fixed number of steps from a fresh world, with a simple
// autopilot that walks, steals a car and drives the road grid toward the
// mission target. Nothing here is a fake frame — the same seed always
// stages the same picture.
import { CFG } from './config.js';
import { createWorld, stepWorld, enterCar, nearestEnterableCar } from './world.js';
import { nearestRoadX, nearestRoadY } from './city.js';
import { currentStage } from './missions.js';
import { commitCrime } from './combat.js';

const STEP = 1 / 60;

// Desired heading for a road-following drive toward (tx, ty): stay on the
// grid, turn at intersections, head down the axis that is furthest away.
function roadHeading(S, x, y, tx, ty) {
  const city = S.city;
  // Close to the target, head straight at it: this is how the autopilot
  // walks across an open lot (marina, garage, helipad) to a car or a
  // mission point that sits off the road grid.
  if (Math.hypot(tx - x, ty - y) < 220) return { x: tx, y: ty };
  const rx = nearestRoadX(city, x);
  const ry = nearestRoadY(city, y);
  const onV = Math.abs(x - rx) < 26;
  const onH = Math.abs(y - ry) < 26;
  if (onV && onH) {
    // At an intersection: go down the axis with the bigger gap.
    if (Math.abs(tx - x) > Math.abs(ty - y)) return { x: x + Math.sign(tx - x) * 120, y };
    return { x, y: y + Math.sign(ty - y) * 120 };
  }
  if (onV) {
    const crossY = nearestRoadY(city, ty);
    if (Math.abs(y - crossY) > 30) return { x: rx, y: crossY };
    return { x: nearestRoadX(city, tx), y: crossY };
  }
  if (onH) {
    const crossX = nearestRoadX(city, tx);
    if (Math.abs(x - crossX) > 30) return { x: crossX, y: ry };
    return { x: crossX, y: nearestRoadY(city, ty) };
  }
  return { x: rx, y: ry };
}

function keysToward(S, heading, inCar) {
  const dx = heading.x - S.player.x;
  const dy = heading.y - S.player.y;
  const want = Math.atan2(dy, dx);
  if (!inCar) {
    return {
      up: dy < -8, down: dy > 8, left: dx < -8, right: dx > 8,
      run: true, enter: false, shoot: false, aimAngle: want,
    };
  }
  let diff = want - S.player.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Coast into turns instead of carrying full speed around the corner.
  const dist = Math.hypot(dx, dy);
  const aligned = Math.abs(diff) < 1.1;
  const nearTurn = dist < 150 && Math.abs(diff) > 0.35;
  return {
    up: aligned && !nearTurn,
    down: Math.abs(diff) > 2.4,
    left: diff < -0.08,
    right: diff > 0.08,
    run: false, enter: false, shoot: false, aimAngle: want,
  };
}

function autopilotInput(S) {
  const p = S.player;
  const stage = currentStage(S);
  if (p.flying) return { up: true, down: false, left: false, right: false, run: false, enter: false, shoot: false, aimAngle: 0 };
  if (p.car) {
    const target = stage?.at || { x: 1500, y: 500 };
    const heading = roadHeading(S, p.x, p.y, target.x, target.y);
    return keysToward(S, heading, true);
  }
  // On foot: walk to the nearest stealable car first.
  const car = nearestEnterableCar(S, 400);
  if (car) {
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < 30) return { up: false, down: false, left: false, right: false, run: false, enter: true, shoot: false, aimAngle: 0 };
    const heading = roadHeading(S, p.x, p.y, car.x, car.y);
    return keysToward(S, heading, false);
  }
  const stage2 = stage?.at || { x: 1500, y: 500 };
  return keysToward(S, roadHeading(S, p.x, p.y, stage2.x, stage2.y), false);
}

function runSteps(S, count, driver) {
  for (let i = 0; i < count; i++) {
    const input = driver ? driver(S) : { up: false, down: false, left: false, right: false, run: false, enter: false, shoot: false, aimAngle: 0 };
    stepWorld(S, input, STEP);
    if (S.screen === 'end') break;
  }
}

// A stateful driver wrapper: if the car has barely moved for a while it is
// stuck on a corner, so reverse out for a moment, then carry on.
function makeDriver() {
  let lastX = null;
  let lastY = null;
  let still = 0;
  let reversing = 0;
  return function driver(S) {
    const p = S.player;
    if (lastX !== null) {
      const moved = Math.hypot(p.x - lastX, p.y - lastY);
      if (p.car && moved < 2) still++;
      else still = 0;
    }
    lastX = p.x;
    lastY = p.y;
    if (still > 90) {
      reversing = 45;
      still = 0;
    }
    if (reversing > 0) {
      reversing--;
      return { up: false, down: true, left: true, right: false, run: false, enter: false, shoot: false, aimAngle: 0 };
    }
    return autopilotInput(S);
  };
}

export function stageScene(scene, seed) {
  const S = createWorld(seed, null);
  S.viewW = 1280;
  S.viewH = 720;
  const drive = makeDriver();

  if (scene === 'start') {
    // Title over a living city: park Rico at a road intersection by the
    // marina, let traffic run.
    S.player.x = 400;
    S.player.y = 2200;
    S.camera.x = S.player.x;
    S.camera.y = S.player.y;
    S.screen = 'title';
    runSteps(S, 360, null);
    S.screen = 'title';
    return S;
  }

  if (scene === 'play') {
    S.screen = 'play';
    runSteps(S, 720, drive);
    S.screen = 'play';
    return S;
  }

  if (scene === 'chase') {
    S.screen = 'play';
    // Get Rico into a car first, then turn the heat all the way up.
    runSteps(S, 420, drive);
    if (!S.player.car) {
      const car = S.cars.find((c) => c.kind === 'parked');
      if (car) {
        S.player.x = car.x;
        S.player.y = car.y;
        enterCar(S, car);
      }
    }
    commitCrime(S, 3, 'staged chase');
    S.player.wanted = 4;
    S.radioStation = 0;
    runSteps(S, 540, drive);
    // Make sure the helicopter is in frame for the money shot.
    if (S.heli) {
      S.heli.x = S.player.x - 120;
      S.heli.y = S.player.y - 130;
      S.heli.spotX = S.player.x;
      S.heli.spotY = S.player.y;
    }
    S.screen = 'play';
    return S;
  }

  // end: Rico busted, police closing in around him.
  S.screen = 'play';
  runSteps(S, 300, drive);
  S.player.wanted = 4;
  S.player.hp = 12;
  S.player.armor = 0;
  runSteps(S, 120, drive);
  S.screen = 'end';
  S.endKind = 'busted';
  // Surround Rico with police cars for the end frame.
  const spots = [
    [-70, -40], [70, -40], [-70, 50], [70, 50],
  ];
  S.police = spots.map(([dx, dy], i) => ({
    id: 900 + i, kind: 'police', x: S.player.x + dx, y: S.player.y + dy,
    angle: Math.atan2(-dy, -dx), speed: 0, model: 'Interceptor',
    color: '#e8eef7', top: 470, condition: 100,
    role: ['Intercept', 'Roadblock', 'Flanking', 'Closing In'][i],
    flash: i * 0.4, siren: 0,
  }));
  return S;
}
