// Solmar Bay — make.fun entry program (gta6-01).
//
// What this does: copies the playable game in game/ and the four staged
// screenshots in screenshots/ from this repository into the output
// directory, then writes dossier.json there with the kit's buildDossier
// helper from vendor/makefun-game.ts.
//
// Run it locally with:
//   MAKEFUN_OUTPUT_DIR=/tmp/gta6-out node main.ts
// and play the game itself with:
//   node serve.ts --port 8080
// then open http://127.0.0.1:8080/ in a browser.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Solmar Bay dossier written to ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
