// Radio: four stations, each with a playlist. The HUD shows the station
// name and the current track; audio.js turns the track into sound.

export const STATIONS = [
  {
    name: 'SOLMAR FM',
    genre: 'Sunset Pop',
    tracks: ['Neon Palms — Midnight Drive', 'Cassia — Golden Hour', 'The Breakers — Tide Song'],
  },
  {
    name: 'BAY 104',
    genre: 'Hip-Hop',
    tracks: ['Young Reef — Bay Anthem', 'Mara Voss — Crown Talk', 'DJ Ferry — Harbor Lights'],
  },
  {
    name: 'VOSS TALK',
    genre: 'Talk Radio',
    tracks: ['The Morning Bay — Traffic & Crime', 'Harbor News — City Hall', 'Night Lines — Callers'],
  },
  {
    name: 'PALM ROCK',
    genre: 'Rock',
    tracks: ['Desert Engine — Redline', 'The Gulls — High Tide', 'Iron Pier — Rust City'],
  },
];

export function createRadio() {
  return { station: 0, track: 0, trackTime: 0, on: true };
}

export function currentStation(radio) {
  return STATIONS[radio.station];
}

export function currentTrack(radio) {
  const s = currentStation(radio);
  return s.tracks[radio.track % s.tracks.length];
}

export function nextStation(radio) {
  radio.station = (radio.station + 1) % STATIONS.length;
  radio.track = 0;
  radio.trackTime = 0;
}

export function stepRadio(radio, dt) {
  radio.trackTime += dt;
  // A track lasts about 24 seconds, then the next one plays.
  if (radio.trackTime > 24) {
    radio.trackTime = 0;
    const s = currentStation(radio);
    radio.track = (radio.track + 1) % s.tracks.length;
  }
}
