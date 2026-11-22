// Four radio stations. The HUD shows the station name and the current track;
// the audio engine synthesises a different groove per station.
export const STATIONS = [
  { name: 'SOLMAR FM 88.1', genre: 'Sunset Pop', tracks: ['Palm Shadows — The Coastals', 'Neon Tide — Marina Blue', 'Golden Hour — Rico & The Palms'] },
  { name: 'BAY BEATS 94.6', genre: 'Hip-Hop', tracks: ['Corner King — Voss', 'Run The Block — DJ Ferry', 'Lowrider Nights — Sol Mar'] },
  { name: 'VICE ROCK 101.3', genre: 'Rock', tracks: ['Highway Heat — Asphalt', 'Chrome Hearts — The Getaways', 'Redline — Midnight Mile'] },
  { name: 'TALK BAY 107.9', genre: 'Talk / News', tracks: ['SBPD Scanner — Live', 'Bay Talk with Mara', 'Traffic & Weather — Hourly'] },
];

export function createRadio() {
  return { station: 0, track: 0, trackTime: 0 };
}

export function currentStation(radio) {
  return STATIONS[radio.station];
}

export function currentTrack(radio) {
  const s = STATIONS[radio.station];
  return s.tracks[radio.track % s.tracks.length];
}

export function nextStation(radio) {
  radio.station = (radio.station + 1) % STATIONS.length;
  radio.track = 0;
  radio.trackTime = 0;
  return currentStation(radio);
}

export function tickRadio(radio, dt) {
  radio.trackTime += dt;
  const s = STATIONS[radio.station];
  const len = s.genre === 'Talk / News' ? 45 : 150;
  if (radio.trackTime > len) {
    radio.trackTime = 0;
    radio.track = (radio.track + 1) % s.tracks.length;
  }
}
