// Solmar Bay — entry program (Node 22, standard library only). Copies the
// game and its screenshots into MAKEFUN_OUTPUT_DIR, then writes dossier.json
// with the vendored buildDossier helper.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR;
if (!out) {
  throw new Error('MAKEFUN_OUTPUT_DIR is not set');
}
mkdirSync(out, { recursive: true });
for (const name of ['game', 'screenshots']) {
  const src = join(here, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in ${here}`);
  cpSync(src, join(out, name), { recursive: true });
}
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
