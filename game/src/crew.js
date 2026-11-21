// The crew: three specialists Rico calls with keys 1–3. Each ability has a
// cooldown, shown on the crew card in the HUD.
export const CREW = [
  {
    key: '1', name: 'Dex', role: 'Driver',
    ability: 'Getaway ride',
    cooldown: 60,
    blurb: 'Calls a fast car to Rico',
  },
  {
    key: '2', name: 'Lena', role: 'Mechanic',
    ability: 'Field repair',
    cooldown: 45,
    blurb: 'Repairs the current car to 100%',
  },
  {
    key: '3', name: 'Ivo', role: 'Lookout',
    ability: 'Cool the heat',
    cooldown: 90,
    blurb: 'Drops the wanted level by 1 star',
  },
];

export function crewReady(S, idx) {
  return S.time >= (S.crewCooldowns[idx] || 0);
}

export function callCrew(S, idx) {
  const member = CREW[idx];
  if (!member) return;
  if (!crewReady(S, idx)) {
    const left = Math.ceil((S.crewCooldowns[idx] || 0) - S.time);
    S.messages.push(`${member.name} is busy — ready in ${left}s`);
    return;
  }
  S.crewCooldowns[idx] = S.time + member.cooldown;
  if (idx === 0) {
    // Dex delivers a fast car beside Rico.
    const car = {
      id: S.nextId++, kind: 'parked',
      x: S.player.x + 70, y: S.player.y + 30, angle: S.player.angle,
      speed: 0, model: 'Kestrel', color: '#2fae7d', top: 200,
      condition: 100, vertical: false, lane: 0, turnAt: null, flash: 0,
    };
    S.cars.push(car);
    S.messages.push('Dex: "Your ride is outside. Keys in the sun visor."');
    S.sound?.pickup();
  } else if (idx === 1) {
    if (S.player.car) {
      S.player.car.condition = 100;
      S.messages.push('Lena: "Good as new. Try not to bend it again."');
      S.sound?.pickup();
    } else {
      S.messages.push('Lena: "Get in a car first, Rico."');
      S.crewCooldowns[idx] = S.time + 5;
    }
  } else if (idx === 2) {
    if (S.player.wanted > 0) {
      S.player.wanted -= 1;
      S.messages.push('Ivo: "I paid off a dispatcher. One star off your head."');
      S.sound?.pickup();
    } else {
      S.messages.push('Ivo: "No heat on you right now. Save it."');
      S.crewCooldowns[idx] = S.time + 5;
    }
  }
}
