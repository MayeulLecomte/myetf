/* =============================================================
   UNIVERS ETF RÉFÉRENCÉ
   -------------------------------------------------------------
   Deux niveaux de contrôle, distincts et indépendants :

   • donneesLe / donneesSource — caractéristiques de marché (nom,
     ISIN, frais courants, encours, réplication, devise, capi/dist,
     éligibilité PEA) relevées sur une source publique à cette date.
     Ces données vieillissent : les encours bougent en permanence,
     les frais et les indices changent à l'occasion.

   • verifie — référencement effectif du support DANS LE CONTRAT du
     client, contrôlé par le conseiller sur la liste des supports.
     Seul ce drapeau engage le conseil ; lui seul retire le bandeau
     « à vérifier » dans la sélection.

   • morningstar / notationLe — note en étoiles relevée auprès de
     Morningstar à cette date, par `node scripts/notations.mjs`.
     Elle est recalculée tous les mois : à rafraîchir périodiquement.
     Neuf supports restent à null — les monétaires, les ETC sur l'or,
     les matières premières et les fonds de moins de trois ans, que
     Morningstar ne note pas. Tant qu'elle vaut null, la notation est
     retirée du score de sélection et le filtre « étoiles minimum »
     ne s'applique pas à ce support.

   Reste NON vérifié faute de source publique :
   • sri — indicateur de risque du DIC (1 à 7), à relever sur le
     document d'informations clés de chaque support.

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
    isin: 'IE00B4L5Y983', ticker: 'IWDA', nom: 'iShares Core MSCI World UCITS ETF USD (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-monde',
    ter: 0.20, encours: 128942, morningstar: 5, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'LU1681043599', ticker: 'CW8', nom: 'Amundi MSCI World Swap UCITS ETF EUR (Acc)',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-monde',
    ter: 0.38, encours: 6581, morningstar: 4, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'Remplace LU1781541179, liquidé ou fusionné.'
  },
  {
    isin: 'FR001400U5Q4', ticker: 'DCAM', nom: 'Amundi PEA Monde (MSCI World) UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-monde',
    ter: 0.20, encours: 1354, morningstar: null, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF',
    note: 'Remplace FR0011869353 (Lyxor PEA Monde), liquidé ou fusionné. Lancé le 4 mars 2025 : historique court.'
  },
  {
    isin: 'IE00BFY0GT14', ticker: 'SPPW', nom: 'SPDR MSCI World UCITS ETF USD Unhedged (Acc)',
    emetteur: 'State Street', classe: 'actions', poche: 'act-monde',
    ter: 0.12, encours: 18006, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'IE00BYX2JD69', ticker: 'SUWS', nom: 'iShares MSCI World SRI UCITS ETF EUR (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-monde',
    ter: 0.20, encours: 7114, morningstar: 3, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: true,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- ACTIONS ÉTATS-UNIS ---------------- */
  {
    isin: 'IE00B5BMR087', ticker: 'CSPX', nom: 'iShares Core S&P 500 UCITS ETF USD (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-us',
    ter: 0.07, encours: 135461, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'FR0011871128', ticker: 'PSP5', nom: 'Amundi PEA S&P 500 UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-us',
    ter: 0.12, encours: 1157, morningstar: 5, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'Cet ISIN figurait à tort en poche technologie sous le nom « Amundi PEA Nasdaq-100 ».'
  },
  {
    isin: 'LU0490618542', ticker: 'D5BM', nom: 'Xtrackers S&P 500 Swap UCITS ETF 1C',
    emetteur: 'DWS', classe: 'actions', poche: 'act-us',
    ter: 0.15, encours: 3583, morningstar: 5, sri: 4, replication: 'Synthétique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- ACTIONS EUROPE ---------------- */
  {
    isin: 'LU0908500753', ticker: 'MEUD', nom: 'Amundi Core Stoxx Europe 600 UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-europe',
    ter: 0.07, encours: 21197, morningstar: 5, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'Éligibilité PEA retirée : le Stoxx Europe 600 comprend Suisse et Royaume-Uni. À confirmer auprès du teneur de compte.'
  },
  {
    isin: 'IE00B4K48X80', ticker: 'EUNK', nom: 'iShares Core MSCI Europe UCITS ETF EUR (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-europe',
    ter: 0.12, encours: 16204, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'FR0007052782', ticker: 'CAC', nom: 'Amundi CAC 40 UCITS ETF Dist',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-europe',
    ter: 0.25, encours: 3461, morningstar: 5, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'Part distribuante (dividende annuel), et non capitalisante comme indiqué initialement.'
  },
  {
    isin: 'LU1861137484', ticker: 'EUSRI', nom: 'Amundi MSCI Europe SRI Climate Paris Aligned UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-europe',
    ter: 0.18, encours: 977, morningstar: 2, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: true,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'Remplace LU1861138961, qui est en réalité le fonds émergents de la même gamme.'
  },

  /* ---------------- ACTIONS JAPON ---------------- */
  {
    isin: 'IE00B4L5YX21', ticker: 'EUNN', nom: 'iShares Core MSCI Japan IMI UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-japon',
    ter: 0.12, encours: 7204, morningstar: 3, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'LU0659580079', ticker: 'XMK9', nom: 'Xtrackers MSCI Japan UCITS ETF 4C EUR Hedged',
    emetteur: 'DWS', classe: 'actions', poche: 'act-japon',
    ter: 0.40, encours: 924, morningstar: null, sri: 4, replication: 'Physique',
    devise: 'EUR', hedge: true, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF',
    note: 'Remplace LU1781541252, qui n\'est pas couvert en euro. Alternative moins chère mais plus petite et distribuante : LU2133056387 (Amundi, 0,20 %, 192 M€).'
  },

  /* ---------------- ACTIONS ÉMERGENTS ---------------- */
  {
    isin: 'IE00BKM4GZ66', ticker: 'EIMI', nom: 'iShares Core MSCI EM IMI UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-emergents',
    ter: 0.18, encours: 37551, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'FR0013412020', ticker: 'PAEEM', nom: 'Amundi PEA Emergent (MSCI Emerging) ESG Transition UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-emergents',
    ter: 0.30, encours: 853, morningstar: 3, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: true,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- ACTIONS PETITES CAPITALISATIONS ---------------- */
  {
    isin: 'IE00BF4RFH31', ticker: 'IUSN', nom: 'iShares MSCI World Small Cap UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-small',
    ter: 0.35, encours: 7764, morningstar: 3, sri: 5, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'LU1681038672', ticker: 'RS2K', nom: 'Amundi Russell 2000 UCITS ETF EUR (C)',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-small',
    ter: 0.35, encours: 799, morningstar: 3, sri: 5, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'justETF annonce ce support éligible au PEA ; laissé à false faute de confirmation par l\'émetteur.'
  },

  /* ---------------- ACTIONS TECHNOLOGIE ---------------- */
  {
    isin: 'IE00BM67HT60', ticker: 'XDWT', nom: 'Xtrackers MSCI World Information Technology UCITS ETF 1C',
    emetteur: 'DWS', classe: 'actions', poche: 'act-tech',
    ter: 0.25, encours: 5617, morningstar: 4, sri: 5, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'IE00B53SZB19', ticker: 'CSNDX', nom: 'iShares Nasdaq 100 UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-tech',
    ter: 0.30, encours: 24409, morningstar: 5, sri: 5, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'FR0011871110', ticker: 'PUST', nom: 'Amundi PEA Nasdaq-100 UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'actions', poche: 'act-tech',
    ter: 0.30, encours: 1131, morningstar: 5, sri: 5, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'ISIN corrigé : FR0011871128 désigne le PEA S&P 500, pas le PEA Nasdaq-100.'
  },

  /* ---------------- ACTIONS FAIBLE VOLATILITÉ / QUALITÉ ---------------- */
  {
    isin: 'IE00B8FHGS14', ticker: 'MVOL', nom: 'iShares Edge MSCI World Minimum Volatility UCITS ETF USD (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-min-vol',
    ter: 0.30, encours: 2307, morningstar: 2, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'IE00BP3QZ601', ticker: 'IWQU', nom: 'iShares Edge MSCI World Quality Factor UCITS ETF (Acc)',
    emetteur: 'BlackRock', classe: 'actions', poche: 'act-min-vol',
    ter: 0.25, encours: 5367, morningstar: 4, sri: 4, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- OBLIGATIONS SOUVERAINES COURT TERME ---------------- */
  {
    isin: 'IE00B14X4Q57', ticker: 'IBGS', nom: 'iShares € Government Bond 1-3yr UCITS ETF (Dist)',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-souv-euro-ct',
    ter: 0.15, encours: 1766, morningstar: 4, sri: 2, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'LU1650487413', ticker: 'C13', nom: 'Amundi Euro Government Bond 1-3Y UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'obligations', poche: 'obl-souv-euro-ct',
    ter: 0.15, encours: 2209, morningstar: 3, sri: 2, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- OBLIGATIONS SOUVERAINES MOYEN-LONG TERME ---------------- */
  {
    isin: 'IE00B4WXJJ64', ticker: 'IEGA', nom: 'iShares Core € Govt Bond UCITS ETF (Dist)',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-souv-euro-lt',
    ter: 0.07, encours: 5421, morningstar: 3, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'LU0290355717', ticker: 'XGLE', nom: 'Xtrackers II Eurozone Government Bond UCITS ETF 1C',
    emetteur: 'DWS', classe: 'obligations', poche: 'obl-souv-euro-lt',
    ter: 0.07, encours: 2269, morningstar: 3, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'Remplace LU1287023342, qui est un fonds Amundi et non Xtrackers.'
  },

  /* ---------------- OBLIGATIONS D'ENTREPRISES INVESTMENT GRADE ---------------- */
  {
    isin: 'IE00B3F81R35', ticker: 'IEAC', nom: 'iShares Core € Corp Bond UCITS ETF (Dist)',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-ig-euro',
    ter: 0.09, encours: 8883, morningstar: 3, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'LU2089238625', ticker: 'PRAC', nom: 'Amundi Core EUR Corporate Bond UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'obligations', poche: 'obl-ig-euro',
    ter: 0.07, encours: 865, morningstar: 3, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'Remplace LU1681040900, qui est un fonds à taux variable en dollars.'
  },

  /* ---------------- OBLIGATIONS HAUT RENDEMENT ---------------- */
  {
    isin: 'IE00B66F4759', ticker: 'IHYG', nom: 'iShares € High Yield Corp Bond UCITS ETF EUR (Dist)',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-hy-euro',
    ter: 0.50, encours: 5508, morningstar: 3, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- OBLIGATIONS INDEXÉES INFLATION ---------------- */
  {
    isin: 'IE00B0M62X26', ticker: 'IBCI', nom: 'iShares € Inflation Linked Govt Bond UCITS ETF',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-inflation',
    ter: 0.09, encours: 1928, morningstar: 3, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16',
    note: 'Part capitalisante, et non distribuante comme indiqué initialement.'
  },

  /* ---------------- DETTE ÉMERGENTE ---------------- */
  {
    isin: 'IE00B2NPKV68', ticker: 'IEMB', nom: 'iShares J.P. Morgan $ EM Bond UCITS ETF (Dist)',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-emergente',
    ter: 0.45, encours: 3741, morningstar: 2, sri: 3, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- OBLIGATIONS GLOBALES COUVERTES ---------------- */
  {
    isin: 'IE00BDBRDM35', ticker: 'AGGH', nom: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)',
    emetteur: 'BlackRock', classe: 'obligations', poche: 'obl-globale-hedge',
    ter: 0.10, encours: 2499, morningstar: 3, sri: 3, replication: 'Physique',
    devise: 'EUR', hedge: true, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- MONÉTAIRE ---------------- */
  {
    isin: 'LU0290358497', ticker: 'XEON', nom: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C',
    emetteur: 'DWS', classe: 'monetaire', poche: 'mon-euro',
    ter: 0.10, encours: 22496, morningstar: null, sri: 1, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF'
  },
  {
    isin: 'FR0010510800', ticker: 'CSH', nom: 'Amundi EUR Overnight Return UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'monetaire', poche: 'mon-euro',
    ter: 0.10, encours: 3226, morningstar: null, sri: 1, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF',
    note: 'Réplication synthétique et non physique ; éligibilité PEA retirée : ce support ne figure pas parmi les ETF PEA d\'Amundi.'
  },
  {
    isin: 'FR0013346681', ticker: 'OBLI', nom: 'Amundi PEA Euro Court Terme UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'monetaire', poche: 'mon-euro',
    ter: 0.25, encours: 194, morningstar: null, sri: 1, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: true, enveloppes: ['AV', 'CTO', 'PEA'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF',
    note: 'Ajouté : seul support monétaire réellement éligible au PEA de la gamme. Sans lui, un PEA ne peut porter aucune poche défensive.'
  },

  /* ---------------- OR ---------------- */
  {
    isin: 'IE00B4ND3602', ticker: 'IGLN', nom: 'iShares Physical Gold ETC',
    emetteur: 'BlackRock', classe: 'diversifiants', poche: 'div-or',
    ter: 0.12, encours: 32698, morningstar: null, sri: 4, replication: 'Physique (ETC)',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF',
    note: 'ETC : instrument de dette adossé à l\'or physique, hors directive UCITS.'
  },
  {
    isin: 'FR0013416716', ticker: 'GOLD', nom: 'Amundi Physical Gold ETC (C)',
    emetteur: 'Amundi', classe: 'diversifiants', poche: 'div-or',
    ter: 0.12, encours: 10575, morningstar: null, sri: 4, replication: 'Physique (ETC)',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-restreint'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF',
    note: 'ETC : instrument de dette adossé à l\'or physique, hors directive UCITS. Libellé en dollars, et non en euros.'
  },

  /* ---------------- IMMOBILIER COTÉ ---------------- */
  {
    isin: 'IE00B1FZS350', ticker: 'IWDP', nom: 'iShares Developed Markets Property Yield UCITS ETF',
    emetteur: 'BlackRock', classe: 'diversifiants', poche: 'div-immobilier',
    ter: 0.59, encours: 1038, morningstar: 3, sri: 5, replication: 'Physique',
    devise: 'USD', hedge: false, capitalisation: false, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },
  {
    isin: 'LU1437018838', ticker: 'EPRA', nom: 'Amundi FTSE EPRA NAREIT Global UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'diversifiants', poche: 'div-immobilier',
    ter: 0.24, encours: 401, morningstar: 3, sri: 5, replication: 'Physique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF', notationLe: '2026-08-16'
  },

  /* ---------------- MATIÈRES PREMIÈRES ---------------- */
  {
    isin: 'IE00BDFL4P12', ticker: 'ICOM', nom: 'iShares Diversified Commodity Swap UCITS ETF',
    emetteur: 'BlackRock', classe: 'diversifiants', poche: 'div-matieres',
    ter: 0.19, encours: 1985, morningstar: null, sri: 4, replication: 'Synthétique',
    devise: 'USD', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-standard'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF'
  },
  {
    isin: 'LU1829218749', ticker: 'COMO', nom: 'Amundi Bloomberg Equal-weight Commodity ex-Agriculture UCITS ETF Acc',
    emetteur: 'Amundi', classe: 'diversifiants', poche: 'div-matieres',
    ter: 0.30, encours: 1665, morningstar: null, sri: 4, replication: 'Synthétique',
    devise: 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: '2026-08-15', donneesSource: 'justETF',
    note: 'Remplace LU0292106167 (125 M€ d\'encours). Indice énergie et métaux équipondéré, sans agriculture ni bétail.'
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
  { nom: 'justETF',            url: 'https://www.justetf.com/fr/', usage: 'Frais courants, encours, réplication, devise, capitalisation — source du contrôle du 15/08/2026' },
  { nom: 'Quantalys',          url: 'https://www.quantalys.com/', usage: 'Notation, historiques de performance, comparaison de fonds (abonnement)' },
  { nom: 'Morningstar France', url: 'https://www.morningstar.fr/fr/etf/', usage: 'Notation étoiles, Medalist Rating, encours' },
  { nom: 'AMF – base GECO',    url: 'https://geco.amf-france.org/', usage: 'Agrément et documentation réglementaire (DIC)' }
];
