#!/usr/bin/env node
/* =============================================================
   NOTATIONS MORNINGSTAR
   -------------------------------------------------------------
   Relève la note en étoiles de chaque support de l'univers auprès
   du moteur de recherche public de Morningstar, et l'inscrit dans
   js/data/etf-univers.js avec la date du relevé.

   Un même ISIN est coté sur plusieurs places : le moteur renvoie
   autant de lignes, avec la même note. On prend la première
   renseignée, et l'on vérifie au passage qu'elles concordent.

   Tous les supports n'ont pas de note : il en faut trois ans
   d'historique, et les ETC — l'or — sont hors du champ. Ces
   lignes restent à null, ce qui les sort du barème du score
   plutôt que de leur prêter une note qu'elles n'ont pas.

   Les frais courants renvoyés servent de contrôle croisé avec le
   relevé justETF : tout écart est signalé, aucun n'est corrigé
   automatiquement.

   Usage :  node scripts/notations.mjs [--ecrire]
            sans --ecrire, le script se contente de rapporter.
   ============================================================= */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const FICHIER = join(RACINE, 'js', 'data', 'etf-univers.js');
const ecrire = process.argv.includes('--ecrire');

const API = 'https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener';
const CHAMPS = 'SecId|Name|isin|starRating|OngoingCharge';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
           'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

function chargerUnivers() {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(FICHIER, 'utf8'), ctx, { filename: 'etf-univers.js' });
  return vm.runInContext('ETF_UNIVERS', ctx);
}

async function interroger(isin) {
  const url = `${API}?page=1&pageSize=20&outputType=json&version=1&languageId=fr-FR` +
              `&currencyId=EUR&term=${isin}&securityDataPoints=${encodeURIComponent(CHAMPS)}`;
  const rep = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(20000)
  });
  if (!rep.ok) throw new Error('HTTP ' + rep.status);
  const donnees = await rep.json();

  const lignes = (donnees.rows || []).filter(r => r.isin === isin);
  if (!lignes.length) return { note: null, ter: null, lignes: 0 };

  const notes = [...new Set(lignes.map(r => r.starRating).filter(n => n && n !== '0'))];
  const ters = [...new Set(lignes.map(r => r.OngoingCharge).filter(t => t != null))];

  return {
    note: notes.length ? Number(notes[0]) : null,
    discordante: notes.length > 1,
    ter: ters.length ? Number(ters[0]) : null,
    nom: lignes[0].Name,
    lignes: lignes.length
  };
}

/* Remplace la note dans le bloc de l'ISIN, sans reformater le reste
   du fichier : le tableau est écrit à la main et doit le rester. */
function inscrire(source, notations, date) {
  let texte = source;

  for (const [isin, note] of Object.entries(notations)) {
    const depart = texte.indexOf(`isin: '${isin}'`);
    if (depart < 0) { console.error(`  ! ${isin} introuvable dans le fichier`); continue; }
    const fin = texte.indexOf('\n  },', depart);
    const bloc = texte.slice(depart, fin);

    let nouveau = bloc.replace(/morningstar: (null|\d)/,
      note === null ? 'morningstar: null' : `morningstar: ${note}`);

    /* La date du relevé n'est portée que par les lignes effectivement
       notées : sur les autres, elle laisserait croire à un contrôle. */
    nouveau = nouveau.replace(/,\s*notationLe: '[^']*'/, '');
    if (note !== null) {
      nouveau = nouveau.replace(/(donneesSource: '[^']*')/, `$1, notationLe: '${date}'`);
    }

    texte = texte.slice(0, depart) + nouveau + texte.slice(fin);
  }
  return texte;
}

async function principal() {
  const univers = chargerUnivers();
  const date = aujourdhui();
  console.log(`Univers : ${univers.length} supports · source : Morningstar\n`);

  const notations = {};
  const ecartsTer = [];
  let notes = 0, absentes = 0, erreurs = 0;

  for (const etf of univers) {
    try {
      const r = await interroger(etf.isin);
      notations[etf.isin] = r.note;

      if (r.note !== null) {
        notes++;
        const avant = etf.morningstar === null ? '—' : etf.morningstar;
        const change = String(avant) !== String(r.note);
        console.log(`  ${r.note}★  ${etf.isin}  ${etf.ticker.padEnd(6)} ${avant} → ${r.note}` +
          (change ? '' : '  (inchangé)') + (r.discordante ? '  [notes discordantes selon la place]' : ''));
      } else {
        absentes++;
        console.log(`  —   ${etf.isin}  ${etf.ticker.padEnd(6)} pas de notation` +
          (r.lignes ? '' : '  (support inconnu du moteur)'));
      }

      if (r.ter != null && Math.abs(r.ter - etf.ter) > 0.005) {
        ecartsTer.push(`${etf.isin} ${etf.ticker} : ${etf.ter} % dans le fichier, ${r.ter} % chez Morningstar`);
      }
    } catch (e) {
      erreurs++;
      console.error(`  !   ${etf.isin}  ${etf.ticker.padEnd(6)} ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 250));   // on ne martèle pas la source
  }

  console.log(`\nNotées : ${notes} · sans notation : ${absentes} · erreurs : ${erreurs}`);

  if (ecartsTer.length) {
    console.log(`\nFrais courants divergents (${ecartsTer.length}) — à trancher à la main :`);
    ecartsTer.forEach(l => console.log('  ' + l));
  }

  if (!ecrire) {
    console.log('\nRelevé seul. Relancez avec --ecrire pour inscrire les notes dans l\'univers.');
    return;
  }
  if (erreurs) {
    console.error('\nDes relevés ont échoué : rien n\'est écrit, pour ne pas figer un univers incomplet.');
    process.exit(1);
  }

  writeFileSync(FICHIER, inscrire(readFileSync(FICHIER, 'utf8'), notations, date));
  console.log(`\njs/data/etf-univers.js mis à jour — notations du ${date}.`);
}

principal().catch(e => { console.error(e); process.exit(1); });
