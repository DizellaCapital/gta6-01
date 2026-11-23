// The 8 story jobs Mara Voss hands Rico. Each job has stages; every stage
// has a label, a target on the map and a time limit. Rewards are paid in cash.

import { CONFIG } from './config.js';

export const MISSIONS = [
  {
    name: 'First Pickup',
    intro: 'Mara Voss: Rico, welcome back. Pick up the package at the marina and bring it to me. No cops.',
    stages: [
      { label: 'Pick up the package at Marina del Sol', x: 600, y: 200, radius: 90, timer: 120 },
      { label: 'Deliver the package to Mara at Voss Heights', x: 600, y: 1000, radius: 90, timer: 120 },
    ],
    reward: 400,
  },
  {
    name: 'Street Heat',
    intro: 'Mara Voss: The Voss crew needs a driver for the street race. Win it and the whole city hears your name.',
    stages: [
      { label: 'Reach the race start on Calle Ocho', x: 1400, y: 1000, radius: 90, timer: 100 },
      { label: 'Race checkpoint 1 — Palm Court', x: 2600, y: 200, radius: 110, timer: 75 },
      { label: 'Race checkpoint 2 — finish at North Docks', x: 2600, y: 1000, radius: 110, timer: 75 },
    ],
    reward: 900,
  },
  {
    name: 'Silent Docks',
    intro: 'Mara Voss: A shipment is sitting unguarded at the North Docks. Take it. Quietly.',
    stages: [
      { label: 'Slip into the North Docks', x: 2600, y: 1400, radius: 100, timer: 130 },
      { label: 'Grab the shipment', x: 3000, y: 1400, radius: 80, timer: 60 },
      { label: 'Lose the heat and reach the garage', x: 1400, y: 1400, radius: 100, timer: 130 },
    ],
    reward: 1200,
  },
  {
    name: 'Chopper Run',
    intro: 'Mara Voss: We have a helicopter on the helipad. Fly the cargo over the bay — SBPD cannot catch what flies.',
    stages: [
      { label: 'Reach the helipad at Old Harbor', x: 1800, y: 200, radius: 90, timer: 120 },
      { label: 'Fly the cargo to Sunset Beach', x: 1000, y: 2000, radius: 130, timer: 110 },
    ],
    reward: 1600,
  },
  {
    name: 'Debt Collector',
    intro: 'Mara Voss: A debtor in Palm Court owes us. Collect — politely at first.',
    stages: [
      { label: 'Find the debtor in Palm Court', x: 2600, y: 600, radius: 90, timer: 120 },
      { label: 'Escort him to the meeting point', x: 1800, y: 1400, radius: 100, timer: 120 },
    ],
    reward: 1500,
  },
  {
    name: 'Roadblock Breaker',
    intro: 'Mara Voss: SBPD set up roadblocks all over Calle Ocho. Smash through and show them the road is ours.',
    stages: [
      { label: 'Break the first roadblock', x: 1400, y: 1400, radius: 110, timer: 100 },
      { label: 'Break the second roadblock', x: 2200, y: 1000, radius: 110, timer: 100 },
      { label: 'Reach the safehouse', x: 600, y: 1400, radius: 90, timer: 120 },
    ],
    reward: 2200,
  },
  {
    name: 'The Big Score',
    intro: 'Mara Voss: The vault truck leaves the North Docks at dawn. This is the one, Rico. Everything rides on it.',
    stages: [
      { label: 'Intercept the vault truck', x: 2600, y: 1400, radius: 110, timer: 130 },
      { label: 'Drive the truck to the hideout', x: 600, y: 600, radius: 110, timer: 150 },
    ],
    reward: 4000,
  },
  {
    name: 'Solmar King',
    intro: 'Mara Voss: One last run and the whole bay is ours. Every cop in Solmar will be on you. Make it count.',
    stages: [
      { label: 'Grab the crown shipment at the marina', x: 200, y: 200, radius: 100, timer: 130 },
      { label: 'Outrun the city to Sunset Beach', x: 2200, y: 2000, radius: 130, timer: 150 },
    ],
    reward: 6000,
  },
];

export function currentMission(world) {
  return MISSIONS[Math.min(world.missionIndex, MISSIONS.length - 1)];
}

export function currentStage(world) {
  const m = currentMission(world);
  return m.stages[Math.min(world.missionStage, m.stages.length - 1)];
}

export function missionTarget(world) {
  const s = currentStage(world);
  return { x: s.x, y: s.y, radius: s.radius, label: s.label };
}

// Called every step: checks stage arrival, timers, completion, failure.
export function stepMissions(world, dt) {
  if (world.missionDone || world.screen !== 'play') return;
  const m = currentMission(world);
  const s = currentStage(world);
  world.missionTimer -= dt;
  if (world.missionTimer <= 0) {
    world.missionTimer = s.timer;
    world.missionStage = 0;
    world.dialog = {
      name: 'Mara Voss',
      text: 'Too slow, Rico. We run it again — the job waits for no one.',
    };
    world.message = 'Mission failed — timer ran out. Restarting job.';
    return;
  }
  const dx = world.player.x - s.x;
  const dy = world.player.y - s.y;
  if (dx * dx + dy * dy < s.radius * s.radius) {
    world.missionStage += 1;
    if (world.missionStage >= m.stages.length) {
      world.money += m.reward;
      world.rp += 150;
      world.message = `Job complete: ${m.name} — +$${m.reward}`;
      world.dialog = {
        name: 'Mara Voss',
        text: `Clean work, Rico. $${m.reward} is yours.`,
      };
      world.missionIndex += 1;
      world.missionStage = 0;
      if (world.missionIndex >= MISSIONS.length) {
        world.missionDone = true;
        world.dialog = {
          name: 'Mara Voss',
          text: 'That is every job, Rico. Solmar Bay is yours now.',
        };
      } else {
        const next = currentMission(world);
        world.missionTimer = next.stages[0].timer;
        world.dialog = {
          name: 'Mara Voss',
          text: next.intro,
        };
      }
    } else {
      const ns = currentStage(world);
      world.missionTimer = ns.timer;
      world.message = `Next: ${ns.label}`;
    }
  }
}

export function startMission(world, index) {
  world.missionIndex = index;
  world.missionStage = 0;
  world.missionDone = false;
  const m = currentMission(world);
  world.missionTimer = m.stages[0].timer;
  world.dialog = { name: 'Mara Voss', text: m.intro };
}
