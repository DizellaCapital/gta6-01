// Solmar Bay districts. Each district covers a rectangle of the map and tracks
// how the locals feel about Rico: friendly turf pays better, hostile turf
// calls the SBPD faster.
export const DISTRICTS = [
  { name: 'Marina Row', x: 0, y: 2400, w: 1600, h: 1200, standing: 62, blurb: 'Yachts, neon, easy money.' },
  { name: 'Old Solmar', x: 0, y: 1200, w: 1600, h: 1200, standing: 48, blurb: 'Brick lanes, old debts.' },
  { name: 'North Docks', x: 0, y: 0, w: 1600, h: 1200, standing: 35, blurb: 'Containers and quiet deals.' },
  { name: 'Palm Heights', x: 1600, y: 2400, w: 1600, h: 1200, standing: 71, blurb: 'Rich, bored, careless.' },
  { name: 'Civic Center', x: 1600, y: 1200, w: 1600, h: 1200, standing: 40, blurb: 'Cops on every corner.' },
  { name: 'Junction Yards', x: 1600, y: 0, w: 1600, h: 1200, standing: 55, blurb: 'Trains, garages, chop shops.' },
  { name: 'Solmar Beach', x: 3200, y: 2400, w: 1600, h: 1200, standing: 66, blurb: 'Boardwalk crowds, fast getaways.' },
  { name: 'The Strip', x: 3200, y: 1200, w: 1600, h: 1200, standing: 58, blurb: 'Casinos never sleep.' },
  { name: 'East Industrial', x: 3200, y: 0, w: 1600, h: 1200, standing: 30, blurb: 'Warehouses, no witnesses.' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[4];
}

export function standingLabel(v) {
  if (v >= 65) return 'Loved';
  if (v >= 50) return 'Liked';
  if (v >= 40) return 'Neutral';
  if (v >= 30) return 'Wary';
  return 'Hostile';
}
