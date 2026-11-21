// Solmar Bay — the crew. Three specialists Rico can call with keys 1–3.
// Each ability has a cooldown shown on its card in the HUD.
export const CREW = [
  { name: 'Dex', role: 'Driver', key: '1', cooldown: 60, desc: 'Calls a fast getaway car to you' },
  { name: 'Lena', role: 'Mechanic', key: '2', cooldown: 45, desc: 'Repairs your ride to 100%' },
  { name: 'Ivo', role: 'Lookout', key: '3', cooldown: 90, desc: 'Drops one wanted star' },
];

export function useCrew(state, index) {
  const member = CREW[index];
  if (!member) return null;
  if (state.crewCooldown[index] > 0) return `${member.name} is resting (${Math.ceil(state.crewCooldown[index])}s).`;
  state.crewCooldown[index] = member.cooldown;
  const p = state.player;
  if (index === 0) {
    // Dex delivers a quick car right beside Rico.
    const car = {
      id: 'dex-' + Math.floor(state.time), kind: 'parked', x: p.x + 70, y: p.y + 30,
      angle: 0, speed: 0, color: '#c0392b', name: 'Comet GT', condition: 100, maxSpeed: 480,
    };
    state.parked.push(car);
    return 'Dex: "Comet GT is outside, Rico. Go."';
  }
  if (index === 1) {
    if (p.vehicle) { p.vehicle.condition = 100; return 'Lena: "Good as new. Try not to bend it again."'; }
    return 'Lena: "Get in a car first and I will fix it."';
  }
  if (p.wanted > 0) {
    p.wanted--;
    p.wantedHeat = 0;
    return 'Ivo: "I made a call. One star off your back."';
  }
  return 'Ivo: "You are clean right now. Save me for later."';
}
