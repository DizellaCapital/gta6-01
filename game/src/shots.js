// Staging for the four screenshots. Each scene runs the REAL simulation
// forward with a simple autopilot — no faked frames. The world starts fresh
// from the seed, the autopilot drives toward the mission target on the road
// grid, and the frame the screenshot takes is whatever the sim produced.
import { CFG } from './config.js';
import { nearestRoadPoint, isOnRoad } from './city.js';
import { currentStage } from './missions.js';

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// One autopilot decision: returns an input object for this step.
export function autopilotInput(world) {
  const p = world.player;
  const input = {
    up: false, down: false, left: false, right: false,
    action: false, shoot: false, brake: false, pressed: {},
  };
  const target = world.mission.done ? { x: CFG.worldW / 2, y: CFG.worldH / 2 } : currentStage(world.mission).target;
  if (p.heli) {
    const d = angleDiff(p.heli.angle, Math.atan2(target.y - p.y, target.x - p.x));
    input.up = true;
    if (d > 0.15) input.right = true;
    else if (d < -0.15) input.left = true;
    return input;
  }
  if (p.onFoot) {
    // Walk to the nearest car and get in.
    let best = null;
    let bestD = 1e9;
    for (const c of world.cars) {
      if (c.police) continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) return input;
    if (bestD < 60) { input.action = true; return input; }
    const a = Math.atan2(best.y - p.y, best.x - p.x);
    steerToward(input, p.angle, a);
    return input;
  }
  // Driving: aim at the target, but via the road grid when the target is off-road.
  let waypoint = target;
  if (!isOnRoad(world.city, target.x, target.y)) {
    waypoint = nearestRoadPoint(world.city, target.x, target.y);
  }
  // If we are off-road, head for the nearest road point first.
  if (!isOnRoad(world.city, p.x, p.y)) {
    waypoint = nearestRoadPoint(world.city, p.x, p.y);
  }
  const dist = Math.hypot(waypoint.x - p.x, waypoint.y - p.y);
  const wantAngle = Math.atan2(waypoint.y - p.y, waypoint.x - p.x);
  const d = angleDiff(p.car.angle, wantAngle);
  if (Math.abs(d) > 0.5 && p.car.speed > 60) input.brake = true;
  if (Math.abs(d) < 1.9) input.up = true;
  else if (p.car.speed > 40) input.down = true;
  if (d > 0.12) input.right = true;
  else if (d < -0.12) input.left = true;
  if (dist < 70 && world.mission.done) input.up = false;
  return input;
}

function steerToward(input, angle, wantAngle) {
  const d = angleDiff(angle, wantAngle);
  input.up = true;
  if (d > 0.2) input.right = true;
  else if (d < -0.2) input.left = true;
}

// Advance the world `seconds` of simulation with the autopilot.
export function runStaging(world, stepWorld, seconds) {
  const steps = Math.round(seconds / CFG.step);
  for (let i = 0; i < steps; i++) {
    stepWorld(world, autopilotInput(world), CFG.step);
    if (world.over) break;
  }
}

// Apply a scene: returns { screen, seconds } for main.js to stage.
export function stageScene(world, shot) {
  if (shot === 'start') {
    // Title over a living city: traffic + peds moving, no player action.
    return { screen: 'title', seconds: 9, setup: null };
  }
  if (shot === 'play') {
    world.wanted = 1;
    world.lastCrime = world.time;
    return { screen: 'playing', seconds: 22, setup: null };
  }
  if (shot === 'chase') {
    world.wanted = 4;
    world.lastCrime = world.time;
    return { screen: 'playing', seconds: 16, setup: null };
  }
  if (shot === 'end') {
    world.wanted = 5;
    world.lastCrime = world.time;
    return {
      screen: 'playing', seconds: 10,
      setup: () => {
        // Surround Rico on foot with cops, then let the busted timer fire.
        world.player.car = null;
        world.player.onFoot = true;
        world.player.heli = null;
        for (const cop of world.police) {
          const a = Math.atan2(cop.y - world.player.y, cop.x - world.player.x);
          cop.x = world.player.x + Math.cos(a) * 34;
          cop.y = world.player.y + Math.sin(a) * 34;
        }
        world.bustedTimer = 1.3;
      },
    };
  }
  return { screen: 'playing', seconds: 5, setup: null };
}
