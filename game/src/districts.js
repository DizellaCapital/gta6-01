// Solmar Bay's districts. Each district is a rectangle of the city with a
// name and a standing score that drifts with the player's behaviour there.
export const DISTRICTS = [
  { name: 'Marina', x: 0, y: 0, w: 800, h: 800, standing: 62 },
  { name: 'Old Town', x: 800, y: 0, w: 800, h: 800, standing: 48 },
  { name: 'Downtown', x: 1600, y: 0, w: 800, h: 800, standing: 55 },
  { name: 'North Hills', x: 2400, y: 0, w: 800, h: 800, standing: 71 },
  { name: 'Portside', x: 0, y: 800, w: 800, h: 800, standing: 34 },
  { name: 'Market Row', x: 800, y: 800, w: 800, h: 800, standing: 58 },
  { name: 'Civic Center', x: 1600, y: 800, w: 800, h: 800, standing: 66 },
  { name: 'East Docks', x: 2400, y: 800, w: 800, h: 800, standing: 29 },
  { name: 'Sunset Strip', x: 0, y: 1600, w: 800, h: 800, standing: 74 },
  { name: 'Little Havana', x: 800, y: 1600, w: 800, h: 800, standing: 41 },
  { name: 'University', x: 1600, y: 1600, w: 800, h: 800, standing: 69 },
  { name: 'South Beach', x: 2400, y: 1600, w: 800, h: 800, standing: 80 },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

export function standingLabel(value) {
  if (value >= 75) return 'Loved';
  if (value >= 60) return 'Liked';
  if (value >= 45) return 'Neutral';
  if (value >= 30) return 'Shady';
  return 'Hated';
}
