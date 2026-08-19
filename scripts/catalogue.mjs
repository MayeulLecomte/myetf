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

/* FundTNAV, SRRI et inceptionDate n'étaient pas relevés au départ, et c'est
   ce qui interdisait de sélectionner dans le catalogue : sans encours, le
   filtre de taille écartait tout ; sans date de création, on ne savait pas
   distinguer un fonds jeune d'un fonds que Morningstar renonce à noter.
   Les trois sont rendus par le même point d'entrée, sans coût.

   ⚠ `SRRI` n'est PAS le SRI du DIC. C'est l'indicateur synthétique de
   l'ancien DICI UCITS, calculé sur la seule volatilité ; le SRI des
   documents d'informations clés PRIIPs y ajoute le risque de crédit et
   suit une échelle différente — un ETF actions monde y ressort à 4 quand
   son SRRI vaut 6. Les deux sont sur 1 à 7 et se ressemblent assez pour
   être confondus, jamais assez pour se remplacer. Le SRI reste donc à
   relever sur chaque DIC ; le SRRI n'est publié qu'à titre indicatif. */
/* `returnM12` et `returnM0` arrivent dans la MÊME réponse : ils ne coûtent
   aucune requête de plus. Confrontés à nos propres clôtures Euronext sur
   deux supports suivis des deux côtés, le douze mois tombe à 0,03 point.
   Morningstar calcule en VL dividendes réinvestis là où nos cours sont des
   prix nus : l'écart se voit sur un distribuant, et se dit dans la fiche.

   `primaryBenchmarkName` porte l'indice répliqué. Il vaut « N/A » sur les
   produits qui n'en suivent aucun. */
const CHAMPS = 'SecId|Name|isin|Ticker|categoryName|OngoingCharge|starRating|exchangeCode|' +
               'currencyCode|brandingCompanyName|FundTNAV|SRRI|inceptionDate|' +
               'returnM12|returnM0|primaryBenchmarkName|' +
               'closePrice|closePriceDate|priceCurrency';
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

   Les motifs sont appliqués sur un libellé DÉSACCENTUÉ. Morningstar
   écrit « Actions Marchés Emergents » sans accent au second mot :
   un motif portant « émergents » ne l'accrochait pas, et ces 108
   supports actions sortaient sans poche pendant que les 32 lignes
   obligataires correspondantes tombaient dans le repli « obligations
   globales », voire — quand le libellé portait « Dominante EUR » —
   dans les souveraines de la zone euro. Un classement faux est pire
   qu'une absence de classement : il ne se voit pas.

   La devise, enfin, fait partie de la définition de la poche et non de
   son décor. « Obligations souveraines € court terme » n'accueille pas un
   emprunt d'État américain, et « Obligations globales couvertes en € » ne
   veut rien dire d'un fonds couvert en livres. Les poches marquées `euro`
   exigent donc que la catégorie nomme l'euro — soit comme devise du
   gisement (« Obligations EUR Emprunts d'État »), soit comme devise de
   couverture (« … Couvertes en EUR »). Une catégorie qui accroche le motif
   sans satisfaire cette exigence ne descend PAS à la règle suivante : elle
   sort sans poche. Sans cela, une obligataire en dollars glissait de poche
   en poche jusqu'à trouver un motif complaisant — c'est ainsi qu'une
   *floating rate* en dollars s'est retrouvée en obligataire euro dans
   l'univers d'origine.
   ------------------------------------------------------------- */
const POCHES = [
  [/monetaire|money market/i,                                'mon-euro',          true],
  [/metaux precieux|precious metal|\bor\b|gold/i,            'div-or'],
  [/matieres premieres|commodit/i,                           'div-matieres'],
  [/immobilier|real estate|property/i,                       'div-immobilier'],
  [/obligation.*indexe|inflation/i,                          'obl-inflation',     true],
  [/obligation.*haut rendement|high yield/i,                 'obl-hy-euro',       true],
  /* La dette émergente est libellée en dollars par construction : c'est la
     seule poche obligataire du modèle qui n'exige pas l'euro. */
  [/obligation.*(pays emergents|marches emergents)|emerging.*bond/i, 'obl-emergente'],
  [/obligation.*(emprunts prives|entreprises|corporate)/i,   'obl-ig-euro',       true],
  /* Avant les poches souveraines euro : un gisement mondial couvert en euro
     est un « global aggregate couvert », pas un emprunt d'État de la zone. */
  [/obligation.*(internationale|globale|monde).*couvertes? en eur/i, 'obl-globale-hedge'],
  [/obligation.*(court terme|tres court|1-3|ultra)/i,        'obl-souv-euro-ct',  true],
  [/obligation.*(emprunts d.etat|diversifiee|long terme|flexible)/i, 'obl-souv-euro-lt', true],
  [/technolog|information technology/i,                      'act-tech'],
  [/petites cap|small cap|micro cap|petites & moy/i,         'act-small'],
  [/(volatilit|minimum vol|qualite|quality)/i,               'act-min-vol'],
  [/(pays emergents|marches emergents|emerging|chine|china|inde|india|coree|korea|bresil|brazil|amerique latine|latin america|taiwan|afrique du sud)/i,
                                                             'act-emergents'],
  [/japon|japan/i,                                           'act-japon'],
  [/(etats-unis|amerique du nord|us large|u\.s\.)/i,         'act-us'],
  [/(europe|zone euro|france|allemagne|royaume-uni|suisse|italie|espagne|pays-bas|nordique|scandinav)/i,
                                                             'act-europe'],
  [/(international|monde|global|world)/i,                    'act-monde']
];

/* Catégories qui accrochent un motif mais désignent tout autre chose.
   « Actions Asie hors Japon » n'est pas du Japon ; une obligataire
   subordonnée n'est pas un emprunt d'État ; une obligataire à échéance
   fixe ne se compare pas à un indice de duration constante. */
const PIEGES = /hors japon|ex japan|subordonn|a echeance/i;

/** La catégorie nomme-t-elle l'euro, comme gisement ou comme couverture ? */
function enEuro(categorie) {
  return /\beur\b|\beuro\b/i.test(categorie);
}

/* Les catégories sectorielles — santé, finance, énergie, matériaux… — ne
   sont rattachées à AUCUNE poche, et c'est délibéré : le modèle n'a pas de
   poche sectorielle hors technologie. Les y forcer reviendrait à faire
   entrer un pari sectoriel dans une allocation qui n'en demande pas. */

function sansAccent(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Catégories que l'on ne verse pas au catalogue : hors du champ d'un
   conseil patrimonial en unités de compte, ou franchement dangereuses
   entre les mains d'un particulier. */
const ECARTEES = /actifs digitaux|crypto|levier|leverag|short|bear |x2|x3|inverse/i;

/* Les catégories Morningstar sont géographiques : elles ne savent pas dire
   qu'un fonds est un « minimum volatilité » ou un « qualité ». Ces deux
   poches du modèle ne peuvent donc venir que du nom du support, et
   seulement là où la catégorie a déjà désigné une poche actions large —
   un fonds technologique ou de petites capitalisations reste dans la
   sienne, même s'il porte le mot « quality ». */
const FACTEUR = /minimum volatilit|min\.? vol|minvol|low volatilit|quality factor|\bquality\b|\bqualite\b/i;
const LARGES = ['act-monde', 'act-europe', 'act-us', 'act-emergents', 'act-japon'];

function poche(categorie, nom) {
  if (!categorie) return null;
  const plat = sansAccent(categorie);
  if (PIEGES.test(plat)) return null;

  for (const [motif, p, euroExige] of POCHES) {
    if (!motif.test(plat)) continue;
    /* Le motif a accroché : la ligne est jugée ici, et nulle part ailleurs. */
    if (euroExige && !enEuro(plat)) return null;
    if (LARGES.includes(p) && FACTEUR.test(sansAccent(nom || ''))) return 'act-min-vol';
    return p;
  }
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
          /* L'encours est rendu en euros ; l'univers le porte en millions. */
          encours: r.FundTNAV == null ? null : Math.round(Number(r.FundTNAV) / 1e6),
          srri: r.SRRI == null ? null : Number(r.SRRI),
          creation: (r.inceptionDate || '').slice(0, 10) || null,
          perf1an: r.returnM12 == null ? null : Math.round(Number(r.returnM12) * 100) / 100,
          perfAnnee: r.returnM0 == null ? null : Math.round(Number(r.returnM0) * 100) / 100,
          /* « N/A » n'est pas un indice : on n'en garde rien plutôt que de
             l'afficher tel quel dans une fiche. */
          indice: (r.primaryBenchmarkName || '').trim().replace(/^N\/A$/i, '') || null,
          /* Dernière clôture connue, sa date et SA devise — qui n'est pas
             toujours celle du fonds. 142 des supports sélectionnables cotent
             hors zone euro, dont quatorze en pence : un GBX pris pour un
             euro vaut cent fois trop. La devise voyage donc avec le prix, et
             c'est elle qui décide s'il est utilisable. */
          prix: r.closePrice == null ? null : Number(r.closePrice),
          prixDate: (r.closePriceDate || '').slice(0, 10) || null,
          prixDevise: (r.priceCurrency || '').trim() || null,
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

  /* Les indices se répètent autant que les catégories — des centaines d'ETF
     suivent le MSCI World. Ils sont déportés comme les émetteurs. */
  const indices = [...new Set(lignes.map(l => l.indice).filter(Boolean))].sort();
  const iIndice = new Map(indices.map((x, i) => [x, i]));

  /* Les dates de cotation se comptent sur les doigts d'une main : elles sont
     déportées, comme le reste. Les devises aussi. */
  const datesPrix = [...new Set(lignes.map(l => l.prixDate).filter(Boolean))].sort();
  const iDatePrix = new Map(datesPrix.map((x, i) => [x, i]));
  const devisesPrix = [...new Set(lignes.map(l => l.prixDevise).filter(Boolean))].sort();
  const iDevisePrix = new Map(devisesPrix.map((x, i) => [x, i]));

  const table = lignes.map(l => [
    l.isin, l.nom, l.ticker, iEmetteur.get(l.emetteur), iCategorie.get(l.categorie),
    l.ter, l.note, l.devise, l.places.join(','), poche(l.categorie, l.nom),
    l.encours, l.srri, l.creation,
    l.perf1an, l.perfAnnee, l.indice == null ? null : iIndice.get(l.indice),
    l.prix,
    l.prixDate == null ? null : iDatePrix.get(l.prixDate),
    l.prixDevise == null ? null : iDevisePrix.get(l.prixDevise)
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
    '   poche déduite de la catégorie — null si aucune ne convient —,',
    '   encours en M€, SRRI de l\'ancien DICI UCITS (1 à 7), date de',
    '   création, performance 12 mois, performance depuis le 1er',
    '   janvier, indice répliqué (index), dernière clôture, sa date',
    '   (index), sa devise (index).',
    '',
    '   ⚠ La devise du PRIX n\'est pas toujours celle du fonds, et n\'est',
    '   pas toujours l\'euro : cent six supports sélectionnables cotent en',
    '   dollars, quatorze en pence — où un cours pris pour un euro vaut',
    '   cent fois trop. Rien ne doit valoriser un portefeuille avec ces',
    '   prix-là sans avoir lu la devise.',
    '',
    '   ⚠ Les deux performances sont calculées par Morningstar en VL,',
    '   dividendes réinvestis. Nos propres cours Euronext sont des prix',
    '   nus : les deux ne coïncident que sur un capitalisant. Elles',
    '   datent du jour de génération ci-dessous, pas d\'aujourd\'hui.',
    '',
    '   ⚠ Le SRRI n\'est PAS le SRI du document d\'informations clés :',
    '   il ne mesure que la volatilité, sur une échelle qui place un',
    '   ETF actions monde à 6 là où son SRI vaut 4. Le SRI reste à',
    '   relever sur chaque DIC.',
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
      emetteurs, categories, indices, datesPrix, devisesPrix,
      colonnes: ['isin', 'nom', 'ticker', 'emetteur', 'categorie', 'ter', 'note', 'devise',
                 'places', 'poche', 'encours', 'srri', 'creation',
                 'perf1an', 'perfAnnee', 'indice', 'prix', 'prixDate', 'prixDevise'],
      lignes: table
    }) + ';\n');

  const renseigne = i => table.filter(t => t[i] != null).length;
  console.log(`\n\n${table.length} supports retenus · ${ecartees} écartés (levier, inverse, actifs numériques)`);
  console.log(`${rattachees} rattachés à une poche du modèle, ${table.length - rattachees} à trancher à la main`);
  console.log(`${surEuronext} cotés sur Euronext : revalorisables automatiquement`);
  console.log(`${emetteurs.length} émetteurs · ${categories.length} catégories`);
  console.log(`renseignés : encours ${renseigne(10)} · frais ${renseigne(5)} · ` +
              `note ${renseigne(6)} · SRRI ${renseigne(11)} · création ${renseigne(12)}`);
  console.log(`             perf 12 mois ${renseigne(13)} · perf depuis janvier ${renseigne(14)} · ` +
              `indice ${renseigne(15)} (${indices.length} distincts)`);
  const enEuro = table.filter(t => t[18] != null && devisesPrix[t[18]] === 'EUR').length;
  console.log(`             clôture ${renseigne(16)} · dont ${enEuro} en euros · ` +
              `devises ${devisesPrix.join(', ')} · dates ${datesPrix.join(', ')}`);
}

principal().catch(e => { console.error(e); process.exit(1); });
