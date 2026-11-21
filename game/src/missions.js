// Mara Voss's story: eight jobs in order. Each job is a list of stages with
// a place to reach (or checkpoints to clear) and an optional timer; finishing
// a job pays cash, raises rank points and lifts district standing.
import { CFG } from './config.js';

export const MISSIONS = [
  {
    name: 'Solmar Bay Taxi',
    giver: 'Mara Voss',
    reward: 400,
    intro: 'Mara: "Rico, my cousin just landed at the marina. Pick her up and take her to the Palm Court hotel. No dents."',
    stages: [
      { text: 'Pick up Mara\'s cousin at the marina', at: { x: 130, y: CFG.worldHeight - 130 }, r: 90 },
      { text: 'Drop her at the Palm Court hotel', at: { x: 1400, y: 500 }, r: 90 },
    ],
  },
  {
    name: 'Bayfront Delivery',
    giver: 'Mara Voss',
    reward: 550,
    intro: 'Mara: "Two parcels, two doors. First the docks office, then the Civic Hill gallery. Keep it quiet."',
    stages: [
      { text: 'Deliver the parcel to the docks office', at: { x: 600, y: CFG.worldHeight - 500 }, r: 90 },
      { text: 'Deliver the parcel to the Civic Hill gallery', at: { x: 2100, y: 600 }, r: 90 },
    ],
  },
  {
    name: 'Sunset Sprint',
    giver: 'Mara Voss',
    reward: 700,
    intro: 'Mara: "Street race, five gates, ninety seconds. Win it and the Strip talks about us. Lose it and we walk."',
    timer: 90,
    stages: [
      { text: 'Race gate 1/5 — Sunset Strip', at: { x: 600, y: 1100 }, r: 100 },
      { text: 'Race gate 2/5 — Palm Court', at: { x: 1200, y: 1100 }, r: 100 },
      { text: 'Race gate 3/5 — Old Town', at: { x: 1200, y: 500 }, r: 100 },
      { text: 'Race gate 4/5 — Civic Hill', at: { x: 2200, y: 500 }, r: 100 },
      { text: 'Race gate 5/5 — finish line', at: { x: 2200, y: 1500 }, r: 100 },
    ],
  },
  {
    name: 'Harbor Heist Setup',
    giver: 'Mara Voss',
    reward: 800,
    intro: 'Mara: "We need a clean ride. Lift the Kestrel parked by the marina, then bring it to our garage. No police."',
    stages: [
      { text: 'Steal the Kestrel by the marina', at: { x: 340, y: CFG.worldHeight - 80 }, r: 110 },
      { text: 'Deliver it to the crew garage', at: { x: 295, y: CFG.worldHeight - 100 }, r: 120 },
    ],
  },
  {
    name: 'Docks Deal',
    giver: 'Mara Voss',
    reward: 900,
    intro: 'Mara: "Meet my contact at the docks. The SBPD will be sniffing around — if they spot you, run."',
    stages: [
      { text: 'Meet the contact at the docks', at: { x: 400, y: CFG.worldHeight - 700 }, r: 90 },
      { text: 'Lose the heat — get 600m from any unit', at: { x: 2400, y: 300 }, r: 120 },
    ],
  },
  {
    name: 'Skyline Run',
    giver: 'Mara Voss',
    reward: 1100,
    intro: 'Mara: "Three drops across the city, two minutes. The heli pad is yours if you need the sky. Make it count."',
    timer: 120,
    stages: [
      { text: 'Drop 1/3 — Northgate', at: { x: 2800, y: 300 }, r: 100 },
      { text: 'Drop 2/3 — Bayfront', at: { x: 2800, y: 1700 }, r: 100 },
      { text: 'Drop 3/3 — Marina Row', at: { x: 400, y: 1700 }, r: 100 },
    ],
  },
  {
    name: 'The Big Score',
    giver: 'Mara Voss',
    reward: 1500,
    intro: 'Mara: "The Civic bank, Rico. In and out. The whole city will be looking for us after this — be ready."',
    stages: [
      { text: 'Reach the Civic bank', at: { x: 2100, y: 800 }, r: 100 },
      { text: 'Escape to the marina safehouse', at: { x: 200, y: CFG.worldHeight - 200 }, r: 120 },
    ],
  },
  {
    name: 'Solmar Bay Finale',
    giver: 'Mara Voss',
    reward: 2500,
    intro: 'Mara: "Last one. Deliver the case to me at the helipad and we are free. Everything we built rides on this drive."',
    stages: [
      { text: 'Pick up the case at Old Town', at: { x: 800, y: 900 }, r: 100 },
      { text: 'Deliver the case to Mara at the helipad', at: { x: CFG.worldWidth - 100, y: 100 }, r: 110 },
    ],
  },
];

export function currentMission(S) {
  return MISSIONS[S.missionIdx] || null;
}

export function currentStage(S) {
  const m = currentMission(S);
  if (!m) return null;
  return m.stages[S.missionStage] || null;
}

export function startMission(S, idx) {
  const m = MISSIONS[idx];
  if (!m) return;
  S.missionIdx = idx;
  S.missionStage = 0;
  S.missionTimer = m.timer || 0;
  S.missionState = 'active';
  S.dialog = { name: m.giver, text: m.intro, until: S.time + 7 };
  S.messages.push(`JOB ${idx + 1}/8 — ${m.name}`);
}

export function updateMissions(S, dt) {
  const m = currentMission(S);
  if (!m || S.missionState !== 'active') return;
  if (m.timer) {
    S.missionTimer -= dt;
    if (S.missionTimer <= 0) {
      S.missionState = 'failed';
      S.messages.push(`JOB FAILED — ${m.name}. Talk to Mara to retry.`);
      S.missionTimer = 0;
      return;
    }
  }
  const stage = currentStage(S);
  if (!stage) return;
  const d = Math.hypot(S.player.x - stage.at.x, S.player.y - stage.at.y);
  if (d <= stage.r) {
    S.missionStage++;
    S.sound?.pickup();
    if (S.missionStage >= m.stages.length) {
      S.player.money += m.reward;
      S.player.rp += 120;
      S.player.rank = rankFor(S.player.rp);
      S.missionState = 'done';
      S.messages.push(`JOB DONE — ${m.name} +$${m.reward}`);
      S.dialog = { name: m.giver, text: `Mara: "Clean work, Rico. $${m.reward} is yours. Next job when you're ready."`, until: S.time + 6 };
      if (S.missionIdx + 1 < MISSIONS.length) {
        startMission(S, S.missionIdx + 1);
      } else {
        S.screen = 'end';
        S.endKind = 'win';
      }
    } else {
      S.messages.push(`Stage ${S.missionStage + 1}/${m.stages.length}`);
    }
  }
}

export function rankFor(rp) {
  if (rp >= 900) return 'Kingpin';
  if (rp >= 600) return 'Fixer';
  if (rp >= 350) return 'Wheelman';
  if (rp >= 150) return 'Runner';
  return 'Rookie';
}
