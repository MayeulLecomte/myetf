/* =============================================================
   MOTEUR D'ARBITRAGE
   Compare le portefeuille détenu à l'allocation cible et propose
   des mouvements, en tenant compte des seuils de déclenchement,
   des apports disponibles et de la fiscalité de l'enveloppe.
   ============================================================= */

const MoteurArbitrage = (function () {

  const FISCALITE = {
    AV:  { taux: 0,    libelle: "Assurance-vie : les arbitrages entre unités de compte ne sont pas un fait générateur d'imposition." },
    PEA: { taux: 0,    libelle: "PEA : les arbitrages internes ne sont pas imposables tant qu'aucun retrait n'est effectué." },
    CTO: { taux: 0.30, libelle: "Compte-titres : chaque vente en plus-value déclenche l'imposition (PFU 30 %, ou barème sur option)." }
  };

  /**
   * @param {Array}  portefeuille [{isin, libelle, montant, pvLatente}]  pvLatente en % du montant
   * @param {Array}  lignesCibles issues de MoteurSelection.construire()
   * @param {Object} contexte {enveloppe, apport, montantTotal}
   * @param {Array}  univers
   */
  function analyser(portefeuille, lignesCibles, contexte, univers) {
    const index = {};
    univers.forEach(e => { index[e.isin] = e; });

    const detenu = portefeuille
      .filter(l => l.isin && Number(l.montant) > 0)
      .map(l => {
        const ref = index[l.isin];
        return {
          isin: l.isin,
          libelle: l.libelle || (ref ? ref.nom : l.isin),
          montant: Number(l.montant),
          pvLatente: Number(l.pvLatente) || 0,
          poche: ref ? ref.poche : (l.poche || null),
          classe: ref ? ref.classe : (l.classe || null),
          connu: !!ref
        };
      });

    const apport = Number(contexte.apport) || 0;
    const valeurDetenue = detenu.reduce((a, l) => a + l.montant, 0);
    const total = valeurDetenue + apport;

    if (total <= 0) return null;

    /* --- Positions cibles en euros --- */
    const cibleParIsin = {};
    lignesCibles.forEach(l => {
      cibleParIsin[l.etf.isin] = (cibleParIsin[l.etf.isin] || 0) + total * l.poids / 100;
    });

    /* --- Écarts ligne à ligne --- */
    const tousIsin = Array.from(new Set(detenu.map(l => l.isin).concat(Object.keys(cibleParIsin))));
    const seuilMontant = Math.max(SEUILS_ARBITRAGE.montantMin, total * SEUILS_ARBITRAGE.ecartAbsoluMin / 100);

    const ecarts = tousIsin.map(isin => {
      const pos = detenu.find(l => l.isin === isin);
      const ref = index[isin];
      const actuel = pos ? pos.montant : 0;
      const cible = cibleParIsin[isin] || 0;
      const delta = cible - actuel;
      const relatif = actuel > 0 ? Math.abs(delta) / actuel : 1;
      return {
        isin,
        libelle: pos ? pos.libelle : (ref ? ref.nom : isin),
        poche: pos ? pos.poche : (ref ? ref.poche : null),
        classe: pos ? pos.classe : (ref ? ref.classe : null),
        actuel, cible, delta,
        pctActuel: total ? 100 * actuel / total : 0,
        pctCible: total ? 100 * cible / total : 0,
        pvLatente: pos ? pos.pvLatente : 0,
        declenche: Math.abs(delta) >= seuilMontant && (actuel === 0 || relatif >= SEUILS_ARBITRAGE.ecartRelatifMin || Math.abs(delta) >= seuilMontant)
      };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    /* --- Ordres ---
       Les surpondérations qui franchissent le seuil sont ramenées à la cible.
       Les liquidités dégagées, augmentées de l'apport, sont ensuite réparties
       au prorata des déficits — y compris ceux qui, isolément, ne
       justifieraient pas un mouvement : il faut bien investir le produit des
       ventes et l'apport. */
    const ordres = [];

    ecarts.filter(e => e.declenche && e.delta < 0).forEach(e => {
      const montant = Math.round(-e.delta);
      if (montant < SEUILS_ARBITRAGE.montantMin) return;
      const pv = montant * (e.pvLatente / 100);
      ordres.push({
        sens: 'Vente', isin: e.isin, libelle: e.libelle, poche: e.poche, classe: e.classe,
        montant, pct: total ? Math.round(1000 * montant / total) / 10 : 0,
        plusValue: Math.max(0, Math.round(pv)),
        impot: Math.round(Math.max(0, pv) * (FISCALITE[contexte.enveloppe] || FISCALITE.CTO).taux),
        motif: motif(e, 'vente')
      });
    });

    const totalVendu = ordres.reduce((a, o) => a + o.montant, 0);
    const liquidites = totalVendu + apport;
    const deficits = ecarts.filter(e => e.delta > 0);
    const besoinAchat = deficits.reduce((a, e) => a + e.delta, 0);
    const ratioAchat = besoinAchat > 0 ? Math.min(1, liquidites / besoinAchat) : 0;

    deficits.forEach(e => {
      const montant = Math.round(e.delta * ratioAchat);
      if (montant < SEUILS_ARBITRAGE.montantMin) return;
      ordres.push({
        sens: 'Achat', isin: e.isin, libelle: e.libelle, poche: e.poche, classe: e.classe,
        montant, pct: total ? Math.round(1000 * montant / total) / 10 : 0,
        plusValue: 0, impot: 0,
        motif: motif(e, 'achat')
      });
    });

    /* Le produit des ventes et l'apport doivent être intégralement réinvestis :
       le reliquat (arrondis + lignes d'achat écartées car trop petites) est
       affecté au plus gros achat, ou à défaut au plus fort déficit. */
    let achats = ordres.filter(o => o.sens === 'Achat');
    const residu = liquidites - achats.reduce((a, o) => a + o.montant, 0);

    if (!achats.length && liquidites >= SEUILS_ARBITRAGE.montantMin) {
      const e = deficits.slice().sort((a, b) => b.delta - a.delta)[0];
      if (e) {
        achats = [{
          sens: 'Achat', isin: e.isin, libelle: e.libelle, poche: e.poche, classe: e.classe,
          montant: 0, pct: 0, plusValue: 0, impot: 0, motif: motif(e, 'achat')
        }];
        ordres.push(achats[0]);
      }
    }

    if (achats.length && Math.round(residu) !== 0) {
      /* Réparti au prorata des achats déjà calculés, pour ne pas concentrer
         le reliquat sur une seule ligne. */
      const base = achats.reduce((a, o) => a + o.montant, 0);
      achats.forEach(o => {
        o.montant = Math.round(o.montant + residu * (base > 0 ? o.montant / base : 1 / achats.length));
      });
      const reste = Math.round(liquidites - achats.reduce((a, o) => a + o.montant, 0));
      if (reste !== 0) achats.slice().sort((a, b) => b.montant - a.montant)[0].montant += reste;
      achats.forEach(o => { o.pct = total ? Math.round(1000 * o.montant / total) / 10 : 0; });
    }

    /* --- Synthèse par classe --- */
    const parClasse = {};
    ['actions', 'obligations', 'monetaire', 'diversifiants'].forEach(cl => {
      const actuel = detenu.filter(l => l.classe === cl).reduce((a, l) => a + l.montant, 0);
      const cible = lignesCibles.filter(l => l.classe === cl).reduce((a, l) => a + total * l.poids / 100, 0);
      parClasse[cl] = {
        actuelPct: total ? Math.round(1000 * actuel / total) / 10 : 0,
        ciblePct: total ? Math.round(1000 * cible / total) / 10 : 0,
        actuel, cible, delta: cible - actuel
      };
    });

    const impotTotal = ordres.reduce((a, o) => a + (o.impot || 0), 0);
    const rotation = total ? Math.round(1000 * totalVendu / total) / 10 : 0;

    return {
      total, valeurDetenue, apport,
      ecarts, ordres, parClasse,
      inconnus: detenu.filter(l => !l.connu),
      fiscalite: {
        regime: (FISCALITE[contexte.enveloppe] || FISCALITE.CTO).libelle,
        impotEstime: impotTotal,
        taux: (FISCALITE[contexte.enveloppe] || FISCALITE.CTO).taux
      },
      rotation,
      seuilMontant: Math.round(seuilMontant),
      aucunMouvement: ordres.length === 0
    };
  }

  function motif(ecart, sens) {
    const lib = LIBELLES_POCHES[ecart.poche] || 'poche non identifiée';
    if (sens === 'vente') {
      if (ecart.cible === 0) return "Support sorti de l'allocation cible (" + lib + ")";
      return "Surpondération de " + Math.round(Math.abs(ecart.pctActuel - ecart.pctCible) * 10) / 10 + " pts sur " + lib;
    }
    if (ecart.actuel === 0) return "Nouvelle ligne : " + lib;
    return "Sous-pondération de " + Math.round(Math.abs(ecart.pctCible - ecart.pctActuel) * 10) / 10 + " pts sur " + lib;
  }

  /** Journal des arbitrages : conservé pour le suivi « au fil de l'eau ». */
  function entreeJournal(analyse, contexte, macro) {
    return {
      date: contexte.dateISO,
      profil: contexte.profilNom,
      enveloppe: contexte.enveloppe,
      scenarioDominant: macro ? macro.dominant : null,
      nbOrdres: analyse.ordres.length,
      rotation: analyse.rotation,
      impot: analyse.fiscalite.impotEstime,
      ordres: analyse.ordres.map(o => ({ sens: o.sens, isin: o.isin, libelle: o.libelle, montant: o.montant }))
    };
  }

  return { analyser, entreeJournal, FISCALITE };
})();
