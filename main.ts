// Solmar Bay — entry point (Node 22, stdlib only).
// Copies game/ and screenshots/ into MAKEFUN_OUTPUT_DIR and writes dossier.json
// through the kit's buildDossier, with the gate's caps.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const out = process.env.MAKEFUN_OUTPUT_DIR;
if (!out) {
  console.error('MAKEFUN_OUTPUT_DIR is not set');
  process.exit(1);
}
mkdirSync(out, { recursive: true });
cpSync('game', join(out, 'game'), { recursive: true });
cpSync('screenshots', join(out, 'screenshots'), { recursive: true });
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`dossier.json written (${dossier.length} bytes) to ${out}`);
