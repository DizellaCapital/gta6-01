# Solmar Bay

An open-world crime game in the browser. Drive, steal cars, fly a helicopter,
dodge the SBPD, and run eight story jobs for Mara Voss across a sunny coastal
city — no libraries, no network requests, just a canvas and a seeded world.

## Play

```sh
node serve.ts
```

Then open http://localhost:8080/ in a browser.

- **WASD / arrows** — walk or drive
- **E** — enter / exit a car, board the helicopter at the helipad
- **Space / click** — shoot
- **Q** — change radio station
- **1 / 2 / 3** — call a crew member (Jax, Lena, Marco)
- **G** — store a car in the Junction garage, **R** — repair it ($100)
- **P** — pause, **M** — mute, **Enter** — start / restart

Progress saves to localStorage automatically.

## Screenshots

Four staged scenes (`?shot=start|play|chase|end&seed=1`) run the real
simulation forward with an autopilot, so every frame is genuine gameplay.

## License

MIT
