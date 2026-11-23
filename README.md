# Solmar Bay

A 2D top-down open-world crime game set in the sun-soaked coastal city of
Solmar Bay. Play as Rico, a wheelman working for Mara Voss: drive and steal
cars, fly the helicopter, dodge the SBPD, run eight story jobs, build a crew
and climb from Small Timer to Kingpin.

- No libraries, no network requests — plain ES modules on a canvas.
- Deterministic: the same seed always builds the same city and the same
  screenshot frames (`?shot=start|play|chase|end&seed=1`).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080/ in a browser.

Controls: WASD drive / walk · E enter & exit cars · Q radio · C weapon ·
1-3 call crew · SPACE shoot · ESC pause · ENTER start.

## License

MIT — see LICENSE.
