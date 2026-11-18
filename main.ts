// BLOOMWARD — hand-in program for the best-game-01 bounty.
//
// The game itself is the static site in game/ beside this file: one HTML
// page and a set of ES modules, no build step, nothing fetched from the
// network. This program's only job is delivery — copy game/ and
// screenshots/ into the output directory, then write dossier.json there
// using the kit's own vendored library, so the bytes are exactly what
// the scorer rebuilds on its side.
//
// Run it the way the grader does, or locally with an override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Refuse to hand in an empty shell: if the garden is missing, fail here
// with a clear message instead of letting the gate find nothing.
if (!existsSync(join(repoDir, 'game', 'index.html'))) {
  throw new Error('game/index.html not found — there is no game to hand in.');
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });

mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// The caps below mirror the gate's own limits, so an oversize entry is
// refused here first, with the same numbers the scorer would use.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`BLOOMWARD delivered to ${outDir}: game/, screenshots/ and dossier.json are ready.`);
