// Districts of Solmar Bay: name + the player's standing in each one.
// Standing rises when jobs are finished in that district.
import { CONFIG, DISTRICT_NAMES } from './config.js';

export function makeDistricts() {
  // 4 columns x 3 rows of districts across the map.
  return DISTRICT_NAMES.map((name, i) => ({
    name,
    col: i % 4,
    row: Math.floor(i / 4),
    standing: 0, // 0..100
  }));
}

export function districtAt(x, y) {
  const col = Math.max(0, Math.min(3, Math.floor((x / CONFIG.WORLD_W) * 4)));
  const row = Math.max(0, Math.min(2, Math.floor((y / CONFIG.WORLD_H) * 3)));
  const idx = row * 4 + col;
  return DISTRICT_NAMES[idx];
}

export function standingLabel(v) {
  if (v >= 70) return 'RESPECTED';
  if (v >= 40) return 'KNOWN';
  if (v >= 15) return 'NOTICED';
  return 'STRANGER';
}
