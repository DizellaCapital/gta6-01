// Districts of Solmar Bay. Each one covers a rectangle of the map and
// carries the player's standing there, shown in the HUD.

export const DISTRICTS = [
  { name: 'Marina del Sol', x0: 0, y0: 0, x1: 1067, y1: 800, standing: 62 },
  { name: 'Old Harbor', x0: 1067, y0: 0, x1: 2133, y1: 800, standing: 48 },
  { name: 'Palm Court', x0: 2133, y0: 0, x1: 3200, y1: 800, standing: 71 },
  { name: 'Voss Heights', x0: 0, y0: 800, x1: 1067, y1: 1600, standing: 35 },
  { name: 'Calle Ocho', x0: 1067, y0: 800, x1: 2133, y1: 1600, standing: 58 },
  { name: 'North Docks', x0: 2133, y0: 800, x1: 3200, y1: 1600, standing: 41 },
  { name: 'Sunset Beach', x0: 0, y0: 1600, x1: 3200, y1: 2400, standing: 66 },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[0];
}
