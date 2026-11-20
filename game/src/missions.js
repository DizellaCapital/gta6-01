// Missions + story for Solmar Bay. Eight jobs for Rico Solano, an
// ex-delivery driver who owes the Solmar Bay Credit Union $2,000 — every
// job pays it down. Kinds: pickup-and-drop, chase, street race
// (checkpoints in order), heli (fly the Skyhawk-9), and a three-stage
// finale. All givers, places and cars are original.
export const MISSIONS = [
  {
    id: 'taxi', name: 'Solmar Taxi', giver: 'Mara Voss', kind: 'job',
    brief: 'Pick up a fare at Palm Court and drop them at the Grand Solmar hotel.',
    start: { x: 1000, y: 350 }, pickup: { x: 1000, y: 350 }, drop: { x: 2200, y: 850 },
    reward: 120, time: 75,
    dialog: 'Mara: "Rico, first fare of the day. Palm Court, don\'t keep them waiting."',
  },
  {
    id: 'delivery', name: 'Bay Delivery', giver: 'Mara Voss', kind: 'job',
    brief: 'Collect a parcel at the docks and deliver it to the marina flats. No dents.',
    start: { x: 400, y: 1350 }, pickup: { x: 400, y: 1350 }, drop: { x: 2800, y: 1850 },
    reward: 150, time: 90,
    dialog: 'Mara: "Parcel at the docks. The marina flats, and try not to dent it."',
  },
  {
    id: 'getaway', name: 'Getaway Driver', giver: 'Tito Reyes', kind: 'job',
    brief: 'The cops are onto Tito. Get to the safehouse on Harbor Row with heat on you.',
    start: { x: 1600, y: 850 }, pickup: { x: 1600, y: 850 }, drop: { x: 400, y: 350 },
    reward: 250, time: 60, needWanted: 1,
    dialog: 'Tito: "They spotted me, Rico! Grab me and lose them at the safehouse."',
  },
  {
    id: 'rescue', name: 'Beach Rescue', giver: 'Lena Park', kind: 'job',
    brief: 'A friend is hurt at the beach tower. Pick them up and drive them to the clinic.',
    start: { x: 1600, y: 2250 }, pickup: { x: 1600, y: 2250 }, drop: { x: 1000, y: 1350 },
    reward: 200, time: 120,
    dialog: 'Lena: "Someone\'s hurt at the beach tower. Drive careful — they\'re fragile."',
  },
  {
    id: 'courier', name: 'Chase the Courier', giver: 'Mara Voss', kind: 'chase',
    brief: 'A rival courier stole our route book. Ram their car three times to stop them.',
    start: { x: 2200, y: 1350 }, pickup: { x: 2200, y: 1350 }, drop: { x: 2200, y: 1350 },
    reward: 300, time: 90, chase: true,
    dialog: 'Mara: "That courier took our route book. Ram them till they stop. Three hits."',
  },
  {
    id: 'race', name: 'Harbor Sprint', giver: 'Tito Reyes', kind: 'race',
    brief: 'Street race! Hit all 4 checkpoints in order before the clock runs out.',
    start: { x: 2200, y: 850 },
    checkpoints: [
      { x: 2800, y: 850 }, { x: 2800, y: 1850 }, { x: 1000, y: 1850 }, { x: 400, y: 350 },
    ],
    reward: 350, time: 75,
    dialog: 'Tito: "Harbor Sprint tonight. Four gates, one clock. Don\'t lift, Rico!"',
  },
  {
    id: 'heli', name: 'Rooftop Run', giver: 'Mara Voss', kind: 'heli',
    brief: 'Fly the Skyhawk-9: pick up the package at the helipad, drop it on the downtown roof.',
    start: { x: 2800, y: 350 }, pickup: { x: 2800, y: 350 }, drop: { x: 2200, y: 350 },
    reward: 400, time: 120,
    dialog: 'Mara: "The Skyhawk is fueled at the helipad. Fly it — rooftops only, no roads."',
  },
  {
    id: 'finale', name: 'The Big Score', giver: 'Mara Voss', kind: 'finale',
    brief: 'Pick up the crew, hit the Bay Credit Union, then lose the heat at the safehouse.',
    start: { x: 1000, y: 1350 },
    stages: [
      { key: 'go-crew', label: 'Pick up the crew', target: { x: 1000, y: 1350 } },
      { key: 'go-bank', label: 'Hit the Bay Credit Union', target: { x: 2200, y: 850 } },
      { key: 'go-escape', label: 'Escape to the safehouse', target: { x: 400, y: 350 } },
    ],
    reward: 600, time: 150, needWanted: 2,
    dialog: 'Mara: "This is the one, Rico. Crew, bank, safehouse — and the debt is gone."',
  },
];

export const REWARDS = Object.fromEntries(MISSIONS.map((m) => [m.id, m.reward]));

export function createMissions() {
  return {
    index: 0,           // next mission to offer
    active: null,       // {def, stage, timer, hits, checkpoint}
    done: [],
    failed: [],
  };
}

export function currentMission(missions) {
  return missions.index < MISSIONS.length ? MISSIONS[missions.index] : null;
}

export function missionTarget(missions) {
  if (!missions.active) {
    const next = currentMission(missions);
    return next ? next.start : null;
  }
  const m = missions.active;
  const def = m.def;
  if (def.kind === 'race') return def.checkpoints[Math.min(m.checkpoint, def.checkpoints.length - 1)];
  if (def.kind === 'finale') {
    const stage = def.stages.find((s) => s.key === m.stage);
    return stage ? stage.target : def.stages[0].target;
  }
  if (def.kind === 'heli') {
    if (m.stage === 'go-heli') return def.start;
    if (m.stage === 'go-pickup') return def.pickup;
    return def.drop;
  }
  if (m.stage === 'go-pickup') return def.pickup;
  return def.drop;
}

/** Structured info for the HUD mission panel. */
export function missionInfo(missions) {
  if (!missions.active) {
    const next = currentMission(missions);
    if (!next) return { name: 'Story complete', stage: 'All 8 jobs done', timer: 0, objective: 'Solmar Bay is yours, Rico.', reward: 0, giver: '—' };
    return {
      name: next.name, stage: 'Next job', timer: 0,
      objective: `Go to the gold marker — ${next.giver}`, reward: next.reward, giver: next.giver,
    };
  }
  const m = missions.active;
  const def = m.def;
  let stage = m.stage;
  let objective = '';
  if (def.kind === 'race') {
    stage = `Checkpoint ${m.checkpoint + 1}/${def.checkpoints.length}`;
    objective = 'Hit the gold gate in order — beat the clock';
  } else if (def.kind === 'finale') {
    const s = def.stages.find((x) => x.key === m.stage);
    stage = s ? s.label : m.stage;
    objective = m.stage === 'go-bank'
      ? 'Grab the score — expect heat'
      : m.stage === 'go-escape' ? 'Lose the cops at the safehouse' : 'Pick up Tito and Lena';
  } else if (def.kind === 'heli') {
    stage = m.stage === 'go-heli' ? 'Get the helicopter' : m.stage === 'go-pickup' ? 'Pick up the package' : 'Drop on the downtown roof';
    objective = m.stage === 'go-heli' ? 'Press E at the helipad to fly the Skyhawk-9' : m.stage === 'go-pickup' ? 'Land on the helipad marker' : 'Land on the roof marker';
  } else if (def.kind === 'chase') {
    stage = `Ram the courier (${m.hits}/3)`;
    objective = 'Ram the purple courier car 3 times';
  } else if (m.stage === 'go-pickup') {
    stage = 'Pick up';
    objective = def.needWanted ? 'Pick up Tito — with heat on you' : 'Reach the gold marker to pick up';
  } else {
    stage = 'Deliver';
    objective = 'Drive to the gold marker';
  }
  return {
    name: def.name, stage, timer: Math.max(0, Math.ceil(m.timer)),
    objective, reward: def.reward, giver: def.giver,
  };
}

export function missionLabel(missions) {
  const info = missionInfo(missions);
  return `${info.name}: ${info.stage} — ${info.objective}${info.timer ? ` — ${info.timer}s` : ''}`;
}

/** Start the next mission when the player reaches its gold start marker. */
export function tryStartMission(missions, playerPos) {
  if (missions.active) return null;
  const next = currentMission(missions);
  if (!next) return null;
  const dx = playerPos.x - next.start.x;
  const dy = playerPos.y - next.start.y;
  if (dx * dx + dy * dy > 70 * 70) return null;
  const stage = next.kind === 'heli' ? 'go-heli'
    : next.kind === 'finale' ? 'go-crew'
    : next.kind === 'race' ? 'race' : 'go-pickup';
  missions.active = { def: next, stage, timer: next.time, hits: 0, checkpoint: 0 };
  return next;
}

/**
 * Advance the active mission. Returns 'complete' | 'fail' | 'pickup' |
 * 'need-heat' | 'checkpoint' | 'need-heli' | null.
 * `events` is {atTarget, courierHits, wanted, inHeli} supplied by the world step.
 */
export function updateMission(missions, events) {
  const m = missions.active;
  if (!m) return null;
  m.timer -= 1 / 60;
  if (m.timer <= 0) {
    missions.failed.push(m.def.id);
    missions.active = null;
    missions.index += 1;
    return 'fail';
  }
  const def = m.def;
  if (def.kind === 'chase' || def.chase) {
    m.hits = events.courierHits || m.hits;
    if (m.hits >= 3) {
      missions.done.push(def.id);
      missions.active = null;
      missions.index += 1;
      return 'complete';
    }
    return null;
  }
  if (def.kind === 'race') {
    if (events.atTarget) {
      m.checkpoint += 1;
      if (m.checkpoint >= def.checkpoints.length) {
        missions.done.push(def.id);
        missions.active = null;
        missions.index += 1;
        return 'complete';
      }
      return 'checkpoint';
    }
    return null;
  }
  if (def.kind === 'heli') {
    if (m.stage === 'go-heli') {
      if (events.atTarget && events.inHeli) { m.stage = 'go-pickup'; return 'pickup'; }
      if (events.atTarget && !events.inHeli) return 'need-heli';
      return null;
    }
    if (m.stage === 'go-pickup' && events.atTarget) {
      if (!events.inHeli) return 'need-heli';
      m.stage = 'go-drop';
      return 'pickup';
    }
    if (m.stage === 'go-drop' && events.atTarget) {
      if (!events.inHeli) return 'need-heli';
      missions.done.push(def.id);
      missions.active = null;
      missions.index += 1;
      return 'complete';
    }
    return null;
  }
  if (def.kind === 'finale') {
    if (!events.atTarget) return null;
    if (m.stage === 'go-crew') { m.stage = 'go-bank'; return 'pickup'; }
    if (m.stage === 'go-bank') { m.stage = 'go-escape'; return 'pickup'; }
    if (m.stage === 'go-escape') {
      missions.done.push(def.id);
      missions.active = null;
      missions.index += 1;
      return 'complete';
    }
    return null;
  }
  if (m.stage === 'go-pickup' && events.atTarget) {
    m.stage = 'go-drop';
    return 'pickup';
  }
  if (m.stage === 'go-drop' && events.atTarget) {
    if (def.needWanted && events.wanted < def.needWanted) return 'need-heat';
    missions.done.push(def.id);
    missions.active = null;
    missions.index += 1;
    return 'complete';
  }
  return null;
}
