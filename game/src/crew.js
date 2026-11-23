// The crew: three specialists Rico can call on with keys 1, 2 and 3.
// Each ability has a cooldown, shown on the crew card in the HUD.

export const CREW = [
  {
    name: 'Dex',
    role: 'Getaway Driver',
    ability: 'Turbo Boost',
    desc: 'Instant burst of speed + full car repair',
    cooldown: 25,
  },
  {
    name: 'Lena',
    role: 'Hacker',
    ability: 'Ghost Signal',
    desc: 'Drops wanted level by 2 stars',
    cooldown: 40,
  },
  {
    name: 'Marco',
    role: 'Muscle',
    ability: 'Bodyguard',
    desc: 'Restores armor and scares off nearby cops',
    cooldown: 35,
  },
];

export function createCrew() {
  return CREW.map((m) => ({ ...m, readyIn: 0 }));
}

export function stepCrew(crew, dt) {
  for (const m of crew) {
    if (m.readyIn > 0) m.readyIn -= dt;
  }
}

export function callCrew(world, index) {
  const m = world.crew[index];
  if (!m) return false;
  if (m.readyIn > 0) {
    world.message = `${m.name} is not ready yet (${Math.ceil(m.readyIn)}s)`;
    return false;
  }
  m.readyIn = m.cooldown;
  const p = world.player;
  if (index === 0) {
    if (p.car) {
      p.car.cond = 100;
      p.car.speed = Math.min(p.car.speed + 220, 560);
    }
    world.message = 'Dex: Turbo boost! Car repaired, hold on!';
  } else if (index === 1) {
    world.wanted = Math.max(0, world.wanted - 2);
    world.wantedHeat = 0;
    world.message = 'Lena: Ghost signal sent — SBPD lost your trail.';
  } else {
    p.armor = 50;
    for (const car of world.cars) {
      if (car.kind !== 'police') continue;
      const dx = car.x - p.x;
      const dy = car.y - p.y;
      if (dx * dx + dy * dy < 500 * 500) car.flee = 3;
    }
    world.message = 'Marco: Armor restored. Cops backing off.';
  }
  return true;
}
