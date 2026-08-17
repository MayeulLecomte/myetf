#!/usr/bin/env node
/* =============================================================
   MARQUEUR DE VERSION PUBLIÉE
   -------------------------------------------------------------
   Écrit version.json à partir du cache-buster déjà porté par
   index.html (`?v=…`). C'est le seul fichier que l'application
   ira chercher sans passer par le cache, et le seul moyen de
   détecter qu'un navigateur travaille sur une version périmée.

   Le problème qu'il résout : les numéros de version des scripts
   et de la feuille de style vivent DANS index.html. Si le
   navigateur garde index.html, il garde aussi les anciens
   numéros, et le cache-buster ne buste plus rien. Safari sur
   iPhone est particulièrement tenace là-dessus.

   Usage :  node scripts/version.mjs
   ============================================================= */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

const html = readFileSync(join(RACINE, 'index.html'), 'utf8');
const versions = [...html.matchAll(/\?v=(\d+)/g)].map(m => m[1]);

if (!versions.length) {
  console.error('Aucun marqueur ?v= trouvé dans index.html.');
  process.exit(1);
}

/* Tous les fichiers portent normalement le même marqueur ; en cas de
   divergence on retient le plus récent, qui est celui qui compte. */
const version = versions.sort().slice(-1)[0];
const distinctes = new Set(versions);

writeFileSync(join(RACINE, 'version.json'),
  JSON.stringify({ version, publie: new Date().toISOString().slice(0, 10) }) + '\n');

console.log('version.json → ' + version +
  (distinctes.size > 1 ? '  ⚠ ' + distinctes.size + ' marqueurs différents dans index.html' : ''));
