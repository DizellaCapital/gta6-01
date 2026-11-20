// Rico's crew. Three original characters, each with one ability on a
// cooldown, triggered with keys 1/2/3. The HUD crew card shows who is
// ready; the world applies the effect.
export const CREW = [
  {
    id: 'tito', name: 'Tito Reyes', role: 'Wheelman',
    ability: 'Clean Plates', key: '1',
    desc: 'Swaps the plates — wanted drops 2 stars',
    cooldown: 45,
  },
  {
    id: 'lena', name: 'Lena Park', role: 'Mechanic',
    ability: 'Field Repair', key: '2',
    desc: 'Patches the ride — car condition +50',
    cooldown: 40,
  },
  {
    id: 'mara', name: 'Mara Voss', role: 'Lookout',
    ability: 'Lookout', key: '3',
    desc: 'Eyes on the street — roadblocks marked 15s',
    cooldown: 50,
  },
];

export function createCrew() {
  return {
    members: CREW.map((c) => ({ ...c, cd: 0 })),
    lookoutTimer: 0,
  };
}

export function crewReady(crew, id) {
  const m = crew.members.find((x) => x.id === id);
  return m ? m.cd <= 0 : false;
}

export function crewUse(crew, id) {
  const m = crew.members.find((x) => x.id === id);
  if (!m || m.cd > 0) return null;
  m.cd = m.cooldown;
  if (id === 'mara') crew.lookoutTimer = 15;
  return m;
}

export function tickCrew(crew, dt) {
  for (const m of crew.members) m.cd = Math.max(0, m.cd - dt);
  crew.lookoutTimer = Math.max(0, crew.lookoutTimer - dt);
}
