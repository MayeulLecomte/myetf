#!/usr/bin/env node
/* =============================================================
   INVENTAIRE DES DÉCLARATIONS
   -------------------------------------------------------------
   L'outil du déménagement, avec l'empreinte des vues.

   Un déménagement PUR ne change rien d'autre que le fichier où
   vit chaque déclaration. L'ensemble des noms, et le texte de
   chacun, doivent donc être identiques avant et après — seule
   la colonne « fichier » a le droit de bouger.

   Ce script relève, pour chaque déclaration de premier niveau,
   son nom, le fichier qui la porte et une empreinte de son
   texte. Les commentaires qui la précèdent en font partie : ils
   la documentent, ils voyagent avec elle.

   Usage :  node test/inventaire.mjs            → le relevé
            node test/inventaire.mjs avant.json → la comparaison

   Le relevé s'écrit sur la sortie standard, en JSON, pour être
   gardé de côté puis repassé en argument après le déplacement.
   ============================================================= */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Tout ce qui déclare dans la portée globale de la page. Les moteurs y
   figurent : ils ne bougent pas, et leur immobilité fait partie de la
   preuve. */
const FICHIERS = [
  'js/app.js',
  'js/ui/socle.js', 'js/ui/dossier.js', 'js/ui/navigation.js',
  'js/ui/vues-profil.js', 'js/ui/vues-allocation.js', 'js/ui/vues-suivi.js',
  'js/ui/catalogue.js', 'js/ui/rapport.js', 'js/ui/entrees.js',
  'js/data/libelles.js', 'js/data/questionnaire.js', 'js/data/allocations.js',
  'js/data/macro.js', 'js/data/fiscalite.js', 'js/data/historique.js',
  'js/data/etf-univers.js',
  /* Les fichiers générés déclarent eux aussi dans la portée globale : ils
     n'ont pas à bouger, mais ils peuvent entrer en collision avec un nom
     déplacé, et c'est justement ce qu'on veut voir. */
  'js/data/catalogue-etf.js', 'js/data/cours-marche.js',
  'js/data/cours-historique.js', 'js/data/note-marche.js',
  'js/engine/profil.js', 'js/engine/allocation.js', 'js/engine/selection.js',
  'js/engine/arbitrage.js', 'js/engine/revenus.js', 'js/engine/backtest.js',
  'js/engine/situation.js', 'js/engine/contrat.js', 'js/engine/univers.js'
];

function empreinte(texte) {
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h * 33) ^ texte.charCodeAt(i)) >>> 0;
  return ('00000000' + h.toString(16)).slice(-8);
}

/* Une déclaration commence AU-DESSUS de sa ligne `function` : les
   commentaires qui la précèdent lui appartiennent et voyagent avec elle.

   On remonte donc, en traitant un bloc /* … *\/ COMME UN TOUT. La première
   version se contentait de reconnaître une ligne « qui ressemble à du
   commentaire », et s'arrêtait au milieu des bandeaux de ce dépôt — dont les
   lignes intérieures ne commencent ni par `*` ni par `//` mais par du texte
   indenté. Elle emportait alors la seule ligne de fermeture, laissant un
   `*\/` orphelin en tête du fichier d'arrivée. */
function debutReel(lignes, i) {
  let d = i;
  while (d > 0) {
    const p = lignes[d - 1].trim();
    if (p === '') { d--; continue; }
    if (p.startsWith('//')) { d--; continue; }
    if (p.endsWith('*/')) {
      /* Remonter jusqu'à l'ouverture du bloc, quoi qu'il y ait entre les deux. */
      let o = d - 1;
      while (o > 0 && lignes[o].indexOf('/*') < 0) o--;
      if (lignes[o].indexOf('/*') < 0) break;
      d = o;
      continue;
    }
    break;
  }
  /* Les lignes blanches de tête ne sont pas du texte : on les rend. */
  while (d < i && lignes[d].trim() === '') d++;
  return Math.max(d, plancher(lignes));
}

/* Le bandeau de tête d'un fichier le décrit, LUI. Il ne suit pas la première
   déclaration venue quand elle déménage : aucune tranche ne commence
   au-dessus de cette ligne. */
function plancher(lignes) {
  let i = 0;
  while (i < lignes.length && lignes[i].trim() === '') i++;
  if (i >= lignes.length || !lignes[i].trim().startsWith('/*')) return 0;
  while (i < lignes.length && lignes[i].indexOf('*/') < 0) i++;
  return Math.min(i + 1, lignes.length);
}

function relever(fichier) {
  const chemin = join(RACINE, fichier);
  if (!existsSync(chemin)) return [];
  const lignes = readFileSync(chemin, 'utf8').split('\n');

  const departs = [];
  lignes.forEach((l, i) => {
    const m = /^(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/.exec(l);
    if (m) departs.push({ nom: m[1], ligne: i, debut: debutReel(lignes, i) });
  });

  return departs.map((d, k) => {
    const fin = k + 1 < departs.length ? departs[k + 1].debut : lignes.length;
    /* Les lignes blanches de tête et de queue ne font pas partie de la
       déclaration : deux fichiers qui l'espacent différemment la portent
       pourtant à l'identique, et l'empreinte doit le dire. */
    const brut = lignes.slice(d.debut, fin);
    while (brut.length && brut[0].trim() === '') brut.shift();
    while (brut.length && brut[brut.length - 1].trim() === '') brut.pop();
    const texte = brut.join('\n');
    return { nom: d.nom, fichier, lignes: fin - d.debut, somme: empreinte(texte) };
  });
}

const releve = {};
let total = 0;
FICHIERS.forEach(f => relever(f).forEach(d => {
  if (releve[d.nom]) {
    console.error('DOUBLON : ' + d.nom + ' — ' + releve[d.nom].fichier + ' puis ' + d.fichier);
    process.exitCode = 1;
  }
  releve[d.nom] = { fichier: d.fichier, lignes: d.lignes, somme: d.somme };
  total++;
}));

const argument = process.argv[2];
if (!argument) {
  console.log(JSON.stringify({ total, declarations: releve }, null, 1));
  console.error(total + ' déclarations relevées sur ' +
                new Set(Object.values(releve).map(d => d.fichier)).size + ' fichiers.');
} else {
  const avant = JSON.parse(readFileSync(argument, 'utf8'));
  const noms = new Set([...Object.keys(avant.declarations), ...Object.keys(releve)]);
  const disparus = [], apparus = [], modifies = [], deplaces = [];

  noms.forEach(n => {
    const a = avant.declarations[n], b = releve[n];
    if (a && !b) return disparus.push(n);
    if (!a && b) return apparus.push(n + ' (' + b.fichier + ')');
    if (a.somme !== b.somme) return modifies.push(n + ' — ' + a.fichier + ' ' + a.somme +
                                                  ' → ' + b.fichier + ' ' + b.somme);
    if (a.fichier !== b.fichier) deplaces.push(n + ' : ' + a.fichier + ' → ' + b.fichier);
  });

  console.log(avant.total + ' déclarations avant · ' + total + ' après');
  console.log('déplacées sans une virgule de changement : ' + deplaces.length);
  const pb = disparus.length + apparus.length + modifies.length;
  if (disparus.length) console.log('\nDISPARUES (' + disparus.length + ') :\n  ' + disparus.join('\n  '));
  if (apparus.length)  console.log('\nAPPARUES (' + apparus.length + ') :\n  ' + apparus.join('\n  '));
  if (modifies.length) console.log('\nTEXTE MODIFIÉ (' + modifies.length + ') :\n  ' + modifies.join('\n  '));

  console.log('\n' + (pb === 0
    ? '✅ déménagement pur : aucune déclaration perdue, ajoutée ni modifiée'
    : '❌ ' + pb + ' écart(s) — ce n\'est pas un déménagement pur'));
  process.exit(pb === 0 ? 0 : 1);
}
