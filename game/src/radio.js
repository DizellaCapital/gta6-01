// In-game radio for Solmar Bay. Four original stations, each with its
// own DJ line and a playlist of original songs (no licensed music, no
// real artists). The song advances on a timer; R switches station.
export const STATIONS = [
  {
    id: 'bayfm', name: 'Bay FM 101.2', genre: 'Solmar Pop', dj: 'with Sunny Marlow',
    songs: [
      { title: 'Neon Tide', artist: 'The Palmettos' },
      { title: 'Sunset Static', artist: 'Marisol Vega' },
      { title: 'Boardwalk Lights', artist: 'Kid Coral' },
    ],
  },
  {
    id: 'reef', name: 'Reef Radio 88.4', genre: 'Island Beats', dj: 'with DJ Pelican',
    songs: [
      { title: 'Coconut Radio', artist: 'DJ Pelican' },
      { title: 'Low Tide Love', artist: 'The Sand Dollars' },
      { title: 'Mango Season', artist: 'Lulu Bay' },
    ],
  },
  {
    id: 'harbor-rock', name: 'Harbor Rock 97.9', genre: 'Harbor Rock', dj: 'with Roxy Vale',
    songs: [
      { title: 'Concrete Surf', artist: 'The Breakers' },
      { title: 'Night Ferry', artist: 'Iron Gull' },
      { title: 'Gasoline Sunset', artist: 'Roxy Vale' },
    ],
  },
  {
    id: 'talk', name: 'Solmar Talk 640 AM', genre: 'Talk & News', dj: 'with Delia Frost',
    songs: [
      { title: 'The Morning Tide', artist: 'Delia Frost' },
      { title: 'Bay City Beat — news hour', artist: 'Otis Crane' },
      { title: 'Night Lines', artist: 'Otis Crane' },
    ],
  },
];

export const SONG_SECONDS = 18;

export function createRadio() {
  return { station: 0, song: 0, songTimer: 0, on: true };
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
  radio.songTimer = 0;
  return currentStation(radio);
}

export function prevStation(radio) {
  radio.station = (radio.station - 1 + STATIONS.length) % STATIONS.length;
  radio.song = 0;
  radio.songTimer = 0;
  return currentStation(radio);
}

/** Advance the song clock; only plays while the player is in a vehicle. */
export function tickRadio(radio, dt, inVehicle) {
  if (!radio.on || !inVehicle) return;
  radio.songTimer += dt;
  if (radio.songTimer >= SONG_SECONDS) {
    radio.songTimer = 0;
    radio.song = (radio.song + 1) % currentStation(radio).songs.length;
  }
}

export function radioLabel(radio) {
  if (!radio.on) return 'RADIO OFF — press R to turn on';
  const st = currentStation(radio);
  const song = currentSong(radio);
  return `${st.name} · ${song.title} — ${song.artist}`;
}
