// The crew. Three specialists Rico can call on with keys 1-3. Each ability
// has a cooldown, and the HUD shows who is ready and who is recharging.
export function createCrew() {
  return {
    members: [
      {
        name: 'Jax',
        role: 'Mechanic',
        ability: 'Full repair',
        key: 'Digit1',
        cooldown: 40,
        cd: 0,
      },
      {
        name: 'Lena',
        role: 'Hacker',
        ability: 'Drop 1 star',
        key: 'Digit2',
        cooldown: 55,
        cd: 0,
      },
      {
        name: 'Marco',
        role: 'Driver',
        ability: 'Getaway car',
        key: 'Digit3',
        cooldown: 70,
        cd: 0,
      },
    ],
  };
}

export function stepCrew(crew, dt) {
  for (const m of crew.members) {
    if (m.cd > 0) m.cd -= dt;
  }
}

// Apply a crew member's ability. Returns a message for the feed, or null
// when the member is still on cooldown.
export function useCrew(crew, index, world) {
  const m = crew.members[index];
  if (!m || m.cd > 0) return null;
  m.cd = m.cooldown;
  const player = world.player;
  if (m.name === 'Jax') {
    if (player.car) player.car.condition = 100;
    return 'Jax patched the car up — condition 100%.';
  }
  if (m.name === 'Lena') {
    if (player.wanted > 0) player.wanted -= 1;
    return 'Lena spoofed the dispatch — one star down.';
  }
  // Marco: park a fresh getaway car next to the player on the nearest road.
  const spot = world.nearestRoadSpot(player.x, player.y);
  world.cars.push({
    kind: 'parked',
    x: spot.x,
    y: spot.y,
    angle: 0,
    speed: 0,
    topSpeed: 380,
    color: '#e8b13c',
    name: 'Getaway Coupe',
    condition: 100,
    owned: true,
    driver: false,
    w: 34,
    h: 17,
  });
  return 'Marco dropped a getaway car nearby.';
}
