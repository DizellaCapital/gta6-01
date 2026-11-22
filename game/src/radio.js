// Four radio stations. Music is synthesized in audio.js; this module owns
// the station list, the current station and the track readout.
export const STATIONS = [
  { name: 'SOLMAR FM', genre: 'Sunset Pop', tracks: ['Neon Coastline', 'Palm Static', 'Gold Hour Drive'] },
  { name: 'BAY 98.5', genre: 'Latin Heat', tracks: ['Calle Sol', 'Marina Nights', 'Rumba del Puerto'] },
  { name: 'STATIC 101', genre: 'Synthwave', tracks: ['Midnight Overdrive', 'Chrome Rain', 'Vector Dreams'] },
  { name: 'TALK 720', genre: 'Talk & News', tracks: ['The Bay Report', 'Harbor Call-In', 'City Hall Hour'] },
];

export function makeRadio() {
  return { station: 0, track: 0, on: true };
}

export function stationName(radio) {
  return STATIONS[radio.station % STATIONS.length].name;
}

export function trackName(radio) {
  const st = STATIONS[radio.station % STATIONS.length];
  return st.tracks[radio.track % st.tracks.length];
}

export function genreName(radio) {
  return STATIONS[radio.station % STATIONS.length].genre;
}

export function nextStation(radio) {
  radio.station = (radio.station + 1) % STATIONS.length;
  radio.track = 0;
  return radio.station;
}

export function nextTrack(radio) {
  const st = STATIONS[radio.station % STATIONS.length];
  radio.track = (radio.track + 1) % st.tracks.length;
}
