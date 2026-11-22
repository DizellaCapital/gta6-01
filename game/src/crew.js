// Crew: three specialists Rico can call with keys 1/2/3. Each ability has a
// cooldown and a short visible effect.
export const CREW_DEFS = [
  { name: 'LENA', role: 'DRIVER', ability: 'GETAWAY', desc: 'Drops a clean car next to you', cooldown: 45 },
  { name: 'DEX', role: 'HACKER', ability: 'GHOST', desc: 'Wipes 2 wanted stars', cooldown: 60 },
  { name: 'BIG MO', role: 'MUSCLE', ability: 'BACKUP', desc: 'Clears nearby police for 10s', cooldown: 75 },
];

export function makeCrew() {
  return CREW_DEFS.map((d) => ({ ...d, readyIn: 0, active: 0 }));
}

export function callCrew(world, idx) {
  const member = world.crew[idx];
  if (!member) return false;
  if (member.readyIn > 0) {
    world.message = `${member.name} is not ready yet (${Math.ceil(member.readyIn)}s).`;
    return false;
  }
  const p = world.player;
  member.readyIn = member.cooldown;
  if (idx === 0) {
    // Lena delivers a fresh car beside the player.
    const spot = { x: p.x + 90, y: p.y };
    world.cars.push({
      id: world.nextCarId++, x: spot.x, y: spot.y, angle: 0, speed: 0,
      color: '#e8b73a', kind: 'parked', name: 'Comet GT', health: 100, driver: null,
    });
    world.message = 'LENA delivered a Comet GT. Press E to get in.';
  } else if (idx === 1) {
    p.wanted = Math.max(0, p.wanted - 2);
    world.message = 'DEX wiped the cameras. Wanted -2 stars.';
  } else {
    member.active = 10;
    for (const u of world.police) u.stunned = 10;
    world.message = 'BIG MO is holding the cops off. Move!';
  }
  return true;
}

export function tickCrew(world, dt) {
  for (const m of world.crew) {
    if (m.readyIn > 0) m.readyIn = Math.max(0, m.readyIn - dt);
    if (m.active > 0) m.active = Math.max(0, m.active - dt);
  }
}
