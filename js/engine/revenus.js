/* =============================================================
   MOTEUR DE REVENUS
   Détermine sur quels supports prélever un revenu régulier,
   dans quel ordre, pour quel coût fiscal, et si le rythme de
   retrait est soutenable dans la durée.
   ============================================================= */

const MoteurRevenus = (function () {

  const FREQUENCES = {
    mensuelle:     { libelle: 'Mensuelle',     parAn: 12 },
    trimestrielle: { libelle: 'Trimestrielle', parAn: 4 },
    semestrielle:  { libelle: 'Semestrielle',  parAn: 2 },
    annuelle:      { libelle: 'Annuelle',      parAn: 1 }
  };

  /* -------------------------------------------------------------
     Contrainte de coussin : quand un revenu est servi, la poche
     monétaire doit couvrir plusieurs années de retraits pour ne
     jamais être contraint de vendre des actions en pleine baisse.
     ------------------------------------------------------------- */
  function contrainteCoussin(allocation, besoinAnnuel, coussinMois, capital) {
    if (!besoinAnnuel || !capital) return { allocation, applique: false };

    const coussinEuros = besoinAnnuel * (coussinMois / 12);
    const coussinPct = Math.min(95, 100 * coussinEuros / capital);
    const monetaireActuel = allocation.classes.monetaire || 0;
    if (coussinPct <= monetaireActuel + 0.05) return { allocation, applique: false };

    const manque = coussinPct - monetaireActuel;
    const classes = Object.assign({}, allocation.classes);
    const poches = Object.assign({}, allocation.poches);

    /* Le complément est prélevé sur les autres classes, au prorata,
       en commençant par les plus risquées. */
    const ponctionnables = ['actions', 'diversifiants', 'obligations'];
    let restant = manque;
    const ordreEffort = { actions: 0.5, diversifiants: 0.2, obligations: 0.3 };
    ponctionnables.forEach(cl => {
      if (restant <= 0) return;
      const dispo = classes[cl] || 0;
      const ponction = Math.min(dispo, Math.min(restant, manque * ordreEffort[cl]));
      classes[cl] = dispo - ponction;
      restant -= ponction;
    });
    /* Reliquat éventuel : prélevé sur ce qui reste, au prorata */
    if (restant > 0.05) {
      const base = ponctionnables.reduce((a, cl) => a + (classes[cl] || 0), 0);
      if (base > 0) {
        ponctionnables.forEach(cl => {
          const ponction = restant * (classes[cl] || 0) / base;
          classes[cl] = Math.max(0, (classes[cl] || 0) - ponction);
        });
      }
    }
    classes.monetaire = coussinPct;

    /* Report sur les poches : on rescale chaque classe */
    Object.keys(poches).forEach(p => {
      const cl = MoteurSelection.classeDePoche(p);
      const avant = allocation.classes[cl] || 0;
      poches[p] = avant > 0 ? poches[p] * (classes[cl] || 0) / avant : 0;
    });
    poches['mon-euro'] = classes.monetaire;

    MoteurAllocation.normaliserA100(classes);
    MoteurAllocation.normaliserA100(poches);

    return {
      allocation: Object.assign({}, allocation, { classes, poches }),
      applique: true,
      coussinEuros: Math.round(coussinEuros),
      coussinPct: Math.round(coussinPct * 10) / 10,
      monetaireAvant: monetaireActuel
    };
  }

  /* -------------------------------------------------------------
     Plan de prélèvement
     ------------------------------------------------------------- */

  /**
   * @param {Array}  detention   [{isin, libelle, montant, pvLatente, poche, classe}]
   * @param {Array}  lignesCibles issues de MoteurSelection
   * @param {Object} p {enveloppe, besoinAnnuel, frequence, coussinMois,
   *                    anciennete, couple, primesVersees, rendementEspere}
   * @param {Array}  univers
   */
  function planifier(detention, lignesCibles, p, univers) {
    const index = {};
    univers.forEach(e => { index[e.isin] = e; });

    const lignes = detention
      .filter(l => l.isin && Number(l.montant) > 0)
      .map(l => {
        const ref = index[l.isin];
        return {
          isin: l.isin,
          libelle: l.libelle || (ref ? ref.nom : l.isin),
          montant: Number(l.montant),
          pvLatente: Number(l.pvLatente) || 0,
          poche: ref ? ref.poche : l.poche,
          classe: ref ? ref.classe : l.classe,
          distribuant: ref ? ref.capitalisation === false : false,
          rendement: RENDEMENTS_COURANTS[ref ? ref.poche : l.poche] || 0
        };
      });

    const capital = lignes.reduce((a, l) => a + l.montant, 0);
    if (capital <= 0 || !p.besoinAnnuel) return null;

    const freq = FREQUENCES[p.frequence] || FREQUENCES.mensuelle;
    const besoinAnnuel = Number(p.besoinAnnuel);
    const besoinParEcheance = besoinAnnuel / freq.parAn;
    const tauxRetrait = 100 * besoinAnnuel / capital;

    /* --- Étape 1 : revenus encaissés sans vendre ---
       En assurance-vie, les coupons des unités de compte sont
       réinvestis dans le contrat : ils ne constituent pas un revenu
       disponible. Le revenu passe nécessairement par un rachat. */
    const dividendesBruts = lignes.reduce((a, l) => a + l.montant * l.rendement / 100, 0);
    const dividendesDisponibles = p.enveloppe === 'AV'
      ? 0
      : lignes.filter(l => l.distribuant).reduce((a, l) => a + l.montant * l.rendement / 100, 0);

    const aPrelever = Math.max(0, besoinAnnuel - dividendesDisponibles);

    /* --- Cible en euros par ISIN --- */
    const cibleParIsin = {};
    lignesCibles.forEach(l => {
      cibleParIsin[l.etf.isin] = (cibleParIsin[l.etf.isin] || 0) + (capital - aPrelever) * l.poids / 100;
    });

    const coussinCible = besoinAnnuel * (p.coussinMois / 12);
    const monetaire = lignes.filter(l => l.classe === 'monetaire');
    const monetaireTotal = monetaire.reduce((a, l) => a + l.montant, 0);

    const prelevements = [];
    let reste = aPrelever;

    /* --- Étape 2 : monétaire au-delà du coussin --- */
    const excedentMonetaire = Math.max(0, monetaireTotal - coussinCible - aPrelever);
    if (excedentMonetaire > 0 && reste > 0) {
      repartir(monetaire, Math.min(reste, excedentMonetaire), 'coussin', prelevements, l => l.montant);
      reste -= Math.min(reste, excedentMonetaire);
    }

    /* --- Étape 3 : lignes surpondérées --- */
    if (reste > 0) {
      const surponderees = lignes
        .map(l => ({ l, exces: l.montant - (cibleParIsin[l.isin] || 0) }))
        .filter(x => x.exces > 0);
      const totalExces = surponderees.reduce((a, x) => a + x.exces, 0);
      if (totalExces > 0) {
        const montant = Math.min(reste, totalExces);
        repartir(surponderees.map(x => x.l), montant, 'surponderation', prelevements,
          l => surponderees.find(x => x.l === l).exces);
        reste -= montant;
      }
    }

    /* --- Étape 4 : solde au prorata --- */
    if (reste > 0.5) {
      const dejaPreleve = {};
      prelevements.forEach(x => { dejaPreleve[x.isin] = (dejaPreleve[x.isin] || 0) + x.montant; });
      const disponibles = lignes.filter(l => l.montant - (dejaPreleve[l.isin] || 0) > 1);
      repartir(disponibles, reste, 'prorata', prelevements,
        l => l.montant - (dejaPreleve[l.isin] || 0));
      reste = 0;
    }

    /* --- Consolidation par support --- */
    const parSupport = {};
    prelevements.forEach(x => {
      if (!parSupport[x.isin]) parSupport[x.isin] = { isin: x.isin, libelle: x.libelle, poche: x.poche, classe: x.classe, montant: 0, pvLatente: x.pvLatente, etapes: [] };
      parSupport[x.isin].montant += x.montant;
      if (parSupport[x.isin].etapes.indexOf(x.etape) < 0) parSupport[x.isin].etapes.push(x.etape);
    });
    const supports = Object.values(parSupport)
      .map(s => {
        s.montant = Math.round(s.montant);
        s.pct = capital ? Math.round(1000 * s.montant / capital) / 10 : 0;
        s.parEcheance = Math.round(s.montant / freq.parAn);
        s.plusValue = Math.round(s.montant * Math.max(0, s.pvLatente) / 100);
        return s;
      })
      .filter(s => s.montant > 0)
      .sort((a, b) => b.montant - a.montant);

    /* --- Fiscalité --- */
    const fisc = fiscalite(p, capital, lignes, supports, dividendesDisponibles);

    /* --- Soutenabilité --- */
    const projection = projeter(capital, besoinAnnuel, p.rendementEspere / 100, FISCALITE_PARAMS.inflation);

    return {
      capital, besoinAnnuel, besoinParEcheance, frequence: freq,
      tauxRetrait: Math.round(tauxRetrait * 100) / 100,
      tauxRetraitNet: Math.round((tauxRetrait + 100 * fisc.total / capital) * 100) / 100,
      dividendesBruts: Math.round(dividendesBruts),
      dividendesDisponibles: Math.round(dividendesDisponibles),
      partCouverteParDividendes: besoinAnnuel ? Math.round(100 * dividendesDisponibles / besoinAnnuel) : 0,
      aPrelever: Math.round(aPrelever),
      coussinCible: Math.round(coussinCible),
      monetaireTotal: Math.round(monetaireTotal),
      coussinSuffisant: monetaireTotal >= coussinCible - 1,
      supports, fiscalite: fisc, projection,
      alertes: alertes(p, tauxRetrait, projection, monetaireTotal, coussinCible, capital)
    };
  }

  /** Répartit un montant entre des lignes au prorata d'une clé. */
  function repartir(lignes, montant, etape, sortie, cle) {
    const base = lignes.reduce((a, l) => a + Math.max(0, cle(l)), 0);
    if (base <= 0) return;
    lignes.forEach(l => {
      const part = montant * Math.max(0, cle(l)) / base;
      if (part < 1) return;
      sortie.push({
        isin: l.isin, libelle: l.libelle, poche: l.poche, classe: l.classe,
        pvLatente: l.pvLatente, montant: part, etape
      });
    });
  }

  /* -------------------------------------------------------------
     Fiscalité du retrait selon l'enveloppe
     ------------------------------------------------------------- */
  function fiscalite(p, capital, lignes, supports, dividendes) {
    const ps = FISCALITE_PARAMS.prelevementsSociaux;
    const detail = [];
    let total = 0;

    if (p.enveloppe === 'AV') {
      const av = FISCALITE_PARAMS.assuranceVie;
      const primes = Number(p.primesVersees) || 0;
      const produits = Math.max(0, capital - primes);
      const rachat = supports.reduce((a, s) => a + s.montant, 0);
      /* Assiette = rachat × (produits / valeur de rachat) */
      const assiette = capital > 0 ? rachat * produits / capital : 0;

      const abattement = p.anciennete >= 8
        ? (p.couple ? av.abattementCouple : av.abattementCelibataire) : 0;
      const assietteIr = Math.max(0, assiette - abattement);
      const tauxIr = p.anciennete >= 8
        ? (primes <= av.seuilPrimes ? av.tauxIrApres8ansSous150k : av.tauxIrApres8ansAu150k)
        : av.tauxIrAvant8ans;

      const impotIr = assietteIr * tauxIr;
      const impotPs = assiette * ps;
      total = impotIr + impotPs;

      detail.push({ libelle: 'Rachat partiel programmé', valeur: Math.round(rachat) });
      detail.push({ libelle: 'Produits dans le contrat', valeur: Math.round(produits) });
      detail.push({ libelle: 'Quote-part de produits taxable', valeur: Math.round(assiette) });
      if (abattement) detail.push({ libelle: 'Abattement annuel (contrat > 8 ans)', valeur: -abattement });
      detail.push({ libelle: 'Impôt sur le revenu (' + (tauxIr * 100).toFixed(1).replace('.', ',') + ' %)', valeur: Math.round(impotIr) });
      detail.push({ libelle: 'Prélèvements sociaux (' + (ps * 100).toFixed(1).replace('.', ',') + ' %)', valeur: Math.round(impotPs) });

      return {
        total: Math.round(total), detail,
        assiette: Math.round(assiette),
        tauxEffectif: rachat ? Math.round(1000 * total / rachat) / 10 : 0,
        regime: "Assurance-vie — seule la quote-part de produits comprise dans le rachat est imposée. " +
          (p.anciennete >= 8
            ? "Contrat de plus de 8 ans : abattement annuel de " +
              (p.couple ? av.abattementCouple : av.abattementCelibataire).toLocaleString('fr-FR') + " € sur les produits."
            : "Contrat de moins de 8 ans : pas d'abattement, PFU à 12,8 %.") + ' ' + av.note
      };
    }

    if (p.enveloppe === 'PEA') {
      const pea = FISCALITE_PARAMS.pea;
      const primes = Number(p.primesVersees) || 0;
      const gains = Math.max(0, capital - primes);
      const retrait = supports.reduce((a, s) => a + s.montant, 0) + dividendes;
      const assiette = capital > 0 ? retrait * gains / capital : 0;
      const apres5 = p.anciennete >= pea.dureeExoneration;
      const impotIr = apres5 ? 0 : assiette * pea.tauxIrAvantDuree;
      const impotPs = assiette * ps;
      total = impotIr + impotPs;

      detail.push({ libelle: 'Retrait', valeur: Math.round(retrait) });
      detail.push({ libelle: 'Quote-part de gain', valeur: Math.round(assiette) });
      detail.push({ libelle: 'Impôt sur le revenu', valeur: Math.round(impotIr) });
      detail.push({ libelle: 'Prélèvements sociaux', valeur: Math.round(impotPs) });

      return {
        total: Math.round(total), detail, assiette: Math.round(assiette),
        tauxEffectif: retrait ? Math.round(1000 * total / retrait) / 10 : 0,
        regime: (apres5
          ? "PEA de plus de 5 ans : retrait exonéré d'impôt sur le revenu, prélèvements sociaux dus sur la quote-part de gain."
          : "⚠ PEA de moins de 5 ans : un retrait entraîne en principe la clôture du plan. " +
            "Servir un revenu depuis un PEA jeune est à proscrire.") + ' ' + pea.note
      };
    }

    /* Compte-titres */
    const cto = FISCALITE_PARAMS.compteTitres;
    const pvRealisee = supports.reduce((a, s) => a + s.plusValue, 0);
    const impotPv = pvRealisee * cto.tauxPfu;
    const impotDiv = dividendes * cto.tauxPfu;
    total = impotPv + impotDiv;

    detail.push({ libelle: 'Plus-values réalisées', valeur: Math.round(pvRealisee) });
    detail.push({ libelle: 'PFU sur plus-values (30 %)', valeur: Math.round(impotPv) });
    detail.push({ libelle: 'Dividendes encaissés', valeur: Math.round(dividendes) });
    detail.push({ libelle: 'PFU sur dividendes (30 %)', valeur: Math.round(impotDiv) });

    const retrait = supports.reduce((a, s) => a + s.montant, 0) + dividendes;
    return {
      total: Math.round(total), detail, assiette: Math.round(pvRealisee + dividendes),
      tauxEffectif: retrait ? Math.round(1000 * total / retrait) / 10 : 0,
      regime: cto.note + " Seule la fraction de plus-value comprise dans la vente est taxée : " +
        "vendre les lignes les moins chargées en plus-value latente réduit la facture."
    };
  }

  /* -------------------------------------------------------------
     Projection déterministe du capital
     ------------------------------------------------------------- */
  function projeter(capital, besoinAnnuel, rendement, inflation) {
    const points = [];
    let c = capital, retrait = besoinAnnuel, epuisement = null;
    for (let an = 1; an <= 40; an++) {
      c = (c - retrait) * (1 + rendement);
      retrait = retrait * (1 + inflation);
      if (c <= 0 && epuisement === null) { epuisement = an; c = 0; }
      if ([5, 10, 15, 20, 25, 30].indexOf(an) >= 0) {
        points.push({ an, capital: Math.round(Math.max(0, c)), pouvoirAchat: Math.round(Math.max(0, c) / Math.pow(1 + inflation, an)) });
      }
    }
    const tauxSoutenable = Math.max(0, (rendement - inflation)) * 100;
    return {
      points, epuisement,
      tauxSoutenable: Math.round(tauxSoutenable * 100) / 100,
      capital30ans: points.length ? points[points.length - 1].capital : 0
    };
  }

  function alertes(p, tauxRetrait, projection, monetaire, coussin, capital) {
    const a = [];
    if (tauxRetrait > projection.tauxSoutenable + 1.5) {
      a.push({
        niveau: 'erreur',
        texte: "Le taux de retrait (" + tauxRetrait.toFixed(2).replace('.', ',') + " % par an) dépasse nettement " +
          "le rendement réel espéré (" + projection.tauxSoutenable.toFixed(2).replace('.', ',') + " % net d'inflation). " +
          "Le capital sera consommé" + (projection.epuisement ? " et épuisé vers l'année " + projection.epuisement : "") +
          ". Ce n'est acceptable que si la consommation du capital est un choix assumé du client."
      });
    } else if (tauxRetrait > projection.tauxSoutenable) {
      a.push({
        niveau: 'alerte',
        texte: "Le taux de retrait entame légèrement le capital en euros constants. " +
          "Acceptable sur un horizon court ou si le client accepte une érosion progressive."
      });
    } else {
      a.push({
        niveau: 'succes',
        texte: "Le taux de retrait est inférieur au rendement réel espéré : le capital devrait se maintenir " +
          "en pouvoir d'achat, sous réserve de la réalisation des hypothèses de rendement."
      });
    }

    if (monetaire < coussin - 1) {
      a.push({
        niveau: 'alerte',
        texte: "Coussin de sécurité insuffisant : " + Math.round(monetaire).toLocaleString('fr-FR') + " € en monétaire " +
          "pour un besoin de " + Math.round(coussin).toLocaleString('fr-FR') + " € (" + p.coussinMois + " mois de revenus). " +
          "Sans ce matelas, une baisse des marchés obligerait à vendre des actions au plus mauvais moment."
      });
    }

    if (p.enveloppe === 'PEA' && p.anciennete < FISCALITE_PARAMS.pea.dureeExoneration) {
      a.push({
        niveau: 'erreur',
        texte: "PEA de moins de 5 ans : tout retrait entraîne en principe la clôture du plan. " +
          "Servir le revenu depuis une autre enveloppe."
      });
    }

    if (p.enveloppe === 'AV' && p.anciennete < 8) {
      a.push({
        niveau: 'alerte',
        texte: "Contrat de moins de 8 ans : aucun abattement annuel sur les produits. " +
          "Si le besoin de revenu n'est pas immédiat, différer les rachats jusqu'au huitième anniversaire " +
          "réduit sensiblement l'imposition."
      });
    }

    return a;
  }

  return { planifier, contrainteCoussin, projeter, FREQUENCES };
})();
