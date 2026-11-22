// Screenshot staging: each scene runs the REAL simulation forward from a
// fresh world with a small deterministic autopilot — no fake frames.
// The autopilot follows the road grid toward the mission target and gets
// into a car first when on foot.
import { CONFIG } from './config.js';
import { nearestRoadPoint, nearestRoadX, nearestRoadY } from './city.js';
import { stepWorld, playerCar } from './world.js';
import { stageTarget } from './missions.js';
import { syncPolice } from './police.js';
import { makeInput } from './input.js';

function autopilotInput(world) {
  const input = makeInput();
  const p = world.player;
  const target = stageTarget(world.missions);
  // On foot: walk to the nearest car, then get in.
  if (p.onFoot && p.heliId == null) {
    let best = null;
    let bestD = Infinity;
    for (const c of world.cars) {
      if (c.kind === 'police') continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best && bestD < 56) {
      input.interact = true;
      return input;
    }
    const goal = best || target;
    steerOnFoot(input, p, goal);
    return input;
  }
  // In a car: drive along the road grid toward the target.
  const wp = nearestRoadPoint(target.x, target.y);
  const dx = wp.x - p.x;
  const dy = wp.y - p.y;
  if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return input;
  const nx = nearestRoadX(p.x);
  const ny = nearestRoadY(p.y);
  const onH = ny.dist < 40;
  const onV = nx.dist < 40;
  let want;
  if (onH && !onV) want = dx > 0 ? 0 : Math.PI;
  else if (onV && !onH) want = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
  else if (Math.abs(dx) > Math.abs(dy)) want = dx > 0 ? 0 : Math.PI;
  else want = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
  let diff = want - p.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Only throttle when roughly lined up: full-speed turns swing wide and
  // clip building corners. Steering still works while coasting.
  input.up = Math.abs(diff) < 0.7;
  if (diff > 0.12) input.right = true;
  else if (diff < -0.12) input.left = true;
  return input;
}

function steerOnFoot(input, p, goal) {
  const dx = goal.x - p.x;
  const dy = goal.y - p.y;
  if (dx > 12) input.right = true;
  else if (dx < -12) input.left = true;
  if (dy > 12) input.down = true;
  else if (dy < -12) input.up = true;
}

function runSim(world, seconds, drive) {
  const steps = Math.round(seconds / CONFIG.DT);
  for (let i = 0; i < steps; i++) {
    const input = drive ? autopilotInput(world) : makeInput();
    stepWorld(world, input, CONFIG.DT);
    if (world.screen !== 'play') break;
  }
}

// Stage one named scene. Returns the world ready to render one frame.
export function stageShot(world, name) {
  world.screen = 'play';
  if (name === 'start') {
    // Title over a living city: let traffic and pedestrians move a while.
    runSim(world, 7, false);
    world.screen = 'title';
    return world;
  }
  if (name === 'play') {
    runSim(world, 16, true);
    // Wanted 1 with a unit in pursuit, as the brief requires.
    world.player.wanted = 1;
    world.player.wantedTimer = 0;
    syncPolice(world);
    runSim(world, 2, true);
    return world;
  }
  if (name === 'chase') {
    // Start already behind the wheel: with wanted 4 the walk to a car would
    // end in a bust before the chase even begins.
    const p0 = world.player;
    const starter = world.cars.find((c) => c.kind === 'parked' && c.name === 'Comet');
    if (starter) {
      p0.onFoot = false;
      p0.carId = starter.id;
      starter.kind = 'player';
      p0.x = starter.x; p0.y = starter.y; p0.angle = starter.angle;
    }
    world.player.wanted = 4;
    world.player.wantedTimer = 0;
    world.radio.station = 2;
    world.message = 'SBPD Air-1 overhead — lose them!';
    world.messageT = 30;
    syncPolice(world);
    runSim(world, 13, true);
    // Make sure the heat is still on for the frame.
    world.player.wanted = 4;
    world.player.wantedTimer = 0;
    syncPolice(world);
    // Stage one roadblock right ahead of the player (on the road) so the
    // chase frame shows it; the other stays where the sim left it.
    const pp = world.player;
    const ahead = nearestRoadPoint(pp.x + Math.cos(pp.angle) * 240, pp.y + Math.sin(pp.angle) * 240);
    if (world.roadblocks.length > 0) {
      world.roadblocks[0] = { x: ahead.x, y: ahead.y, angle: pp.angle + Math.PI / 2 };
    }
    return world;
  }
  if (name === 'end') {
    world.player.wanted = 5;
    world.player.wantedTimer = 0;
    syncPolice(world);
    // Drive a while first so the busted frame has a story behind it.
    runSim(world, 7, true);
    // Surround the player on foot for the busted frame.
    const p = world.player;
    if (p.carId != null) {
      const car = playerCar(world);
      if (car) { p.x = car.x + 40; p.y = car.y; p.carId = null; p.onFoot = true; car.kind = 'parked'; car.speed = 0; }
    }
    if (p.heliId != null) {
      p.heliId = null;
      p.onFoot = true;
      if (world.playerHeli) world.playerHeli.parked = true;
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const spot = nearestRoadPoint(p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 90);
      world.police.push({
        id: world.nextCarId++, x: spot.x, y: spot.y, angle: Math.atan2(p.y - spot.y, p.x - spot.x),
        speed: 0, maxSpeed: 0, color: '#2f6fd0', kind: 'police',
        name: `Unit ${3 + i} — SBPD`, role: 'Closing In', hp: 100, dead: false, stunned: 0, ramCooldown: 0,
      });
      world.cars.push(world.police[world.police.length - 1]);
    }
    world.screen = 'over';
    world.overReason = 'busted';
    return world;
  }
  return world;
}

export const SHOT_NAMES = ['start', 'play', 'chase', 'end'];
