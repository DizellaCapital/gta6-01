// Solmar Bay radio: four stations, each with its own sound, tempo and a
// rotating list of (fictional) tracks. R cycles stations; the HUD shows the
// station name and the track now playing.
export const STATIONS = [
  {
    id: 0,
    name: 'Reef Radio 88.4',
    freq: '88.4',
    bpm: 96,
    root: 220,
    wave: 'triangle',
    scale: [0, 3, 5, 7, 10],
    pattern: [0, 2, 1, 3, 4, 3, 2, 1, 0, 2, 4, 3, 2, 1, 0, -1],
    tracks: ['Low Tide Love — The Palms', 'Salt Air — Marina Grey', 'Boardwalk Lights — Sol'],
  },
  {
    id: 1,
    name: 'Solmar FM 101.2',
    freq: '101.2',
    bpm: 122,
    root: 247,
    wave: 'square',
    scale: [0, 2, 4, 7, 9],
    pattern: [0, 1, 2, 1, 3, 2, 4, 2, 3, 4, 3, 2, 1, 2, 0, -1],
    tracks: ['Neon Coast — Vela', 'Sunset Strip — The Gulls', 'Gold Hour — Cassia'],
  },
  {
    id: 2,
    name: 'Bay Beats 95.6',
    freq: '95.6',
    bpm: 128,
    root: 196,
    wave: 'sawtooth',
    scale: [0, 2, 3, 7, 8],
    pattern: [0, 0, 2, 0, 3, 0, 2, 4, 0, 0, 2, 3, 4, 3, 2, 1],
    tracks: ['Harbor Nights — DJ Breakwater', 'Container Shuffle — Kestrel', 'Dockside — Mira Vane'],
  },
  {
    id: 3,
    name: 'Night Drive 107.9',
    freq: '107.9',
    bpm: 84,
    root: 174,
    wave: 'sine',
    scale: [0, 3, 5, 6, 10],
    pattern: [0, 3, 2, 4, 3, 2, 1, 2, 0, 2, 3, 4, 3, 1, 0, -1],
    tracks: ['Midnight Overpass — Nocturne', 'Headlight Hymn — The Lanes', 'Empty Freeway — Alba'],
  },
];

export function stationById(id) {
  return STATIONS[((id % STATIONS.length) + STATIONS.length) % STATIONS.length];
}

export function nextStationId(id) {
  return (id + 1) % STATIONS.length;
}

export function trackFor(station, timeSeconds) {
  const slot = Math.floor(timeSeconds / 24) % station.tracks.length;
  return station.tracks[slot];
}
