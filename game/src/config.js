// Solmar Bay — world constants. One place for every number the sim uses,
// so tuning never means hunting through files.

export const CONFIG = {
  // World size in pixels. Roads form a grid across the whole map.
  WORLD_W: 3200,
  WORLD_H: 2400,
  ROAD_SPACING: 400,
  ROAD_W: 72,
  SIDEWALK: 14,

  // Fixed simulation step (seconds).
  DT: 1 / 60,

  // Movement speeds (pixels per second).
  WALK_SPEED: 180,
  WALK_SPRINT: 260,
  CAR_MAX_SPEED: 430,
  CAR_ACCEL: 300,
  CAR_REVERSE_MAX: 140,
  CAR_BRAKE: 520,
  CAR_TURN: 2.9,
  HELI_SPEED: 340,
  HELI_CLIMB: 120,
  PED_SPEED: 55,
  TRAFFIC_SPEED: 150,

  // Wanted system.
  WANTED_MAX: 5,
  WANTED_DECAY_SECONDS: 14,
  ROADBLOCK_MIN_WANTED: 3,
  HELI_MIN_WANTED: 4,

  // Combat.
  PLAYER_HP: 100,
  PLAYER_ARMOR: 50,

  // Economy.
  START_MONEY: 250,

  // Palette.
  PALETTE: {
    grass: '#5d8a4a',
    sand: '#d9c184',
    sea: '#2e6f9e',
    road: '#3a3d42',
    roadLine: '#e8d44d',
    sidewalk: '#9a938a',
    building: '#b08968',
    buildingRoof: '#7a5c40',
    buildingAlt: '#8f7d6b',
    park: '#4c7a3d',
    player: '#e63946',
    police: '#2b6cb0',
    traffic: '#d8d8d8',
    heli: '#1f2937',
    marker: '#ffd60a',
  },
};
