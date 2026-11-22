// Rico's three-person crew. Each member has one ability on a cooldown,
// called with keys 1 / 2 / 3.
export const CREW = [
  { name: 'Jax', role: 'Driver', ability: 'Getaway Car', desc: 'Brings a fast car to you', cooldown: 45 },
  { name: 'Lena', role: 'Hacker', ability: 'Ghost Signal', desc: 'Drops one wanted star', cooldown: 60 },
  { name: 'Marco', role: 'Muscle', ability: 'Clear The Street', desc: 'Scares off nearby cops', cooldown: 75 },
];

export function createCrewState() {
  return { readyAt: [0, 0, 0] };
}

export function crewReadyAt(state, i, now) {
  return state.readyAt[i] <= now;
}

export function crewCooldownLeft(state, i, now) {
  return Math.max(0, state.readyAt[i] - now);
}

// Runs the ability; returns a message line, or null when still cooling down.
export function callCrew(world, state, i) {
  if (!crewReadyAt(state, i, world.time)) return null;
  state.readyAt[i] = world.time + CREW[i].cooldown;
  if (i === 0) {
    // Jax delivers a tuned car right next to Rico.
    const a = world.player.angle + Math.PI / 2;
    const car = spawnCrewCar(world, world.player.x + Math.cos(a) * 90, world.player.y + Math.sin(a) * 90);
    world.message = `Jax: getaway car parked beside you.`;
    return car;
  }
  if (i === 1) {
    world.wanted = Math.max(0, world.wanted - 1);
    world.message = `Lena: cameras looped, one star down.`;
    return true;
  }
  // Marco clears the street.
  let cleared = 0;
  for (const p of world.police) {
    const d = Math.hypot(p.x - world.player.x, p.y - world.player.y);
    if (d < 700) { p.flee = true; cleared++; }
  }
  world.message = `Marco: ${cleared} cop${cleared === 1 ? '' : 's'} backing off.`;
  return cleared;
}

import { makeCar } from './world.js';

function spawnCrewCar(world, x, y) {
  const car = makeCar(world, x, y, '#e8b73a', false);
  car.tuned = true;
  car.name = 'Comet GT';
  car.health = 100;
  world.cars.push(car);
  return car;
}
