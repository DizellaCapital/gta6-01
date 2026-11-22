// Solmar Bay — Node entry point. Copies game/ and screenshots/ into the
// output directory (MAKEFUN_OUTPUT_DIR) and writes dossier.json via the
// vendor dossier builder. Node 22, stdlib only.
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || join(here, 'out');

mkdirSync(outDir, { recursive: true });

const gameSrc = join(here, 'game');
if (!existsSync(gameSrc)) throw new Error('game/ directory missing');
cpSync(gameSrc, join(outDir, 'game'), { recursive: true });

const shotsSrc = join(here, 'screenshots');
if (existsSync(shotsSrc)) {
  const shots = readdirSync(shotsSrc).filter((f) => f.toLowerCase().endsWith('.jpg'));
  if (shots.length > 0) cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier written: ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
