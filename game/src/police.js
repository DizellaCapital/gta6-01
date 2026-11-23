// SBPD dispatch. Wanted stars decide how many units chase the player, which
// roles they take, when roadblocks go up and when the police helicopter with
// its spotlight joins. Police cars drive the road grid and pick the turn at
// each crossing that closes the distance to the player.
import { CFG } from './config.js';
import { nearestRoadX, nearestRoadY, randomRoadPoint } from './city.js';
import { districtAt } from './districts.js';

const ROLES = ['Intercept', 'Flanking', 'Closing In', 'Roadblock', 'Spotlight', 'Pursuit', 'Backup'];

export function createPolice() {
  return {
    units: [],
    roadblocks: [],
    heli: null,
    nextId: 11,
    spawnTimer: 0,
  };
}

function unitName(police) {
  const id = police.nextId;
  police.nextId += 1;
  return `SBPD-${id}`;
}

function spawnUnit(police, city, rng, player) {
  const spot = randomRoadPoint(city, rng, player, 420);
  const role = ROLES[police.units.length % ROLES.length];
  police.units.push({
    kind: 'police',
    name: unitName(police),
    role,
    x: spot.x,
    y: spot.y,
    angle: 0,
    speed: 0,
    topSpeed: 330,
    color: CFG.PALETTE.police,
    condition: 100,
    owned: false,
    driver: false,
    w: 34,
    h: 17,
  });
}

function steerToward(unit, tx, ty) {
  const want = Math.atan2(ty - unit.y, tx - unit.x);
  let diff = want - unit.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const step = 3.2 * CFG.DT;
  unit.angle += Math.max(-step, Math.min(step, diff));
}

export function stepPolice(police, city, rng, player, dt, wanted) {
  const wantUnits = Math.min(wanted + 1, 7);
  police.spawnTimer -= dt;
  if (police.units.length < wantUnits && police.spawnTimer <= 0) {
    spawnUnit(police, city, rng, player);
    police.spawnTimer = 1.2;
  }
  // Extra units leave when the heat drops.
  while (police.units.length > wantUnits) police.units.pop();

  for (const unit of police.units) {
    // Chase on the grid: head straight at the player, snapped to roads.
    const nx = nearestRoadX(city, unit.x);
    const ny = nearestRoadY(city, unit.y);
    const onH = ny.dist <= CFG.ROAD_W / 2;
    const onV = nx.dist <= CFG.ROAD_W / 2;
    if (onH && !onV) unit.y = ny.value;
    if (onV && !onH) unit.x = nx.value;
    const dist = Math.hypot(player.x - unit.x, player.y - unit.y);
    if (dist > 46) {
      steerToward(unit, player.x, player.y);
      unit.speed = Math.min(unit.topSpeed, unit.speed + 420 * dt);
    } else {
      // Ramming speed: bump the player, then back off a little.
      unit.speed = Math.max(60, unit.speed - 300 * dt);
    }
    unit.x += Math.cos(unit.angle) * unit.speed * dt;
    unit.y += Math.sin(unit.angle) * unit.speed * dt;
    unit.dist = Math.round(dist / 10);
  }

  // Roadblocks at wanted 3 and up: two stopped cruisers across the road the
  // player is heading down, a few hundred metres ahead.
  if (wanted >= 3) {
    if (police.roadblocks.length === 0) {
      const aheadX = player.x + Math.cos(player.angle) * 320;
      const aheadY = player.y + Math.sin(player.angle) * 320;
      const nx = nearestRoadX(city, aheadX);
      const ny = nearestRoadY(city, aheadY);
      const horizontal = Math.abs(Math.cos(player.angle)) > Math.abs(Math.sin(player.angle));
      const bx = horizontal ? aheadX : nx.value;
      const by = horizontal ? ny.value : aheadY;
      for (let i = -1; i <= 1; i += 1) {
        police.roadblocks.push({
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
    }
  } else {
    police.roadblocks.length = 0;
  }

  // Helicopter with a spotlight at wanted 4 and 5.
  if (wanted >= 4) {
    if (!police.heli) {
      police.heli = { x: player.x - 160, y: player.y - 160, angle: 0, rotor: 0 };
    }
    const heli = police.heli;
    heli.rotor += dt * 22;
    const tx = player.x + Math.cos(heli.angle) * 130;
    const ty = player.y + Math.sin(heli.angle) * 130;
    heli.angle += dt * 0.55;
    heli.x += (tx - heli.x) * Math.min(1, dt * 1.4);
    heli.y += (ty - heli.y) * Math.min(1, dt * 1.4);
  } else {
    police.heli = null;
  }
}

// Rows for the dispatch HUD panel.
export function dispatchRows(police) {
  const rows = police.units.map((u) => ({
    name: u.name,
    role: u.role,
    dist: u.dist || 0,
  }));
  rows.sort((a, b) => a.dist - b.dist);
  return rows;
}

export function districtStandingNote(x, y) {
  const d = districtAt(x, y);
  return d;
}
