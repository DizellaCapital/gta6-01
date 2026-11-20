# Solmar Bay — "Make GTA 6" (gta6-01)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/DizellaCapital/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/DizellaCapital/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A make.fun `program/v1` entry for the account `@a-dizella-capital`.

## What it is

**Solmar Bay** is an original open-world crime game in the spirit of GTA 6,
built by a recorded Muse agent session. Explore sun-soaked Solmar City on foot,
by car, and by helicopter: traffic, pedestrians, car theft, a 1–5 star wanted
system with SBPD dispatch (named units, roadblocks, police helicopter with
spotlight), 8 story missions, street races, a garage, a 3-person crew with
abilities, in-game radio with 4 stations, weapon slots, armor, districts with
standing, rank/RP, and a dense HUD with a circular minimap. Start/pause/
game-over, localStorage saves, and synthesized WebAudio sound. No Rockstar
names, characters, maps, or assets anywhere.

- `main.ts` (Node 22, standard library only) hands the game in: it copies
  `game/` and `screenshots/` to the output directory and writes
  `dossier.json`, the summary the judge reads.
- `game/` is plain static files a desktop browser loads offline
  (`game/index.html` and its ES modules, no library, no network request).
- `screenshots/` holds 4 play-test captures (start, play, chase, end).

## Features

- **Helicopter** — fly the Skyhawk-9 from the helipad (W/S thrust, A/D turn,
  Space climb, C descend, E to land & exit); one story mission is flown.
- **Radio** — 4 original stations (Bay FM, Reef Radio, Harbor Rock,
  Solmar Talk) with DJs and song titles; R switches station, songs advance.
- **8 story missions** — taxi, delivery, getaway, beach rescue, courier chase,
  Harbor Sprint street race, Rooftop Run heli job, and The Big Score finale.
- **5-star dispatch** — named SBPD units with roles and distances, roadblocks
  at 4+ stars, SBPD Air-1 helicopter with spotlight at 3+ stars.
- **Street race** — repeatable 4-gate sprint against 2 rivals (G at the flag).
- **Garage** — repair + repaint for $50, and heat fades faster inside.
- **Crew** — Tito Reyes (clean plates, 1), Lena Park (field repair, 2),
  Mara Voss (lookout, 3), each on a cooldown.
- **Dense HUD** — mission panel (job x/8, stage, timer bar, next objective),
  dispatch panel, weapon slots, crew cards, radio readout, speed, car name +
  condition + plate, money, wanted stars, circular minimap, health/armor,
  district + standing, rank/RP, NPC dialogue box.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk & drive (W/S thrust, A/D turn in the heli) |
| E | Enter/exit car or helicopter |
| Space | Punch / brake / climb (heli) |
| C | Descend (heli) |
| X / click | Shoot |
| Q | Switch weapon (Fists / Pistol / SMG) |
| R | Next radio station |
| G | Garage (repair/repaint) / join street race |
| 1 / 2 / 3 | Crew abilities (plates / repair / lookout) |
| P | Pause · M mute · L continue save |

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
