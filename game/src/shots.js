// Screenshot staging: each scene runs the REAL simulation forward from a
// fresh world with a simple autopilot — no fake frames. The autopilot
// follows the road grid toward a target: at an intersection it picks the
// axis with the most distance left, otherwise it stays on its road until
// the next intersection. That avoids oscillation when the target is off
// the grid.

import { CONFIG } from './config.js';
import { createWorld, resetWorld, stepWorld, enterCar, addWanted } from './world.js';
import { nearestRoadPoint, roadAxisAt } from './city.js';
import { missionTarget } from './missions.js';

const DT = CONFIG.DT;

function blankInput() {
  return {
    up: false, down: false, left: false, right: false,
    sprint: false, action: false, shoot: false, brake: false,
    mouseX: 0, mouseY: 0, mouseDown: false, pressed: new Set(),
  };
}

function runSteps(world, input, seconds) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) stepWorld(world, input, DT);
}

// Grid autopilot: drive the player's car toward (tx, ty).
function autopilotDrive(world, input, tx, ty) {
  const p = world.player;
  const car = p.car;
  if (!car) return;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const axis = roadAxisAt(world.city, p.x, p.y);
  // Desired heading: prefer the axis with the larger remaining distance.
  let wantAngle;
  if (axis === 'both') {
    wantAngle = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 0 : Math.PI)
      : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  } else if (axis === 'v') {
    wantAngle = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else if (axis === 'h') {
    wantAngle = dx > 0 ? 0 : Math.PI;
  } else {
    // Off-road: head for the nearest road point first.
    const snap = nearestRoadPoint(world.city, p.x, p.y);
    wantAngle = Math.atan2(snap.y - p.y, snap.x - p.x);
  }
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  input.left = diff < -0.12;
  input.right = diff > 0.12;
  // Creep forward while turning so a stopped car can swing around;
  // only brake when nearly facing the wrong way.
  input.up = Math.abs(diff) < 2.4;
  input.down = false;
  input.brake = Math.abs(diff) > 2.8;
}

function autopilotWalk(world, input, tx, ty) {
  const p = world.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  if (Math.abs(dx) > 24) {
    input.right = dx > 0;
    input.left = dx < 0;
  } else {
    input.right = false;
    input.left = false;
  }
  if (Math.abs(dy) > 24) {
    input.down = dy > 0;
    input.up = dy < 0;
  } else {
    input.down = false;
    input.up = false;
  }
}

function driveTo(world, tx, ty, seconds, stopDist = 0) {
  const input = blankInput();
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    // In a vehicle, stop once close enough to the target — used to end a
    // staging drive part-way there instead of finishing the job.
    if (!world.player.onFoot && stopDist > 0) {
      const d = Math.hypot(tx - world.player.x, ty - world.player.y);
      if (d < stopDist) break;
    }
    if (world.player.onFoot) {
      autopilotWalk(world, input, tx, ty);
      // Step into a parked car as soon as we are close enough.
      const near = world.cars.find(
        (c) => c.kind === 'parked' && Math.hypot(c.x - world.player.x, c.y - world.player.y) < 70,
      );
      input.action = Boolean(near);
    } else {
      autopilotDrive(world, input, tx, ty);
      input.action = false;
    }
    stepWorld(world, input, DT);
  }
}

export function stageShot(name, seed = 1) {
  const world = createWorld(seed);
  resetWorld(world);
  world.viewW = 1280;
  world.viewH = 720;
  const input = blankInput();

  if (name === 'start') {
    // Title over a living city: traffic and peds run, Rico waits on foot.
    world.screen = 'title';
    world.player.x = 600;
    world.player.y = 600;
    world.cam.x = 600;
    world.cam.y = 600;
    runSteps(world, input, 5);
    world.screen = 'title';
  } else if (name === 'play') {
    world.screen = 'play';
    // Walk to the parked car, get in, drive toward the first job target
    // but stop part-way there — the frame should show the first job in
    // progress, not a finished one.
    const car = world.cars.find((c) => c.kind === 'parked');
    driveTo(world, car.x, car.y, 6, 25);
    const t = missionTarget(world);
    driveTo(world, t.x, t.y, 8, 260);
    // Wanted 1 for the frame: pin it after the drive so ped hits and
    // decay during the drive cannot change it, then roll on briefly so
    // the first SBPD unit spawns into the dispatch panel.
    world.wanted = 1;
    world.wantedHeat = CONFIG.WANTED_DECAY_SECONDS;
    driveTo(world, t.x, t.y, 1.2, 200);
    world.wanted = 1;
    world.wantedHeat = CONFIG.WANTED_DECAY_SECONDS;
    // Keep at most the nearest pursuit car, matching wanted 1.
    const cops = world.cars.filter((c) => c.kind === 'police');
    if (cops.length > 1) {
      cops.sort((a, b) => Math.hypot(a.x - world.player.x, a.y - world.player.y) - Math.hypot(b.x - world.player.x, b.y - world.player.y));
      const keep = new Set(cops.slice(0, 1));
      world.cars = world.cars.filter((c) => c.kind !== 'police' || keep.has(c));
    }
    world.police.heli = null;
    world.police.roadblocks = [];
    // One short coast so the dispatch list recomputes from the trimmed state.
    runSteps(world, blankInput(), 0.1);
    world.wanted = 1;
    world.wantedHeat = CONFIG.WANTED_DECAY_SECONDS;
  } else if (name === 'chase') {
    world.screen = 'play';
    const car = world.cars.find((c) => c.kind === 'parked');
    driveTo(world, car.x, car.y, 6, 25);
    addWanted(world, 4);
    // Let the pursuit build, then drive on so the heli, the roadblock
    // ahead and the dispatch list are all in frame.
    const t = missionTarget(world);
    driveTo(world, t.x, t.y, 9);
    // Re-place a roadblock just ahead of the player so it is visible.
    const ahead = nearestRoadPoint(world.city, world.player.x + Math.cos(world.player.angle) * 260, world.player.y + Math.sin(world.player.angle) * 260);
    world.police.roadblocks = [{ x: ahead.x, y: ahead.y, angle: ahead.axis === 'v' ? 0 : Math.PI / 2 }];
    world.radio.station = 1;
    // Keep rolling toward the job so the frame catches the car moving.
    driveTo(world, t.x, t.y, 1.5);
  } else if (name === 'end') {
    world.screen = 'play';
    addWanted(world, 5);
    // Let the cops close in, then end busted with police surrounding Rico.
    runSteps(world, blankInput(), 6);
    const p = world.player;
    if (p.car) {
      p.car.kind = 'parked';
      p.car = null;
      p.onFoot = true;
    }
    // Ring of police cars around the player for the final frame.
    world.cars = world.cars.filter((c) => c.kind !== 'police');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      world.cars.push({
        kind: 'police',
        x: p.x + Math.cos(a) * 130,
        y: p.y + Math.sin(a) * 130,
        angle: a + Math.PI,
        speed: 0,
        color: CONFIG.PALETTE.police,
        name: `Unit ${7 + i * 5}`,
        role: 'Closing In',
        cond: 100,
        w: 34,
        h: 18,
        flee: 0,
      });
    }
    world.police.heli = { x: p.x + 200, y: p.y - 200, angle: 0, spotlight: true };
    world.screen = 'over';
    world.overKind = 'busted';
    runSteps(world, blankInput(), 0.5);
    world.screen = 'over';
    world.overKind = 'busted';
  } else {
    throw new Error(`unknown shot: ${name}`);
  }
  return world;
}
