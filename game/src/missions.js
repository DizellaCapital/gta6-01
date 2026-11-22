// Eight story jobs for Mara Voss. Each job has stages; a stage is finished by
// reaching its marker. The race job uses checkpoints, the heli job needs the
// player's helicopter, the last job is the big score.
import { nearestRoadPoint } from './city.js';

function pt(x, y) {
  return nearestRoadPoint(x, y);
}

export const MISSIONS = [
  {
    name: 'FIRST ERRAND',
    giver: 'Mara Voss',
    briefing: 'Rico. Pick up the package at the Marina and bring it to my place. No detours.',
    stages: [
      { text: 'Pick up the package at Marina Row', target: () => pt(600, 200), reward: 0 },
      { text: 'Deliver it to Mara at Palm Court', target: () => pt(1400, 600), reward: 250 },
    ],
  },
  {
    name: 'WHEELS',
    giver: 'Mara Voss',
    briefing: 'I need a clean ride. Lift the Comet parked by the Casino Strip and bring it to the garage.',
    stages: [
      { text: 'Steal the Comet at Casino Strip (press E near a car)', target: () => pt(2200, 600), reward: 0 },
      { text: 'Park it in the garage at Dockside', target: () => pt(2600, 1400), reward: 400 },
    ],
  },
  {
    name: 'STREET HEAT',
    giver: 'Mara Voss',
    briefing: 'The street racers want a piece of you. Beat the clock through the checkpoints.',
    race: true,
    stages: [
      { text: 'Race: hit all 4 checkpoints before the timer ends', target: () => pt(1000, 1000), reward: 600, timer: 75 },
    ],
    checkpoints: [() => pt(1000, 1000), () => pt(2200, 1000), () => pt(2200, 1800), () => pt(600, 1800)],
  },
  {
    name: 'QUIET MONEY',
    giver: 'Mara Voss',
    briefing: 'Collect the drops around Market Square. Stay out of sight — the SBPD is watching.',
    stages: [
      { text: 'Collect drop 1/3 at Market Square', target: () => pt(1800, 1400), reward: 0 },
      { text: 'Collect drop 2/3 at Sunset Mile', target: () => pt(2600, 1800), reward: 0 },
      { text: 'Collect drop 3/3 at North Beach', target: () => pt(3000, 1000), reward: 500 },
    ],
  },
  {
    name: 'EYES IN THE SKY',
    giver: 'Mara Voss',
    briefing: 'Take the helicopter from the helipad and photograph the yacht off the Marina. Fly high.',
    heli: true,
    stages: [
      { text: 'Reach the helipad at Airport Road', target: () => pt(600, 2200), reward: 0 },
      { text: 'Fly to the yacht off Marina Row', target: () => pt(600, 200), reward: 800 },
    ],
  },
  {
    name: 'THE FIXER',
    giver: 'Mara Voss',
    briefing: 'Dex needs an escort through the Canal District. Keep the tail off him.',
    stages: [
      { text: 'Meet Dex at Canal District', target: () => pt(1800, 2200), reward: 0 },
      { text: 'Escort Dex to Hillcrest', target: () => pt(1000, 1800), reward: 650 },
    ],
  },
  {
    name: 'ROADBLOCK RUN',
    giver: 'Mara Voss',
    briefing: 'The shipment is coming in at Dockside and SBPD knows. Smash through and bring it home.',
    stages: [
      { text: 'Reach the shipment at Dockside', target: () => pt(3000, 1800), reward: 0 },
      { text: 'Escape to the garage at Little Havana', target: () => pt(1400, 2200), reward: 900 },
    ],
  },
  {
    name: 'THE BIG SCORE',
    giver: 'Mara Voss',
    briefing: 'One last job, Rico. The casino vault. Get in, get the money, get out. Then we own this city.',
    stages: [
      { text: 'Enter the Casino Strip', target: () => pt(2200, 600), reward: 0 },
      { text: 'Grab the vault cash', target: () => pt(2200, 1000), reward: 0 },
      { text: 'Escape to the Marina — finish the story', target: () => pt(600, 200), reward: 2500 },
    ],
  },
];

export function makeMissions() {
  return {
    index: 0,
    stage: 0,
    timer: 0,
    raceCp: 0,
    done: false,
    dialog: MISSIONS[0].briefing,
    dialogT: 8,
  };
}

export function currentMission(m) {
  return MISSIONS[Math.min(m.index, MISSIONS.length - 1)];
}

export function currentStage(m) {
  const mission = currentMission(m);
  return mission.stages[Math.min(m.stage, mission.stages.length - 1)];
}

export function stageTarget(m) {
  const mission = currentMission(m);
  if (mission.race) {
    const cps = mission.checkpoints;
    return cps[Math.min(m.raceCp, cps.length - 1)]();
  }
  return currentStage(m).target();
}

export function objectiveText(m) {
  if (m.done) return 'Story complete — Solmar Bay is yours.';
  const mission = currentMission(m);
  if (mission.race) {
    return `Race: checkpoint ${Math.min(m.raceCp + 1, mission.checkpoints.length)}/${mission.checkpoints.length}`;
  }
  return currentStage(m).text;
}

// Called every step; returns 'stage' | 'job' | 'done' | null.
export function tickMissions(world, dt) {
  const m = world.missions;
  if (m.done) return null;
  const mission = currentMission(m);
  if (m.dialogT > 0) m.dialogT -= dt;
  const stage = currentStage(m);
  if (stage.timer && m.timer <= 0 && m.stage === 0) m.timer = stage.timer;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.timer = 0;
      world.message = 'Timer expired — job failed. Try again from the marker.';
      m.stage = 0;
      m.raceCp = 0;
      m.timer = stage.timer || 0;
      return 'fail';
    }
  }
  const t = stageTarget(m);
  const p = world.player;
  const d = Math.hypot(p.x - t.x, p.y - t.y);
  const reach = mission.race ? 70 : 64;
  if (d > reach) return null;
  // Reached the stage marker.
  if (mission.race) {
    m.raceCp++;
    if (m.raceCp >= mission.checkpoints.length) {
      p.money += stage.reward;
      p.rp += 60;
      return finishJob(world);
    }
    world.message = `Checkpoint ${m.raceCp}/${mission.checkpoints.length} — keep going!`;
    return 'stage';
  }
  if (stage.reward) {
    p.money += stage.reward;
    p.rp += 60;
  }
  m.stage++;
  if (m.stage >= mission.stages.length) return finishJob(world);
  world.message = `Stage clear. Next: ${currentStage(m).text}`;
  return 'stage';
}

function finishJob(world) {
  const m = world.missions;
  const mission = currentMission(m);
  const p = world.player;
  if (!mission.race) {
    // Reward already paid per stage; the last stage carries the job reward.
  }
  p.rp += 100;
  world.message = `JOB COMPLETE: ${mission.name} — Mara is pleased.`;
  m.index++;
  m.stage = 0;
  m.raceCp = 0;
  m.timer = 0;
  if (m.index >= MISSIONS.length) {
    m.done = true;
    m.dialog = 'Mara Voss: "We own Solmar Bay now, Rico. All of it."';
    m.dialogT = 12;
    world.screen = 'over';
    world.overReason = 'story';
    return 'done';
  }
  const next = currentMission(m);
  m.dialog = `${next.giver}: "${next.briefing}"`;
  m.dialogT = 9;
  return 'job';
}
