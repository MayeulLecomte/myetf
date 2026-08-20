#!/usr/bin/env node
/* =============================================================
   RAPPROCHEMENT DE L'UNIVERS AVEC LE CATALOGUE MORNINGSTAR
   -------------------------------------------------------------
   Compare les 42 supports de l'univers de travail — relevés à la
   main sur justETF — avec le screener Morningstar déjà téléchargé
   par scripts/catalogue.mjs, et écrit la liste des divergences
   dans js/data/ecarts-univers.js.

   ⚠ RIEN N'EST ÉCRASÉ. Le relevé manuel reste la référence. La
   liste dit seulement quelles lignes rouvrir sur justETF au
   prochain relevé trimestriel — et le premier passage l'a montré :
   sur les deux écarts de frais trouvés, c'est le CATALOGUE qui
   avait tort les deux fois.

   Aucun appel réseau : le catalogue est déjà là.

   Usage :  node scripts/ecarts.mjs
   ============================================================= */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------
   CE QUI SE COMPARE, ET CE QUI NE SE COMPARE PAS
   ------------------------------------------------------------
   Deux colonnes du catalogue ont l'air comparables et ne le sont
   pas. Les exclure n'est pas un renoncement : les inclure noierait
   les vrais écarts sous trente lignes de bruit tous les mois, et
   la liste serait abandonnée au deuxième passage.

   • L'ENCOURS. Morningstar donne la taille du FONDS ENTIER,
     justETF celle de la PART. Les quatre parts de Xtrackers MSCI
     Japan portent toutes 7 623 M€ au catalogue, quand la part
     4C EUR-Hedged en fait 924 chez justETF : +725 % d'écart
     apparent, zéro information.

   • LA DEVISE. Le catalogue donne celle de la PART COTÉE
     (« 2D USD » → USD, « 4C EUR » → EUR), notre champ celle du
     FONDS. Seize « USD vs EUR » qui n'en sont pas.

   Reste ce qui a la même définition des deux côtés : les frais,
   le nom — qui attrape l'ISIN désignant un autre fonds —, et la
   présence, dont la disparition dit une fermeture ou une fusion.
   ------------------------------------------------------------ */

/* Les frais tolèrent l'arrondi : 0,20 et 0,2 sont le même nombre, et
   deux sources qui arrondissent au centième ne doivent pas produire
   un écart. Au-delà d'un centième de point, c'est un vrai changement
   de tarif. */
const TOLERANCE_FRAIS = 0.01;

/* LE NOM N'EST PAS UN DÉCLENCHEUR, ET C'EST MESURÉ.
   Il servirait à attraper l'ISIN qui désigne un AUTRE FONDS — le défaut
   le plus grave, à neuf occurrences lors du relevé d'août 2026. Mais les
   deux sources abrègent différemment, et sur les 42 supports la mesure
   est sans appel :

     paires VRAIES  (même fonds)   — score de 0,60 à 1,00
     paires FAUSSES (fonds voisin) — score jusqu'à 0,80

   Les deux nuages se RECOUVRENT. Aucun seuil ne les sépare : placé bas
   il laisse passer un ISIN faux, placé haut il crie sur « State Street
   SPDR MSCI Wld ETF EUR » contre « SPDR MSCI World UCITS ETF USD
   Unhedged ». Un contrôle qu'on n'a pas le droit de croire ne vaut pas
   mieux que pas de contrôle.

   Le nom du catalogue est donc AFFICHÉ à côté du nôtre sur chaque ligne
   signalée — l'œil tranche là où l'algorithme ne peut pas — mais il ne
   déclenche rien. Ne pas le rétablir en déclencheur sans refaire cette
   mesure : elle est reproductible, et elle échouera de nouveau. */

function lireGlobal(fichier, nom) {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(join(RACINE, fichier), 'utf8'), ctx, { filename: fichier });
  return vm.runInContext(nom, ctx);
}

function principal() {
  const cheminCatalogue = join(RACINE, 'js/data/catalogue-etf.js');
  if (!existsSync(cheminCatalogue)) {
    console.error('js/data/catalogue-etf.js absent — lancez d\'abord scripts/catalogue.mjs.');
    process.exit(1);
  }

  const univers = lireGlobal('js/data/etf-univers.js', 'ETF_UNIVERS');
  const cat = lireGlobal('js/data/catalogue-etf.js', 'CATALOGUE_ETF');

  const col = {};
  cat.colonnes.forEach((c, i) => { col[c] = i; });
  const parIsin = new Map();
  cat.lignes.forEach(l => parIsin.set(l[col.isin], l));

  const lignes = [];

  univers.forEach(e => {
    const l = parIsin.get(e.isin);

    if (!l) {
      lignes.push({
        isin: e.isin, nom: e.nom, champ: 'presence',
        releve: 'au catalogue', catalogue: 'absent', nomCatalogue: null,
        note: 'Fonds fermé, fusionné, ou ISIN à revoir.'
      });
      return;
    }

    const ter = l[col.ter];
    if (ter != null && Math.abs(ter - e.ter) > TOLERANCE_FRAIS) {
      lignes.push({
        isin: e.isin, nom: e.nom, champ: 'ter',
        releve: e.ter, catalogue: ter,
        /* Le nom du catalogue voyage avec la ligne : c'est ce qui permet
           de voir, en rouvrant la fiche, qu'on parle bien du même fonds. */
        nomCatalogue: l[col.nom], note: null
      });
    }

  });

  const sortie = {
    genere: new Date().toISOString().slice(0, 10),
    catalogue: cat.genere,
    controles: univers.length,
    lignes
  };

  writeFileSync(join(RACINE, 'js/data/ecarts-univers.js'),
    `/* =============================================================
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

const ECARTS_UNIVERS = ${JSON.stringify(sortie, null, 2)};
`);

  console.log(`Rapprochement du ${sortie.genere} — catalogue du ${sortie.catalogue}.`);
  console.log(`${univers.length} supports contrôlés, ${lignes.length} écart(s).`);
  lignes.forEach(x => console.log(`  ${x.champ.padEnd(9)} ${x.isin}  ${x.releve} vs ${x.catalogue}`));
  console.log('js/data/ecarts-univers.js écrit.');
}

principal();
