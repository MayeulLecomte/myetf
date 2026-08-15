/* =============================================================
   MOTEUR D'ALLOCATION
   1. Allocation stratégique (issue du profil)
   2. Agrégation des indicateurs macro → probabilités de scénarios
   3. Allocation tactique = stratégique + déviations bornées
   ============================================================= */

const MoteurAllocation = (function () {

  /* ---------- 1. STRATÉGIQUE ---------- */

  /**
   * @returns {{classes:Object, poches:Object}} en % du portefeuille total.
   */
  function strategique(profilId) {
    const profil = PROFILS.find(p => p.id === profilId);
    const classes = Object.assign({}, profil.allocation);
    const poches = {};

    Object.keys(classes).forEach(cl => {
      const poidsClasse = classes[cl];
      if (poidsClasse <= 0) return;
      const repartition = (SOUS_ALLOCATIONS[cl] || {})[profilId] || {};
      const sommeRel = Object.values(repartition).reduce((a, b) => a + b, 0);
      if (!sommeRel) return;
      Object.keys(repartition).forEach(poche => {
        poches[poche] = arrondi(poidsClasse * repartition[poche] / sommeRel);
      });
    });

    return { classes, poches };
  }

  /* ---------- 2. AGRÉGATION MACRO ---------- */

  /**
   * @param {Object} choix  {idIndicateur: valeurOption}
   * @returns {{probas:Object, overlays:Object, journal:Array}}
   */
  function agregerMacro(choix) {
    const poids = {};
    SCENARIOS.forEach(s => { poids[s.id] = 1.0; });   // a priori uniforme
    const overlays = {};
    const journal = [];

    INDICATEURS.forEach(ind => {
      const valeur = choix[ind.id] !== undefined ? choix[ind.id] : valeurDefaut(ind);
      const opt = ind.options.find(o => o.valeur === valeur);
      if (!opt) return;

      if (opt.scenarios) {
        Object.keys(opt.scenarios).forEach(s => { poids[s] = (poids[s] || 0) + opt.scenarios[s]; });
      }
      if (opt.overlay) {
        Object.keys(opt.overlay).forEach(p => { overlays[p] = (overlays[p] || 0) + opt.overlay[p]; });
        journal.push({ indicateur: ind.label, choix: opt.label, effets: opt.overlay });
      }
    });

    const somme = Object.values(poids).reduce((a, b) => a + b, 0);
    const probas = {};
    Object.keys(poids).forEach(s => { probas[s] = arrondi(100 * poids[s] / somme); });
    normaliserA100(probas);

    return { probas, overlays, journal };
  }

  function valeurDefaut(ind) {
    const d = ind.options.find(o => o.defaut);
    return d ? d.valeur : ind.options[0].valeur;
  }

  /** Distribution par défaut (tous indicateurs à leur valeur neutre). */
  function macroParDefaut() { return agregerMacro({}); }

  /* ---------- 3. TACTIQUE ---------- */

  /**
   * @param {string} profilId
   * @param {Object} probas   probabilités de scénarios en %
   * @param {Object} overlays surcouches par poche (points de %)
   * @param {number} intensite 0 → purement stratégique, 1 → déviation maximale
   */
  function tactique(profilId, probas, overlays, intensite) {
    intensite = Math.max(0, Math.min(1, intensite === undefined ? 0.6 : intensite));
    const strat = strategique(profilId);
    const classes = {};
    const poches = {};
    const explications = [];

    /* --- Classes d'actifs --- */
    Object.keys(strat.classes).forEach(cl => {
      const base = strat.classes[cl];
      if (base <= 0) { classes[cl] = 0; return; }   // une poche absente du profil le reste

      let deviation = 0;
      SCENARIOS.forEach(s => {
        deviation += (probas[s.id] / 100) * ((s.tilts[cl] || 0));
      });
      deviation *= intensite;

      const borne = BORNES_TACTIQUES[cl] || 8;
      deviation = Math.max(-borne, Math.min(borne, deviation));
      classes[cl] = Math.max(0, base + deviation);
    });

    normaliserA100(classes);
    Object.keys(classes).forEach(cl => { classes[cl] = arrondi(classes[cl]); });
    normaliserA100(classes);

    /* --- Poches à l'intérieur de chaque classe --- */
    Object.keys(classes).forEach(cl => {
      const poidsClasse = classes[cl];
      if (poidsClasse <= 0) return;

      const repartition = Object.assign({}, (SOUS_ALLOCATIONS[cl] || {})[profilId] || {});
      const sommeRel = Object.values(repartition).reduce((a, b) => a + b, 0);
      if (!sommeRel) return;

      const relatif = {};
      Object.keys(repartition).forEach(p => { relatif[p] = 100 * repartition[p] / sommeRel; });

      Object.keys(relatif).forEach(p => {
        let dev = 0;
        SCENARIOS.forEach(s => { dev += (probas[s.id] / 100) * ((s.poches || {})[p] || 0); });
        dev += (overlays[p] || 0);
        dev *= intensite;
        const borne = BORNES_TACTIQUES.poche;
        dev = Math.max(-borne, Math.min(borne, dev));
        if (Math.abs(dev) >= 1) {
          explications.push({ poche: p, classe: cl, deviation: arrondi(dev) });
        }
        relatif[p] = Math.max(0, relatif[p] + dev);
      });

      normaliserA100(relatif);
      Object.keys(relatif).forEach(p => { poches[p] = arrondi(poidsClasse * relatif[p] / 100); });
    });

    normaliserA100(poches);

    return { classes, poches, strategique: strat, explications, intensite };
  }

  /* ---------- Utilitaires ---------- */

  function arrondi(x) { return Math.round(x * 10) / 10; }

  /** Ramène la somme d'un dictionnaire de pourcentages à exactement 100. */
  function normaliserA100(dict) {
    const cles = Object.keys(dict);
    let somme = cles.reduce((a, k) => a + dict[k], 0);
    if (somme <= 0) return dict;
    cles.forEach(k => { dict[k] = dict[k] * 100 / somme; });
    /* Correction du résidu d'arrondi sur la plus grosse ligne */
    cles.forEach(k => { dict[k] = arrondi(dict[k]); });
    somme = cles.reduce((a, k) => a + dict[k], 0);
    const residu = arrondi(100 - somme);
    if (residu !== 0 && cles.length) {
      const plusGrosse = cles.reduce((a, b) => (dict[a] >= dict[b] ? a : b));
      dict[plusGrosse] = arrondi(dict[plusGrosse] + residu);
    }
    return dict;
  }

  /** Rendement / volatilité estimés du portefeuille (hypothèses long terme). */
  const HYPOTHESES = {
    actions:       { rendement: 7.0, volatilite: 16.0 },
    obligations:   { rendement: 3.2, volatilite: 5.0 },
    monetaire:     { rendement: 2.2, volatilite: 0.4 },
    diversifiants: { rendement: 4.5, volatilite: 12.0 }
  };
  const CORRELATION_MOYENNE = 0.25;

  function metriques(classes) {
    let rendement = 0, varianceSimple = 0, sommePonderee = 0;
    Object.keys(classes).forEach(cl => {
      const w = (classes[cl] || 0) / 100;
      const h = HYPOTHESES[cl];
      if (!h) return;
      rendement += w * h.rendement;
      varianceSimple += Math.pow(w * h.volatilite, 2);
      sommePonderee += w * h.volatilite;
    });
    /* Volatilité entre le cas parfaitement corrélé et le cas indépendant */
    const volIndep = Math.sqrt(varianceSimple);
    const volatilite = volIndep + CORRELATION_MOYENNE * (sommePonderee - volIndep);
    return {
      rendement: Math.round(rendement * 10) / 10,
      volatilite: Math.round(volatilite * 10) / 10,
      perteAnnuelle95: Math.round((rendement - 1.65 * volatilite) * 10) / 10
    };
  }

  return { strategique, tactique, agregerMacro, macroParDefaut, metriques, normaliserA100, valeurDefaut };
})();
