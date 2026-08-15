/* =============================================================
   MOTEUR DE BACKTEST
   Rejoue une allocation sur les séries de performances annuelles,
   avec ou sans rééquilibrage, avec ou sans retraits, et mesure
   le risque de séquence.
   ============================================================= */

const MoteurBacktest = (function () {

  /**
   * @param {Object} poids   {poche: % du portefeuille}
   * @param {Object} opt     {capital, rebalancement:'annuel'|'aucun',
   *                          retraitAnnuel, inflation, ordre:'chronologique'|'inverse',
   *                          fraisContrat (% annuel), historique}
   */
  function simuler(poids, opt) {
    opt = opt || {};
    const hist = opt.historique || HISTORIQUE_POCHES;
    const capital = opt.capital || 100000;
    const rebalancement = opt.rebalancement !== 'aucun';
    const retrait0 = Number(opt.retraitAnnuel) || 0;
    const inflation = opt.inflation === undefined ? FISCALITE_PARAMS.inflation : opt.inflation;
    const frais = (Number(opt.fraisContrat) || 0) / 100;

    /* Poches réellement investies et disposant d'une série */
    const poches = Object.keys(poids).filter(p => poids[p] > 0 && hist[p]);
    const manquantes = Object.keys(poids).filter(p => poids[p] > 0 && !hist[p]);
    if (!poches.length) return null;

    /* Renormalisation sur les poches couvertes */
    const sommePoids = poches.reduce((a, p) => a + poids[p], 0);
    const w = {};
    poches.forEach(p => { w[p] = poids[p] / sommePoids; });

    const indices = ANNEES_HISTORIQUE.map((a, i) => i);
    if (opt.ordre === 'inverse') indices.reverse();

    /* Valeur de chaque poche */
    const valeurs = {};
    poches.forEach(p => { valeurs[p] = capital * w[p]; });

    let total = capital, retrait = retrait0, retraitsCumules = 0;
    const annees = [];
    let plusHaut = capital, maxDrawdown = 0;

    indices.forEach((idx, rang) => {
      const an = ANNEES_HISTORIQUE[idx];
      const debut = total;

      /* Retrait en début de période */
      const preleve = Math.min(total, retrait);
      if (preleve > 0) {
        poches.forEach(p => { valeurs[p] -= preleve * (valeurs[p] / total); });
        total -= preleve;
        retraitsCumules += preleve;
      }

      /* Application des performances */
      let apres = 0;
      const contributions = {};
      poches.forEach(p => {
        const r = (hist[p].valeurs[idx] || 0) / 100;
        const avant = valeurs[p];
        valeurs[p] = avant * (1 + r) * (1 - frais);
        contributions[p] = valeurs[p] - avant;
        apres += valeurs[p];
      });

      const rendement = total > 0 ? 100 * (apres - total) / total : 0;
      total = apres;

      /* Rééquilibrage en fin d'année */
      if (rebalancement) poches.forEach(p => { valeurs[p] = total * w[p]; });

      if (total > plusHaut) plusHaut = total;
      const dd = plusHaut > 0 ? 100 * (total - plusHaut) / plusHaut : 0;
      if (dd < maxDrawdown) maxDrawdown = dd;

      annees.push({
        annee: an, rang: rang + 1, debut: Math.round(debut), retrait: Math.round(preleve),
        rendement: arrondi(rendement), capital: Math.round(total),
        drawdown: arrondi(dd), contributions
      });

      retrait = retrait * (1 + inflation);
    });

    const rendements = annees.map(a => a.rendement);
    const n = rendements.length;
    const moyenne = rendements.reduce((a, b) => a + b, 0) / n;
    const variance = rendements.reduce((a, b) => a + Math.pow(b - moyenne, 2), 0) / (n - 1 || 1);
    const volatilite = Math.sqrt(variance);

    /* Performance annualisée : uniquement significative sans flux */
    const perfCumulee = 100 * (total / capital - 1);
    const annualisee = retrait0 > 0
      ? null
      : 100 * (Math.pow(total / capital, 1 / n) - 1);

    /* Rendement pondéré dans le temps, valide même avec retraits */
    const twr = annees.reduce((a, x) => a * (1 + x.rendement / 100), 1);
    const twrAnnualise = 100 * (Math.pow(twr, 1 / n) - 1);

    return {
      annees, capitalInitial: capital, capitalFinal: Math.round(total),
      retraitsCumules: Math.round(retraitsCumules),
      perfCumulee: arrondi(perfCumulee),
      annualisee: annualisee === null ? null : arrondi(annualisee),
      twrAnnualise: arrondi(twrAnnualise),
      volatilite: arrondi(volatilite),
      maxDrawdown: arrondi(maxDrawdown),
      pireAnnee: annees.slice().sort((a, b) => a.rendement - b.rendement)[0],
      meilleureAnnee: annees.slice().sort((a, b) => b.rendement - a.rendement)[0],
      anneesNegatives: annees.filter(a => a.rendement < 0).length,
      ratioRendementRisque: volatilite > 0 ? arrondi(twrAnnualise / volatilite) : null,
      couverture: arrondi(100 * sommePoids / Object.keys(poids).reduce((a, p) => a + poids[p], 0)),
      manquantes, rebalancement, nbAnnees: n
    };
  }

  /** Contribution de chaque poche à la performance totale (en points). */
  function contributions(resultat, poids) {
    const cumul = {};
    resultat.annees.forEach(a => {
      Object.keys(a.contributions).forEach(p => {
        cumul[p] = (cumul[p] || 0) + a.contributions[p];
      });
    });
    const total = Object.values(cumul).reduce((a, b) => a + b, 0);
    return Object.keys(cumul)
      .map(p => ({
        poche: p,
        gain: Math.round(cumul[p]),
        poids: poids[p],
        pointsDePerf: arrondi(100 * cumul[p] / resultat.capitalInitial),
        partDuGain: total !== 0 ? arrondi(100 * cumul[p] / total) : 0
      }))
      .sort((a, b) => b.gain - a.gain);
  }

  /** Compare les six profils sur la même période. */
  function comparerProfils(opt) {
    return PROFILS.map(p => {
      const strat = MoteurAllocation.strategique(p.id);
      const r = simuler(strat.poches, opt);
      return r ? Object.assign({ profil: p }, r) : null;
    }).filter(Boolean);
  }

  /** Rejoue les indices de comparaison. */
  function references(opt) {
    return REFERENCES_BACKTEST.map(ref => {
      const r = simuler(ref.poids, opt);
      return r ? Object.assign({ nom: ref.nom, id: ref.id }, r) : null;
    }).filter(Boolean);
  }

  /**
   * Risque de séquence : même portefeuille, mêmes rendements,
   * mêmes retraits — mais dans l'ordre inverse.
   */
  function risqueSequence(poids, opt) {
    const chrono = simuler(poids, Object.assign({}, opt, { ordre: 'chronologique' }));
    const inverse = simuler(poids, Object.assign({}, opt, { ordre: 'inverse' }));
    if (!chrono || !inverse) return null;
    return {
      chrono, inverse,
      ecart: Math.round(inverse.capitalFinal - chrono.capitalFinal),
      ecartPct: chrono.capitalFinal ? arrondi(100 * (inverse.capitalFinal - chrono.capitalFinal) / chrono.capitalFinal) : 0
    };
  }

  /** Effet du rééquilibrage annuel. */
  function effetRebalancement(poids, opt) {
    const avec = simuler(poids, Object.assign({}, opt, { rebalancement: 'annuel' }));
    const sans = simuler(poids, Object.assign({}, opt, { rebalancement: 'aucun' }));
    if (!avec || !sans) return null;
    return {
      avec, sans,
      gain: Math.round(avec.capitalFinal - sans.capitalFinal),
      gainPerf: arrondi(avec.perfCumulee - sans.perfCumulee),
      gainVol: arrondi(sans.volatilite - avec.volatilite)
    };
  }

  /** Part des séries réellement sourcées dans l'allocation testée. */
  function fiabilite(poids, historique) {
    const hist = historique || HISTORIQUE_POCHES;
    let source = 0, estime = 0, absent = 0, marche = 0;
    const n = ANNEES_HISTORIQUE.length;
    Object.keys(poids).forEach(p => {
      if (poids[p] <= 0) return;
      const s = hist[p];
      if (!s) { absent += poids[p]; return; }
      /* La provenance est appréciée année par année : une série peut
         être partiellement alimentée par les cours de marché. */
      const prov = s.provenance || [];
      let nbMarche = 0, nbSource = 0;
      for (let i = 0; i < n; i++) {
        if (prov[i] === 'marche') nbMarche++;
        else if (prov[i] === 'source' || (!prov[i] && s.source === 'source')) nbSource++;
      }
      marche += poids[p] * nbMarche / n;
      source += poids[p] * nbSource / n;
      estime += poids[p] * (n - nbMarche - nbSource) / n;
    });
    return {
      marche: arrondi(marche), source: arrondi(source),
      estime: arrondi(estime), absent: arrondi(absent),
      fiable: arrondi(marche + source)
    };
  }

  function arrondi(x) { return Math.round(x * 100) / 100; }

  return { simuler, contributions, comparerProfils, references, risqueSequence, effetRebalancement, fiabilite };
})();
