// Radio. Four stations, each with a name, a flavour line and a rotating
// playlist of song titles. The audio module turns the current station into
// synthesized WebAudio music; this module only owns the schedule.
export const STATIONS = [
  {
    name: 'SOLMAR FM',
    tag: 'Top 40 · sun-soaked hits',
    songs: ['Neon Tide — Midnight Drive', 'Palma — Golden Hour', 'The Breakers — Salt Air'],
  },
  {
    name: 'BAY 97',
    tag: 'Hip-hop · street anthems',
    songs: ['Kilo — Corner Store', 'Voss — Crown Money', 'Dre Low — Bay Nights'],
  },
  {
    name: 'VICE WAVE',
    tag: 'Synthwave · night drive',
    songs: ['Laserhawk — Chrome Sunset', 'Nightride — Vector', 'Glass Tiger — After Dark'],
  },
  {
    name: 'TALK 1010',
    tag: 'Talk · Solmar Bay news',
    songs: ['The Morning Tide — headlines', 'Bay Talk — callers on the heist', 'Sports Desk — Sharks vs Suns'],
  },
];

export function createRadio() {
  return { station: 0, song: 0, songTime: 0, songLen: 24 };
}

export function currentStation(radio) {
  return STATIONS[radio.station];
}

export function currentSong(radio) {
  const st = currentStation(radio);
  return st.songs[radio.song % st.songs.length];
}

export function nextStation(radio) {
  radio.station = (radio.station + 1) % STATIONS.length;
  radio.song = 0;
  radio.songTime = 0;
}

export function stepRadio(radio, dt) {
  radio.songTime += dt;
  if (radio.songTime >= radio.songLen) {
    radio.songTime = 0;
    radio.song += 1;
  }
}
