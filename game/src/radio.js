// Solmar Bay — radio. Four stations; the HUD shows the station and the
// current track, and the track rolls over on a timer. Audio itself lives
// in audio.js; this module only owns the station data and the clock.
export const STATIONS = [
  { name: 'Reef Radio', freq: '88.4', genre: 'Chill waves', tracks: ['Low Tide Love', 'Coral Sunset', 'Salt Air Drive'] },
  { name: 'Volt FM', freq: '101.2', genre: 'Electro', tracks: ['Neon Freeway', 'Midnight Overdrive', 'Pulse of the Bay'] },
  { name: 'Palm Talk', freq: '96.6', genre: 'Talk', tracks: ['The Marina Hour', 'Bay Politics Live', 'Sports Desk'] },
  { name: 'Sunset Rock', freq: '104.7', genre: 'Rock', tracks: ['Highway Hearts', 'Chrome and Thunder', 'Last Light Run'] },
];

export function currentTrack(state) {
  const s = STATIONS[state.radioStation % STATIONS.length];
  const idx = Math.floor(state.time / 30) % s.tracks.length;
  return { station: s, track: s.tracks[idx] };
}

export function nextStation(state) {
  state.radioStation = (state.radioStation + 1) % STATIONS.length;
  const s = STATIONS[state.radioStation];
  return `${s.name} ${s.freq} — ${s.genre}`;
}
