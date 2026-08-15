/* =============================================================
   MOTEUR DE PROFILAGE
   Calcule les scores par axe, applique la règle de prudence
   (le profil retenu est le minimum entre capacité et tolérance)
   puis les plafonds réglementaires internes.
   ============================================================= */

const MoteurProfil = (function () {

  /** Moyenne pondérée des scores d'un axe. */
  function scoreAxe(reponses, axe) {
    let total = 0, poidsTotal = 0;
    QUESTIONS.filter(q => q.axe === axe && q.poids > 0).forEach(q => {
      const idx = reponses[q.id];
      if (idx === undefined || idx === null) return;
      const opt = q.options[idx];
      if (!opt) return;
      total += opt.score * q.poids;
      poidsTotal += q.poids;
    });
    return poidsTotal ? Math.round(total / poidsTotal) : null;
  }

  /** Récupère une métadonnée posée sur l'option choisie d'une question. */
  function meta(reponses, questionId, cle) {
    const q = QUESTIONS.find(x => x.id === questionId);
    if (!q) return undefined;
    const opt = q.options[reponses[questionId]];
    return opt && opt.meta ? opt.meta[cle] : undefined;
  }

  function profilParScore(score) {
    return PROFILS.find(p => score >= p.scoreMin && score <= p.scoreMax) || PROFILS[0];
  }

  function profilParId(id) {
    return PROFILS.find(p => p.id === id);
  }

  /** Nombre de questions notées restant sans réponse. */
  function questionsManquantes(reponses) {
    return QUESTIONS.filter(q => q.poids > 0 && (reponses[q.id] === undefined || reponses[q.id] === null));
  }

  /**
   * Calcule le profil complet.
   * @returns {object|null} null si le questionnaire est incomplet.
   */
  function calculer(reponses, identite) {
    if (questionsManquantes(reponses).length > 0) return null;

    const capacite     = scoreAxe(reponses, 'capacite');
    const tolerance    = scoreAxe(reponses, 'tolerance');
    const connaissance = scoreAxe(reponses, 'connaissance');

    /* Règle de prudence : on ne peut pas exposer un client au-delà
       de sa capacité de perte, ni au-delà de sa tolérance déclarée. */
    const scoreRetenu = Math.min(capacite, tolerance);
    let profil = profilParScore(scoreRetenu);
    const profilTheorique = profil;

    /* Application des plafonds */
    const plafondsAppliques = [];

    const horizon = meta(reponses, 'q_horizon', 'horizon');
    PLAFONDS.horizon.forEach(p => {
      if (horizon !== undefined && horizon < p.max) {
        const cible = profilParId(p.profil);
        if (cible.ordre < profil.ordre) { profil = cible; plafondsAppliques.push(p.motif + ' → plafond ' + cible.nom); }
      }
    });

    PLAFONDS.connaissance.forEach(p => {
      if (connaissance < p.max) {
        const cible = profilParId(p.profil);
        if (cible.ordre < profil.ordre) { profil = cible; plafondsAppliques.push(p.motif + ' → plafond ' + cible.nom); }
      }
    });

    const perteMax = meta(reponses, 'q_perteMax', 'perteMax');
    PLAFONDS.perteMax.forEach(p => {
      if (perteMax !== undefined && perteMax <= p.max) {
        const cible = profilParId(p.profil);
        if (cible.ordre < profil.ordre) { profil = cible; plafondsAppliques.push(p.motif + ' → plafond ' + cible.nom); }
      }
    });

    /* L'âge ne plafonne pas mécaniquement mais alerte le conseiller. */
    const alertes = [];
    const age = Number(identite.age) || 0;
    if (age >= 70 && profil.ordre >= 3) {
      alertes.push("Souscripteur de " + age + " ans avec un profil " + profil.nom.toLowerCase() +
        " : vérifier la cohérence avec l'horizon successoral et documenter la motivation du client.");
    }
    if (Math.abs(capacite - tolerance) >= 30) {
      alertes.push("Écart important entre capacité de perte (" + capacite + ") et tolérance déclarée (" +
        tolerance + ") : l'écart doit être expliqué au client et tracé dans le rapport d'adéquation.");
    }
    if (meta(reponses, 'q_vecu', 'vecu') === 'vendu' && profil.ordre >= 3) {
      alertes.push("Le client a déjà vendu en phase de baisse. Le risque comportemental est réel : " +
        "prévoir un accompagnement renforcé ou réduire d'un cran l'exposition actions.");
    }
    if (meta(reponses, 'q_precaution', 'x') === undefined) { /* placeholder */ }

    const esg = meta(reponses, 'q_esg', 'esg') || 'aucune';
    const gestion = meta(reponses, 'q_arbitrage', 'gestion') || 'conseillee';
    const objectif = meta(reponses, 'q_objectif', 'objectif') || 'croissance';

    return {
      scores: { capacite, tolerance, connaissance, retenu: scoreRetenu },
      profil,
      profilTheorique,
      declasse: profilTheorique.id !== profil.id,
      plafondsAppliques,
      alertes,
      preferences: { esg, gestion, objectif, horizon, perteMax }
    };
  }

  /** Perte maximale historique estimée du portefeuille cible (stress test). */
  function stressTest(allocation) {
    /* Chocs de référence appliqués par classe, calibrés sur 2008 / 2020 / 2022. */
    const scenarios = [
      { nom: 'Crise financière type 2008', chocs: { actions: -42, obligations: 3,   monetaire: 1,  diversifiants: -18 } },
      { nom: 'Choc exogène type mars 2020', chocs: { actions: -33, obligations: 2,   monetaire: 0,  diversifiants: -12 } },
      { nom: 'Choc de taux type 2022',      chocs: { actions: -18, obligations: -15, monetaire: 0,  diversifiants: -6 } },
      { nom: 'Choc géopolitique / énergie', chocs: { actions: -15, obligations: -4,  monetaire: 0,  diversifiants: 8 } }
    ];
    return scenarios.map(s => {
      let impact = 0;
      Object.keys(allocation).forEach(cl => { impact += (allocation[cl] || 0) / 100 * (s.chocs[cl] || 0); });
      return { nom: s.nom, impact: Math.round(impact * 10) / 10 };
    });
  }

  return { calculer, questionsManquantes, profilParId, scoreAxe, stressTest };
})();
