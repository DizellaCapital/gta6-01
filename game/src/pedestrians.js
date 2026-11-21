// Solmar Bay — pedestrians. People stroll the sidewalks beside the roads,
// pause, and turn at corners. They keep the city feeling alive.
import { CONFIG } from './config.js';
import { makeRng, pick, range } from './random.js';

export function spawnPedestrians(state, count) {
  const rng = makeRng(state.seed + 131);
  state.peds = [];
  for (let i = 0; i < count; i++) {
    const horizontal = rng() < 0.5;
    const road = horizontal
      ? pick(rng, state.city.roadsY)
      : pick(rng, state.city.roadsX);
    const along = range(rng, 80, (horizontal ? CONFIG.worldWidth : CONFIG.worldHeight) - 80);
    state.peds.push({
      id: 'p' + i,
      horizontal,
      road,
      along,
      dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, CONFIG.pedSpeed * 0.6, CONFIG.pedSpeed * 1.3),
      color: pick(rng, CONFIG.palette.pedColors),
      pause: 0,
      x: horizontal ? along : road + 44,
      y: horizontal ? road + 44 : along,
      angle: 0,
    });
  }
}

export function updatePedestrians(state, dt) {
  for (const ped of state.peds) {
    if (ped.pause > 0) { ped.pause -= dt; continue; }
    ped.along += ped.dir * ped.speed * dt;
    const limit = ped.horizontal ? CONFIG.worldWidth : CONFIG.worldHeight;
    if (ped.along < 70) { ped.along = 70; ped.dir = 1; }
    if (ped.along > limit - 70) { ped.along = limit - 70; ped.dir = -1; }
    if (state.rng() < 0.0015) ped.pause = range(state.rng, 1, 4);
    if (state.rng() < 0.002) ped.dir *= -1;
    if (ped.horizontal) { ped.x = ped.along; ped.y = ped.road + 44; ped.angle = ped.dir > 0 ? 0 : Math.PI; }
    else { ped.x = ped.road + 44; ped.y = ped.along; ped.angle = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  }
}
