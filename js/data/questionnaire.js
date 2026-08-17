/* =============================================================
   QUESTIONNAIRE DE PROFILAGE INVESTISSEUR
   Structure MIF2 / DDA : connaissance & expérience, situation
   financière (capacité de perte), objectifs & horizon,
   tolérance au risque, préférences de durabilité.
   ============================================================= */

const IDENTITE = [
  { id: 'nom',        label: 'Nom / référence dossier', type: 'text',   placeholder: 'M. et Mme Dupont' },
  { id: 'age',        label: 'Âge du client',     type: 'number', min: 18, max: 100, defaut: 45, suffixe: 'ans' },
  { id: 'montant',    label: 'Montant à investir',      type: 'number', min: 0, defaut: 100000, suffixe: '€' },
  { id: 'versement',  label: 'Versement programmé mensuel', type: 'number', min: 0, defaut: 0, suffixe: '€/mois' },
  {
    id: 'enveloppe', label: 'Enveloppe support', type: 'select', defaut: 'AV',
    options: [
      { valeur: 'AV',  label: 'Assurance-vie / Capitalisation' },
      { valeur: 'PEA', label: 'PEA' },
      { valeur: 'CTO', label: 'Compte-titres ordinaire' }
    ]
  },
  {
    id: 'contratAV', label: 'Gamme du contrat (assurance-vie)', type: 'select', defaut: 'av-large',
    dependDe: { champ: 'enveloppe', valeur: 'AV' },
    options: [
      { valeur: 'av-large',     label: 'Contrat architecture ouverte — univers large' },
      { valeur: 'av-standard',  label: 'Contrat standard — univers intermédiaire' },
      { valeur: 'av-restreint', label: 'Contrat bancaire — univers restreint' }
    ]
  }
];

/* -------------------------------------------------------------
   Questions notées.
   axe : 'capacite' | 'tolerance' | 'connaissance' | 'preference'
   Chaque option porte un score sur 100. Le score d'un axe est la
   moyenne pondérée (poids) des questions de cet axe.
   ------------------------------------------------------------- */

const QUESTIONS = [
  /* ---------- OBJECTIFS & HORIZON (capacité) ---------- */
  {
    id: 'q_horizon', section: 'Objectifs & horizon', axe: 'capacite', poids: 2,
    texte: "Sur quelle durée envisagez-vous de conserver ce placement sans avoir besoin des fonds ?",
    aide: "L'horizon est le premier déterminant du risque acceptable : il plafonne le profil quel que soit le reste.",
    options: [
      { label: 'Moins de 2 ans',   score: 0,   meta: { horizon: 1 } },
      { label: 'De 2 à 5 ans',     score: 25,  meta: { horizon: 3 } },
      { label: 'De 5 à 8 ans',     score: 55,  meta: { horizon: 6 } },
      { label: 'De 8 à 15 ans',    score: 85,  meta: { horizon: 11 } },
      { label: 'Plus de 15 ans',   score: 100, meta: { horizon: 18 } }
    ]
  },
  {
    id: 'q_objectif', section: 'Objectifs & horizon', axe: 'capacite', poids: 1,
    texte: "Quel est l'objectif principal de ce placement ?",
    options: [
      { label: 'Préserver le capital, disponibilité immédiate', score: 0,   meta: { objectif: 'securite' } },
      { label: 'Générer des revenus complémentaires réguliers', score: 30,  meta: { objectif: 'revenus' } },
      { label: 'Valoriser mon épargne à moyen terme',           score: 60,  meta: { objectif: 'croissance' } },
      { label: 'Préparer ma retraite (horizon long)',           score: 75,  meta: { objectif: 'retraite' } },
      { label: 'Rechercher la performance maximale',            score: 100, meta: { objectif: 'performance' } },
      { label: 'Transmettre / capitaliser sur le long terme',   score: 80,  meta: { objectif: 'transmission' } }
    ]
  },
  {
    id: 'q_retrait', section: 'Objectifs & horizon', axe: 'capacite', poids: 1.5,
    texte: "Quelle est la probabilité d'un retrait important (> 30 %) avant l'échéance prévue ?",
    options: [
      { label: 'Certaine, dans les 2 ans',       score: 0 },
      { label: 'Possible, sans être planifiée',  score: 35 },
      { label: 'Peu probable',                   score: 75 },
      { label: 'Nulle, les fonds sont dédiés',   score: 100 }
    ]
  },

  /* ---------- SITUATION FINANCIÈRE (capacité de perte) ---------- */
  {
    id: 'q_precaution', section: 'Situation financière', axe: 'capacite', poids: 1.5,
    texte: "De quelle épargne de précaution disponible immédiatement disposez-vous, hors ce placement ?",
    aide: "Sans matelas de sécurité, toute baisse de marché peut contraindre à vendre au pire moment.",
    options: [
      { label: 'Aucune',                        score: 0 },
      { label: 'Moins de 3 mois de dépenses',   score: 30 },
      { label: 'De 3 à 6 mois de dépenses',     score: 75 },
      { label: 'Plus de 6 mois de dépenses',    score: 100 }
    ]
  },
  {
    id: 'q_partpatrimoine', section: 'Situation financière', axe: 'capacite', poids: 2,
    texte: "Quelle part de votre patrimoine financier total ce placement représente-t-il ?",
    options: [
      { label: 'Plus de 75 %',   score: 10 },
      { label: 'De 50 à 75 %',   score: 35 },
      { label: 'De 25 à 50 %',   score: 70 },
      { label: 'Moins de 25 %',  score: 100 }
    ]
  },
  {
    id: 'q_capaciteEpargne', section: 'Situation financière', axe: 'capacite', poids: 1,
    texte: "Quelle est votre capacité d'épargne mensuelle, une fois toutes les charges payées ?",
    options: [
      { label: 'Négative (je puise dans mon épargne)', score: 0 },
      { label: 'Nulle ou marginale',                   score: 25 },
      { label: 'Moins de 10 % de mes revenus',         score: 65 },
      { label: 'Plus de 10 % de mes revenus',          score: 100 }
    ]
  },
  {
    id: 'q_endettement', section: 'Situation financière', axe: 'capacite', poids: 1,
    texte: "Quel est votre taux d'endettement actuel (toutes charges de crédit / revenus) ?",
    options: [
      { label: 'Supérieur à 45 %',   score: 0 },
      { label: 'De 33 à 45 %',       score: 35 },
      { label: 'Inférieur à 33 %',   score: 80 },
      { label: 'Aucun crédit en cours', score: 100 }
    ]
  },
  {
    id: 'q_stabilite', section: 'Situation financière', axe: 'capacite', poids: 1,
    texte: "Comment qualifieriez-vous la stabilité de vos revenus sur les 5 prochaines années ?",
    options: [
      { label: 'Instables ou incertains',              score: 15 },
      { label: 'Variables (indépendant, commissions)', score: 45 },
      { label: 'Stables',                              score: 85 },
      { label: 'Stables et indexés / garantis',        score: 100 }
    ]
  },

  /* ---------- CONNAISSANCE & EXPÉRIENCE ---------- */
  {
    id: 'q_connaissance', section: 'Connaissance & expérience', axe: 'connaissance', poids: 1.5,
    texte: "Comment évaluez-vous votre connaissance des marchés financiers ?",
    options: [
      { label: 'Aucune',                                   score: 0 },
      { label: 'Basique (j\'en entends parler)',           score: 35 },
      { label: 'Bonne (je suis les marchés régulièrement)', score: 75 },
      { label: 'Professionnelle',                          score: 100 }
    ]
  },
  {
    id: 'q_produits', section: 'Connaissance & expérience', axe: 'connaissance', poids: 1.5,
    texte: "Quel est le produit le plus risqué que vous ayez déjà détenu ?",
    options: [
      { label: 'Livrets et fonds en euros uniquement', score: 10 },
      { label: 'SCPI / immobilier papier',             score: 35 },
      { label: 'OPCVM diversifiés ou ETF',             score: 65 },
      { label: 'Actions en direct',                    score: 85 },
      { label: 'Produits structurés, dérivés, levier', score: 100 }
    ]
  },
  {
    id: 'q_vecu', section: 'Connaissance & expérience', axe: 'connaissance', poids: 1,
    texte: "Avez-vous déjà traversé une forte baisse de marché en étant investi (2008, 2020, 2022) ?",
    aide: "L'expérience vécue est un meilleur prédicteur du comportement réel que la tolérance déclarée.",
    options: [
      { label: "Non, je n'étais pas investi",           score: 0,   meta: { vecu: 'aucun' } },
      { label: "Oui, et j'ai vendu",                    score: 30,  meta: { vecu: 'vendu' } },
      { label: "Oui, et je n'ai rien fait",             score: 80,  meta: { vecu: 'conserve' } },
      { label: "Oui, et j'ai renforcé mes positions",   score: 100, meta: { vecu: 'renforce' } }
    ]
  },
  {
    id: 'q_comprehension', section: 'Connaissance & expérience', axe: 'connaissance', poids: 1,
    texte: "Un ETF actions internationales peut perdre plus de 30 % de sa valeur en une année. Le saviez-vous ?",
    options: [
      { label: "Non, je l'ignorais",                    score: 0 },
      { label: "Je m'en doutais sans le quantifier",    score: 50 },
      { label: "Oui, et je sais que c'est temporaire",  score: 100 }
    ]
  },

  /* ---------- TOLÉRANCE AU RISQUE ---------- */
  {
    id: 'q_reaction', section: 'Tolérance au risque', axe: 'tolerance', poids: 2,
    texte: "Votre portefeuille perd 20 % en six mois. Que faites-vous ?",
    options: [
      { label: 'Je vends tout pour arrêter la perte',        score: 0 },
      { label: 'Je vends une partie pour sécuriser',         score: 25 },
      { label: 'Je ne fais rien et j\'attends',              score: 70 },
      { label: 'Je renforce, c\'est une opportunité d\'achat', score: 100 }
    ]
  },
  {
    id: 'q_perteMax', section: 'Tolérance au risque', axe: 'tolerance', poids: 2,
    texte: "Quelle perte maximale sur un an pourriez-vous supporter sans remettre en cause votre stratégie ?",
    options: [
      { label: 'Aucune perte',    score: 0,   meta: { perteMax: 0 } },
      { label: 'Jusqu\'à -5 %',   score: 18,  meta: { perteMax: 5 } },
      { label: 'Jusqu\'à -10 %',  score: 38,  meta: { perteMax: 10 } },
      { label: 'Jusqu\'à -20 %',  score: 62,  meta: { perteMax: 20 } },
      { label: 'Jusqu\'à -30 %',  score: 85,  meta: { perteMax: 30 } },
      { label: 'Plus de -40 %',   score: 100, meta: { perteMax: 40 } }
    ]
  },
  {
    id: 'q_couple', section: 'Tolérance au risque', axe: 'tolerance', poids: 1.5,
    texte: "Quel couple rendement / risque vous correspond le mieux sur 10 ans ?",
    options: [
      { label: '+2 %/an, aucune année négative',              score: 0 },
      { label: '+4 %/an, avec une baisse possible de -8 %',   score: 33 },
      { label: '+6 %/an, avec une baisse possible de -20 %',  score: 66 },
      { label: '+8 %/an, avec une baisse possible de -35 %',  score: 100 }
    ]
  },
  {
    id: 'q_volatilite', section: 'Tolérance au risque', axe: 'tolerance', poids: 1,
    texte: "Les variations fréquentes de la valeur de votre portefeuille vous...",
    options: [
      { label: 'empêchent de dormir',            score: 0 },
      { label: 'gênent, je consulte souvent',    score: 35 },
      { label: 'laissent indifférent',           score: 80 },
      { label: 'intéressent, j\'y vois des opportunités', score: 100 }
    ]
  },
  {
    id: 'q_arbitrage', section: 'Tolérance au risque', axe: 'tolerance', poids: 1,
    texte: "Acceptez-vous des arbitrages tactiques en cours de vie du contrat (2 à 4 par an) ?",
    options: [
      { label: 'Non, je veux une allocation figée',            score: 40,  meta: { gestion: 'passive' } },
      { label: 'Oui, sur proposition de mon conseiller',       score: 75,  meta: { gestion: 'conseillee' } },
      { label: 'Oui, y compris des mouvements significatifs',  score: 100, meta: { gestion: 'active' } }
    ]
  },

  /* ---------- PRÉFÉRENCES DE DURABILITÉ ---------- */
  {
    id: 'q_esg', section: 'Préférences de durabilité', axe: 'preference', poids: 0,
    texte: "Souhaitez-vous intégrer des critères extra-financiers (ESG / ISR) dans votre allocation ?",
    options: [
      { label: 'Non, seule la performance compte',           score: 0, meta: { esg: 'aucune' } },
      { label: 'Oui, si cela ne pénalise pas la performance', score: 0, meta: { esg: 'souhaitee' } },
      { label: 'Oui, c\'est une priorité',                    score: 0, meta: { esg: 'prioritaire' } }
    ]
  }
];

/* Bornes de profil (plafonds réglementaires internes) */
const PLAFONDS = {
  horizon: [
    { max: 2,  profil: 'securitaire', motif: "Horizon inférieur à 2 ans" },
    { max: 5,  profil: 'prudent',     motif: "Horizon de 2 à 5 ans" },
    { max: 8,  profil: 'equilibre',   motif: "Horizon de 5 à 8 ans" }
  ],
  connaissance: [
    { max: 30, profil: 'prudent',   motif: "Connaissance des marchés insuffisante" },
    { max: 50, profil: 'equilibre', motif: "Connaissance des marchés limitée" },
    { max: 70, profil: 'dynamique', motif: "Connaissance des marchés intermédiaire" }
  ],
  perteMax: [
    { max: 0,  profil: 'securitaire', motif: "Aucune perte acceptée" },
    { max: 5,  profil: 'prudent',     motif: "Perte maximale acceptée limitée à 5 %" },
    { max: 10, profil: 'equilibre',   motif: "Perte maximale acceptée limitée à 10 %" },
    { max: 20, profil: 'dynamique',   motif: "Perte maximale acceptée limitée à 20 %" },
    { max: 30, profil: 'offensif',    motif: "Perte maximale acceptée limitée à 30 %" }
  ]
};
