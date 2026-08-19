/* =============================================================
   MOTEUR DE SITUATION DE PORTEFEUILLE
   -------------------------------------------------------------
   Établit un relevé daté : ce qui est détenu, à quel cours, pour
   quelle valeur, et quelle part du portefeuille.

   Deux natures de situation, qu'il ne faut pas confondre :

   • FIGÉE — les quantités et les cours ont été enregistrés à la
     date dite. C'est un relevé exact, opposable.
   • RECONSTITUÉE — les quantités d'aujourd'hui sont revalorisées
     aux cours d'une date passée. Exacte seulement si le
     portefeuille n'a pas bougé depuis. Toujours signalée comme
     telle : c'est une estimation, pas un relevé.

   Le moteur ne sait rien du DOM ni du stockage : il reçoit une
   détention et rend un objet de situation.
   ============================================================= */

const MoteurSituation = (function () {

  /* Statuts de valorisation d'une ligne, du plus fiable au moins :
     seance    cours de clôture de la date demandée
     anterieur dernière séance connue avant cette date (week-end, férié)
     actuel    dernier cours connu, postérieur à la date demandée
     montant   ligne saisie en montant, sans quantité : valeur figée
     absent    quantité connue mais aucun cours (support hors Euronext) */

  /** Cours de clôture applicable à une date, dans l'historique publié. */
  function coursALaDate(isin, dateISO, histo) {
    const h = histo || (typeof COURS_HISTORIQUE !== 'undefined' ? COURS_HISTORIQUE : null);
    if (!h || !h.series[isin]) return null;

    const serie = h.series[isin];
    /* Recherche dichotomique de la dernière séance ≤ date. */
    let bas = 0, haut = h.dates.length - 1, trouve = -1;
    while (bas <= haut) {
      const milieu = (bas + haut) >> 1;
      if (h.dates[milieu] <= dateISO) { trouve = milieu; bas = milieu + 1; }
      else haut = milieu - 1;
    }
    if (trouve < 0) return null;

    /* Le jour retenu peut être sans cotation pour ce support : on remonte. */
    for (let i = trouve; i >= 0; i--) {
      if (serie[i] !== null && serie[i] !== undefined) {
        return { cours: serie[i], date: h.dates[i], statut: h.dates[i] === dateISO ? 'seance' : 'anterieur' };
      }
    }
    return null;
  }

  /** Valorise une détention à une date donnée. */
  /* ----------------------------------------------------------
     LA VALORISATION DE REPLI
     ----------------------------------------------------------
     Seuls 34 ISIN ont un historique de cours Euronext, sur près
     de neuf cents sélectionnables. Pour les autres, le catalogue
     porte une dernière clôture — et deux pièges qui feraient
     d'elle un chiffre faux plutôt qu'une valeur manquante.

     LA DEVISE. Cent quarante-deux supports sélectionnables cotent
     hors zone euro, dont quatorze en PENCE : un GBX pris pour un
     euro vaut cent fois trop. Convertir demanderait un taux de
     change que l'application n'a pas. Une clôture qui n'est pas
     en euros n'est donc pas une valorisation, et le montant saisi
     reste seul.

     L'ÂGE. Le catalogue est relevé à la main, et ses clôtures ne
     sont pas toutes fraîches : le relevé du 19 août 2026 en porte
     qui datent de décembre 2022 — produits retirés de la cote ou
     sans échange. Au-delà de 45 jours, la clôture n'est plus une
     valeur, c'est un souvenir.

     Ces deux refus ne sont pas des erreurs : ils sont RENDUS, pour
     que la vue puisse dire pourquoi une ligne n'est pas valorisée.
     ---------------------------------------------------------- */
  const AGE_MAX_REPLI = 45;

  function coursDeRepli(isin, dateISO, repli) {
    if (!repli || !repli.prix) return null;
    const p = repli.prix[isin];
    if (!p || p.cours == null) return null;
    if (p.devise !== 'EUR') return { refus: 'deviseAutre' };
    if (!p.date) return { refus: 'tropAncien' };
    const age = (Date.parse(dateISO) - Date.parse(p.date)) / 86400000;
    if (age > AGE_MAX_REPLI) return { refus: 'tropAncien' };
    return { cours: p.cours, date: p.date };
  }

  function valoriser(detention, dateISO, options) {
    const opt = options || {};
    const univers = opt.univers || [];
    const histo = opt.historique;
    const derniers = opt.derniers || (typeof DERNIERS_COURS !== 'undefined' ? DERNIERS_COURS : {});
    const repli = opt.repli || null;

    const lignes = (detention || []).map(l => {
      const ref = univers.find(e => e.isin === l.isin) || null;
      const quantite = Number(l.quantite) || 0;
      const base = {
        isin: l.isin || '',
        libelle: l.libelle || (ref ? ref.nom : l.isin) || 'Support non identifié',
        poche: ref ? ref.poche : (l.poche || null),
        classe: ref ? ref.classe : (l.classe || null),
        quantite,
        pvLatente: Number(l.pvLatente) || 0,
        /* Détenu, ou seulement recommandé et pas encore acheté. Une ligne
           d'un dossier antérieur n'en porte pas : elle a été saisie à la
           main, elle décrit donc une position réelle.

           À ne pas confondre avec `statut`, posé plus bas, qui dit d'où
           vient le COURS de la ligne. Deux notions, deux noms. */
        possession: l.possession === 'a-investir' ? 'a-investir' : 'detenu'
      };

      if (quantite <= 0) {
        /* Sans quantité, aucune revalorisation possible : le montant saisi
           vaut à sa date de saisie, et pour toute autre date on le reprend
           tel quel en le disant. */
        return Object.assign(base, {
          cours: null, dateCours: null, statut: 'montant',
          montant: Math.round(Number(l.montant) || 0)
        });
      }

      const c = coursALaDate(l.isin, dateISO, histo);
      if (c) {
        return Object.assign(base, {
          cours: c.cours, dateCours: c.date, statut: c.statut,
          montant: Math.round(quantite * c.cours)
        });
      }

      /* Pas d'historique : on retombe sur le dernier cours connu, qui est
         postérieur à la date demandée. La ligne est fausse pour cette date
         et doit être présentée comme telle. */
      const dernier = derniers[l.isin];
      if (dernier) {
        return Object.assign(base, {
          cours: dernier.cours, dateCours: dernier.date, statut: 'actuel',
          montant: Math.round(quantite * dernier.cours)
        });
      }

      /* Ni historique, ni dernier cours relevé : le catalogue peut porter
         une clôture, si elle est en euros et si elle n'est pas trop vieille. */
      const r = coursDeRepli(l.isin, dateISO, repli);
      if (r && r.cours != null) {
        return Object.assign(base, {
          cours: r.cours, dateCours: r.date, statut: 'repli',
          montant: Math.round(quantite * r.cours)
        });
      }

      return Object.assign(base, {
        cours: null, dateCours: null, statut: r && r.refus ? r.refus : 'absent',
        montant: Math.round(Number(l.montant) || 0)
      });
    });

    const total = lignes.reduce((a, l) => a + l.montant, 0);
    lignes.forEach(l => { l.poids = total ? Math.round(1000 * l.montant / total) / 10 : 0; });
    lignes.sort((a, b) => b.montant - a.montant);

    /* Répartition par classe d'actifs, pour comparer à l'allocation cible. */
    const parClasse = {};
    lignes.forEach(l => {
      const cl = l.classe || 'non classé';
      parClasse[cl] = (parClasse[cl] || 0) + l.montant;
    });
    Object.keys(parClasse).forEach(cl => {
      parClasse[cl] = { montant: parClasse[cl], poids: total ? Math.round(1000 * parClasse[cl] / total) / 10 : 0 };
    });

    const compte = st => lignes.filter(l => l.statut === st).length;

    return {
      date: dateISO,
      lignes,
      total,
      parClasse,
      pvLatente: lignes.reduce((a, l) => a + l.pvLatente, 0),
      /* Une situation n'est fiable que si chaque ligne a un cours de la
         période. Les statuts « actuel » et « absent » la dégradent. */
      /* « repli » ne dégrade pas : c'est un vrai cours, en euros, daté.
         « deviseAutre » et « tropAncien » si, comme « absent » : dans les
         trois cas la ligne vaut son montant saisi, pas une valeur de marché. */
      fiable: lignes.length > 0 && !lignes.some(l =>
        l.statut === 'actuel' || l.statut === 'absent' ||
        l.statut === 'deviseAutre' || l.statut === 'tropAncien'),
      alertes: {
        horsPeriode: compte('actuel'),
        sansCours: compte('absent'),
        enMontant: compte('montant'),
        reportees: compte('anterieur'),
        repli: compte('repli'),
        deviseAutre: compte('deviseAutre'),
        tropAncien: compte('tropAncien')
      }
    };
  }

  /** Détention telle qu'elle serait après exécution des ordres proposés. */
  function apresArbitrage(detention, ordres, univers) {
    const apres = (detention || []).map(l => Object.assign({}, l));

    (ordres || []).forEach(o => {
      const signe = o.sens === 'Vente' ? -1 : 1;
      let ligne = apres.find(l => l.isin === o.isin);

      if (!ligne) {
        const ref = (univers || []).find(e => e.isin === o.isin);
        ligne = {
          isin: o.isin, libelle: o.libelle || (ref ? ref.nom : o.isin),
          montant: 0, quantite: 0, pvLatente: 0
        };
        apres.push(ligne);
      }

      const montant = signe * (Number(o.montant) || 0);
      ligne.montant = Math.round((Number(ligne.montant) || 0) + montant);

      /* Les quantités suivent le montant au dernier cours connu : sans
         cela, la situation d'après arbitrage ne serait plus revalorisable. */
      const cours = ligne.cours || (typeof DERNIERS_COURS !== 'undefined' && DERNIERS_COURS[o.isin]
        ? DERNIERS_COURS[o.isin].cours : null);
      if (cours && Number(ligne.quantite) >= 0) {
        ligne.quantite = Math.max(0, Math.round(((Number(ligne.quantite) || 0) + montant / cours) * 1000) / 1000);
      }

      /* Une vente réalise la plus-value latente au prorata du montant cédé. */
      if (signe < 0 && ligne.pvLatente) {
        const avant = ligne.montant - montant;
        const part = avant > 0 ? Math.min(1, Math.abs(montant) / avant) : 1;
        ligne.pvLatente = Math.round(ligne.pvLatente * (1 - part));
      }
    });

    return apres.filter(l => Math.round(Number(l.montant) || 0) > 0);
  }

  /**
   * Dates de situation réglementaires : chaque 30 juin et 31 décembre
   * écoulé, du plus récent au plus ancien. Ce sont les deux arrêtés qui
   * servent de repère semestriel dans le suivi d'un contrat.
   */
  function datesReference(aujourdhuiISO, depuisISO, maximum) {
    const fin = aujourdhuiISO;
    const debut = depuisISO || '2000-01-01';
    const dates = [];
    let annee = Number(fin.slice(0, 4));

    while (annee >= Number(debut.slice(0, 4)) && dates.length < (maximum || 8)) {
      [annee + '-12-31', annee + '-06-30'].forEach(d => {
        if (d <= fin && d >= debut && dates.length < (maximum || 8)) dates.push(d);
      });
      annee--;
    }
    return dates;
  }

  /** Libellé d'une date de référence : « 30 juin 2026 » → arrêté semestriel. */
  function libelleReference(dateISO) {
    return dateISO.slice(5) === '12-31' ? 'Arrêté annuel' : 'Arrêté semestriel';
  }

  return { coursALaDate, valoriser, apresArbitrage, datesReference, libelleReference,
           coursDeRepli, AGE_MAX_REPLI };
})();
