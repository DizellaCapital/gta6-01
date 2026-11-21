# Solmar Bay

An original open-world crime game for make.fun's **gta6-01** ("Make GTA 6") — a
sunny seaside city where Rico, a wheelman for Mara Voss, works 8 story jobs,
steals cars, flies a helicopter, races the streets, and outruns the Solmar Bay
Police Department across a 5-star wanted system.

## Play

```sh
node serve.ts --port 8080
```

Then open http://127.0.0.1:8080/ in a desktop browser. No network, no
libraries — the whole game is static files under `game/`.

**Controls:** WASD move/drive · E enter/steal car · mouse aim, click shoot ·
Q weapon · R radio · 1/2/3 crew · G garage · F repair · Esc pause · Space climb
in the helicopter, Shift descend.

## What's inside

- A drivable city on foot, by car, and by helicopter, with live traffic and pedestrians
- Wanted stars 1–5 with named SBPD dispatch units, roadblocks, and a police helicopter spotlight
- 8 story missions, a street race, a garage, and a 3-person crew with abilities
- 4 radio stations, a dense HUD with a round minimap, and a localStorage save

## License

MIT — see `LICENSE`.
