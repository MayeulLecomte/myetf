/* =============================================================
   PARAMÈTRES FISCAUX ET DE RENDEMENT
   -------------------------------------------------------------
   ⚠  Règles applicables aux résidents fiscaux français, à jour des
   informations disponibles lors de la création de l'outil. La
   fiscalité de l'épargne évolue à chaque loi de finances :
   CONTRÔLEZ CES PARAMÈTRES CHAQUE ANNÉE avant de produire un
   chiffrage pour un client. Tout est regroupé ici pour qu'une
   mise à jour ne demande aucune modification des moteurs.
   ============================================================= */

const FISCALITE_PARAMS = {

  millesime: 2026,

  prelevementsSociaux: 0.172,

  assuranceVie: {
    /* Rachat partiel : seule la quote-part de produits est taxable.
       Assiette = Rachat × (Produits / Valeur de rachat totale). */
    tauxIrAvant8ans: 0.128,          // PFU
    tauxIrApres8ansSous150k: 0.075,  // primes nettes ≤ 150 000 €
    tauxIrApres8ansAu150k: 0.128,    // fraction au-delà
    seuilPrimes: 150000,
    abattementCelibataire: 4600,     // annuel, sur les produits, après 8 ans
    abattementCouple: 9200,
    note: "Les prélèvements sociaux s'appliquent aux produits sans abattement. " +
          "L'abattement après 8 ans ne joue que sur l'impôt sur le revenu."
  },

  pea: {
    dureeExoneration: 5,             // années
    tauxIrAvantDuree: 0.128,
    note: "Après 5 ans, le retrait est exonéré d'impôt sur le revenu ; " +
          "les prélèvements sociaux restent dus sur la quote-part de gain. " +
          "Avant 5 ans, le retrait entraîne en principe la clôture du plan."
  },

  compteTitres: {
    tauxPfu: 0.30,                   // 12,8 % IR + 17,2 % PS
    note: "Prélèvement forfaitaire unique de 30 % sur les plus-values réalisées " +
          "et sur les dividendes, sauf option globale pour le barème progressif."
  },

  /* Hypothèse d'inflation utilisée pour l'indexation des retraits
     et le calcul du taux de retrait réel. */
  inflation: 0.02
};

/* -------------------------------------------------------------
   RENDEMENT COURANT INDICATIF PAR POCHE (% annuel)
   Sert à estimer la part du besoin de revenu couverte par les
   coupons et dividendes, sans vendre de parts.
   À réactualiser à partir des fiches produit (rendement de
   distribution sur 12 mois glissants).
   ------------------------------------------------------------- */

const RENDEMENTS_COURANTS = {
  'act-monde': 1.8,
  'act-us': 1.2,
  'act-europe': 3.2,
  'act-japon': 2.2,
  'act-emergents': 2.8,
  'act-small': 1.9,
  'act-tech': 0.6,
  'act-min-vol': 2.6,
  'obl-souv-euro-ct': 2.8,
  'obl-souv-euro-lt': 3.0,
  'obl-ig-euro': 3.4,
  'obl-hy-euro': 5.8,
  'obl-inflation': 2.2,
  'obl-emergente': 5.5,
  'obl-globale-hedge': 3.2,
  'mon-euro': 2.2,
  'div-or': 0,
  'div-immobilier': 3.8,
  'div-matieres': 0
};

/* Ordre de prélèvement recommandé pour servir un revenu.
   Il est appliqué en cascade par le moteur de revenus. */
const CASCADE_REVENUS = [
  {
    id: 'dividendes',
    libelle: 'Coupons et dividendes encaissés',
    explication: "Revenus déjà versés sur le compte espèces : aucun titre n'est vendu, " +
                 "aucune plus-value n'est réalisée."
  },
  {
    id: 'coussin',
    libelle: 'Poche monétaire excédentaire',
    explication: "Le monétaire au-delà du coussin de sécurité est prélevé en premier : " +
                 "sa valeur ne dépend pas des marchés, on ne vend jamais à perte."
  },
  {
    id: 'surponderation',
    libelle: 'Lignes surpondérées par rapport à la cible',
    explication: "Prélever sur ce qui a le plus progressé rééquilibre le portefeuille " +
                 "et finance le revenu par la même opération."
  },
  {
    id: 'prorata',
    libelle: 'Prélèvement au prorata de l\'allocation cible',
    explication: "Solde prélevé proportionnellement, pour ne pas déformer l'allocation."
  }
];
