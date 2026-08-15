/* =============================================================
   PROFILS DE RISQUE ET ALLOCATIONS STRATÉGIQUES CIBLES
   Les poches sont exprimées en % du portefeuille.
   ============================================================= */

const PROFILS = [
  {
    id: 'securitaire', nom: 'Sécuritaire', ordre: 0, scoreMin: 0,  scoreMax: 16, sri: '1 à 2',
    couleur: 'var(--profil-securitaire)',
    volatiliteCible: '0 – 3 %', perteMax: '-3 %', rendementCible: '2,0 – 2,5 %',
    horizonMin: 1,
    description: "Préservation du capital. Le portefeuille ne supporte pas de perte durable en capital.",
    allocation: { actions: 0, obligations: 25, monetaire: 70, diversifiants: 5 }
  },
  {
    id: 'prudent', nom: 'Prudent', ordre: 1, scoreMin: 17, scoreMax: 33, sri: '2 à 3',
    couleur: 'var(--profil-prudent)',
    volatiliteCible: '3 – 6 %', perteMax: '-8 %', rendementCible: '2,5 – 3,5 %',
    horizonMin: 3,
    description: "Recherche d'un rendement légèrement supérieur au monétaire, avec une exposition actions minoritaire.",
    allocation: { actions: 20, obligations: 45, monetaire: 25, diversifiants: 10 }
  },
  {
    id: 'equilibre', nom: 'Équilibré', ordre: 2, scoreMin: 34, scoreMax: 50, sri: '3 à 4',
    couleur: 'var(--profil-equilibre)',
    volatiliteCible: '6 – 10 %', perteMax: '-15 %', rendementCible: '3,5 – 5,0 %',
    horizonMin: 5,
    description: "Équilibre entre croissance et protection. Répartition proche 40/60 actions-taux.",
    allocation: { actions: 40, obligations: 40, monetaire: 10, diversifiants: 10 }
  },
  {
    id: 'dynamique', nom: 'Dynamique', ordre: 3, scoreMin: 51, scoreMax: 67, sri: '4',
    couleur: 'var(--profil-dynamique)',
    volatiliteCible: '10 – 14 %', perteMax: '-25 %', rendementCible: '5,0 – 6,5 %',
    horizonMin: 8,
    description: "Moteur actions majoritaire, poche obligataire de stabilisation.",
    allocation: { actions: 60, obligations: 27, monetaire: 5, diversifiants: 8 }
  },
  {
    id: 'offensif', nom: 'Offensif', ordre: 4, scoreMin: 68, scoreMax: 84, sri: '5',
    couleur: 'var(--profil-offensif)',
    volatiliteCible: '14 – 18 %', perteMax: '-35 %', rendementCible: '6,5 – 7,5 %',
    horizonMin: 10,
    description: "Portefeuille orienté croissance long terme, forte sensibilité aux marchés actions.",
    allocation: { actions: 78, obligations: 12, monetaire: 2, diversifiants: 8 }
  },
  {
    id: 'agressif', nom: 'Agressif', ordre: 5, scoreMin: 85, scoreMax: 100, sri: '5 à 6',
    couleur: 'var(--profil-agressif)',
    volatiliteCible: '18 – 24 %', perteMax: '-45 %', rendementCible: '7,5 – 9,0 %',
    horizonMin: 12,
    description: "Exposition actions quasi intégrale, y compris petites capitalisations et thématiques.",
    allocation: { actions: 92, obligations: 0, monetaire: 0, diversifiants: 8 }
  }
];

/* -------------------------------------------------------------
   Répartition interne de chaque classe d'actifs, par profil.
   Les valeurs sont des parts relatives (%) DE LA CLASSE.
   ------------------------------------------------------------- */

const SOUS_ALLOCATIONS = {
  actions: {
    securitaire: {},
    prudent:   { 'act-monde': 60, 'act-europe': 20, 'act-min-vol': 20 },
    equilibre: { 'act-monde': 50, 'act-us': 10, 'act-europe': 20, 'act-emergents': 8, 'act-min-vol': 12 },
    dynamique: { 'act-monde': 42, 'act-us': 15, 'act-europe': 17, 'act-japon': 5, 'act-emergents': 10, 'act-tech': 6, 'act-small': 5 },
    offensif:  { 'act-monde': 35, 'act-us': 18, 'act-europe': 15, 'act-japon': 5, 'act-emergents': 12, 'act-tech': 9, 'act-small': 6 },
    agressif:  { 'act-monde': 28, 'act-us': 20, 'act-europe': 12, 'act-japon': 5, 'act-emergents': 14, 'act-tech': 13, 'act-small': 8 }
  },
  obligations: {
    securitaire: { 'obl-souv-euro-ct': 60, 'obl-ig-euro': 40 },
    prudent:     { 'obl-souv-euro-ct': 30, 'obl-souv-euro-lt': 20, 'obl-ig-euro': 35, 'obl-inflation': 15 },
    equilibre:   { 'obl-souv-euro-ct': 20, 'obl-souv-euro-lt': 22, 'obl-ig-euro': 30, 'obl-inflation': 13, 'obl-hy-euro': 8, 'obl-emergente': 7 },
    dynamique:   { 'obl-souv-euro-lt': 25, 'obl-ig-euro': 30, 'obl-inflation': 12, 'obl-hy-euro': 18, 'obl-emergente': 15 },
    offensif:    { 'obl-ig-euro': 35, 'obl-hy-euro': 35, 'obl-emergente': 30 },
    agressif:    {}
  },
  monetaire: {
    securitaire: { 'mon-euro': 100 }, prudent: { 'mon-euro': 100 },
    equilibre:   { 'mon-euro': 100 }, dynamique: { 'mon-euro': 100 },
    offensif:    { 'mon-euro': 100 }, agressif: { 'mon-euro': 100 }
  },
  diversifiants: {
    securitaire: { 'div-or': 100 },
    prudent:     { 'div-or': 60, 'div-immobilier': 40 },
    equilibre:   { 'div-or': 55, 'div-immobilier': 30, 'div-matieres': 15 },
    dynamique:   { 'div-or': 50, 'div-immobilier': 30, 'div-matieres': 20 },
    offensif:    { 'div-or': 50, 'div-immobilier': 25, 'div-matieres': 25 },
    agressif:    { 'div-or': 50, 'div-immobilier': 25, 'div-matieres': 25 }
  }
};

/* Libellés lisibles des poches */
const LIBELLES_POCHES = {
  'act-monde':         'Actions Monde (développées)',
  'act-us':            'Actions États-Unis',
  'act-europe':        'Actions Europe',
  'act-japon':         'Actions Japon',
  'act-emergents':     'Actions Pays émergents',
  'act-small':         'Actions Petites capitalisations',
  'act-tech':          'Actions Technologie / Innovation',
  'act-min-vol':       'Actions Faible volatilité / Qualité',
  'obl-souv-euro-ct':  'Obligations souveraines € court terme',
  'obl-souv-euro-lt':  'Obligations souveraines € moyen-long terme',
  'obl-ig-euro':       'Obligations d\'entreprises € Investment Grade',
  'obl-hy-euro':       'Obligations à haut rendement',
  'obl-inflation':     'Obligations indexées sur l\'inflation',
  'obl-emergente':     'Dette émergente',
  'obl-globale-hedge': 'Obligations globales couvertes en €',
  'mon-euro':          'Monétaire € / Liquidités',
  'div-or':            'Or',
  'div-immobilier':    'Immobilier coté (SIIC / REITs)',
  'div-matieres':      'Matières premières diversifiées'
};

const LIBELLES_CLASSES = {
  actions: 'Actions',
  obligations: 'Obligations',
  monetaire: 'Monétaire',
  diversifiants: 'Diversifiants'
};

/* Les couleurs pointent vers les jetons de css/app.css : une seule
   source de vérité, et le basculement clair/sombre se fait sans
   intervention du JavaScript. */
const COULEURS_CLASSES = {
  actions: 'var(--serie-actions)',
  obligations: 'var(--serie-obligations)',
  monetaire: 'var(--serie-monetaire)',
  diversifiants: 'var(--serie-diversifiants)'
};
