/* =============================================================
   UNIVERS DE SÉLECTION ISSU DU CATALOGUE
   -------------------------------------------------------------
   Convertit les lignes du catalogue européen en supports que le
   moteur de sélection sait comparer.

   Le catalogue et l'univers de travail ne se valent pas, et la
   conversion ne prétend pas le contraire :

   • Ce qui est SOURCÉ chez Morningstar — ISIN, nom, émetteur,
     catégorie, frais courants, encours, note, devise, date de
     création — est repris tel quel. Le SRRI de l'ancien DICI est
     repris à part : ce n'est pas le SRI du DIC, qui reste à
     relever document par document.
   • Ce qui est DÉDUIT DU NOM — couverture de change, part
     capitalisante ou distribuante, label de durabilité,
     réplication synthétique — est marqué `deduit: true`. Un nom
     est un indice, pas une donnée : « MSCI World SRI » dit le
     label, mais l'absence de « SRI » ne dit pas son absence.
   • Ce qui est INCONNU reste inconnu. L'éligibilité PEA n'est
     pas publiée par Morningstar : elle est à `false` sauf mention
     explicite dans le nom, et il ne faut pas lire ce `false`
     comme « non éligible » mais comme « non renseigné ».
   • Aucun support du catalogue n'est `verifie` : rien n'y a été
     contrôlé au contrat, par construction.

   Trois données sont exigées pour qu'un support soit sélectionnable
   — une poche, des frais courants, un encours. Conseiller un fonds
   dont on ignore les frais ou la taille n'est pas conseiller.
   ============================================================= */

const MoteurUnivers = (function () {

  /* Marqueurs lus dans le nom du support. Volontairement étroits :
     un faux positif se propage dans une préconisation. */
  const HEDGE   = /hedged|hedge\b|couvert|\bhdg\b|eur[- ]h\b/i;
  const CAPI    = /\b(acc|acc\.|accumulating|accumulation|capitalisation|thesauri|1c|2c|3c|4c|5c)\b|\(c\)/i;
  const DIST    = /\b(dist|dist\.|distributing|distribution|income|inc|1d|2d|3d)\b|\(d\)/i;
  const ISR     = /\bsri\b|\besg\b|\bisr\b|socially responsible|sustainab|durable|paris[- ]aligned|\bpab\b|\bctb\b|climate transition|screened|ethical|ethique/i;
  const PEA     = /\bpea\b/i;
  const SWAP    = /\bswap\b|synthéti|synthetic/i;
  const ETC     = /\betc\b|\betp\b|physical gold|physical silver/i;

  /* Des frais courants à zéro sont, la plupart du temps, des frais absents
     encodés en zéro. Sur les quatre supports rattachés à une poche que le
     catalogue affiche à 0 %, deux facturent en réalité des frais connus —
     et ce zéro leur donnait le score de frais maximal, donc leur poche.
     Un support gratuit existe pourtant : il reste cherchable au catalogue
     et s'ajoute à la main, une fois ses frais vérifiés. */
  function fraisUtilisables(ter) {
    return ter != null && ter > 0;
  }

  /**
   * @param {Object} catalogue  CATALOGUE_ETF
   * @param {Object} o          {encoursMin, notesSeulement}
   * @returns {Array} supports au format de l'univers de travail
   */
  function depuisCatalogue(catalogue, o) {
    o = o || {};
    if (!catalogue || !catalogue.lignes) return [];

    const supports = [];

    catalogue.lignes.forEach(l => {
      const [isin, nom, ticker, iEm, iCat, ter, note, devise, places, poche, encours, srri, creation] = l;

      /* Les trois exigences. Un support qui n'en satisfait pas une reste
         cherchable au catalogue et ajoutable à la main : il est écarté de
         la sélection automatique, pas de l'application. */
      if (!poche) return;
      if (!fraisUtilisables(ter)) return;
      if (encours == null) return;

      if (o.encoursMin && encours < o.encoursMin) return;
      if (o.notesSeulement && note == null) return;

      const capi = CAPI.test(nom) ? true : DIST.test(nom) ? false : null;

      supports.push({
        isin, ticker: ticker || '', nom,
        emetteur: catalogue.emetteurs[iEm] || '',
        categorie: catalogue.categories[iCat] || '',
        classe: classeDePoche(poche), poche,
        ter, encours, morningstar: note == null ? null : note,
        /* `sri` reste vide : le catalogue publie le SRRI de l'ancien DICI,
           qui n'est pas le SRI du DIC et ne peut pas en tenir lieu — il
           place un ETF actions monde à 6 là où le SRI vaut 4. Le SRRI est
           conservé à part, à titre indicatif. */
        sri: null,
        srri: srri == null ? null : srri,
        replication: SWAP.test(nom) ? 'Synthétique' : ETC.test(nom) ? 'Physique (ETC)' : 'Non renseignée',
        devise: devise || 'EUR',
        hedge: HEDGE.test(nom),
        capitalisation: capi,
        isr: ISR.test(nom),
        pea: PEA.test(nom),
        enveloppes: PEA.test(nom) ? ['AV', 'CTO', 'PEA'] : ['AV', 'CTO'],
        /* Tout le catalogue est réputé disponible en architecture ouverte :
           c'est le seul univers de contrat qui ne prétend rien. */
        contratsAV: ['av-large'],
        verifie: false,
        donneesLe: catalogue.genere,
        donneesSource: 'Morningstar (catalogue)',
        notationLe: note == null ? undefined : catalogue.genere,
        creation: creation || null,
        places: (places || '').split(',').filter(Boolean),
        deduit: true
      });
    });

    return supports;
  }

  function classeDePoche(poche) {
    if (poche.indexOf('act-') === 0) return 'actions';
    if (poche.indexOf('obl-') === 0) return 'obligations';
    if (poche.indexOf('mon-') === 0) return 'monetaire';
    return 'diversifiants';
  }

  /** Ce que le catalogue laisse hors de la sélection, et pourquoi. */
  function ecartes(catalogue) {
    const c = { sansPoche: 0, sansFrais: 0, sansEncours: 0, retenus: 0 };
    (catalogue && catalogue.lignes ? catalogue.lignes : []).forEach(l => {
      if (!l[9]) c.sansPoche++;
      else if (!fraisUtilisables(l[5])) c.sansFrais++;
      else if (l[10] == null) c.sansEncours++;
      else c.retenus++;
    });
    return c;
  }

  /* ----------------------------------------------------------
     L'ENTONNOIR DE SÉLECTION
     ----------------------------------------------------------
     Quatre mille cinq cents ETF au catalogue, et le moteur en
     retient une douzaine. Entre les deux, quatre resserrements
     que personne ne voyait — un testeur croyait l'outil choisir
     parmi tout le catalogue européen.

     Les chiffres sont calculés ici, en un seul endroit, pour que
     la ligne de l'onglet Univers et le tableau de « Méthode &
     limites » ne puissent pas raconter deux histoires.
     ---------------------------------------------------------- */
  function entonnoir(catalogue, univers, filtres) {
    const e = ecartes(catalogue);
    const brut = e.sansPoche + e.sansFrais + e.sansEncours + e.retenus;

    /* L'univers de travail complète le catalogue : ses supports sont relevés
       à la main, et quelques-uns n'y figurent pas. */
    const derives = depuisCatalogue(catalogue);
    const connus = {};
    (univers || []).forEach(x => { connus[x.isin] = true; });
    const offert = (univers || []).concat(derives.filter(s => !connus[s.isin]));

    const f = filtres || {};
    const passe = x =>
      (f.etoilesMin == null || x.morningstar == null || x.morningstar >= f.etoilesMin) &&
      (f.encoursMin == null || (x.encours != null && x.encours >= f.encoursMin)) &&
      (f.terMax == null || (x.ter != null && x.ter <= f.terMax));

    return {
      genere: catalogue ? catalogue.genere : null,
      brut,
      sansPoche: e.sansPoche, sansFrais: e.sansFrais, sansEncours: e.sansEncours,
      exploitables: e.retenus,
      universTravail: (univers || []).length,
      offert: offert.length,
      candidats: offert.filter(passe).length,
      filtres: { etoilesMin: f.etoilesMin, encoursMin: f.encoursMin, terMax: f.terMax }
    };
  }

  return { depuisCatalogue, ecartes, entonnoir };
})();
