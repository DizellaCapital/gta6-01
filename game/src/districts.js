// Districts of Solmar Bay + street standing. Districts are pure map
// regions (no Rockstar names); standing is derived from jobs done and
// current heat, so the HUD can show where Rico stands in each part of town.
export const DISTRICTS = [
  { name: 'Palm Court', x0: 0, y0: 0, x1: 1600, y1: 850 },
  { name: 'Downtown', x0: 1600, y0: 0, x1: 3200, y1: 850 },
  { name: 'Harbor Row', x0: 0, y0: 850, x1: 1600, y1: 1350 },
  { name: 'Old Marina', x0: 1600, y0: 850, x1: 3200, y1: 1350 },
  { name: 'Canal District', x0: 0, y0: 1350, x1: 1600, y1: 1850 },
  { name: 'Marina District', x0: 1600, y0: 1350, x1: 3200, y1: 1850 },
  { name: 'South Beach', x0: 0, y0: 1850, x1: 3200, y1: 2400 },
];

export function districtFor(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  }
  return 'Solmar Bay';
}

/** Standing: heat overrides everything; otherwise jobs done earns respect. */
export function standingFor(jobsDone, wanted) {
  if (wanted >= 4) return 'Hunted';
  if (wanted >= 2) return 'Hot';
  if (jobsDone >= 7) return 'Legend of the Bay';
  if (jobsDone >= 5) return 'Respected';
  if (jobsDone >= 3) return 'Known';
  if (jobsDone >= 1) return 'Getting known';
  return 'Nobody yet';
}
