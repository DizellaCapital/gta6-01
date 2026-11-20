# Solmar Bay — "Make GTA 6" (gta6-01)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/DizellaCapital/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/DizellaCapital/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A make.fun `program/v1` entry for the account `@a-dizella-capital`.

## What it is

**Solmar Bay** is an original open-world crime game in the spirit of GTA 6,
built by a recorded Muse agent session. Explore sun-soaked Solmar City on foot
and by car: traffic, pedestrians, car theft, a 1–5 star wanted system with
police chases, 5 story missions for Mara Voss, combat, a HUD with a live
minimap, start/pause/game-over, localStorage saves, and synthesized WebAudio
sound. No Rockstar names, characters, maps, or assets anywhere.

- `main.ts` (Node 22, standard library only) hands the game in: it copies
  `game/` and `screenshots/` to the output directory and writes
  `dossier.json`, the summary the judge reads.
- `game/` is plain static files a desktop browser loads offline
  (`game/index.html` and its ES modules, no library, no network request).
- `screenshots/` holds 4 play-test captures (start, play, chase, end).

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or build the submission output directly:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Entry

- Bounty: https://make.fun/bounty/gta6-01 — "Make GTA 6", $1,666, 100 places.
- Sealed recording: `01a1eebc-f9ab-773d-8b4b-365379889f87` (strict transcripts).
- License: MIT.
