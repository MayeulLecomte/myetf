#!/usr/bin/env node
/* =============================================================
   MISE À JOUR DES COURS — source gratuite Euronext
   -------------------------------------------------------------
   Récupère les cours de clôture quotidiens des ETF de l'univers
   auprès d'Euronext (Amsterdam, Paris, Bruxelles, Lisbonne),
   les ARCHIVE dans data/cours.json, puis en déduit les
   performances calendaires par poche.

   L'archivage est cumulatif : Euronext ne sert que deux années
   glissantes, mais le fichier conserve tout ce qu'il a déjà vu.
   L'historique s'approfondit donc tout seul au fil des mois.

   Aucune dépendance, aucune clé d'API.

   Usage :  node scripts/maj-cours.mjs [--verbeux]
   ============================================================= */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES = ['XAMS', 'XPAR', 'XBRU', 'XLIS'];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
           'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const CONCURRENCE = 4;
const verbeux = process.argv.includes('--verbeux');

/* ---------- Chargement de l'univers et des libellés ---------- */
function chargerDonnees() {
  const ctx = vm.createContext({});
  ['js/data/allocations.js', 'js/data/etf-univers.js', 'js/data/historique.js']
    .forEach(f => vm.runInContext(readFileSync(join(RACINE, f), 'utf8'), ctx, { filename: f }));
  return {
    univers: vm.runInContext('ETF_UNIVERS', ctx),
    libelles: vm.runInContext('LIBELLES_POCHES', ctx),
    annees: vm.runInContext('ANNEES_HISTORIQUE', ctx)
  };
}

/* ---------- Récupération d'une série ---------- */
async function telechargerSerie(isin) {
  for (const mic of PLACES) {
    const url = 'https://live.euronext.com/en/ajax/AwlHistoricalPrice/getFullDownloadAjax/' +
      `${isin}-${mic}?format=csv&decimal_separator=.&date_form=Y-m-d`;
    try {
      const rep = await fetch(url, {
        headers: { 'User-Agent': UA, 'Referer': 'https://live.euronext.com/' },
        signal: AbortSignal.timeout(25000)
      });
      if (!rep.ok) continue;
      const texte = await rep.text();
      const points = analyser(texte);
      if (Object.keys(points).length > 100) return { mic, points };
    } catch (e) {
      if (verbeux) console.error(`   ${isin}/${mic} : ${e.message}`);
    }
  }
  return null;
}

/* Le fichier comporte trois lignes d'en-tête avant la ligne de colonnes.
   Euronext ignore le paramètre date_form et renvoie jj/mm/aaaa ; on
   accepte néanmoins les deux formats au cas où cela changerait. */
function normaliserDate(brut) {
  const s = brut.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function analyser(csv) {
  const points = {};
  for (const ligne of csv.split(/\r?\n/)) {
    const champs = ligne.split(';');
    if (champs.length < 6) continue;
    const date = normaliserDate(champs[0]);
    if (!date) continue;
    const cloture = parseFloat(champs[5]);
    if (!isFinite(cloture) || cloture <= 0) continue;
    points[date] = Math.round(cloture * 10000) / 10000;
  }
  return points;
}

/* ---------- Performances calendaires ---------- */
function perfsCalendaires(points) {
  const dates = Object.keys(points).sort();
  if (!dates.length) return {};

  /* Dernière cotation de chaque année */
  const cloturesAnnuelles = {};
  dates.forEach(d => { cloturesAnnuelles[d.slice(0, 4)] = points[d]; });

  /* Une année n'est complète que si l'on dispose d'une cotation
     en décembre de cette année ET en décembre de l'année précédente. */
  const aDecembre = an => dates.some(d => d.startsWith(`${an}-12`));
  const perfs = {};
  Object.keys(cloturesAnnuelles).forEach(an => {
    const prec = String(Number(an) - 1);
    if (!cloturesAnnuelles[prec]) return;
    if (!aDecembre(an) || !aDecembre(prec)) return;
    perfs[an] = Math.round(10000 * (cloturesAnnuelles[an] / cloturesAnnuelles[prec] - 1)) / 100;
  });
  return perfs;
}

/* ---------- Programme principal ---------- */
async function principal() {
  const { univers, libelles, annees } = chargerDonnees();
  const cheminCours = join(RACINE, 'data', 'cours.json');
  const archive = existsSync(cheminCours)
    ? JSON.parse(readFileSync(cheminCours, 'utf8'))
    : { genere: null, source: 'Euronext — cours de clôture', series: {} };

  console.log(`Univers : ${univers.length} supports · places interrogées : ${PLACES.join(', ')}`);

  const resultats = [];
  const file = [...univers];
  const travailleurs = Array.from({ length: CONCURRENCE }, async () => {
    while (file.length) {
      const etf = file.shift();
      const r = await telechargerSerie(etf.isin);
      resultats.push({ etf, r });
      process.stdout.write(r ? '.' : '×');
    }
  });
  await Promise.all(travailleurs);
  process.stdout.write('\n');

  /* --- Fusion dans l'archive : on n'écrase jamais, on complète --- */
  let nouveauxPoints = 0, trouves = 0;
  const couverture = [];

  for (const { etf, r } of resultats) {
    if (!r) {
      couverture.push({ isin: etf.isin, nom: etf.nom, poche: etf.poche, statut: 'introuvable' });
      continue;
    }
    trouves++;
    const existante = archive.series[etf.isin] || { mic: r.mic, points: {} };
    const avant = Object.keys(existante.points).length;
    Object.assign(existante.points, r.points);
    nouveauxPoints += Object.keys(existante.points).length - avant;
    existante.mic = r.mic;
    existante.nom = etf.nom;
    existante.poche = etf.poche;
    existante.capitalisation = etf.capitalisation;
    archive.series[etf.isin] = existante;

    const dates = Object.keys(existante.points).sort();
    couverture.push({
      isin: etf.isin, nom: etf.nom, poche: etf.poche, mic: r.mic, statut: 'ok',
      debut: dates[0], fin: dates[dates.length - 1], points: dates.length,
      capitalisation: etf.capitalisation
    });
  }

  /* La sortie doit être déterministe : les requêtes s'achèvent dans un
     ordre variable, or un fichier réordonné à chaque exécution
     produirait un commit quotidien inutile et invaliderait sans raison
     le cache de tous les visiteurs. On trie donc tout, et la date de
     génération suit la dernière cotation connue, pas l'heure du relevé. */
  const trier = obj => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a < b ? -1 : 1));
  archive.series = trier(archive.series);
  Object.values(archive.series).forEach(s => { s.points = trier(s.points); });

  const toutesDates = Object.values(archive.series).flatMap(s => Object.keys(s.points)).sort();
  archive.genere = toutesDates[toutesDates.length - 1] || null;

  mkdirSync(join(RACINE, 'data'), { recursive: true });
  writeFileSync(cheminCours, JSON.stringify(archive));

  /* --- Séries de performances par poche --- */
  const parPoche = {};
  const isinsUnivers = new Set(univers.map(e => e.isin));
  for (const [isin, s] of Object.entries(archive.series)) {
    /* L'archive des cours est cumulative et conserve les supports sortis
       de l'univers : leurs séries restent utiles, mais un support écarté
       — liquidé, mal identifié ou remplacé — ne doit plus servir de
       référence à une poche du modèle. */
    if (!isinsUnivers.has(isin)) continue;
    /* Un ETF distribuant ne reflète pas le rendement total : son cours
       décroche à chaque détachement de coupon. On ne s'en sert pas
       pour reconstituer une performance. */
    if (s.capitalisation === false) continue;
    const perfs = perfsCalendaires(s.points);
    if (!Object.keys(perfs).length) continue;
    const candidat = { isin, nom: s.nom, mic: s.mic, perfs, points: Object.keys(s.points).length };
    const actuel = parPoche[s.poche];
    if (!actuel || Object.keys(perfs).length > Object.keys(actuel.perfs).length ||
        (Object.keys(perfs).length === Object.keys(actuel.perfs).length && candidat.points > actuel.points)) {
      parPoche[s.poche] = candidat;
    }
  }

  const pochesTriees = Object.fromEntries(Object.entries(parPoche).sort(([a], [b]) => a < b ? -1 : 1));
  writeFileSync(join(RACINE, 'data', 'perfs-poches.json'),
    JSON.stringify({ genere: archive.genere, source: 'Euronext', poches: pochesTriees }, null, 2));

  /* --- Derniers cours connus, par ISIN ---
     Permet à l'application de revaloriser une détention saisie en
     quantités sans aucun appel réseau. */
  const derniers = {};
  for (const [isin, s] of Object.entries(archive.series)) {
    const dates = Object.keys(s.points).sort();
    if (!dates.length) continue;
    const fin = dates[dates.length - 1];
    derniers[isin] = { date: fin, cours: s.points[fin], nom: s.nom, mic: s.mic };
  }

  /* --- Variations par poche, pour la note de marché --- */
  const variations = {};
  for (const [poche, ref] of Object.entries(parPoche)) {
    const s = archive.series[ref.isin];
    if (!s) continue;
    const dates = Object.keys(s.points).sort();
    const dernier = dates[dates.length - 1];
    const valeur = d => s.points[d];
    const reculer = n => dates[Math.max(0, dates.length - 1 - n)];
    const debutAnnee = dates.filter(d => d < `${dernier.slice(0, 4)}-01-01`).pop();
    const varPct = (de) => de && valeur(de)
      ? Math.round(10000 * (valeur(dernier) / valeur(de) - 1)) / 100 : null;
    variations[poche] = {
      instrument: ref.nom, date: dernier,
      jour: varPct(reculer(1)),
      semaine: varPct(reculer(5)),
      mois: varPct(reculer(21)),
      annee: varPct(debutAnnee)
    };
  }
  writeFileSync(join(RACINE, 'data', 'variations.json'),
    JSON.stringify({ genere: archive.genere, variations }, null, 2));

  /* --- Fichier lu par l'application ---
     Émis en JavaScript et non en JSON pour rester lisible en
     ouverture directe du fichier (file://), où fetch est bloqué. */
  const entete = [
    '/* ============================================================',
    '   PERFORMANCES CALENDAIRES ISSUES DES COURS DE MARCHÉ',
    '   Fichier GÉNÉRÉ automatiquement par scripts/maj-cours.mjs.',
    '   Ne pas modifier à la main : toute retouche sera écrasée.',
    '   Source : Euronext, cours de clôture, ETF capitalisants',
    '   (le cours d\'un ETF capitalisant intègre les revenus',
    '   réinvestis : il reflète donc bien le rendement total).',
    `   Généré le ${archive.genere}.`,
    '   ============================================================ */', '',
    'const PERFS_MARCHE = '
  ].join('\n');
  writeFileSync(join(RACINE, 'js', 'data', 'cours-marche.js'),
    entete + JSON.stringify(pochesTriees, null, 2) + ';\n\n' +
    'const DERNIERS_COURS = ' + JSON.stringify(derniers, null, 2) + ';\n');

  /* --- Rapport --- */
  const introuvables = couverture.filter(c => c.statut === 'introuvable');
  const anneesCompletes = new Set();
  Object.values(parPoche).forEach(p => Object.keys(p.perfs).forEach(a => anneesCompletes.add(a)));

  console.log(`\nSupports trouvés      : ${trouves} / ${univers.length}`);
  console.log(`Nouveaux points       : ${nouveauxPoints}`);
  console.log(`Poches documentées    : ${Object.keys(parPoche).length} / ${Object.keys(libelles).length}`);
  console.log(`Années calendaires    : ${[...anneesCompletes].sort().join(', ') || 'aucune complète'}`);
  console.log(`Attendu par le backtest : ${annees.join(', ')}`);

  if (introuvables.length) {
    console.log(`\nNon trouvés sur Euronext (${introuvables.length}) — cotés ailleurs, ou ISIN à vérifier :`);
    introuvables.forEach(c => console.log(`  ${c.isin}  ${c.nom.slice(0, 52)}`));
  }

  /* --- Charge utile du widget Scriptable ---
     Volontairement minuscule : un widget iOS dispose de peu de
     mémoire et se rafraîchit souvent. Aucune donnée client n'y
     figure — uniquement des variations de marché. */
  const classement = Object.entries(variations)
    .filter(([, v]) => v.semaine !== null)
    .sort((a, b) => (b[1].semaine || 0) - (a[1].semaine || 0));
  const abrege = ([poche, v]) => ({
    poche: (libelles[poche] || poche).replace(/ \(.*\)$/, ''),
    jour: v.jour, semaine: v.semaine, annee: v.annee
  });
  /* La note du jour est ajoutée ensuite par note-marche.mjs. On la
     reprend telle quelle plutôt que de l'écraser : sans cela, relancer
     ce script seul ferait disparaître la note du widget sans rien dire. */
  const cheminWidget = join(RACINE, 'data', 'widget.json');
  let noteWidget = null;
  if (existsSync(cheminWidget)) {
    try { noteWidget = JSON.parse(readFileSync(cheminWidget, 'utf8')).note || null; } catch { /* fichier illisible : on repart à zéro */ }
  }
  if (!noteWidget) {
    /* Repli sur la note publiée dans l'application, si elle existe. */
    const cheminNote = join(RACINE, 'js', 'data', 'note-marche.js');
    if (existsSync(cheminNote)) {
      try {
        const ctx = vm.createContext({});
        vm.runInContext(readFileSync(cheminNote, 'utf8'), ctx, { filename: 'note-marche.js' });
        const n = vm.runInContext('NOTE_MARCHE', ctx);
        if (n && n.note) noteWidget = { titre: n.note.titre, synthese: n.note.synthese };
      } catch { /* note absente ou illisible : le widget s'en passe */ }
    }
  }

  writeFileSync(cheminWidget, JSON.stringify(Object.assign({
    genere: archive.genere,
    hausses: classement.slice(0, 3).map(abrege),
    baisses: classement.slice(-3).reverse().map(abrege),
    reperes: ['act-monde', 'obl-ig-euro', 'div-or', 'mon-euro']
      .filter(p => variations[p]).map(p => abrege([p, variations[p]]))
  }, noteWidget ? { note: noteWidget } : {})));

  couverture.sort((a, b) => a.isin < b.isin ? -1 : 1);
  writeFileSync(join(RACINE, 'data', 'couverture.json'),
    JSON.stringify({ genere: archive.genere, couverture }, null, 2));

  if (!trouves) { console.error('\nAucune donnée récupérée : la source a peut-être changé.'); process.exit(1); }
}

principal().catch(e => { console.error(e); process.exit(1); });
