// Solmar Bay — tuning, palette and world layout in one place.
// The camera shows a fixed 1280x720 logical window; the city itself is
// 3200x2400, so the camera follows the player through it.
export const FIELD = { width: 1280, height: 720 };
export const WORLD = { width: 3200, height: 2400 };
export const STEP = 1 / 60;

// Roads: vertical avenues and horizontal streets, 96 px wide.
export const ROADS_V = [400, 1000, 1600, 2200, 2800];
export const ROADS_H = [350, 850, 1350, 1850];
export const ROAD_W = 96;

export const PLAYER = {
  radius: 13,
  walkSpeed: 210,
  runSpeed: 260,
  health: 100,
  punchRange: 34,
  punchDamage: 18,
  punchCooldown: 0.45,
};

export const CAR = {
  length: 52,
  width: 26,
  maxSpeed: 430,
  policeMaxSpeed: 470,
  accel: 340,
  brake: 520,
  reverseMax: 150,
  steer: 2.6,
};

export const WANTED_MAX = 5;

export const PALETTE = {
  backdrop: '#0e1a24',
  grass: '#7fae62',
  park: '#5da24e',
  sand: '#ecd9a0',
  water: '#2e7fb8',
  deepWater: '#1d5f92',
  road: '#3a3f47',
  roadEdge: '#2c3038',
  lane: '#f2d06b',
  sidewalk: '#b9b3a4',
  buildingA: '#e8b04b',
  buildingB: '#d96a4a',
  buildingC: '#4a90c2',
  buildingD: '#8a6fb8',
  buildingE: '#e8e0d0',
  roof: '#5a5148',
  text: '#f4f1e8',
  muted: '#c9c4b4',
  panel: 'rgba(16,24,32,0.88)',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#3b82f6',
  green: '#4ade80',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const SAVE_KEY = 'solmar-bay.save.v1';
export const BEST_KEY = 'solmar-bay.best';
