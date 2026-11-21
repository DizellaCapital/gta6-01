// Solmar Bay — districts. Each part of town has a name and a standing with
// the player; the HUD shows where Rico is and how the locals feel about him.
import { CONFIG } from './config.js';

export const DISTRICTS = CONFIG.districts;

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[0];
}

// Standing drifts as Rico works: finishing jobs warms a district up.
export function standingFor(district, missionsDone) {
  if (missionsDone >= 6) return 'Respected';
  if (missionsDone >= 3) return district.standing === 'Hostile' ? 'Neutral' : 'Friendly';
  return district.standing;
}
