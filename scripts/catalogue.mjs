#!/usr/bin/env node
/* =============================================================
   CATALOGUE DES ETF COTÉS EN EUROPE
   -------------------------------------------------------------
   Recense les ETF et ETP cotés sur les grandes places
   européennes, auprès du moteur de recherche public de
   Morningstar, et publie js/data/catalogue-etf.js.

   Ce catalogue n'est PAS l'univers de travail. L'univers, ce sont
   les supports que le conseiller a retenus et vérifiés, et c'est
   lui seul qui alimente la sélection. Le catalogue sert à
   chercher un support — celui que le contrat référence, par
   exemple — et à le verser dans l'univers d'un clic.

   Le fichier est chargé au démarrage : il doit rester petit. D'où
   la forme tabulaire, avec les émetteurs et les catégories
   déportés dans des index, et les places groupées par ISIN — un
   même ETF est coté sur plusieurs bourses.

   Usage :  node scripts/catalogue.mjs
   ============================================================= */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener';
const CHAMPS = 'SecId|Name|isin|Ticker|categoryName|OngoingCharge|starRating|exchangeCode|currencyCode|brandingCompanyName';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
           'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const PAGE = 250;

/* Les quatre premières sont celles dont maj-cours.mjs sait relever les
   cours : un support qui en vient se revalorisera tout seul. Les trois
   suivantes couvrent le reste de l'offre européenne courante. */
const PLACES = [
  { mic: 'XPAR', nom: 'Euronext Paris',     euronext: true },
  { mic: 'XAMS', nom: 'Euronext Amsterdam', euronext: true },
  { mic: 'XBRU', nom: 'Euronext Bruxelles', euronext: true },
  { mic: 'XLIS', nom: 'Euronext Lisbonne',  euronext: true },
  { mic: 'XETR', nom: 'Xetra',              euronext: false },
  { mic: 'XMIL', nom: 'Borsa Italiana',     euronext: false },
  { mic: 'XLON', nom: 'London Stock Exchange', euronext: false }
];

/* -------------------------------------------------------------
   Rattachement d'une catégorie Morningstar à une poche du modèle.
   L'ordre compte : la première expression qui accroche gagne, et
   les libellés les plus spécifiques passent donc en premier. Une
   catégorie qui ne correspond à aucune poche laisse la ligne sans
   rattachement — le conseiller tranchera au moment de l'ajout,
   plutôt que de recevoir un classement inventé.
   ------------------------------------------------------------- */
const POCHES = [
  [/monétaire|money market/i,                                'mon-euro'],
  [/métaux précieux|precious metal|\bor\b|gold/i,            'div-or'],
  [/matières premières|commodit/i,                           'div-matieres'],
  [/immobilier|real estate|property/i,                       'div-immobilier'],
  [/obligation.*indexé|inflation/i,                          'obl-inflation'],
  [/obligation.*haut rendement|high yield/i,                 'obl-hy-euro'],
  [/obligation.*(pays émergents|marchés émergents)|emerging.*bond/i, 'obl-emergente'],
  [/obligation.*(emprunts privés|entreprises|corporate)/i,   'obl-ig-euro'],
  [/obligation.*(court terme|1-3|ultra)/i,                   'obl-souv-euro-ct'],
  [/obligation.*(eur|euro|zone euro)/i,                      'obl-souv-euro-lt'],
  [/obligation|bond/i,                                       'obl-globale-hedge'],
  [/technolog|information technology/i,                      'act-tech'],
  [/petites cap|small cap|micro cap/i,                       'act-small'],
  [/(volatilit|minimum vol|qualité|quality)/i,               'act-min-vol'],
  [/(pays émergents|marchés émergents|emerging)/i,           'act-emergents'],
  [/japon|japan/i,                                           'act-japon'],
  [/(etats-unis|états-unis|amérique du nord|us large|u\.s\.)/i, 'act-us'],
  [/(europe|zone euro|france|allemagne|royaume-uni)/i,       'act-europe'],
  [/(international|monde|global|world)/i,                    'act-monde']
];

/* Catégories que l'on ne verse pas au catalogue : hors du champ d'un
   conseil patrimonial en unités de compte, ou franchement dangereuses
   entre les mains d'un particulier. */
const ECARTEES = /actifs digitaux|crypto|levier|leverag|short|bear |x2|x3|inverse/i;

function poche(categorie) {
  if (!categorie) return null;
  for (const [motif, p] of POCHES) if (motif.test(categorie)) return p;
  return null;
}

function classe(p) {
  if (!p) return null;
  if (p.indexOf('act-') === 0) return 'actions';
  if (p.indexOf('obl-') === 0) return 'obligations';
  if (p.indexOf('mon-') === 0) return 'monetaire';
  return 'diversifiants';
}

async function page(mic, numero) {
  const url = `${API}?page=${numero}&pageSize=${PAGE}&outputType=json&version=1` +
              `&languageId=fr-FR&currencyId=EUR&universeIds=ETEXG%24${mic}` +
              `&securityDataPoints=${encodeURIComponent(CHAMPS)}`;
  const rep = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(30000)
  });
  if (!rep.ok) throw new Error('HTTP ' + rep.status);
  return rep.json();
}

async function principal() {
  const parIsin = new Map();
  let ecartees = 0;

  for (const place of PLACES) {
    let numero = 1, total = null, recus = 0;
    process.stdout.write(`${place.mic} `);

    while (total === null || recus < total) {
      const d = await page(place.mic, numero);
      if (total === null) total = d.total;
      const lignes = d.rows || [];
      if (!lignes.length) break;
      recus += lignes.length;

      for (const r of lignes) {
        if (!r.isin) continue;
        if (ECARTEES.test(r.categoryName || '') || ECARTEES.test(r.Name || '')) { ecartees++; continue; }

        const existant = parIsin.get(r.isin);
        if (existant) {
          if (!existant.places.includes(place.mic)) existant.places.push(place.mic);
          continue;
        }
        parIsin.set(r.isin, {
          isin: r.isin,
          nom: (r.Name || '').trim(),
          ticker: (r.Ticker || '').trim(),
          emetteur: (r.brandingCompanyName || '').trim(),
          categorie: (r.categoryName || '').trim(),
          ter: r.OngoingCharge == null ? null : Number(r.OngoingCharge),
          note: r.starRating && r.starRating !== '0' ? Number(r.starRating) : null,
          devise: (r.currencyCode || '').trim(),
          places: [place.mic]
        });
      }
      numero++;
      await new Promise(r => setTimeout(r, 200));
    }
    process.stdout.write(`${recus}/${total}  `);
  }

  const lignes = [...parIsin.values()].sort((a, b) => a.nom < b.nom ? -1 : 1);

  /* Émetteurs et catégories déportés : ils se répètent des centaines de
     fois, et les stocker en clair triplerait le poids du fichier. */
  const emetteurs = [...new Set(lignes.map(l => l.emetteur))].sort();
  const categories = [...new Set(lignes.map(l => l.categorie))].sort();
  const iEmetteur = new Map(emetteurs.map((e, i) => [e, i]));
  const iCategorie = new Map(categories.map((c, i) => [c, i]));

  const table = lignes.map(l => [
    l.isin, l.nom, l.ticker, iEmetteur.get(l.emetteur), iCategorie.get(l.categorie),
    l.ter, l.note, l.devise, l.places.join(','), poche(l.categorie)
  ]);

  const rattachees = table.filter(t => t[9]).length;
  const surEuronext = lignes.filter(l => l.places.some(m => ['XPAR', 'XAMS', 'XBRU', 'XLIS'].includes(m))).length;

  const entete = [
    '/* ============================================================',
    '   CATALOGUE DES ETF COTÉS EN EUROPE',
    '   Fichier GÉNÉRÉ automatiquement par scripts/catalogue.mjs.',
    '   Ne pas modifier à la main : toute retouche sera écrasée.',
    '',
    '   Ce n\'est PAS l\'univers de travail : c\'est un annuaire de',
    '   recherche. Rien n\'y est vérifié, et rien n\'entre dans la',
    '   sélection tant que le conseiller ne l\'a pas versé dans',
    '   l\'univers depuis l\'onglet « Univers ETF ».',
    '',
    '   colonnes : isin, nom, ticker, émetteur (index), catégorie',
    '   (index), frais courants, note Morningstar, devise, places,',
    '   poche déduite de la catégorie — null si aucune ne convient.',
    '',
    `   Généré le ${new Date().toISOString().slice(0, 10)} · ${table.length} supports · ` +
      `${rattachees} rattachés à une poche · ${surEuronext} cotés sur Euronext.`,
    '   Source : Morningstar. Produits à levier, inverses et actifs',
    '   numériques écartés.',
    '   ============================================================ */', '',
    'const CATALOGUE_ETF = '
  ].join('\n');

  writeFileSync(join(RACINE, 'js', 'data', 'catalogue-etf.js'),
    entete + JSON.stringify({
      genere: new Date().toISOString().slice(0, 10),
      emetteurs, categories,
      colonnes: ['isin', 'nom', 'ticker', 'emetteur', 'categorie', 'ter', 'note', 'devise', 'places', 'poche'],
      lignes: table
    }) + ';\n');

  console.log(`\n\n${table.length} supports retenus · ${ecartees} écartés (levier, inverse, actifs numériques)`);
  console.log(`${rattachees} rattachés à une poche du modèle, ${table.length - rattachees} à trancher à la main`);
  console.log(`${surEuronext} cotés sur Euronext : revalorisables automatiquement`);
  console.log(`${emetteurs.length} émetteurs · ${categories.length} catégories`);
}

principal().catch(e => { console.error(e); process.exit(1); });
