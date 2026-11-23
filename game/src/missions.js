// Mara Voss's eight story jobs. Each job is a short chain of stages; a stage
// is reached by driving (or flying) to its marker. Race stages add a timer
// and a chain of checkpoints. Targets are road intersections, so every
// marker is reachable on the street grid.
import { CFG } from './config.js';

function at(city, ix, iy) {
  return { x: city.roadsX[ix], y: city.roadsY[iy] };
}

export function buildMissions(city) {
  return [
    {
      name: 'First Pickup',
      intro: 'Rico. Mara here. A package is waiting at the marina. Bring it to me, no detours.',
      reward: 350,
      stages: [
        { type: 'pickup', ...at(city, 2, 2), r: 70, text: 'Pick up the package at the marina' },
        { type: 'deliver', ...at(city, 5, 4), r: 70, text: 'Deliver the package to Mara' },
      ],
    },
    {
      name: 'Hot Wheels',
      intro: 'The boys need a fast car. Lift the coupe on Market Row and park it in my garage.',
      reward: 500,
      stages: [
        { type: 'steal', ...at(city, 7, 5), r: 70, text: 'Steal the coupe on Market Row' },
        { type: 'deliver', x: city.garage.x, y: city.garage.y, r: 90, text: 'Park it in the garage' },
      ],
    },
    {
      name: 'Sunset Sprint',
      intro: 'Street race, Sunset Strip to South Beach. Beat the clock and the pack stays off your tail.',
      reward: 800,
      stages: [
        { type: 'race', ...at(city, 1, 9), r: 80, text: 'Reach the start line', time: 75 },
        { type: 'race', ...at(city, 5, 11), r: 80, text: 'Checkpoint 1 of 3', time: 75 },
        { type: 'race', ...at(city, 9, 10), r: 80, text: 'Checkpoint 2 of 3', time: 75 },
        { type: 'race', ...at(city, 13, 11), r: 80, text: 'Finish at South Beach', time: 75 },
      ],
    },
    {
      name: 'Dockside Drop',
      intro: 'The docks are crawling with SBPD. Drop the crate at East Docks and vanish before they box you in.',
      reward: 650,
      stages: [
        { type: 'pickup', ...at(city, 6, 3), r: 70, text: 'Collect the crate downtown' },
        { type: 'deliver', ...at(city, 14, 6), r: 70, text: 'Drop it at East Docks' },
      ],
    },
    {
      name: 'Sky Hook',
      intro: 'Time to fly. Take the chopper from the helipad and land it on the Civic Center roof pad.',
      reward: 950,
      stages: [
        { type: 'heli', x: city.helipad.x, y: city.helipad.y, r: 60, text: 'Board the helicopter at the helipad' },
        { type: 'heli', ...at(city, 10, 6), r: 90, text: 'Land at the Civic Center pad' },
      ],
    },
    {
      name: 'Payback Run',
      intro: 'A rival crew shorted us. Hit their stash house in Little Havana, then lose the heat.',
      reward: 1100,
      stages: [
        { type: 'goto', ...at(city, 4, 10), r: 70, text: 'Reach the stash house' },
        { type: 'pickup', ...at(city, 4, 10), r: 70, text: 'Grab the stash' },
        { type: 'deliver', ...at(city, 8, 4), r: 70, text: 'Bring it back to Mara' },
      ],
    },
    {
      name: 'University Heist',
      intro: 'One vault, one night, no alarms. Get in, get the haul, get out through Portside.',
      reward: 1500,
      stages: [
        { type: 'goto', ...at(city, 10, 10), r: 70, text: 'Reach the university vault' },
        { type: 'pickup', ...at(city, 10, 10), r: 70, text: 'Crack the vault' },
        { type: 'deliver', ...at(city, 2, 6), r: 70, text: 'Escape through Portside' },
      ],
    },
    {
      name: 'The Big Score',
      intro: 'Last job, Rico. The North Hills mansion, then we are legends. Everything rides on this.',
      reward: 2500,
      stages: [
        { type: 'goto', ...at(city, 13, 2), r: 80, text: 'Reach the North Hills mansion' },
        { type: 'pickup', ...at(city, 13, 2), r: 80, text: 'Take the score' },
        { type: 'race', ...at(city, 8, 8), r: 80, text: 'Lose the tail — checkpoint', time: 90 },
        { type: 'deliver', ...at(city, 5, 4), r: 80, text: 'Bring it home to Mara', time: 90 },
      ],
    },
  ];
}

export function createMissionState() {
  return { index: 0, stage: 0, timer: 0, done: false, failed: false };
}

export function currentMission(missions, state) {
  if (state.done || state.index >= missions.length) return null;
  return missions[state.index];
}

export function currentStage(missions, state) {
  const m = currentMission(missions, state);
  if (!m) return null;
  return m.stages[state.stage] || null;
}

export function missionTarget(missions, state) {
  const stage = currentStage(missions, state);
  if (!stage) return null;
  return { x: stage.x, y: stage.y, r: stage.r, text: stage.text, type: stage.type };
}

// Advance the mission chain. Returns an event string for the message feed
// ('stage', 'job', 'all-done', 'timeout') or null.
export function stepMissions(missions, state, player, dt, world) {
  if (state.done) return null;
  const mission = currentMission(missions, state);
  if (!mission) return null;
  const stage = currentStage(missions, state);
  if (!stage) return null;
  if (stage.time) {
    if (state.timer <= 0) state.timer = stage.time;
    state.timer -= dt;
    if (state.timer <= 0) {
      state.timer = 0;
      state.failed = true;
      return 'timeout';
    }
  }
  const dx = player.x - stage.x;
  const dy = player.y - stage.y;
  const reach = stage.r + (player.inHeli ? 40 : 0);
  if (dx * dx + dy * dy > reach * reach) return null;
  if (stage.type === 'steal' && player.onFoot) return null;
  if (stage.type === 'heli' && state.stage === 0 && !player.inHeli) return null;
  state.stage += 1;
  state.timer = 0;
  if (state.stage >= mission.stages.length) {
    player.money += mission.reward;
    player.rp += 120;
    state.index += 1;
    state.stage = 0;
    if (state.index >= missions.length) {
      state.done = true;
      return 'all-done';
    }
    return 'job';
  }
  return 'stage';
}

export function jobLabel(state) {
  return `JOB ${Math.min(state.index + 1, 8)}/8`;
}
