/* =============================================================
   MODULE MACROÉCONOMIQUE & GÉOPOLITIQUE
   Le conseiller renseigne l'état du monde ; le moteur en déduit
   une distribution de scénarios puis des déviations tactiques
   par rapport à l'allocation stratégique.
   ============================================================= */

/* -------------------------------------------------------------
   1. INDICATEURS renseignés par le conseiller.
   Chaque option pousse la probabilité de certains scénarios
   (poids additifs) et applique éventuellement une surcouche
   directe sur des poches (overlay, en points de pourcentage).
   ------------------------------------------------------------- */

const INDICATEURS = [
  {
    id: 'cycle', groupe: 'Conjoncture', label: 'Cycle économique (zone euro / US)',
    aide: "Position dans le cycle : PMI, emploi, production industrielle.",
    options: [
      { valeur: 'recession',    label: 'Récession',   scenarios: { recession: 3.0, stagflation: 0.5 } },
      { valeur: 'ralentissement', label: 'Ralentissement', scenarios: { recession: 1.5, atterrissage: 1.0, stagflation: 0.5 } },
      { valeur: 'stabilisation', label: 'Stabilisation', scenarios: { atterrissage: 2.0 }, defaut: true },
      { valeur: 'reprise',      label: 'Reprise',     scenarios: { atterrissage: 1.5, reflation: 1.5 } },
      { valeur: 'expansion',    label: 'Expansion',   scenarios: { reflation: 2.5 } },
      { valeur: 'surchauffe',   label: 'Surchauffe',  scenarios: { stagflation: 2.0, reflation: 1.0 } }
    ]
  },
  {
    id: 'inflation', groupe: 'Conjoncture', label: 'Dynamique d\'inflation',
    options: [
      { valeur: 'desinflation', label: 'Désinflation marquée', scenarios: { atterrissage: 2.0, reflation: 1.0 } },
      { valeur: 'proche_cible', label: 'Proche de la cible (≈ 2 %)', scenarios: { atterrissage: 1.5, reflation: 0.5 }, defaut: true },
      { valeur: 'persistante',  label: 'Persistante au-dessus de la cible', scenarios: { stagflation: 1.5 } },
      { valeur: 'reacceleration', label: 'Réaccélération', scenarios: { stagflation: 3.0 }, overlay: { 'obl-inflation': 3, 'obl-souv-euro-lt': -3 } }
    ]
  },
  {
    id: 'politiqueMonetaire', groupe: 'Politique monétaire', label: 'Orientation des banques centrales',
    options: [
      { valeur: 'restrictive',   label: 'Restrictive (hausses de taux)', scenarios: { recession: 2.0, stagflation: 1.0 }, overlay: { 'mon-euro': 3, 'obl-souv-euro-lt': -2 } },
      { valeur: 'pause',         label: 'Pause / statu quo', scenarios: { atterrissage: 1.5 }, defaut: true },
      { valeur: 'assouplissement', label: 'Assouplissement en cours', scenarios: { atterrissage: 1.5, reflation: 1.5 }, overlay: { 'obl-souv-euro-lt': 3, 'mon-euro': -3 } },
      { valeur: 'accommodante',  label: 'Très accommodante / soutien d\'urgence', scenarios: { reflation: 2.0, recession: 1.0 }, overlay: { 'obl-souv-euro-lt': 4, 'mon-euro': -4 } }
    ]
  },
  {
    id: 'courbe', groupe: 'Politique monétaire', label: 'Courbe des taux',
    options: [
      { valeur: 'inversee',   label: 'Inversée', scenarios: { recession: 2.0 }, overlay: { 'obl-souv-euro-ct': 2, 'obl-souv-euro-lt': -2 } },
      { valeur: 'plate',      label: 'Plate', scenarios: { atterrissage: 1.0 }, defaut: true },
      { valeur: 'pentification', label: 'En pentification', scenarios: { reflation: 1.5 }, overlay: { 'obl-souv-euro-lt': 2, 'obl-souv-euro-ct': -2 } }
    ]
  },
  {
    id: 'credit', groupe: 'Marchés', label: 'Spreads de crédit',
    options: [
      { valeur: 'serres',  label: 'Très serrés (complaisance)', scenarios: { reflation: 1.0, recession: 0.5 }, overlay: { 'obl-hy-euro': -3, 'obl-ig-euro': 3 } },
      { valeur: 'neutres', label: 'Neutres', scenarios: {}, defaut: true },
      { valeur: 'ecartement', label: 'En écartement', scenarios: { recession: 1.5 }, overlay: { 'obl-hy-euro': -4, 'obl-souv-euro-ct': 4 } },
      { valeur: 'larges', label: 'Larges (stress avéré)', scenarios: { recession: 1.5 }, overlay: { 'obl-hy-euro': 4, 'obl-ig-euro': 2 } }
    ]
  },
  {
    id: 'valorisation', groupe: 'Marchés', label: 'Valorisation des actions américaines',
    options: [
      { valeur: 'attractives', label: 'Attractives (PER < moyenne LT)', scenarios: { reflation: 1.0 }, overlay: { 'act-us': 4, 'mon-euro': -4 } },
      { valeur: 'neutres',     label: 'Dans la moyenne', scenarios: {}, defaut: true },
      { valeur: 'elevees',     label: 'Élevées', scenarios: {}, overlay: { 'act-us': -3, 'act-europe': 2, 'act-emergents': 1 } },
      { valeur: 'extremes',    label: 'Extrêmes / concentration record', scenarios: { recession: 0.5 }, overlay: { 'act-us': -5, 'act-tech': -3, 'act-europe': 3, 'act-min-vol': 5 } }
    ]
  },
  {
    id: 'dollar', groupe: 'Marchés', label: 'Dollar américain',
    options: [
      { valeur: 'fort',    label: 'Fort / en appréciation', overlay: { 'act-emergents': -3, 'act-us': 2 } },
      { valeur: 'neutre',  label: 'Neutre', defaut: true },
      { valeur: 'faible',  label: 'Faible / en dépréciation', overlay: { 'act-emergents': 3, 'div-or': 2, 'act-us': -2 } }
    ]
  },
  {
    id: 'geopolitique', groupe: 'Géopolitique', label: 'Niveau de risque géopolitique',
    aide: "Conflits, tensions commerciales, échéances électorales majeures, risque énergétique.",
    options: [
      { valeur: 'faible',   label: 'Faible', overlay: { 'div-or': -2, 'act-emergents': 2 } },
      { valeur: 'modere',   label: 'Modéré', defaut: true },
      { valeur: 'eleve',    label: 'Élevé', scenarios: { stagflation: 1.0 }, overlay: { 'div-or': 3, 'div-matieres': 2, 'act-emergents': -2 } },
      { valeur: 'tres_eleve', label: 'Très élevé / conflit ouvert', scenarios: { stagflation: 2.0, recession: 1.0 }, overlay: { 'div-or': 5, 'div-matieres': 3, 'act-emergents': -4, 'mon-euro': 3 } }
    ]
  },
  {
    id: 'commerce', groupe: 'Géopolitique', label: 'Environnement commercial / tarifaire',
    options: [
      { valeur: 'ouverture', label: 'Détente, accords commerciaux', scenarios: { reflation: 1.0 }, overlay: { 'act-emergents': 3 } },
      { valeur: 'statuquo',  label: 'Statu quo', defaut: true },
      { valeur: 'tensions',  label: 'Montée du protectionnisme', scenarios: { stagflation: 1.5 }, overlay: { 'act-emergents': -3, 'act-europe': -2, 'act-us': 2 } },
      { valeur: 'guerre',    label: 'Guerre commerciale ouverte', scenarios: { stagflation: 2.0, recession: 1.5 }, overlay: { 'act-emergents': -5, 'act-europe': -3, 'div-or': 3 } }
    ]
  },
  {
    id: 'fiscalite', groupe: 'Géopolitique', label: 'Contexte budgétaire & fiscal',
    aide: "Trajectoire des déficits, prime de risque souveraine, réformes fiscales de l'épargne.",
    options: [
      { valeur: 'consolidation', label: 'Consolidation budgétaire', overlay: { 'obl-souv-euro-lt': 2 } },
      { valeur: 'neutre',        label: 'Neutre', defaut: true },
      { valeur: 'derapage',      label: 'Dérapage des déficits', overlay: { 'obl-souv-euro-lt': -3, 'obl-inflation': 2, 'div-or': 2 } },
      { valeur: 'crise',         label: 'Crise de la dette souveraine', scenarios: { recession: 1.5 }, overlay: { 'obl-souv-euro-lt': -5, 'obl-souv-euro-ct': 3, 'div-or': 4 } }
    ]
  },
  {
    id: 'momentum', groupe: 'Marchés', label: 'Tendance de marché (momentum 6 mois)',
    options: [
      { valeur: 'risk_off', label: 'Risk-off marqué', scenarios: { recession: 1.0 }, overlay: { 'act-monde': -3, 'mon-euro': 3 } },
      { valeur: 'neutre',   label: 'Sans tendance', defaut: true },
      { valeur: 'risk_on',  label: 'Risk-on', scenarios: { reflation: 1.0 }, overlay: { 'act-monde': 3, 'mon-euro': -3 } }
    ]
  }
];

/* -------------------------------------------------------------
   2. SCÉNARIOS et déviations tactiques associées.
   'tilts' : points de % à ajouter/retirer aux CLASSES.
   'poches' : points de % à ajouter/retirer aux POCHES (relatif
   à la classe, retraité ensuite).
   ------------------------------------------------------------- */

const SCENARIOS = [
  {
    id: 'atterrissage', nom: 'Atterrissage en douceur', couleur: 'var(--scenario-atterrissage)',
    description: "Croissance qui ralentit sans récession, inflation qui converge vers la cible, banques centrales qui assouplissent progressivement.",
    tilts: { actions: 4, obligations: 3, monetaire: -7, diversifiants: 0 },
    poches: { 'act-monde': 3, 'act-us': 2, 'obl-ig-euro': 4, 'obl-souv-euro-lt': 3, 'obl-souv-euro-ct': -4, 'act-min-vol': -3 }
  },
  {
    id: 'recession', nom: 'Récession', couleur: 'var(--scenario-recession)',
    description: "Contraction de l'activité, hausse du chômage, baisse des bénéfices, détente forte des taux longs.",
    tilts: { actions: -12, obligations: 8, monetaire: 3, diversifiants: 1 },
    poches: { 'obl-souv-euro-lt': 10, 'obl-souv-euro-ct': 4, 'obl-hy-euro': -8, 'obl-emergente': -5, 'act-min-vol': 10, 'act-small': -6, 'act-emergents': -5, 'act-tech': -4, 'div-or': 5, 'div-matieres': -5 }
  },
  {
    id: 'stagflation', nom: 'Stagflation', couleur: 'var(--scenario-stagflation)',
    description: "Croissance faible et inflation durablement élevée : les taux longs restent hauts, les marges se compriment.",
    tilts: { actions: -6, obligations: -4, monetaire: 4, diversifiants: 6 },
    poches: { 'obl-inflation': 12, 'obl-souv-euro-lt': -10, 'obl-souv-euro-ct': 5, 'act-tech': -6, 'act-min-vol': 6, 'div-or': 8, 'div-matieres': 8, 'div-immobilier': -6 }
  },
  {
    id: 'reflation', nom: 'Reflation / accélération', couleur: 'var(--scenario-reflation)',
    description: "Reprise synchronisée de la croissance, appétit pour le risque, hausse des bénéfices et des matières premières.",
    tilts: { actions: 8, obligations: -6, monetaire: -3, diversifiants: 1 },
    poches: { 'act-small': 6, 'act-emergents': 5, 'act-europe': 3, 'act-min-vol': -8, 'obl-hy-euro': 6, 'obl-souv-euro-lt': -6, 'div-matieres': 5, 'div-or': -4 }
  }
];

/* Bornes de déviation tactique par rapport à l'allocation stratégique
   (en points de pourcentage, valeur absolue). */
const BORNES_TACTIQUES = {
  actions: 10,
  obligations: 10,
  monetaire: 12,
  diversifiants: 6,
  poche: 8       // borne par poche à l'intérieur d'une classe
};

/* Seuils de déclenchement des arbitrages */
const SEUILS_ARBITRAGE = {
  ecartAbsoluMin: 2.0,     // points de % d'écart minimum pour proposer un mouvement
  ecartRelatifMin: 0.20,   // ou 20 % d'écart relatif sur la ligne
  montantMin: 500,         // pas d'ordre en dessous de ce montant
  ligneMinPct: 3.0         // pas de ligne cible en dessous de 3 % du portefeuille
};
