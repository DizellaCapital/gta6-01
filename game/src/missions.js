// Missions + story for Solmar Bay. Five jobs from Mara Voss's dispatch
// board, each with a start marker, an objective marker, a timer and a
// cash reward. The player is Rico Solano, an ex-delivery driver who owes
// the Solmar Bay Credit Union $2,000 — every job pays it down.
export const MISSIONS = [
  {
    id: 'taxi', name: 'Solmar Taxi', giver: 'Mara Voss',
    brief: 'Pick up a fare at Palm Court and drop them at the Grand Solmar hotel.',
    start: { x: 1000, y: 350 }, pickup: { x: 1000, y: 350 }, drop: { x: 2200, y: 850 },
    reward: 120, time: 75,
  },
  {
    id: 'delivery', name: 'Bay Delivery', giver: 'Mara Voss',
    brief: 'Collect a parcel at the docks and deliver it to the marina flats. No dents.',
    start: { x: 400, y: 1350 }, pickup: { x: 400, y: 1350 }, drop: { x: 2800, y: 1850 },
    reward: 150, time: 90,
  },
  {
    id: 'getaway', name: 'Getaway Driver', giver: 'Tito Reyes',
    brief: 'The cops are onto Tito. Get to the safehouse on Harbor Row with heat on you.',
    start: { x: 1600, y: 850 }, pickup: { x: 1600, y: 850 }, drop: { x: 400, y: 350 },
    reward: 250, time: 60, needWanted: 1,
  },
  {
    id: 'rescue', name: 'Beach Rescue', giver: 'Lena Park',
    brief: 'A friend is hurt at the beach tower. Pick them up and drive them to the clinic.',
    start: { x: 1600, y: 2250 }, pickup: { x: 1600, y: 2250 }, drop: { x: 1000, y: 1350 },
    reward: 200, time: 120,
  },
  {
    id: 'courier', name: 'Chase the Courier', giver: 'Mara Voss',
    brief: 'A rival courier stole our route book. Ram their car three times to stop them.',
    start: { x: 2200, y: 1350 }, pickup: { x: 2200, y: 1350 }, drop: { x: 2200, y: 1350 },
    reward: 300, time: 90, chase: true,
  },
];

export function createMissions() {
  return {
    index: 0,           // next mission to offer
    active: null,       // {def, stage: 'go-pickup'|'go-drop', timer, hits}
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
  const def = missions.active.def;
  if (missions.active.stage === 'go-pickup') return def.pickup;
  return def.drop;
}

export function missionLabel(missions) {
  if (!missions.active) {
    const next = currentMission(missions);
    return next ? `Next job: ${next.name} — go to the gold marker` : 'All jobs done — Solmar Bay is yours, Rico.';
  }
  const def = missions.active.def;
  const t = Math.ceil(missions.active.timer);
  if (missions.active.stage === 'go-pickup') return `${def.name}: pick up at the marker — ${t}s`;
  if (def.chase) return `${def.name}: ram the courier (${missions.active.hits}/3) — ${t}s`;
  return `${def.name}: deliver to the gold marker — ${t}s`;
}

/** Start the next mission when the player reaches its gold start marker. */
export function tryStartMission(missions, playerPos) {
  if (missions.active) return null;
  const next = currentMission(missions);
  if (!next) return null;
  const dx = playerPos.x - next.start.x;
  const dy = playerPos.y - next.start.y;
  if (dx * dx + dy * dy > 70 * 70) return null;
  missions.active = { def: next, stage: 'go-pickup', timer: next.time, hits: 0 };
  return next;
}

/**
 * Advance the active mission. Returns 'complete' | 'fail' | null.
 * `events` is {atTarget, courierHits} supplied by the world step.
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
  if (m.def.chase) {
    m.hits = events.courierHits || m.hits;
    if (m.hits >= 3) {
      missions.done.push(m.def.id);
      missions.active = null;
      missions.index += 1;
      return 'complete';
    }
    return null;
  }
  if (m.stage === 'go-pickup' && events.atTarget) {
    if (m.def.needWanted) {
      // Getaway: the pickup IS the job — head straight for the safehouse.
      m.stage = 'go-drop';
      return 'pickup';
    }
    m.stage = 'go-drop';
    return 'pickup';
  }
  if (m.stage === 'go-drop' && events.atTarget) {
    if (m.def.needWanted && events.wanted < m.def.needWanted) return 'need-heat';
    missions.done.push(m.def.id);
    missions.active = null;
    missions.index += 1;
    return 'complete';
  }
  return null;
}
