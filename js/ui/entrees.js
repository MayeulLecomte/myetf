/* =============================================================
   ENTRÉES
   -------------------------------------------------------------
   Tout ce qui vient du dehors : les gestionnaires d'événements, l'import de
   valorisations et de séries, l'export, la lecture d'un fichier, l'injection
   des cours de marché et le contrôle de version.

   Déplacé depuis js/app.js sans une virgule de changement.
   ============================================================= */

function brancher() {

  /* Dans cet ordre : la colonne porte les libellés que la barre de parcours
     y relit ensuite. */
  poserNav();
  poserTitres(); poserMots(); poserOuvertures();
  poserBarresParcours();

  /* La hauteur de l'en-tête change avec la largeur, et avec l'encoche du
     téléphone quand on le tourne : elle se remesure, elle ne se retient pas. */
  mesurerEntete();
  window.addEventListener('resize', mesurerEntete);
  window.addEventListener('orientationchange', mesurerEntete);

  /* Le repère de section se recalcule au défilement — et au redimensionnement,
     qui déplace le repère collant autant que les cartes. */
  window.addEventListener('scroll', majSectionCourante, { passive: true });
  window.addEventListener('resize', majSectionCourante);

  $('#nav').addEventListener('click', e => {
    const b = e.target.closest('button[data-vue]');
    if (b) afficher(b.dataset.vue);
  });

  $('#sous-nav').addEventListener('click', e => {
    const b = e.target.closest('button[data-vue]');
    if (b) afficher(b.dataset.vue);
  });

  /* --- Barre basse ---
     Toucher le groupe où l'on se trouve déjà remonte en haut de la vue,
     comme partout ailleurs, plutôt que de rejouer un rendu identique. */
  $('#tabbar').addEventListener('click', e => {
    /* Le « ••• » de la barre ouvre la même feuille que celui de l'en-tête :
       une seule feuille, deux portes, et jamais deux contenus à tenir. */
    if (e.target.closest('.tabbar-plus')) { $('#btn-dossier-mobile').click(); return; }
    const b = e.target.closest('button[data-groupe]');
    if (!b) return;
    const g = GROUPES.find(x => x.id === b.dataset.groupe);
    if (!g) return;
    if (groupeDeVue(vueCourante()).id === g.id) window.scrollTo({ top: 0, behavior: 'smooth' });
    /* La PREMIÈRE VUE VISIBLE du bloc, pas la première tout court : en mode
       particulier, « Allocation » menait à la note du jour, que ce mode
       masque. On arrivait sur un écran absent de sa propre navigation. */
    else afficher(g.vues.find(v => !vueMasquee(v)) || g.vues[0]);
  });

  /* --- Actions de dossier, sur téléphone ---
     La feuille ne duplique pas les gestionnaires : elle relaie le clic
     aux vrais boutons de l'en-tête, qui restent la seule définition. */
  $('#btn-dossier-mobile').onclick = () => {
    /* La feuille porte aussi les blocs secondaires — les données n'ont pas
       d'entrée dans la barre basse, il leur faut un chemin ailleurs. */
    const secondaires = GROUPES.filter(g => g.secondaire).map(g =>
      '<div class="barre-actions" style="margin:0 0 8px">' +
        '<button class="bouton secondaire" style="flex:1" data-aller="' + g.vues[0] + '">' +
        echapper(g.libelle) + '</button></div>').join('');

    ouvrirFeuille('Dossier',
      ['btn-sauver', 'btn-exporter', 'btn-importer', 'btn-reinit'].map(id =>
        '<div class="barre-actions" style="margin:0 0 8px">' +
          '<button class="bouton' + (id === 'btn-sauver' ? '' : ' secondaire') +
          '" style="flex:1" data-relais="' + id + '">' +
          echapper($('#' + id).textContent) + '</button></div>').join('') +
      (secondaires ? '<div style="border-top:1px solid var(--ligne);margin:12px 0 10px"></div>' +
        secondaires : ''));
  };

  /* --- Feuille de détail --- */
  $('#feuille-fermer').onclick = fermerFeuille;
  $('#feuille').addEventListener('click', e => { if (e.target.id === 'feuille') fermerFeuille(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerFeuille(); });

  brancherBalayage();

  document.addEventListener('click', e => {
    if (e.target.closest('#btn-avis-lu')) {
      Etat.avisTactiqueLu = true;
      sauver(true); rendreAllocation();
      return;
    }

    const relais = e.target.closest('[data-relais]');
    if (relais) { fermerFeuille(); $('#' + relais.dataset.relais).click(); return; }

    /* Le bouton n'apparaît que sur un dossier vierge, mais la garde reste :
       un rendu concurrent, un retour arrière du navigateur, et le clic
       arriverait sur un dossier commencé. Écraser le travail de quelqu'un
       sans le lui demander n'est pas rattrapable. */
    if (e.target.closest('#btn-decouvrir')) {
      if (dossierEntame() &&
          !confirm('Un dossier est déjà commencé. Le remplacer par le dossier exemple ?')) return;
      remplirExemple(true);
      rendre('accueil'); majNav();
      notifier('Dossier exemple chargé — 250 000 € en assurance-vie, profil dynamique.');
      return;
    }

    const pastille = e.target.closest('[data-poche]');
    if (pastille) { ouvrirPoche(pastille.dataset.poche); return; }

    if (e.target.closest('#btn-charger-perfs')) {
      chargerCatalogue(() => rendreUnivers());
      return;
    }

    const fiche = e.target.closest('[data-fiche]');
    if (fiche) { ouvrirFicheEtf(fiche.dataset.fiche); return; }

    const choix = e.target.closest('[data-mode]');
    if (choix) { choisirMode(choix.dataset.mode); return; }

    /* Bascule sur le catalogue depuis le bandeau « non placés ». Le même
       geste que le sélecteur de source, avec la question posée avant. */
    if (e.target.closest('#btn-passer-catalogue')) {
      if (!confirm(T('supports.catalogue.confirmation'))) return;
      Etat.filtres.sourceUnivers = 'catalogue';
      sauver(true);
      if (Catalogue.etat === 'absent') chargerCatalogue();
      else rendre(vueCourante());
      notifier('Sélection basculée sur le catalogue européen — les supports retenus porteront « à vérifier ».',
               'info', { libelle: 'Ouvrir l\'univers', vue: 'univers' });
      return;
    }

    const aller = e.target.closest('[data-aller]');
    if (aller) { fermerFeuille(); afficher(aller.dataset.aller); return; }

    const ajoutCat = e.target.closest('[data-catalogue-ajout]');
    if (ajoutCat) { ajouterDepuisCatalogue(ajoutCat.dataset.catalogueAjout); return; }

    const dateSit = e.target.closest('[data-situation-date]');
    if (dateSit) {
      e.preventDefault();
      Etat.situationDate = dateSit.dataset.situationDate;
      sauver(true); afficher('situation'); return;
    }
    const figer = e.target.closest('[data-figer]');
    if (figer) {
      const d = figer.dataset.figer;
      figerSituation(d, 'manuelle');
      sauver(true); rendreSituation();
      notifier('Situation au ' + dateFr(d) + ' figée.');
      return;
    }
    /* Confirmer un achat ne change QUE la possession. Le montant et la
       quantité restent ceux de la recommandation : c'est ce qui a été passé.
       La plus-value latente part de zéro, l'achat vient d'avoir lieu. */
    const conf = e.target.closest('[data-confirmer]');
    if (conf) {
      const ligne = Etat.detention.find(l => l.isin === conf.dataset.confirmer);
      if (ligne) {
        ligne.possession = 'detenu';
        sauver(true); rendreSituation();
        notifier('Achat confirmé : ' + ligne.libelle + '.', 'succes');
      }
      return;
    }

    const degeler = e.target.closest('[data-degeler]');
    if (degeler) {
      const d = degeler.dataset.degeler;
      Etat.situations = Etat.situations.filter(s => s.date !== d);
      sauver(true); rendreSituation();
      notifier('Relevé du ' + dateFr(d) + ' supprimé.', 'info');
      return;
    }

    if (e.target.closest('#btn-tout-confirmer')) {
      const n = lignesAInvestir().length;
      Etat.detention.forEach(l => { if (possessionDe(l) === 'a-investir') l.possession = 'detenu'; });
      sauver(true); rendreSituation();
      notifier(n + ' achat' + (n > 1 ? 's confirmés' : ' confirmé') + '.', 'succes');
      return;
    }

    /* La confirmation nomme ce qui va être écrasé. « Êtes-vous sûr ? » ne dit
       rien ; « 8 lignes détenues seront remplacées » se lit et se refuse. */
    if (e.target.closest('#btn-reinit-suivi')) {
      const sel = selectionCourante();
      if (!sel || !sel.lignes.length) {
        notifier('Aucune allocation cible : complétez le questionnaire.', 'alerte'); return;
      }
      const detenues = lignesDetenues().length;
      const avertissement = detenues
        ? detenues + ' ligne' + (detenues > 1 ? 's détenues seront remplacées' : ' détenue sera remplacée') +
          ' par les ' + sel.lignes.length + ' supports de l\'allocation cible, à investir. ' +
          'Les quantités et plus-values latentes saisies seront perdues.'
        : 'Le suivi sera reconstruit sur les ' + sel.lignes.length + ' supports de l\'allocation cible.';
      if (!confirm('Réinitialiser le suivi ?\n\n' + avertissement)) return;
      Etat.detention = [];
      Etat.suiviAmorce = true;
      synchroniserSuivi();
      sauver(true); rendreSituation();
      notifier('Suivi réinitialisé sur l\'allocation cible.', 'info');
      return;
    }

    const supprD = e.target.closest('[data-supprimer-detention]');
    if (supprD) {
      Etat.detention.splice(Number(supprD.dataset.supprimerDetention), 1);
      sauver(true); rendre('arbitrages'); return;
    }
    const supprE = e.target.closest('[data-supprimer-etf]');
    if (supprE) {
      if (confirm('Supprimer ce support de l\'univers ?')) {
        Etat.univers.splice(Number(supprE.dataset.supprimerEtf), 1);
        sauver(true); rendre('univers');
      }
      return;
    }
    const supprJ = e.target.closest('[data-supprimer-journal]');
    if (supprJ) {
      Etat.journal.splice(Number(supprJ.dataset.supprimerJournal), 1);
      sauver(true); rendre('journal'); return;
    }
  });

  /* --- Saisies --- */
  document.addEventListener('input', e => {
    const t = e.target;

    if (t.dataset.identite) {
      const champ = IDENTITE.find(f => f.id === t.dataset.identite);
      Etat.identite[t.dataset.identite] = champ && champ.type === 'number' ? Number(t.value) : t.value;
      if (t.dataset.identite === 'enveloppe') rendreIdentite();
      sauver(true); return;
    }

    if (t.dataset.question !== undefined) {
      Etat.reponses[t.dataset.question] = Number(t.value);
      $$('label', t.closest('.options')).forEach(l => l.classList.toggle('choisi', l.contains(t) && t.checked));
      majProgression(); majNav(); sauver(true); return;
    }

    if (t.dataset.macro) {
      Etat.macroChoix[t.dataset.macro] = t.value;
      Etat.scenariosManuels = null;
      sauver(true); rendreMacro(); return;
    }

    if (t.dataset.scenario) {
      const m = macroCourante();
      const courant = Etat.scenariosManuels || Object.assign({}, m.probas);
      courant[t.dataset.scenario] = Number(t.value);
      Etat.scenariosManuels = courant;
      sauver(true); rendreMacro(); return;
    }

    if (t.dataset.detention !== undefined) {
      const i = Number(t.dataset.index);
      const champ = t.dataset.detention;
      Etat.detention[i][champ] = (champ === 'montant' || champ === 'pvLatente' || champ === 'quantite')
        ? Number(t.value) : t.value;
      if (champ === 'quantite' || champ === 'isin') {
        const c = cotation(Etat.detention[i].isin);
        const q = Number(Etat.detention[i].quantite) || 0;
        if (c && q > 0) {
          Etat.detention[i].montant = Math.round(q * c.cours);
          clearTimeout(window.__detTimer);
          window.__detTimer = setTimeout(() => rendre('arbitrages'), 500);
        }
      }
      if (champ === 'isin') {
        const ref = Etat.univers.find(x => x.isin === t.value);
        if (ref && !Etat.detention[i].libelle) Etat.detention[i].libelle = ref.nom;
      }
      $('#total-detention').textContent = euro(Etat.detention.reduce((a, l) => a + (Number(l.montant) || 0), 0));
      sauver(true); return;
    }

    if (t.dataset.etf !== undefined) {
      const e2 = Etat.univers[Number(t.dataset.index)];
      const champ = t.dataset.etf;
      if (champ === 'contratAV') {
        e2.contratsAV = t.value ? [t.value] : [];
        e2.enveloppes = t.value
          ? Array.from(new Set(e2.enveloppes.concat(['AV'])))
          : e2.enveloppes.filter(x => x !== 'AV');
      } else if (t.type === 'checkbox') {
        e2[champ] = t.checked;
        /* Un référencement coché sans date ni origine ne vaut rien six mois
           plus tard : on horodate la case comme le fait le rapprochement. */
        if (champ === 'verifie') {
          if (t.checked) {
            e2.verifieLe = aujourdhuiISO();
            e2.verifieSource = ($('#contrat-nom') && $('#contrat-nom').value.trim()) || 'Contrôle manuel';
          } else {
            delete e2.verifieLe; delete e2.verifieSource;
          }
          rendreUnivers();
        }
        if (champ === 'pea') {
          e2.enveloppes = t.checked
            ? Array.from(new Set(e2.enveloppes.concat(['PEA'])))
            : e2.enveloppes.filter(x => x !== 'PEA');
        }
      } else if (champ === 'morningstar') {
        e2.morningstar = t.value === '' ? null : Number(t.value);
      } else if (champ === 'ter' || champ === 'encours') {
        e2[champ] = Number(t.value);
      } else {
        e2[champ] = t.value;
      }
      if (champ === 'poche') e2.classe = MoteurSelection.classeDePoche(t.value);
      sauver(true); return;
    }

    if (t.dataset.revenu) {
      const champ = t.dataset.revenu;
      Etat.revenus[champ] = (champ === 'frequence') ? t.value
        : (champ === 'couple') ? (t.value === '1')
        : Number(t.value);
      sauver(true);
      rendreRevenusContenuSeul();
      majNav();
      return;
    }

    if (t.dataset.serie) {
      Etat.historique[t.dataset.serie].valeurs[Number(t.dataset.annee)] = Number(t.value);
      sauver(true);
      clearTimeout(window.__btTimer);
      window.__btTimer = setTimeout(() => rendreBacktest(), 400);
      return;
    }

    if (['bt-capital', 'bt-frais', 'bt-retrait'].indexOf(t.id) >= 0) {
      Etat.backtest[t.id.slice(3)] = Number(t.value);
      sauver(true);
      clearTimeout(window.__btTimer);
      window.__btTimer = setTimeout(() => rendreBacktest(), 300);
      return;
    }

    if (t.dataset.filtreUnivers) {
      Etat.filtreUnivers[t.dataset.filtreUnivers] = t.value;
      rendreUnivers(); return;
    }

    if (t.id === 'f-apport') { Etat.apport = Number(t.value); sauver(true); rendreArbitrages(); return; }
    if (t.id === 'f-intensite') {
      Etat.filtres.intensite = Number(t.value) / 100; majLibelleIntensite(); sauver(true); return;
    }
    if (t.id === 'f-encours') { Etat.filtres.encoursMin = Number(t.value); sauver(true); return; }
    if (t.id === 'f-ter') { Etat.filtres.terMax = Number(t.value); sauver(true); return; }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.serieSource) {
      Etat.historique[t.dataset.serieSource].source = t.checked ? 'source' : 'estime';
      sauver(true); rendreBacktest(); return;
    }
    if (t.id === 'opt-annexe-methode') {
      Etat.rapport.annexeMethode = t.checked;
      sauver(true); rendreRapport(); return;
    }
    if (t.dataset.controle) {
      const ctrl = controlesRapport().find(x => x.id === t.dataset.controle);
      if (!ctrl) return;
      if (!Etat.rapport) Etat.rapport = {};
      if (!Etat.rapport.controles) Etat.rapport.controles = {};
      /* On enregistre l'état relu, pas un simple oui : c'est lui qui permettra
         de laisser tomber la coche si le dossier bouge ensuite. */
      if (t.checked) Etat.rapport.controles[ctrl.id] = ctrl.signature;
      else delete Etat.rapport.controles[ctrl.id];
      sauver(true); rendreControlesRapport(); return;
    }
    if (t.id === 'f-mode') {
      Etat.mode = t.value;
      sauver(true);
      poserNav(); poserTitres(); poserMots(); poserOuvertures(); poserBarresParcours(); majNav();
      rendre('client');
      notifier('Mode « ' + (MODES.find(m => m.id === t.value) || {}).bouton + ' ».', 'info');
      return;
    }
    if (t.id === 'bt-allocation') { Etat.backtest.allocation = t.value; sauver(true); rendreBacktest(); return; }
    if (t.id === 'f-etoiles') { Etat.filtres.etoilesMin = Number(t.value); sauver(true); }
    if (t.id === 'f-synthetique') { Etat.filtres.exclureSynthetique = t.value === '1'; sauver(true); }
    if (t.id === 'f-source') {
      Etat.filtres.sourceUnivers = t.value;
      sauver(true);
      majLibelleSource();
      /* Un demi-mégaoctet ne se télécharge pas sans qu'on l'ait demandé :
         le catalogue n'arrive qu'au moment où il devient la source. */
      if (t.value === 'catalogue' && Catalogue.etat === 'absent') chargerCatalogue();
      else rendre(vueCourante());
      return;
    }
    if (t.id === 'f-contrat') {
      /* Restreindre la sélection à un univers dont rien n'est validé la
         viderait entièrement : le filtre se refuse plutôt que de rendre
         une allocation vide sans dire pourquoi. */
      if (t.value === '1' && !Etat.univers.some(x => x.verifie)) {
        t.value = '0';
        notifier('Aucun support n\'est encore validé au contrat : rapprochez d\'abord la liste des supports.',
                 'alerte', { libelle: 'Ouvrir l\'univers ETF', vue: 'univers' });
        return;
      }
      Etat.filtres.contratSeulement = t.value === '1'; sauver(true);
    }
    if (t.dataset.identite === 'enveloppe' || t.dataset.identite === 'contratAV') { rendreIdentite(); }
  });

  /* --- Boutons globaux --- */
  $('#btn-sauver').onclick = () => sauver();
  $('#btn-reinit').onclick = () => {
    if (!confirm('Effacer le dossier en cours ? L\'univers ETF et le journal seront également réinitialisés.')) return;
    localStorage.removeItem(CLE_STOCKAGE);
    location.reload();
  };
  $('#btn-exporter').onclick = () => telecharger(
    'dossier-' + (Etat.identite.nom || 'client').replace(/\W+/g, '-').toLowerCase() + '.json',
    JSON.stringify(Etat, null, 2));
  $('#btn-importer').onclick = () => $('#fichier-import').click();
  $('#fichier-import').onchange = e => lireFichier(e.target.files[0], d => {
    Object.keys(d).forEach(k => { if (Etat[k] !== undefined) Etat[k] = d[k]; });
    /* Un dossier exporté avant que le mode existe n'en porte aucun : il a été
       construit par un conseiller, et s'ouvre comme tel. */
    if (!Etat.mode) Etat.mode = MODE_DEFAUT;
    poserNav(); poserTitres(); poserMots(); poserOuvertures();
    sauver(true); afficher('client'); notifier('Dossier importé.');
  });

  $('#btn-imprimer').onclick = () => {
    $('#vue-rapport').classList.add('impression');
    window.print();
    setTimeout(() => $('#vue-rapport').classList.remove('impression'), 500);
  };

  $('#btn-ajouter-ligne').onclick = () => {
    Etat.detention.push({ isin: '', libelle: '', montant: 0, pvLatente: 0 });
    sauver(true); rendreDetention();
  };

  $('#btn-coller-valos').onclick = () => {
    const b = $('#bloc-valos');
    b.hidden = !b.hidden;
    if (!b.hidden) $('#zone-valos').focus();
  };
  $('#btn-annuler-valos').onclick = () => { $('#bloc-valos').hidden = true; $('#zone-valos').value = ''; };
  $('#btn-appliquer-valos').onclick = () => {
    const res = importerValorisations($('#zone-valos').value);
    if (!res.lignes.length) { notifier('Aucune ligne exploitable : vérifiez le format ISIN ; montant.', 'erreur'); return; }
    Etat.detention = res.lignes;
    sauver(true);
    $('#bloc-valos').hidden = true; $('#zone-valos').value = '';
    rendre('arbitrages');
    notifier(res.lignes.length + ' ligne(s) mises à jour' +
      (res.ignorees.length ? ', ' + res.ignorees.length + ' ligne(s) ignorée(s)' : '') + '.');
  };

  $('#btn-revaloriser').onclick = () => {
    const r = revaloriser();
    if (!r.lignes && !r.sansCours.length) {
      notifier('Renseignez une quantité sur au moins une ligne pour revaloriser automatiquement.', 'alerte');
      return;
    }
    sauver(true); rendre('arbitrages');
    notifier(r.lignes + ' ligne(s) revalorisée(s)' +
      (r.sansCours.length ? ' · sans cours : ' + r.sansCours.join(', ') : '') + '.');
  };

  $('#btn-rapprocher').onclick = () => {
    const texte = $('#zone-contrat').value;
    if (!texte.trim()) { notifier('Collez d\'abord la liste des supports du contrat.', 'alerte'); return; }
    Rapprochement.rapport = MoteurContrat.rapprocher(Etat.univers, texte);
    rendreRapprochement();
    $('#rapprochement-contenu').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  $('#btn-vider-contrat').onclick = () => {
    $('#zone-contrat').value = '';
    Rapprochement.rapport = null;
    rendreRapprochement();
  };

  const cocherAffiches = valeur => {
    const liste = universFiltre();
    if (!liste.length) { notifier('Aucun support affiché.', 'alerte'); return; }
    if (liste.length > 1 && !confirm((valeur ? 'Cocher' : 'Décocher') + ' « Contrat » sur les ' +
        liste.length + ' support(s) affichés ?')) return;
    const source = ($('#contrat-nom').value.trim()) || 'Contrôle manuel';
    liste.forEach(e => {
      e.verifie = valeur;
      if (valeur) { e.verifieLe = aujourdhuiISO(); e.verifieSource = source; }
      else { delete e.verifieLe; delete e.verifieSource; }
    });
    sauver(true); rendre('univers'); majNav();
    notifier(liste.length + ' support(s) ' + (valeur ? 'validés' : 'invalidés') + ' au contrat.');
  };
  $('#btn-cocher-contrat').onclick = () => cocherAffiches(true);
  $('#btn-decocher-contrat').onclick = () => cocherAffiches(false);

  $('#btn-ajouter-etf').onclick = () => {
    Etat.univers.unshift({
      isin: '', ticker: '', nom: 'Nouveau support', emetteur: '',
      classe: 'actions', poche: 'act-monde', ter: 0.20, encours: 500, morningstar: null, sri: 4,
      replication: 'Physique', devise: 'EUR', hedge: false, capitalisation: true, isr: false,
      pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
      donneesLe: null, donneesSource: ''
    });
    sauver(true); rendreUnivers();
  };
  $('#btn-exporter-univers').onclick = () => telecharger('univers-etf.json', JSON.stringify(Etat.univers, null, 2));
  $('#btn-importer-univers').onclick = () => $('#fichier-univers').click();
  $('#fichier-univers').onchange = e => lireFichier(e.target.files[0], d => {
    if (!Array.isArray(d)) { notifier('Le fichier doit contenir un tableau d\'ETF.', 'erreur'); return; }
    Etat.univers = d; sauver(true); rendreUnivers(); notifier(d.length + ' supports importés.');
  });
  $('#btn-restaurer-univers').onclick = () => {
    if (!confirm('Remplacer l\'univers actuel par l\'univers livré avec l\'application ?')) return;
    Etat.univers = JSON.parse(JSON.stringify(ETF_UNIVERS));
    sauver(true); rendreUnivers();
  };

  $('#btn-reset-scenarios').onclick = () => { Etat.scenariosManuels = null; sauver(true); rendreMacro(); };

  $('#btn-exporter-historique').onclick = () => {
    const lignes = ['poche;libelle;' + ANNEES_HISTORIQUE.join(';') + ';source;reference'];
    Object.keys(Etat.historique).forEach(p => {
      const s = Etat.historique[p];
      lignes.push([p, LIBELLES_POCHES[p] || p].concat(s.valeurs)
        .concat([s.source, (s.reference || '').replace(/;/g, ',')]).join(';'));
    });
    telecharger('series-historiques.csv', lignes.join('\n'));
  };
  $('#btn-importer-historique').onclick = () => $('#fichier-historique').click();
  $('#fichier-historique').onchange = e => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const res = importerSeries(lecteur.result);
      if (!res.reprises) { notifier('Aucune série reconnue. Attendu : poche;libelle;' + ANNEES_HISTORIQUE.join(';'), 'erreur'); return; }
      sauver(true); rendreBacktest();
      notifier(res.reprises + ' série(s) mises à jour' + (res.inconnues.length ? ', ' + res.inconnues.length + ' poche(s) inconnue(s)' : '') + '.');
    };
    lecteur.readAsText(fichier);
  };
  $('#btn-restaurer-historique').onclick = () => {
    if (!confirm('Remplacer les séries actuelles par celles livrées avec l\'application ?')) return;
    Etat.historique = JSON.parse(JSON.stringify(HISTORIQUE_POCHES));
    sauver(true); rendreBacktest();
  };

  $('#lien-remplir-demo').onclick = e => {
    e.preventDefault();
    remplirExemple(false);
    rendreQuestionnaire(); majNav();
    notifier('Questionnaire pré-rempli à titre de démonstration.');
  };
}

/**
 * Analyse un collage de relevé : « ISIN ; montant » ou « ISIN ; quantité ; VL ».
 * Accepte les séparateurs ; , tabulation, les espaces de milliers et la virgule décimale.
 */
function importerValorisations(texte) {
  const lignes = [], ignorees = [];
  const nombre = s => {
    const n = parseFloat(String(s).replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  String(texte || '').split(/\r?\n/).forEach(brut => {
    if (!brut.trim()) return;
    const isin = (brut.match(/\b[A-Z]{2}[0-9A-Z]{9}[0-9]\b/) || [])[0];
    if (!isin) { ignorees.push(brut); return; }

    const champs = brut.split(/[;\t]|,(?=\s*\S*[A-Za-z])/).map(x => x.trim()).filter(Boolean);
    const nombres = champs.filter(x => x !== isin && x.indexOf(isin) < 0).map(nombre).filter(n => n !== null && n > 0);

    let montant = null;
    if (nombres.length === 1) montant = nombres[0];
    else if (nombres.length >= 2) montant = nombres[0] * nombres[1];   // quantité × VL
    if (montant === null) { ignorees.push(brut); return; }

    const ref = Etat.univers.find(e => e.isin === isin);
    const existante = Etat.detention.find(l => l.isin === isin);
    lignes.push({
      isin,
      libelle: (existante && existante.libelle) || (ref ? ref.nom : isin),
      montant: Math.round(montant),
      quantite: nombres.length >= 2 ? nombres[0] : (existante ? existante.quantite : undefined),
      pvLatente: existante ? (Number(existante.pvLatente) || 0) : 0
    });
  });

  return { lignes, ignorees };
}

/** Import CSV de séries : poche;libellé;an1;an2;…  (le libellé est facultatif). */
function importerSeries(texte) {
  let reprises = 0; const inconnues = [];
  const nombre = s => {
    const n = parseFloat(String(s).replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  String(texte || '').split(/\r?\n/).forEach((brut, i) => {
    if (!brut.trim()) return;
    const champs = brut.split(/[;\t]/).map(x => x.trim());
    const poche = champs[0];
    if (!poche || poche === 'poche') return;
    if (!Etat.historique[poche] && !LIBELLES_POCHES[poche]) { inconnues.push(poche); return; }

    const valeurs = champs.slice(1).map(nombre).filter(n => n !== null).slice(0, ANNEES_HISTORIQUE.length);
    if (valeurs.length !== ANNEES_HISTORIQUE.length) { inconnues.push(poche); return; }

    const source = /source/i.test(brut) ? 'source' : (Etat.historique[poche] || {}).source || 'estime';
    Etat.historique[poche] = {
      valeurs, source,
      reference: (Etat.historique[poche] || {}).reference || 'Série importée',
      url: (Etat.historique[poche] || {}).url
    };
    reprises++;
  });

  return { reprises, inconnues };
}

function telecharger(nom, contenu) {
  const blob = new Blob([contenu], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
}

function lireFichier(fichier, cb) {
  if (!fichier) return;
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try { cb(JSON.parse(lecteur.result)); }
    catch (err) { notifier('Fichier illisible : ' + err.message, 'erreur'); }
  };
  lecteur.readAsText(fichier);
}

/* ============================================================
   DÉMARRAGE
   ============================================================ */

/**
 * Injecte les performances issues des cours de marché dans les séries
 * du backtest. Chaque année reçoit sa provenance, ce qui permet
 * d'afficher honnêtement la part réellement sourcée.
 */
function injecterCoursMarche() {
  if (typeof PERFS_MARCHE === 'undefined') return 0;
  let remplacees = 0;
  Object.keys(Etat.historique).forEach(poche => {
    const s = Etat.historique[poche];
    if (!s.provenance) s.provenance = ANNEES_HISTORIQUE.map(() => s.source === 'source' ? 'source' : 'estime');
    const m = PERFS_MARCHE[poche];
    if (!m) return;
    ANNEES_HISTORIQUE.forEach((an, i) => {
      const v = m.perfs[String(an)];
      if (v === undefined) return;
      s.valeurs[i] = v;
      s.provenance[i] = 'marche';
      remplacees++;
    });
    s.instrument = m.nom;
    s.mic = m.mic;
  });
  return remplacees;
}

/* ============================================================
   VERSION PÉRIMÉE DANS LE CACHE
   -------------------------------------------------------------
   Les numéros de version des scripts et de la feuille de style
   vivent DANS index.html. Si le navigateur garde index.html, il
   garde aussi les anciens numéros : le cache-buster ne buste
   plus rien et l'application reste indéfiniment à sa version
   d'hier. Safari sur iPhone est particulièrement tenace.

   D'où ce contrôle. `version.json` est le seul fichier demandé
   hors cache ; son marqueur est comparé à celui que porte le
   `<script>` de app.js — c'est-à-dire à la version réellement
   chargée. S'ils divergent, on recharge une fois sur une adresse
   neuve, ce qui oblige le navigateur à redemander index.html.

   Le rechargement ne peut pas boucler : l'adresse porte le
   marqueur visé, et un second passage sur la même valeur
   n'entreprend rien — il le dit, au lieu de recharger sans fin.
   ============================================================ */

function versionChargee() {
  const s = document.querySelector('script[src*="js/app.js"]');
  const m = s && s.src.match(/[?&]v=(\d+)/);
  return m ? m[1] : null;
}

function verifierVersion() {
  /* Ouverte par double-clic (file://), l'application n'a pas le droit de
     faire un fetch — et n'a aucun cache serveur à contourner. */
  if (location.protocol.indexOf('http') !== 0) return;

  const chargee = versionChargee();
  if (!chargee) return;

  fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      if (!d || !d.version || d.version === chargee) return;
      if (location.search.indexOf('maj=' + d.version) >= 0) {
        notifier('Version ' + d.version + ' publiée, mais le cache du navigateur ne la libère pas. ' +
          'Fermez l\'onglet et rouvrez l\'adresse.', 'alerte');
        return;
      }
      location.replace(location.pathname + '?maj=' + d.version);
    })
    .catch(() => { /* hors ligne : garder ce qu'on a est le bon choix */ });
}
