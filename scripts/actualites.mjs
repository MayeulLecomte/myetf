#!/usr/bin/env node
/* =============================================================
   COLLECTE D'ACTUALITÉ ÉCONOMIQUE ET FINANCIÈRE
   -------------------------------------------------------------
   Relève les titres du jour sur une quinzaine de fils publics et
   les écrit dans data/actualites.json, d'où scripts/note-marche.mjs
   les reprend pour rédiger la note.

   Aucune dépendance, aucune clé d'API : ce sont des flux RSS ou
   Atom ouverts, lus en HTTP simple et analysés à la main.

   ⚠  CE SCRIPT NE DOIT JAMAIS FAIRE ÉCHOUER LA CHAÎNE. Un fil qui
   déménage, qui répond 403 ou qui met vingt secondes est la règle
   et non l'exception — les éditeurs de presse changent leurs URL
   sans prévenir. Chaque source est donc relevée pour elle-même,
   son échec est CONSIGNÉ dans le fichier de sortie, et le script
   sort en 0 dès qu'une seule source a répondu. Il ne sort en
   erreur que si TOUTES ont échoué : là, c'est le réseau, pas la
   presse.

   Usage :  node scripts/actualites.mjs [--verbeux] [--heures=48]
   ============================================================= */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
           'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const verbeux = process.argv.includes('--verbeux');
const argHeures = process.argv.find(a => a.startsWith('--heures='));
const FENETRE_H = argHeures ? Number(argHeures.split('=')[1]) : 48;

const CONCURRENCE   = 6;    /* fils relevés de front */
const DELAI_MS      = 15000;
const PAR_SOURCE    = 12;   /* titres retenus par fil, les plus récents */
const TOTAL_MAX     = 120;  /* titres retenus en tout, après dédoublonnage */

/* -------------------------------------------------------------
   LES SOURCES
   -------------------------------------------------------------
   Elles sont rangées par RÔLE, et le rôle sert au tri final : à
   nombre de titres égal, une dépêche de banque centrale pèse plus
   qu'un papier de rubrique. Le poids ne juge pas la qualité du
   journal, il dit à quelle distance du marché la source se tient.

   Boursorama, Les Échos, Zonebourse et La Tribune ne servent plus
   de flux en direct — 404 ou 403 selon le jour. Ils passent donc
   par l'index de Google Actualités, qui les republie titre pour
   titre. C'est un pis-aller assumé : le titre et l'horodatage sont
   ceux de l'éditeur, le lien pointe chez lui, et le jour où un
   éditeur rouvre son fil il suffit d'échanger l'URL ici.
   ------------------------------------------------------------- */
const GNEWS = q => 'https://news.google.com/rss/search?q=' +
  encodeURIComponent(q) + '&hl=fr&gl=FR&ceid=FR:fr';

const SOURCES = [
  /* --- Presse financière française --- */
  { id: 'boursorama',  nom: 'Boursorama',            poids: 3, url: GNEWS('site:boursorama.com when:2d') },
  { id: 'lesechos',    nom: 'Les Échos — Marchés',   poids: 3, url: GNEWS('site:lesechos.fr bourse OR marchés when:2d') },
  { id: 'latribune',   nom: 'La Tribune',            poids: 2, url: GNEWS('site:latribune.fr marchés OR taux when:2d') },
  { id: 'zonebourse',  nom: 'Zonebourse',            poids: 2, url: GNEWS('site:zonebourse.com when:2d') },
  { id: 'investir',    nom: 'Investir',              poids: 2, url: GNEWS('site:investir.lesechos.fr when:2d') },

  /* --- Presse généraliste, pages économie --- */
  { id: 'lemonde-eco', nom: 'Le Monde — Économie',   poids: 2, url: 'https://www.lemonde.fr/economie/rss_full.xml' },
  { id: 'bfm-eco',     nom: 'BFM — Économie',        poids: 1, url: 'https://www.bfmtv.com/rss/economie/' },
  { id: 'ftvi-eco',    nom: 'franceinfo — Économie', poids: 1, url: 'https://www.francetvinfo.fr/economie.rss' },
  { id: 'challenges',  nom: 'Challenges',            poids: 1, url: 'https://www.challenges.fr/rss.xml' },

  /* --- Marchés internationaux --- */
  /* Le fil « Markets » du Wall Street Journal a été essayé et retiré : il
     répond 200 mais sa dernière dépêche date de janvier 2025. C'est
     exactement le cas que la fenêtre de 48 h attrape sans bruit — un fil
     abandonné qui reste en ligne.

     Reuters a été essayé pour le remplacer et rend zéro : Google
     Actualités ne l'indexe plus. D'où une requête PAR SUJET et non par
     éditeur — c'est la séance américaine qu'on veut, quel que soit le
     journal qui la raconte. */
  { id: 'wall-street', nom: 'Séance américaine',     poids: 3, url: GNEWS('Wall Street OR Nasdaq OR "S&P 500" séance when:2d') },
  { id: 'taux',        nom: 'Taux et obligations',   poids: 3, url: GNEWS('obligations OR taux souverains OR rendement OAT OR Bund when:2d') },
  { id: 'marketwatch', nom: 'MarketWatch',           poids: 2, url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { id: 'cnbc-monde',  nom: 'CNBC — World Markets',  poids: 2, url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
  { id: 'yahoo-fin',   nom: 'Yahoo Finance',         poids: 1, url: 'https://finance.yahoo.com/news/rssindex' },
  { id: 'investing',   nom: 'Investing.com',         poids: 1, url: 'https://www.investing.com/rss/news_25.rss' },

  /* --- Politique monétaire et macro : la source primaire --- */
  { id: 'fed',         nom: 'Réserve fédérale',      poids: 4, url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  { id: 'bce',         nom: 'BCE',                   poids: 4, url: GNEWS('BCE taux directeurs OR inflation zone euro when:2d') },
  { id: 'macro-fr',    nom: 'Macro France',          poids: 3, url: GNEWS('inflation OR croissance OR chômage France INSEE when:2d') }
];

/* -------------------------------------------------------------
   ANALYSE RSS / ATOM
   -------------------------------------------------------------
   Sans bibliothèque, et sans prétendre analyser du XML en
   général : on cherche des <item> (RSS) ou des <entry> (Atom) et
   on y lit quatre champs. Un flux mal formé rend zéro article, ce
   qui est le bon échec — pas une exception.
   ------------------------------------------------------------- */

const ENTITES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&nbsp;': ' ', '&#39;': "'", '&#x27;': "'", '&laquo;': '«', '&raquo;': '»',
  '&eacute;': 'é', '&egrave;': 'è', '&agrave;': 'à', '&ccedil;': 'ç',
  '&ecirc;': 'ê', '&ocirc;': 'ô', '&ugrave;': 'ù', '&hellip;': '…',
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”',
  '&mdash;': '—', '&ndash;': '–', '&euro;': '€', '&pound;': '£'
};

function entites(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-zA-Z#0-9]+;/g, e => ENTITES[e] !== undefined ? ENTITES[e] : ' ');
}

/* L'ORDRE DES DEUX PASSES EST LA SUBTILITÉ.
   Une description RSS porte du HTML, et ce HTML est ÉCHAPPÉ : le flux
   contient `&lt;a href=…&gt;`, pas `<a href=…>`. Retirer les balises
   d'abord ne trouve donc rien, et les entités décodées ensuite rendent un
   `<a href="…">` intact dans le texte — c'est ce qui remplissait les
   résumés d'URL Google au lieu de phrases.

   D'où : entités, PUIS balises, PUIS entités à nouveau — le second tour
   pour les flux doublement échappés, qui existent aussi. */
function decoder(s) {
  return entites(entites(String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
      .replace(/<[^>]*>/g, ' '))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function champ(bloc, noms) {
  for (const n of noms) {
    const m = bloc.match(new RegExp('<' + n + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + n + '>', 'i'));
    if (m) return decoder(m[1]);
    /* Atom écrit souvent <link href="…"/> plutôt qu'un contenu. */
    const a = bloc.match(new RegExp('<' + n + '[^>]*href=["\']([^"\']+)["\']', 'i'));
    if (a) return decoder(a[1]);
  }
  return '';
}

/* Un résumé qui n'est qu'une URL, ou trop court pour porter une phrase,
   ne vaut pas les jetons qu'il coûterait au modèle. */
function resumeUtile(r) {
  const t = r.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length < 40 ? '' : t.slice(0, 220);
}

function analyser(xml) {
  const blocs = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) || [];
  return blocs.map(b => {
    const brut = champ(b, ['pubDate', 'published', 'updated', 'dc:date']);
    const t = brut ? Date.parse(brut) : NaN;
    return {
      titre: champ(b, ['title']),
      lien: champ(b, ['link', 'id']),
      resume: resumeUtile(champ(b, ['description', 'summary', 'content'])),
      date: Number.isNaN(t) ? null : new Date(t).toISOString()
    };
  }).filter(a => a.titre);
}

/* -------------------------------------------------------------
   RELEVÉ D'UNE SOURCE
   ------------------------------------------------------------- */
async function relever(src, limite) {
  try {
    const rep = await fetch(src.url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(DELAI_MS)
    });
    if (!rep.ok) return { ...src, statut: 'HTTP ' + rep.status, articles: [] };

    const articles = analyser(await rep.text())
      /* Bornée des DEUX côtés : quelques fils horodatent dans le futur —
         fuseau mal posé, ou embargo publié en avance. Un titre daté de
         demain remonterait en tête du tri et y resterait. */
      .filter(a => !a.date || (Date.parse(a.date) >= limite && Date.parse(a.date) <= Date.now() + 6 * 3600 * 1000))
      .sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0))
      .slice(0, PAR_SOURCE)
      .map(a => ({ ...a, source: src.nom, sourceId: src.id, poids: src.poids }));

    return { ...src, statut: 'ok', articles };
  } catch (e) {
    return { ...src, statut: e.name === 'TimeoutError' ? 'délai dépassé' : e.message, articles: [] };
  }
}

/* Google Actualités SUFFIXE le titre du nom de l'éditeur : « Titre - Les
   Echos ». Le suffixe fait doublon avec le champ `source`, et surtout il
   fausse le dédoublonnage — la même dépêche reprise par deux journaux
   porte alors deux clés différentes.

   Le retrait ne compare pas au nom de la source : « Les Échos — Marchés »
   ici, « Les Echos » là-bas, accents et sous-titre en moins. On coupe le
   dernier segment court introduit par un tiret, quel qu'il soit, et
   seulement s'il ne contient pas de ponctuation de phrase — un titre qui
   finit par « — et c'est une première » n'est pas un nom de journal. */
function nettoyerTitre(t) {
  return t.replace(/\s+[-–—]\s+[^-–—.:;!?]{2,32}$/, '').trim() || t.trim();
}

/* Deux fils reprennent la même dépêche sous deux titres voisins. La clé de
   dédoublonnage retire les accents, la ponctuation et les mots outils, puis
   ne garde que les huit premiers mots — assez pour reconnaître la même
   dépêche, pas assez pour confondre deux sujets. */
const OUTILS = new Set(['le','la','les','un','une','des','de','du','en','et','a','au','aux','pour','sur','dans','par','avec','ce','cette','son','sa','ses','the','a','an','of','to','in','on','for','and','is','as','at','its']);
function cle(titre) {
  return titre.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/).filter(m => m && !OUTILS.has(m))
    .slice(0, 8).join(' ');
}

async function principal() {
  const limite = Date.now() - FENETRE_H * 3600 * 1000;
  console.log(`Relevé de ${SOURCES.length} sources, fenêtre de ${FENETRE_H} h.`);

  /* Concurrence bornée : dix-sept requêtes lancées ensemble suffisent à
     faire passer le coureur pour un robot chez plus d'un éditeur. */
  const resultats = [];
  const file = SOURCES.slice();
  await Promise.all(Array.from({ length: CONCURRENCE }, async () => {
    while (file.length) resultats.push(await relever(file.shift(), limite));
  }));
  resultats.sort((a, b) => SOURCES.findIndex(s => s.id === a.id) - SOURCES.findIndex(s => s.id === b.id));

  for (const r of resultats) {
    console.log(`  ${r.statut === 'ok' ? '✓' : '✗'} ${r.nom.padEnd(26)} ` +
      (r.statut === 'ok' ? r.articles.length + ' titre(s)' : r.statut));
  }

  const vivantes = resultats.filter(r => r.statut === 'ok' && r.articles.length);
  if (!vivantes.length) {
    console.error('Aucune source n\'a répondu — réseau ou blocage général. Rien n\'est écrit.');
    process.exit(1);
  }

  /* Tri : le plus récent d'abord, le poids départage à date égale. Sans
     date — quelques fils n'en portent pas — l'article passe après ceux
     qui en ont une, sans être écarté. */
  const vus = new Set();
  const articles = vivantes
    .flatMap(r => r.articles)
    .map(a => ({ ...a, titre: nettoyerTitre(a.titre) }))
    /* Google Actualités remplit la description avec le titre suivi du nom
       du journal. Répété sous le titre, c'est du bruit payé au jeton. */
    .map(a => (cle(a.resume).startsWith(cle(a.titre).slice(0, 30)) ? { ...a, resume: '' } : a))
    .sort((a, b) => (Date.parse(b.date || 0) - Date.parse(a.date || 0)) || (b.poids - a.poids))
    .filter(a => { const k = cle(a.titre); if (!k || vus.has(k)) return false; vus.add(k); return true; })
    .slice(0, TOTAL_MAX)
    .map(({ poids, ...a }) => a);

  const sortie = {
    genere: new Date().toISOString(),
    fenetreHeures: FENETRE_H,
    sources: resultats.map(r => ({ id: r.id, nom: r.nom, statut: r.statut, retenus: r.articles.length })),
    articles
  };

  writeFileSync(join(RACINE, 'data', 'actualites.json'), JSON.stringify(sortie, null, 1) + '\n');

  const muettes = resultats.filter(r => r.statut !== 'ok').map(r => r.nom);
  console.log(`\n${articles.length} titre(s) retenus sur ${vivantes.length}/${SOURCES.length} sources.`);
  if (muettes.length) console.log(`Muettes : ${muettes.join(', ')}.`);
  console.log('Écrit dans data/actualites.json.');
}

principal().catch(e => { console.error(e); process.exit(1); });
