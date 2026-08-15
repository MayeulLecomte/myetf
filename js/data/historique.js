/* =============================================================
   SÉRIES DE PERFORMANCES ANNUELLES PAR POCHE
   -------------------------------------------------------------
   ⚠⚠  LECTURE OBLIGATOIRE AVANT TOUTE UTILISATION

   Deux séries seulement sont SOURCÉES (champ source: 'source').
   Toutes les autres sont des ESTIMATIONS (source: 'estime') :
   ordres de grandeur crédibles, mais NON VÉRIFIÉS, pouvant
   s'écarter de plusieurs points de la réalité.

   Un backtest fondé sur des séries estimées n'a AUCUNE valeur
   probante et ne doit jamais être présenté à un client. Il sert
   uniquement à éprouver le comportement du modèle d'allocation.

   POUR OBTENIR UN BACKTEST EXPLOITABLE : remplacez ces séries
   par les performances calendaires réelles, nettes de frais et
   libellées en euros, extraites de Quantalys, Morningstar ou
   justETF — directement dans l'onglet « Backtest », ou par
   import CSV.

   Convention : performances calendaires, dividendes réinvestis,
   en euros, avant frais de gestion du contrat.
   ============================================================= */

const ANNEES_HISTORIQUE = [2021, 2022, 2023, 2024, 2025];

const HISTORIQUE_POCHES = {

  /* ---- Série sourcée : MSCI World net return, en EUR ---- */
  'act-monde': {
    valeurs: [31.1, -12.8, 19.6, 26.6, 6.8],
    source: 'source',
    reference: 'MSCI World Index (EUR), performances calendaires',
    url: 'https://investingintheweb.com/blog/msci-world-index-historical-data/'
  },

  /* ---- Série sourcée : Bloomberg Euro Aggregate Bond ---- */
  'obl-ig-euro': {
    valeurs: [-2.9, -17.2, 7.2, 2.6, 1.3],
    source: 'source',
    reference: 'Bloomberg Euro Aggregate Bond Index — proxy de la poche IG €',
    url: 'https://www.ssga.com/library-content/products/factsheets/etfs/emea/factsheet-emea-en_gb-syba-gy.pdf'
  },

  /* ---- Séries estimées : À REMPLACER ---- */
  'act-us':            { valeurs: [38.0, -13.3, 21.5, 32.7, 3.0],  source: 'estime', reference: 'S&P 500 net EUR' },
  'act-europe':        { valeurs: [24.9, -10.6, 15.8, 8.8, 12.0],  source: 'estime', reference: 'STOXX Europe 600 NR' },
  'act-japon':         { valeurs: [8.5, -6.2, 18.5, 12.0, 10.0],   source: 'estime', reference: 'MSCI Japan EUR' },
  'act-emergents':     { valeurs: [4.9, -14.9, 6.1, 14.5, 12.0],   source: 'estime', reference: 'MSCI Emerging Markets EUR' },
  'act-small':         { valeurs: [25.0, -13.9, 12.5, 16.0, 2.0],  source: 'estime', reference: 'MSCI World Small Cap EUR' },
  'act-tech':          { valeurs: [38.0, -27.5, 49.0, 33.0, 8.0],  source: 'estime', reference: 'MSCI World Information Technology EUR' },
  'act-min-vol':       { valeurs: [21.0, -4.0, 6.5, 17.0, 6.0],    source: 'estime', reference: 'MSCI World Minimum Volatility EUR' },
  'obl-souv-euro-ct':  { valeurs: [-0.7, -4.6, 3.9, 3.5, 2.3],     source: 'estime', reference: 'Obligations souveraines € 1-3 ans' },
  'obl-souv-euro-lt':  { valeurs: [-3.5, -18.5, 7.1, 1.8, 0.5],    source: 'estime', reference: 'Obligations souveraines € toutes maturités' },
  'obl-hy-euro':       { valeurs: [3.4, -11.2, 12.0, 8.5, 5.5],    source: 'estime', reference: 'Obligations € haut rendement' },
  'obl-inflation':     { valeurs: [6.0, -12.5, 3.5, 2.5, 1.5],     source: 'estime', reference: 'Obligations € indexées inflation' },
  'obl-emergente':     { valeurs: [-1.0, -15.0, 9.0, 12.0, -2.0],  source: 'estime', reference: 'Dette émergente en dollars, convertie en euros' },
  'obl-globale-hedge': { valeurs: [-2.5, -13.5, 7.0, 2.5, 2.0],    source: 'estime', reference: 'Global Aggregate couvert en euros' },
  'mon-euro':          { valeurs: [-0.6, -0.1, 3.2, 3.6, 2.2],     source: 'estime', reference: '€STR capitalisé' },
  'div-or':            { valeurs: [-3.6, 6.0, 11.5, 34.0, 28.0],   source: 'estime', reference: 'Once d\'or en euros' },
  'div-immobilier':    { valeurs: [34.0, -18.0, 6.0, 5.0, 2.0],    source: 'estime', reference: 'Immobilier coté monde, en euros' },
  'div-matieres':      { valeurs: [35.0, 23.0, -10.0, 5.0, 6.0],   source: 'estime', reference: 'Matières premières diversifiées, en euros' }
};

/* Indices de comparaison affichés en regard du portefeuille. */
const REFERENCES_BACKTEST = [
  { id: 'monde',    nom: '100 % actions monde', poids: { 'act-monde': 100 } },
  { id: 'mixte',    nom: 'Référence 50/50',     poids: { 'act-monde': 50, 'obl-ig-euro': 50 } },
  { id: 'monetaire', nom: 'Monétaire €',        poids: { 'mon-euro': 100 } }
];
