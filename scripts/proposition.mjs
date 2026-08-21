#!/usr/bin/env node
/* =============================================================
   PROPOSITION D'ARBITRAGES PAR E-MAIL
   -------------------------------------------------------------
   Recalcule les arbitrages d'un dossier avec les cours du jour,
   et décide s'il y a lieu d'écrire au client.

   POURQUOI CE SCRIPT EXISTE. L'application ne sait envoyer qu'un
   `mailto:` — un brouillon ouvert dans le logiciel de messagerie
   de celui qui clique. Pour qu'un e-mail parte SANS que personne
   ne soit devant l'écran, il faut que les arbitrages soient
   calculés ailleurs que dans le navigateur. Ils le sont ici, par
   les MÊMES moteurs : `js/engine/*` et `js/ui/{socle,dossier}.js`
   sont chargés dans un `vm`, exactement comme le fait
   `test/runner.js`. Aucune règle n'est réécrite, et le texte de
   l'e-mail est celui de `texteProposition()` — le même que le
   bouton « Préparer l'e-mail ».

   ⚠  LE DOSSIER EST UNE PHOTO, LES COURS SONT FRAIS. Le dossier
   arrive par la variable d'environnement DOSSIER_CLIENT (un
   secret de dépôt, jamais un fichier versionné : le dépôt est
   public et `.gitignore` interdit d'y committer un dossier). Il
   est figé à la date de son export ; les cours, eux, sont relevés
   chaque matin. Les montants et la dérive sont donc justes tant
   que la COMPOSITION du portefeuille n'a pas changé. Passé
   PEREMPTION_J jours, l'e-mail le dit lui-même — une photo
   périmée qui se tait passerait pour une lecture fraîche.

   ⚠  IL N'ENVOIE RIEN. Il écrit le corps du message et rend un
   verdict ; c'est le workflow qui envoie, après un délai pendant
   lequel l'envoi peut être annulé.

   Usage :
     node scripts/proposition.mjs                  (lit DOSSIER_CLIENT)
     node scripts/proposition.mjs --fichier=d.json (essai local)
     node scripts/proposition.mjs --forcer         (ignore « rien n'a changé »)
   ============================================================= */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const ETAT_ENVOI = join(RACINE, 'data', 'proposition-envoyee.json');
const PEREMPTION_J = 120;

const arg = n => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const drapeau = n => process.argv.includes('--' + n);

/* -------------------------------------------------------------
   LE MÊME MOTEUR QUE L'APPLICATION
   -------------------------------------------------------------
   L'ordre est celui d'`index.html`, et il compte : les `const` de
   premier niveau ne sont pas hissés. `js/ui/socle.js` et
   `js/ui/dossier.js` ne touchent pas au DOM — c'est pour cela
   qu'ils sont chargeables ici, et c'est pour cela que
   `texteProposition()` y a déménagé.
   ------------------------------------------------------------- */
const FICHIERS = [
  'js/data/libelles.js', 'js/data/questionnaire.js', 'js/data/allocations.js',
  'js/data/macro.js', 'js/data/etf-univers.js', 'js/data/fiscalite.js',
  'js/data/historique.js', 'js/data/cours-marche.js', 'js/data/cours-historique.js',
  'js/data/catalogue-etf.js', 'js/data/ecarts-univers.js',
  'js/engine/profil.js', 'js/engine/allocation.js', 'js/engine/selection.js',
  'js/engine/arbitrage.js', 'js/engine/revenus.js', 'js/engine/backtest.js',
  'js/engine/situation.js', 'js/engine/contrat.js', 'js/engine/univers.js',
  'js/ui/socle.js', 'js/ui/dossier.js'
];

function moteur() {
  const ctx = { console };
  vm.createContext(ctx);
  for (const f of FICHIERS) {
    vm.runInContext(readFileSync(join(RACINE, f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

/* -------------------------------------------------------------
   LE DOSSIER
   ------------------------------------------------------------- */
function dossier() {
  const chemin = arg('fichier');
  const brut = chemin ? readFileSync(join(RACINE, chemin), 'utf8') : process.env.DOSSIER_CLIENT;
  if (!brut || !brut.trim()) {
    console.log('Aucun dossier fourni (DOSSIER_CLIENT vide) — rien à proposer.');
    return null;
  }
  try { return JSON.parse(brut); }
  catch (e) {
    console.error('DOSSIER_CLIENT n\'est pas du JSON valide : ' + e.message);
    process.exit(1);
  }
}

/* Injecté comme le fait « Importer un dossier » : les clés connues
   seulement. Une clé inconnue serait un champ d'une version future ; la
   recopier en aveugle ferait entrer n'importe quoi dans `Etat`. */
function injecter(ctx, d) {
  const Etat = vm.runInContext('Etat', ctx);
  Object.keys(d).forEach(k => { if (Etat[k] !== undefined) Etat[k] = d[k]; });
  if (!Etat.mode) Etat.mode = vm.runInContext('MODE_DEFAUT', ctx);
  return Etat;
}

/* -------------------------------------------------------------
   L'ANALYSE — le même appel que `rendreArbitrages()`
   ------------------------------------------------------------- */
function analyser(ctx) {
  return vm.runInContext(`(function () {
    const r = resultatProfil();
    if (!r) return { erreur: 'questionnaire incomplet' };
    const sel = selectionCourante();
    const a = MoteurArbitrage.analyser(
      lignesDetenues(), sel.lignes,
      { enveloppe: Etat.identite.enveloppe || 'AV', apport: apportDisponible() },
      universSelection()
    );
    if (!a) return { erreur: 'aucune ligne détenue ni apport' };
    return {
      profil: r.profil.nom,
      ordres: a.ordres.length,
      deriveMax: a.deriveMax !== undefined ? a.deriveMax : null,
      rotation: a.rotation !== undefined ? a.rotation : null,
      /* Le texte complet : c'est un e-mail, pas un mailto, donc aucune
         limite de longueur à respecter. La liste ne se tronque pas. */
      texte: texteProposition(a, Infinity),
      destinataire: (Etat.identite.email || '').trim(),
      nom: (Etat.identite.nom || '').trim()
    };
  })()`, ctx);
}

/* -------------------------------------------------------------
   A-T-ON DÉJÀ ENVOYÉ CECI ?
   -------------------------------------------------------------
   L'état est versionné dans `data/`, donc PUBLIC : il ne porte
   qu'une empreinte, une date et un décompte. Ni nom, ni montant,
   ni ISIN — une empreinte ne se remonte pas.

   L'empreinte porte sur le texte de la proposition, pas sur la
   liste des ordres : c'est le message reçu qui doit différer pour
   qu'un second parte. Deux jours où la dérive bouge sans changer
   un seul montant arrondi ne valent pas deux e-mails.
   ------------------------------------------------------------- */
function empreinte(texte) {
  return createHash('sha256').update(texte, 'utf8').digest('hex').slice(0, 16);
}

function dernierEnvoi() {
  if (!existsSync(ETAT_ENVOI)) return null;
  try { return JSON.parse(readFileSync(ETAT_ENVOI, 'utf8')); } catch (e) { return null; }
}

function ageDossierJours(d) {
  const iso = d.dernierAcces;
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
}

function principal() {
  const d = dossier();
  if (!d) { sortir({ envoyer: 'non', motif: 'aucun dossier' }); return; }

  const ctx = moteur();
  injecter(ctx, d);

  const a = analyser(ctx);
  if (a.erreur) { sortir({ envoyer: 'non', motif: a.erreur }); return; }

  console.log(`Dossier « ${a.nom || '—'} » · profil ${a.profil} · ${a.ordres} ordre(s).`);

  if (!a.destinataire) {
    sortir({ envoyer: 'non', motif: 'le dossier ne porte pas d\'adresse e-mail' });
    return;
  }
  if (!a.ordres) {
    sortir({ envoyer: 'non', motif: 'aucun arbitrage à proposer' });
    return;
  }

  const emp = empreinte(a.texte);
  const avant = dernierEnvoi();
  if (avant && avant.empreinte === emp && !drapeau('forcer')) {
    sortir({ envoyer: 'non', motif: `proposition inchangée depuis le ${avant.date}` });
    return;
  }

  /* La photo vieillit, et le message le dit. Cette phrase est la seule
     chose qui distingue une proposition fraîche d'une proposition assise
     sur un portefeuille qui n'existe plus. */
  const age = ageDossierJours(d);
  const reserve = (age !== null && age > PEREMPTION_J)
    ? '\n\n---\nCette proposition repose sur un dossier exporté il y a ' + age +
      ' jours. Si des ordres ont été passés depuis, ré-exportez le dossier : ' +
      'les lignes détenues ci-dessus ne sont plus les bonnes.'
    : '\n\n---\nProposition calculée automatiquement sur les cours du jour, à partir du ' +
      'dossier tel qu\'il a été exporté. Si des ordres ont été passés depuis, ré-exportez-le.';

  const corps = a.texte + reserve;
  mkdirSync(join(RACINE, 'data'), { recursive: true });
  writeFileSync(join(RACINE, 'data', 'proposition-corps.txt'), corps);
  writeFileSync(ETAT_ENVOI, JSON.stringify({
    empreinte: emp,
    date: new Date().toISOString().slice(0, 10),
    ordres: a.ordres
  }) + '\n');

  console.log(`Proposition NOUVELLE (empreinte ${emp}) — ${a.ordres} ordre(s).`);
  sortir({
    envoyer: 'oui',
    motif: avant ? 'la proposition a changé' : 'première proposition',
    destinataire: a.destinataire,
    objet: 'Proposition d\'arbitrages' + (a.nom ? ' — ' + a.nom : '') +
           ' — ' + new Date().toISOString().slice(0, 10),
    ordres: String(a.ordres)
  });
}

/* Les sorties partent vers le workflow. En local, elles s'impriment. */
function sortir(o) {
  console.log(o.envoyer === 'oui'
    ? `→ ENVOI : ${o.motif}, ${o.ordres} ordre(s) vers ${o.destinataire}`
    : `→ pas d'envoi : ${o.motif}`);
  const f = process.env.GITHUB_OUTPUT;
  if (!f) return;
  writeFileSync(f, Object.keys(o).map(k => `${k}=${o[k]}`).join('\n') + '\n', { flag: 'a' });
}

principal();
