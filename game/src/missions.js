// Solmar Bay — the story. Eight jobs for Mara Voss, in order. Each job has
// a briefing, a chain of stages (drive somewhere, pick something up, escape,
// deliver), a timer where the job is timed, and a cash reward. The world
// module advances stages when Rico reaches a stage target.
export const MISSIONS = [
  {
    name: 'Solmar Bay Taxi',
    briefing: 'Mara Voss: "Rico, drive my cousin from the marina to Old Town. No scratches, no cops. Easy money."',
    reward: 400,
    stages: [
      { text: 'Pick up Mara\'s cousin at the marina', target: { x: 400, y: 400 }, radius: 90 },
      { text: 'Drop him off in Old Town', target: { x: 2000, y: 400 }, radius: 90 },
    ],
  },
  {
    name: 'Dockside Pickup',
    briefing: 'Mara Voss: "A crate came in at Dockside. Grab it before the harbour crew clocks it. Bring it to the garage."',
    reward: 650,
    stages: [
      { text: 'Collect the crate at Dockside', target: { x: 400, y: 1600 }, radius: 90 },
      { text: 'Deliver the crate to the garage', target: { x: 2000, y: 2000 }, radius: 110 },
    ],
  },
  {
    name: 'Sunset Grand Prix',
    briefing: 'Mara Voss: "Street race tonight, Beachfront to the Hills. Beat the clock and the whole town talks about you."',
    reward: 900,
    timer: 150,
    stages: [
      { text: 'Race checkpoint 1 — Beachfront', target: { x: 800, y: 2800 }, radius: 110 },
      { text: 'Race checkpoint 2 — Downtown', target: { x: 2000, y: 2000 }, radius: 110 },
      { text: 'Race checkpoint 3 — Solmar Hills finish', target: { x: 3600, y: 1600 }, radius: 110 },
    ],
  },
  {
    name: 'Getaway Driver',
    briefing: 'Mara Voss: "My crew hit a snag in Downtown. Pick them up and lose the SBPD. Do not get busted."',
    reward: 1200,
    stages: [
      { text: 'Pick up the crew in Downtown', target: { x: 2400, y: 1600 }, radius: 90 },
      { text: 'Lose the cops and reach the safehouse', target: { x: 800, y: 2800 }, radius: 110 },
    ],
  },
  {
    name: 'Rooftop Lift',
    briefing: 'Mara Voss: "The heli is fuelled on the pad. Fly to the Downtown tower, pick up the package, and land it at the marina."',
    reward: 1500,
    stages: [
      { text: 'Take the helicopter from the helipad', target: { x: 3600, y: 2800 }, radius: 120 },
      { text: 'Pick up the package on the Downtown tower', target: { x: 2400, y: 1600 }, radius: 110 },
      { text: 'Land the package at the marina', target: { x: 400, y: 400 }, radius: 120 },
    ],
  },
  {
    name: 'Two Hot Cars',
    briefing: 'Mara Voss: "I need two clean rides for a buyer. Steal a Comet and a Marlin and park them in the garage."',
    reward: 1800,
    stages: [
      { text: 'Steal a Comet and bring it to the garage', target: { x: 2000, y: 2000 }, radius: 110 },
      { text: 'Steal a Marlin and bring it to the garage', target: { x: 2000, y: 2000 }, radius: 110 },
    ],
  },
  {
    name: 'The Big Score',
    briefing: 'Mara Voss: "Tonight we take the Palm Heights vault. Grab the cash, then run — the whole SBPD will be on you."',
    reward: 3500,
    stages: [
      { text: 'Hit the Palm Heights vault', target: { x: 4000, y: 800 }, radius: 100 },
      { text: 'Escape the SBPD and reach the safehouse', target: { x: 800, y: 2800 }, radius: 110 },
    ],
  },
  {
    name: 'King of Solmar Bay',
    briefing: 'Mara Voss: "Last one, Rico. One final race across the whole city, then you are a legend. Make it count."',
    reward: 5000,
    timer: 210,
    stages: [
      { text: 'Final race — checkpoint 1, Marina Row', target: { x: 800, y: 400 }, radius: 110 },
      { text: 'Final race — checkpoint 2, Dockside', target: { x: 800, y: 2000 }, radius: 110 },
      { text: 'Final race — checkpoint 3, Airport Flats', target: { x: 3600, y: 2800 }, radius: 110 },
      { text: 'Final race — finish at Palm Heights', target: { x: 4000, y: 800 }, radius: 120 },
    ],
  },
];

export function currentMission(state) {
  return MISSIONS[state.missionIndex] || null;
}

export function currentStage(state) {
  const m = currentMission(state);
  return m ? m.stages[state.missionStage] : null;
}

// Advance the active job when Rico reaches the stage target. Returns a
// message for the HUD when something happens, or null.
export function updateMissions(state, dt) {
  const m = currentMission(state);
  if (!m || state.screen !== 'play') return null;
  if (m.timer) {
    state.missionTimer -= dt;
    if (state.missionTimer <= 0) {
      state.missionTimer = m.timer;
      state.missionStage = 0;
      return 'Time up — the job resets. Try again, Rico.';
    }
  }
  const stage = currentStage(state);
  if (!stage) return null;
  const dx = state.player.x - stage.target.x;
  const dy = state.player.y - stage.target.y;
  if (Math.hypot(dx, dy) < stage.radius) {
    state.missionStage++;
    if (state.missionStage >= m.stages.length) {
      state.player.money += m.reward;
      state.player.rp += 250;
      state.stats.missionsDone++;
      state.missionIndex++;
      state.missionStage = 0;
      const next = currentMission(state);
      state.missionTimer = next && next.timer ? next.timer : 0;
      state.dialog = { speaker: 'Mara Voss', text: next ? `Job done. $${m.reward} is yours. Next: ${next.name}.` : 'That is every job, Rico. Solmar Bay is yours now.', timer: 6 };
      return `Job complete: ${m.name} — $${m.reward}`;
    }
    return `Stage done — ${currentStage(state).text}`;
  }
  return null;
}

export function startMissionTimer(state) {
  const m = currentMission(state);
  state.missionTimer = m && m.timer ? m.timer : 0;
}
