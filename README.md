# Solmar Bay

An original open-world crime game that runs offline in a desktop browser —
a sun-soaked coastal city to explore on foot, by car and by helicopter.

You are Rico, a wheelman working for Mara Voss. Drive the streets of Solmar
Bay, steal cars, outrun the SBPD's five-star wanted system, run eight story
jobs, race the Sunset Strip, keep a garage of stolen rides, call your
three-person crew, and tune four radio stations — all with a dense HUD,
a circular minimap and a save that persists in localStorage.

## Play

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

- **WASD** move / drive · **E** enter or steal a car (or take the helicopter
  from the helipad) · **Mouse** aim, **click** shoot · **Q** switch weapon
- **R** change radio station · **1 / 2 / 3** call Dex, Lena or Ivo
- **Esc** pause · **M** retry a failed job

## Details

- No libraries, no network requests: plain ES modules + 2D canvas.
- Deterministic: the same seed stages the same screenshot frames
  (`?shot=start|play|chase|end&seed=1`).
- 8 story missions, 5-star wanted ladder with dispatch roles, roadblocks
  and a police helicopter with a spotlight at wanted 4–5, street racing,
  a garage, a 3-person crew and 4 synth radio stations.

## License

MIT — see LICENSE.
