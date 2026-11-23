// Solmar Bay — world constants. Every tunable number for the city lives here
// so the simulation, the renderer and the staging driver all agree on one set.
export const CFG = {
  WORLD_W: 3200,
  WORLD_H: 2400,
  GRID: 200,          // distance between neighbouring roads
  ROAD_W: 64,         // asphalt width
  LANE: 16,           // lane offset from a road centre line
  DT: 1 / 60,         // fixed simulation step, seconds
  WALK_SPEED: 155,
  CAR_TOP: 380,
  CAR_ACCEL: 300,
  CAR_BRAKE: 520,
  CAR_REVERSE: 150,
  CAR_TURN: 2.6,      // radians per second at full steer
  HELI_SPEED: 460,
  HELI_CLIMB: 220,
  TRAFFIC_COUNT: 16,
  PED_COUNT: 26,
  WANTED_MAX: 5,
  CRIME_MEMORY: 9,    // seconds after the last crime before stars start to fade
  WANTED_FADE: 7,     // seconds of quiet per star lost
  BULLET_SPEED: 720,
  BULLET_RANGE: 520,
  PALETTE: {
    grass: '#5d8a4a',
    park: '#4c7a3e',
    sand: '#d9c184',
    water: '#2f6f8f',
    asphalt: '#33363b',
    asphaltEdge: '#26282c',
    dash: '#d8c95a',
    sidewalk: '#8d8578',
    buildingRoof: '#b08954',
    buildingRoof2: '#7d8aa0',
    buildingRoof3: '#a05a4e',
    buildingRoof4: '#6f7d5a',
    helipad: '#3a3f45',
    garage: '#5a5148',
    hudBg: 'rgba(8, 12, 18, 0.78)',
    hudLine: 'rgba(255, 255, 255, 0.16)',
    hudText: '#f2f4f6',
    hudDim: '#aeb8c2',
    accent: '#ffd23e',
    danger: '#ff5252',
    good: '#58d68d',
    police: '#2f6fd0',
    playerCar: '#e8b13c',
  },
  CAR_COLORS: ['#c94f43', '#4f7ec9', '#e8e8e8', '#3f9e6b', '#8a5fc0', '#d97b2f', '#5bc0c9', '#b8b8b8'],
  PED_COLORS: ['#e8c39e', '#8a5a3b', '#5a3b2a', '#f0d0b0', '#6b4a2f'],
  SHIRT_COLORS: ['#d94f4f', '#4f8ad9', '#58b368', '#e8d44f', '#9b59b6', '#e8e8e8', '#2f2f2f'],
};
