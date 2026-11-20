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

// Helipad (civil heli spawns here) and Rico's garage (repair + repaint).
export const HELIPAD = { x: 2800, y: 350 };
export const GARAGE = { x: 1000, y: 1850, r: 100 };
export const GARAGE_REPAIR_COST = 50;
// Free street-race start (repeatable sprint, G to join).
export const RACE_START = { x: 2200, y: 850 };

export const HELI = {
  length: 64,
  width: 30,
  maxSpeed: 520,
  accel: 300,
  climb: 130, // altitude units per second (0..300)
  maxAlt: 300,
  turn: 2.2,
};

// Original Solmar Bay car models — no real makes or Rockstar names.
export const CAR_NAMES = [
  'Comet GT', 'Bay Runner', 'Solmar Cruiser', 'Palm Coupe', 'Harbor Hauler',
  'Marina GT', 'Sunset Sedan', 'Coral Cab', 'Tide Van', 'Reef Roadster',
];
export const HELI_NAME = 'Skyhawk-9';
export const POLICE_HELI_NAME = 'SBPD Air-1';

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
