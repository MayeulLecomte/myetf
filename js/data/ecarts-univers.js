/* =============================================================
   ÉCARTS ENTRE L'UNIVERS DE TRAVAIL ET LE CATALOGUE
   Fichier GÉNÉRÉ par scripts/ecarts.mjs. Ne pas modifier à la main.

   Ce n'est pas une correction : c'est une liste de choses à
   revérifier sur justETF. Le relevé manuel reste la référence —
   au premier passage, sur les deux écarts de frais trouvés,
   c'est le catalogue qui avait tort les deux fois.

   Ni l'encours ni la devise n'y figurent, et c'est voulu : le
   catalogue donne la taille du FONDS ENTIER quand justETF donne
   celle de la PART, et la devise de la PART COTÉE quand notre
   champ porte celle du FONDS.
   ============================================================= */

const ECARTS_UNIVERS = {
  "genere": "2026-08-20",
  "catalogue": "2026-08-19",
  "controles": 42,
  "lignes": [
    {
      "isin": "FR0011871128",
      "nom": "Amundi PEA S&P 500 UCITS ETF Acc",
      "champ": "ter",
      "releve": 0.12,
      "catalogue": 0.15,
      "nomCatalogue": "Amundi PEA S&P 500 UCITS ETF Acc",
      "note": null
    },
    {
      "isin": "FR0013412020",
      "nom": "Amundi PEA Emergent (MSCI Emerging) ESG Transition UCITS ETF Acc",
      "champ": "ter",
      "releve": 0.3,
      "catalogue": 0.2,
      "nomCatalogue": "Amundi PEA Émerg MSCI ESG Tr UCITS ETFC",
      "note": null
    },
    {
      "isin": "FR0013346681",
      "nom": "Amundi PEA Euro Court Terme UCITS ETF Acc",
      "champ": "ter",
      "releve": 0.25,
      "catalogue": 0.4,
      "nomCatalogue": "Amundi PEA Euro Court Terme UCITS ETF",
      "note": null
    }
  ]
};
