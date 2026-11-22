// Eight story jobs for Mara Voss. Each job is a chain of stages; reaching a
// stage target (a point on a road, or inside its radius) advances the job.
// Jobs 6 and 7 are the street race and the helicopter job.
import { CFG } from './config.js';

// Stage targets are given as fractions of the map so they land on roads.
function at(fx, fy) {
  return { x: Math.round(fx * CFG.worldW), y: Math.round(fy * CFG.worldH) };
}

export const MISSIONS = [
  {
    name: 'First Pickup', pay: 500,
    intro: 'Mara: Rico. A package at the docks. No questions, no cops.',
    stages: [
      { text: 'Reach the North Docks pickup', target: at(0.12, 0.14), radius: 90, time: 150 },
      { text: 'Bring the package to Mara at Marina Row', target: at(0.18, 0.82), radius: 90, time: 180 },
    ],
  },
  {
    name: 'The Quiet Loan', pay: 800,
    intro: 'Mara: A debtor in Old Solmar owes me. Collect. Politely, if you can.',
    stages: [
      { text: 'Find the debtor in Old Solmar', target: at(0.22, 0.42), radius: 90, time: 150 },
      { text: 'Return the cash to Mara', target: at(0.18, 0.82), radius: 90, time: 180 },
    ],
  },
  {
    name: 'Hot Wheels', pay: 1200,
    intro: 'Mara: I need a Comet GT from Palm Heights. Borrow it. Permanently.',
    stages: [
      { text: 'Steal the Comet GT in Palm Heights', target: at(0.45, 0.78), radius: 110, time: 200 },
      { text: 'Deliver it to the Junction garage', target: at(0.42, 0.12), radius: 110, time: 200 },
    ],
  },
  {
    name: 'Smoke Screen', pay: 1500,
    intro: 'Mara: The SBPD impound lot holds my truck. Get it out before dawn.',
    stages: [
      { text: 'Reach the impound lot in Civic Center', target: at(0.45, 0.42), radius: 100, time: 180 },
      { text: 'Lose the cops, then park at the beach', target: at(0.78, 0.82), radius: 110, time: 240 },
    ],
  },
  {
    name: 'The Informant', pay: 2000,
    intro: 'Mara: Someone is talking to the SBPD. Find him on The Strip.',
    stages: [
      { text: 'Meet the contact on The Strip', target: at(0.72, 0.42), radius: 90, time: 180 },
      { text: 'Escort him to the safe house', target: at(0.62, 0.12), radius: 90, time: 220 },
    ],
  },
  {
    name: 'Midnight Mile', pay: 3000,
    intro: 'Mara: Street race. Three checkpoints, one winner. Do not lose.',
    stages: [
      { text: 'Race: checkpoint 1 — Marina Row', target: at(0.12, 0.82), radius: 80, time: 70 },
      { text: 'Race: checkpoint 2 — Civic Center', target: at(0.45, 0.42), radius: 80, time: 70 },
      { text: 'Race: finish line — The Strip', target: at(0.78, 0.42), radius: 80, time: 70 },
    ],
  },
  {
    name: 'Eye In The Sky', pay: 4000,
    intro: 'Mara: Take the heli from the Marina helipad. Watch the convoy from above.',
    stages: [
      { text: 'Reach the Marina helipad', target: at(0.12, 0.72), radius: 100, time: 180 },
      { text: 'Fly to the convoy over East Industrial', target: at(0.82, 0.12), radius: 140, time: 180 },
      { text: 'Land back at the helipad', target: at(0.12, 0.72), radius: 100, time: 180 },
    ],
  },
  {
    name: 'The Big Score', pay: 8000,
    intro: 'Mara: The vault job. Everything we built leads here, Rico.',
    stages: [
      { text: 'Rendezvous with the crew at Junction Yards', target: at(0.42, 0.12), radius: 100, time: 200 },
      { text: 'Hit the vault on The Strip', target: at(0.72, 0.42), radius: 100, time: 240 },
      { text: 'Escape to Solmar Beach', target: at(0.82, 0.82), radius: 120, time: 240 },
    ],
  },
];

export function createMissionState() {
  return { index: 0, stage: 0, timer: 0, done: false, started: false };
}

export function currentMission(state) {
  return MISSIONS[Math.min(state.index, MISSIONS.length - 1)];
}

export function currentStage(state) {
  const m = currentMission(state);
  return m.stages[Math.min(state.stage, m.stages.length - 1)];
}

export function missionProgress(state) {
  return `${state.index + 1}/8`;
}
