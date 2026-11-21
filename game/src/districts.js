// Solmar Bay's districts: eight named quarters, each with the player's
// standing there. Standing rises when jobs finish in the district and falls
// when the player causes trouble in it.
import { CFG, DISTRICT_NAMES } from './config.js';

const STANDINGS = ['Hostile', 'Cold', 'Neutral', 'Warm', 'Trusted'];

export function buildDistricts() {
  const cols = 4;
  const rows = 2;
  const list = [];
  for (let i = 0; i < DISTRICT_NAMES.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    list.push({
      name: DISTRICT_NAMES[i],
      x0: (col * CFG.worldWidth) / cols,
      y0: (row * CFG.worldHeight) / rows,
      x1: ((col + 1) * CFG.worldWidth) / cols,
      y1: ((row + 1) * CFG.worldHeight) / rows,
      standing: 2, // Neutral
    });
  }
  return list;
}

export function districtAt(districts, x, y) {
  for (const d of districts) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return districts[0];
}

export function standingLabel(d) {
  return STANDINGS[Math.max(0, Math.min(STANDINGS.length - 1, d.standing))];
}

export function nudgeStanding(districts, x, y, delta) {
  const d = districtAt(districts, x, y);
  d.standing = Math.max(0, Math.min(STANDINGS.length - 1, d.standing + delta));
  return d;
}
