/* =============================================================
   MOTEUR DE SÉLECTION DES SUPPORTS
   Traduit une allocation par poche en lignes ETF concrètes,
   dans les limites de l'univers réellement accessible
   (enveloppe + univers du contrat + filtres qualité).
   ============================================================= */

const MoteurSelection = (function () {

  /* Poche de repli par classe lorsqu'aucun support n'est disponible */
  const REPLI = {
    actions: ['act-monde', 'act-europe', 'act-us'],
    obligations: ['obl-ig-euro', 'obl-souv-euro-ct', 'obl-souv-euro-lt', 'obl-globale-hedge'],
    monetaire: ['mon-euro'],
    diversifiants: ['div-or', 'div-immobilier', 'div-matieres']
  };

  /** Univers filtré selon l'enveloppe, le contrat et les critères qualité. */
  function universEligible(univers, contexte) {
    const contratsOk = contexte.enveloppe === 'AV'
      ? (HIERARCHIE_CONTRATS[contexte.contratAV] || [])
      : null;

    return univers.filter(e => {
      if (!e.enveloppes.includes(contexte.enveloppe)) return false;
      if (contexte.enveloppe === 'PEA' && !e.pea) return false;
      if (contexte.enveloppe === 'AV') {
        const dispo = (e.contratsAV || []).some(c => contratsOk.includes(c));
        if (!dispo) return false;
      }
      if ((e.morningstar || 0) < (contexte.etoilesMin || 4)) return false;
      if (contexte.encoursMin && (e.encours || 0) < contexte.encoursMin) return false;
      if (contexte.terMax && (e.ter || 0) > contexte.terMax) return false;
      if (contexte.exclureSynthetique && /Synth/i.test(e.replication)) return false;
      return true;
    });
  }

  /** Score qualité d'un ETF (0-100), relatif à ses concurrents de la même poche. */
  function scorer(etf, concurrents, contexte) {
    const detail = {};

    detail.notation = (etf.morningstar / 5) * 40;

    const ters = concurrents.map(c => c.ter);
    const terMin = Math.min.apply(null, ters), terMax = Math.max.apply(null, ters);
    detail.frais = terMax > terMin ? 20 * (terMax - etf.ter) / (terMax - terMin) : 18;

    /* Encours : échelle logarithmique, saturée à 20 Md€ */
    const enc = Math.max(1, etf.encours || 1);
    detail.taille = 15 * Math.min(1, Math.log10(enc) / Math.log10(20000));

    detail.replication = /Physique \(ETC\)/i.test(etf.replication) ? 6
      : /Physique/i.test(etf.replication) ? 10 : 7;

    /* Le critère ESG ne pèse que si le client en a exprimé la préférence.
       Le total est ramené à 100 selon le barème effectivement appliqué. */
    const poidsEsg = contexte.esg === 'prioritaire' ? 15 : contexte.esg === 'souhaitee' ? 8 : 0;
    detail.esg = etf.isr ? poidsEsg : 0;

    /* Objectif de revenu : en compte-titres et en PEA, un ETF distribuant verse
       des liquidités sans vendre de parts. En assurance-vie au contraire, les
       coupons sont réinvestis dans le contrat et le revenu passe par un rachat
       partiel : la part capitalisante est plus simple et fiscalement neutre. */
    const poidsRevenu = contexte.objectifRevenus ? 8 : 0;
    if (poidsRevenu) {
      const recherche = contexte.enveloppe === 'AV' ? true : false;   // true = capitalisant
      detail.distribution = (etf.capitalisation === recherche) ? poidsRevenu : 0;
    }

    const maximum = 40 + 20 + 15 + 10 + poidsEsg + poidsRevenu;
    const total = Object.values(detail).reduce((a, b) => a + b, 0) * 100 / maximum;
    return { total: Math.round(total * 10) / 10, detail };
  }

  /**
   * Construit le portefeuille de lignes.
   * @param {Object} poches   {idPoche: % du portefeuille}
   * @param {Object} contexte {enveloppe, contratAV, etoilesMin, esg, montant, ...}
   * @param {Array}  univers
   */
  function construire(poches, contexte, univers) {
    const eligibles = universEligible(univers, contexte);
    const avertissements = [];
    const cibles = Object.assign({}, poches);
    const classesNonImplementables = {};
    const pochesSansIsr = [];
    let residuel = 0;

    /* --- Report des poches sans support disponible --- */
    Object.keys(cibles).forEach(poche => {
      if (cibles[poche] <= 0) return;
      const dispo = eligibles.filter(e => e.poche === poche);
      if (dispo.length) return;

      const classe = classeDePoche(poche);
      const remplacants = (REPLI[classe] || []).filter(p => eligibles.some(e => e.poche === p));

      if (remplacants.length) {
        const cible = remplacants[0];
        avertissements.push("« " + (LIBELLES_POCHES[poche] || poche) + " » (" + cibles[poche].toFixed(1) +
          " %) indisponible dans cet univers : reporté sur « " + LIBELLES_POCHES[cible] + " ».");
        cibles[cible] = (cibles[cible] || 0) + cibles[poche];
        cibles[poche] = 0;
        return;
      }

      /* Aucun support dans la classe entière : repli sur le monétaire de
         l'enveloppe, qui minore le risque au lieu de le majorer. */
      if (eligibles.some(e => e.poche === 'mon-euro')) {
        classesNonImplementables[classe] = (classesNonImplementables[classe] || 0) + cibles[poche];
        cibles['mon-euro'] = (cibles['mon-euro'] || 0) + cibles[poche];
        cibles[poche] = 0;
        return;
      }

      residuel += cibles[poche];
      cibles[poche] = 0;
      avertissements.push("Aucun support disponible pour « " + (LIBELLES_POCHES[poche] || poche) +
        " » ni pour sa classe : " + residuel.toFixed(1) + " % non investis, à placer manuellement.");
    });

    Object.keys(classesNonImplementables).forEach(cl => {
      avertissements.push("La classe « " + LIBELLES_CLASSES[cl] + " » (" +
        classesNonImplementables[cl].toFixed(1) + " % de l'allocation cible) n'est pas implémentable dans " +
        libelleEnveloppe(contexte) + " : ce poids est placé en monétaire. " +
        "Cette enveloppe ne peut pas porter seule l'allocation du profil — prévoyez une enveloppe " +
        "complémentaire (assurance-vie ou compte-titres) pour cette classe d'actifs.");
    });

    /* --- Sélection du meilleur support par poche --- */
    let lignes = [];
    Object.keys(cibles).forEach(poche => {
      const poids = cibles[poche];
      if (poids <= 0) return;
      let concurrents = eligibles.filter(e => e.poche === poche);
      if (!concurrents.length) return;

      /* Préférence ESG : on restreint aux supports ISR quand il en existe
         pour la poche, sinon on retient le meilleur support disponible en
         signalant la dérogation. */
      if (contexte.esg === 'prioritaire') {
        const isr = concurrents.filter(e => e.isr);
        if (isr.length) {
          concurrents = isr;
        } else {
          pochesSansIsr.push(LIBELLES_POCHES[poche] || poche);
        }
      }

      const notes = concurrents.map(e => ({ etf: e, score: scorer(e, concurrents, contexte) }))
        .sort((a, b) => b.score.total - a.score.total);

      lignes.push({
        poche, classe: classeDePoche(poche),
        poids: poids,
        etf: notes[0].etf,
        score: notes[0].score,
        alternatives: notes.slice(1, 4).map(n => ({ etf: n.etf, score: n.score.total }))
      });
    });

    if (pochesSansIsr.length) {
      avertissements.push("Préférences de durabilité prioritaires : aucun support labellisé n'est référencé pour " +
        pochesSansIsr.join(', ') + ". Le meilleur support disponible a été retenu par défaut ; " +
        "cette dérogation doit être signalée au client dans le rapport d'adéquation.");
    }

    /* --- Suppression des lignes trop petites --- */
    lignes = fusionnerPetitesLignes(lignes, avertissements);

    /* --- Montants --- */
    const montant = Number(contexte.montant) || 0;
    lignes.forEach(l => { l.montant = Math.round(montant * l.poids / 100); });

    /* --- Frais moyens pondérés du portefeuille --- */
    const terMoyen = lignes.reduce((a, l) => a + l.poids * l.etf.ter, 0) / 100;

    lignes.sort((a, b) => (ordreClasse(a.classe) - ordreClasse(b.classe)) || (b.poids - a.poids));

    /* --- Répartition réellement obtenue, par classe --- */
    const classesObtenues = { actions: 0, obligations: 0, monetaire: 0, diversifiants: 0 };
    lignes.forEach(l => { classesObtenues[l.classe] += l.poids; });

    return {
      lignes,
      avertissements,
      residuel: Math.round(residuel * 10) / 10,
      classesNonImplementables,
      classesObtenues,
      terMoyen: Math.round(terMoyen * 1000) / 1000,
      nbSupports: lignes.length,
      universEligible: eligibles.length,
      universTotal: univers.length
    };
  }

  function libelleEnveloppe(contexte) {
    if (contexte.enveloppe === 'PEA') return 'un PEA';
    if (contexte.enveloppe === 'CTO') return 'un compte-titres';
    return "cet univers d'assurance-vie";
  }

  function fusionnerPetitesLignes(lignes, avertissements) {
    const seuil = SEUILS_ARBITRAGE.ligneMinPct;
    const petites = lignes.filter(l => l.poids < seuil);
    if (!petites.length) return lignes;

    petites.forEach(petite => {
      const memeClasse = lignes.filter(l => l.classe === petite.classe && l !== petite && l.poids >= seuil);
      if (!memeClasse.length) return;  // on conserve la ligne si elle est seule dans sa classe
      const cible = memeClasse.sort((a, b) => b.poids - a.poids)[0];
      cible.poids = Math.round((cible.poids + petite.poids) * 10) / 10;
      petite.poids = 0;
      avertissements.push("Ligne « " + (LIBELLES_POCHES[petite.poche] || petite.poche) +
        " » inférieure à " + seuil + " % : regroupée sur « " + LIBELLES_POCHES[cible.poche] + " ».");
    });

    return lignes.filter(l => l.poids > 0);
  }

  function classeDePoche(poche) {
    if (poche.indexOf('act-') === 0) return 'actions';
    if (poche.indexOf('obl-') === 0) return 'obligations';
    if (poche.indexOf('mon-') === 0) return 'monetaire';
    return 'diversifiants';
  }

  function ordreClasse(cl) {
    return ['actions', 'obligations', 'diversifiants', 'monetaire'].indexOf(cl);
  }

  return { construire, universEligible, scorer, classeDePoche };
})();
