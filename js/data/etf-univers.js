/* =============================================================
   UNIVERS ETF RÉFÉRENCÉ
   -------------------------------------------------------------
   ⚠  IMPORTANT — Les données ci-dessous (ISIN, frais courants,
   encours, notation Morningstar, éligibilité PEA et référencement
   en assurance-vie) sont un JEU DE DONNÉES DE DÉPART INDICATIF.
   Elles DOIVENT être vérifiées et rafraîchies dans l'onglet
   « Univers ETF » à partir de Quantalys / Morningstar / du DIC de
   l'ETF et de la liste des supports du contrat avant toute
   utilisation en clientèle. Le champ `verifie` passe à true une
   fois la ligne contrôlée par le conseiller.

   contratsAV :
     av-restreint  → contrat bancaire, univers court
     av-standard   → contrat intermédiaire
     av-large      → contrat en architecture ouverte
   Un ETF disponible dans un univers restreint l'est aussi dans
   les univers plus larges (géré par le moteur d'éligibilité).
   ============================================================= */

const ETF_UNIVERS = [

  /* ---------------- ACTIONS MONDE ---------------- */
  {
    isin: 'IE00B4L5Y983', ticker: 'IWDA', nom: 'iShares Core MSCI World UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-monde',
    ter: 0.20, encours: 62000, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'LU1781541179', ticker: 'CW8', nom: 'Amundi Core MSCI World UCITS ETF (Acc)',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-monde',
    ter: 0.12, encours: 8500, morningstar: 5, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'FR0011869353', ticker: 'CW8P', nom: 'Amundi PEA Monde (MSCI World) UCITS ETF',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-monde',
    ter: 0.38, encours: 2400, morningstar: 4, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'IE00BFY0GT14', ticker: 'SPPW', nom: 'SPDR MSCI World UCITS ETF',
    emetteur: 'State Street', classe: 'actions', poche: 'act-monde',
    ter: 0.12, encours: 5200, morningstar: 5, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'IE00BYX2JD69', ticker: 'SUWS', nom: 'iShares MSCI World SRI UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-monde',
    ter: 0.20, encours: 6100, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: true,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },

  /* ---------------- ACTIONS ÉTATS-UNIS ---------------- */
  {
    isin: 'IE00B5BMR087', ticker: 'CSPX', nom: 'iShares Core S&P 500 UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-us',
    ter: 0.07, encours: 95000, morningstar: 5, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'FR0013412285', ticker: 'PE500', nom: 'Amundi PEA S&P 500 UCITS ETF',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-us',
    ter: 0.15, encours: 3100, morningstar: 5, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'LU0490618542', ticker: 'XDWS', nom: 'Xtrackers S&P 500 Swap UCITS ETF (Acc)',
    emetteur: 'DWS', classe: 'actions', poche: 'act-us',
    ter: 0.09, encours: 4800, morningstar: 5, sri: 4, replication: 'Synthétique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false
  },

  /* ---------------- ACTIONS EUROPE ---------------- */
  {
    isin: 'LU0908500753', ticker: 'MEUD', nom: 'Amundi Stoxx Europe 600 UCITS ETF (Acc)',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-europe',
    ter: 0.07, encours: 7200, morningstar: 5, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'IE00B4K48X80', ticker: 'IMEU', nom: 'iShares Core MSCI Europe UCITS ETF',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-europe',
    ter: 0.12, encours: 6400, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'FR0007052782', ticker: 'CAC', nom: 'Amundi CAC 40 UCITS ETF (Acc)',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-europe',
    ter: 0.25, encours: 3800, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'LU1861138961', ticker: 'ESGE', nom: 'Amundi MSCI Europe ESG Leaders UCITS ETF',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-europe',
    ter: 0.18, encours: 1900, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: true,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-large'], verifie: false
  },

  /* ---------------- ACTIONS JAPON ---------------- */
  {
    isin: 'IE00B4L5YX21', ticker: 'IJPA', nom: 'iShares Core MSCI Japan IMI UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-japon',
    ter: 0.15, encours: 5600, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'JPY', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'LU1781541252', ticker: 'TPXH', nom: 'Amundi Japan TOPIX UCITS ETF (EUR Hedged)',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-japon',
    ter: 0.20, encours: 1200, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: true, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false
  },

  /* ---------------- ACTIONS ÉMERGENTS ---------------- */
  {
    isin: 'IE00BKM4GZ66', ticker: 'EIMI', nom: 'iShares Core MSCI EM IMI UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-emergents',
    ter: 0.18, encours: 22000, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'FR0013412020', ticker: 'PAEEM', nom: 'Amundi PEA MSCI Emerging Markets ESG Leaders',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-emergents',
    ter: 0.30, encours: 1100, morningstar: 4, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: true,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false
  },

  /* ---------------- ACTIONS PETITES CAPITALISATIONS ---------------- */
  {
    isin: 'IE00BF4RFH31', ticker: 'WSML', nom: 'iShares MSCI World Small Cap UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-small',
    ter: 0.35, encours: 5300, morningstar: 4, sri: 5, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'LU1681038672', ticker: 'RS2K', nom: 'Amundi Russell 2000 UCITS ETF (Acc)',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-small',
    ter: 0.35, encours: 900, morningstar: 4, sri: 5, replication: 'Synthétique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false
  },

  /* ---------------- ACTIONS TECHNOLOGIE ---------------- */
  {
    isin: 'IE00BM67HT60', ticker: 'XDWT', nom: 'Xtrackers MSCI World Information Technology UCITS ETF',
    emetteur: 'DWS', classe: 'actions', poche: 'act-tech',
    ter: 0.25, encours: 4200, morningstar: 5, sri: 5, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'IE00B53SZB19', ticker: 'CSNDX', nom: 'iShares NASDAQ 100 UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-tech',
    ter: 0.30, encours: 14000, morningstar: 5, sri: 5, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'FR0011871128', ticker: 'PUST', nom: 'Amundi PEA Nasdaq-100 UCITS ETF',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-tech',
    ter: 0.30, encours: 2200, morningstar: 5, sri: 5, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-large'], verifie: false
  },

  /* ---------------- ACTIONS FAIBLE VOLATILITÉ / QUALITÉ ---------------- */
  {
    isin: 'IE00B8FHGS14', ticker: 'MVOL', nom: 'iShares Edge MSCI World Minimum Volatility UCITS ETF',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-min-vol',
    ter: 0.30, encours: 3400, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'IE00BP3QZ601', ticker: 'IWQU', nom: 'iShares Edge MSCI World Quality Factor UCITS ETF',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-min-vol',
    ter: 0.30, encours: 5900, morningstar: 5, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },

  /* ---------------- OBLIGATIONS SOUVERAINES COURT TERME ---------------- */
  {
    isin: 'IE00B14X4Q57', ticker: 'IBGS', nom: 'iShares € Government Bond 1-3yr UCITS ETF',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-souv-euro-ct',
    ter: 0.15, encours: 3600, morningstar: 4, sri: 2, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'LU1650487413', ticker: 'C13', nom: 'Amundi Euro Government Bond 1-3Y UCITS ETF',
    emetteur: 'Amundi', classe: 'obligations', poche: 'obl-souv-euro-ct',
    ter: 0.14, encours: 1300, morningstar: 4, sri: 2, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false
  },

  /* ---------------- OBLIGATIONS SOUVERAINES MOYEN-LONG TERME ---------------- */
  {
    isin: 'IE00B4WXJJ64', ticker: 'IEGA', nom: 'iShares Core € Govt Bond UCITS ETF',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-souv-euro-lt',
    ter: 0.09, encours: 5100, morningstar: 4, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'LU1287023342', ticker: 'X710', nom: 'Xtrackers Eurozone Government Bond UCITS ETF',
    emetteur: 'DWS', classe: 'obligations', poche: 'obl-souv-euro-lt',
    ter: 0.15, encours: 2600, morningstar: 4, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false
  },

  /* ---------------- OBLIGATIONS D'ENTREPRISES INVESTMENT GRADE ---------------- */
  {
    isin: 'IE00B3F81R35', ticker: 'IEAC', nom: 'iShares Core € Corp Bond UCITS ETF',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-ig-euro',
    ter: 0.20, encours: 12000, morningstar: 4, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'LU1681040900', ticker: 'CRP', nom: 'Amundi Euro Corporate Bond UCITS ETF (Acc)',
    emetteur: 'Amundi', classe: 'obligations', poche: 'obl-ig-euro',
    ter: 0.16, encours: 2100, morningstar: 4, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },

  /* ---------------- OBLIGATIONS HAUT RENDEMENT ---------------- */
  {
    isin: 'IE00B66F4759', ticker: 'IHYG', nom: 'iShares € High Yield Corp Bond UCITS ETF',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-hy-euro',
    ter: 0.50, encours: 5400, morningstar: 4, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },

  /* ---------------- OBLIGATIONS INDEXÉES INFLATION ---------------- */
  {
    isin: 'IE00B0M62X26', ticker: 'IBCI', nom: 'iShares € Inflation Linked Govt Bond UCITS ETF',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-inflation',
    ter: 0.09, encours: 2300, morningstar: 4, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },

  /* ---------------- DETTE ÉMERGENTE ---------------- */
  {
    isin: 'IE00B2NPKV68', ticker: 'IEMB', nom: 'iShares J.P. Morgan $ EM Bond UCITS ETF',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-emergente',
    ter: 0.45, encours: 8900, morningstar: 4, sri: 3, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },

  /* ---------------- OBLIGATIONS GLOBALES COUVERTES ---------------- */
  {
    isin: 'IE00BDBRDM35', ticker: 'AGGH', nom: 'iShares Core Global Aggregate Bond UCITS ETF (EUR Hedged)',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-globale-hedge',
    ter: 0.10, encours: 7300, morningstar: 4, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: true, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },

  /* ---------------- MONÉTAIRE ---------------- */
  {
    isin: 'LU0290358497', ticker: 'XEON', nom: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF',
    emetteur: 'DWS', classe: 'monetaire', poche: 'mon-euro',
    ter: 0.10, encours: 21000, morningstar: 4, sri: 1, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false
  },
  {
    isin: 'FR0010510800', ticker: 'SMART', nom: 'Amundi Euro Overnight Return UCITS ETF',
    emetteur: 'Amundi', classe: 'monetaire', poche: 'mon-euro',
    ter: 0.10, encours: 2800, morningstar: 4, sri: 1, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false
  },

  /* ---------------- OR ---------------- */
  {
    isin: 'IE00B4ND3602', ticker: 'IGLN', nom: 'iShares Physical Gold ETC',
    emetteur: 'BlackRock', classe: 'diversifiants', poche: 'div-or',
    ter: 0.12, encours: 18000, morningstar: 4, sri: 4, replication: 'Physique (ETC)',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    note: 'ETC : instrument de dette adossé à l\'or physique, hors directive UCITS.'
  },
  {
    isin: 'FR0013416716', ticker: 'GOLD', nom: 'Amundi Physical Gold ETC',
    emetteur: 'Amundi', classe: 'diversifiants', poche: 'div-or',
    ter: 0.12, encours: 5200, morningstar: 4, sri: 4, replication: 'Physique (ETC)',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    note: 'ETC : instrument de dette adossé à l\'or physique, hors directive UCITS.'
  },

  /* ---------------- IMMOBILIER COTÉ ---------------- */
  {
    isin: 'IE00B1FZS350', ticker: 'IWDP', nom: 'iShares Developed Markets Property Yield UCITS ETF',
    emetteur: 'BlackRock', classe: 'diversifiants', poche: 'div-immobilier',
    ter: 0.59, encours: 1800, morningstar: 4, sri: 5, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'LU1437018838', ticker: 'EPRA', nom: 'Amundi Index FTSE EPRA NAREIT Global UCITS ETF',
    emetteur: 'Amundi', classe: 'diversifiants', poche: 'div-immobilier',
    ter: 0.24, encours: 1100, morningstar: 4, sri: 5, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false
  },

  /* ---------------- MATIÈRES PREMIÈRES ---------------- */
  {
    isin: 'IE00BDFL4P12', ticker: 'ICOM', nom: 'iShares Diversified Commodity Swap UCITS ETF',
    emetteur: 'BlackRock', classe: 'diversifiants', poche: 'div-matieres',
    ter: 0.19, encours: 1500, morningstar: 4, sri: 4, replication: 'Synthétique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false
  },
  {
    isin: 'LU0292106167', ticker: 'XCMC', nom: 'Xtrackers Bloomberg Commodity Swap UCITS ETF',
    emetteur: 'DWS', classe: 'diversifiants', poche: 'div-matieres',
    ter: 0.35, encours: 800, morningstar: 4, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false
  }
];

/* Hiérarchie des univers de contrat : un support référencé dans un
   univers restreint est disponible dans les univers plus larges. */
const HIERARCHIE_CONTRATS = {
  'av-restreint': ['av-restreint'],
  'av-standard':  ['av-restreint', 'av-standard'],
  'av-large':     ['av-restreint', 'av-standard', 'av-large']
};

/* Sources de rafraîchissement des données (onglet Univers ETF) */
const SOURCES_DONNEES = [
  { nom: 'Quantalys',          url: 'https://www.quantalys.com/', usage: 'Notation, historiques de performance, comparaison de fonds (abonnement)' },
  { nom: 'Morningstar France', url: 'https://www.morningstar.fr/fr/etf/', usage: 'Notation étoiles, Medalist Rating, encours' },
  { nom: 'justETF',            url: 'https://www.justetf.com/fr/', usage: 'Frais courants, encours, réplication, éligibilité PEA' },
  { nom: 'AMF – base GECO',    url: 'https://geco.amf-france.org/', usage: 'Agrément et documentation réglementaire (DIC)' }
];
