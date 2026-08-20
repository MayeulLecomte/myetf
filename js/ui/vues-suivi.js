/* =============================================================
   VUES — SUIVI
   -------------------------------------------------------------
   Le bloc Suivi : situation des placements et son tableau, relevés figés,
   comparaison avant/après arbitrage, revenus programmés, journal des revues.

   Déplacé depuis js/app.js sans une virgule de changement.
   ============================================================= */

const LIBELLES_STATUT = {
  seance:      { texte: '', classe: '' },
  anterieur:   { texte: 'séance antérieure', classe: 'gris' },
  actuel:      { texte: 'hors période', classe: 'orange' },
  montant:     { texte: 'montant saisi', classe: 'gris' },
  absent:      { texte: 'sans cours', classe: 'rouge' },
  /* Les trois états de la valorisation de repli. Les deux refus disent
     POURQUOI la ligne n'est pas valorisée : « sans cours » ne suffirait pas,
     puisqu'un cours existe — il est seulement inutilisable. */
  repli:       { texte: 'dernière clôture connue', classe: 'gris' },
  deviseAutre: { texte: 'cours dans une autre devise', classe: 'orange' },
  tropAncien:  { texte: 'relevé trop ancien', classe: 'orange' }
};

/* `actions` n'est vrai que sur le relevé vivant : un relevé figé est un
   constat passé, on n'y confirme plus rien. */
/* ------------------------------------------------------------
   D'OÙ VIENNENT LES COURS DE CE TOTAL
   ------------------------------------------------------------
   Depuis que la clôture du catalogue sert de repli, un même total
   peut mêler des cours du jour relevés sur Euronext et une
   clôture datée d'un relevé fait à la main. Qui lit une valeur la
   croit du jour : il faut donc dire, sous le total, ce qui a
   valorisé quoi.

   Une seule définition, reprise à l'écran et dans le rapport
   imprimé — deux phrases finiraient par se contredire, et c'est
   celle du document remis qui compterait.
   ------------------------------------------------------------ */
function origineDesCours(s) {
  if (!s || !s.lignes.length) return '';
  const compte = f => s.lignes.filter(f).length;
  const duJour = compte(l => l.statut === 'seance' || l.statut === 'anterieur');
  const posterieur = s.alertes.horsPeriode;
  const auRepli = s.alertes.repli;
  const sansCours = s.alertes.enMontant + s.alertes.sansCours +
                    s.alertes.deviseAutre + s.alertes.tropAncien;

  const dateRepli = auRepli ? s.lignes.filter(l => l.statut === 'repli')
                                      .map(l => l.dateCours).filter(Boolean).sort().slice(-1)[0] : null;

  /* « 2 lignes aux cours du jour, 12 au relevé du 18 août » — le mot ne se
     répète que sur le premier terme, comme on l'écrirait à la main. */
  const bouts = [];
  const ajouter = (x, quoi) =>
    bouts.push(x + (bouts.length ? '' : ' ligne' + (x > 1 ? 's' : '')) + ' ' + quoi);
  if (duJour) ajouter(duJour, 'aux cours du jour');
  if (auRepli) ajouter(auRepli, 'au relevé du ' + (dateRepli ? dateFr(dateRepli) : 'catalogue'));
  if (posterieur) ajouter(posterieur, 'au dernier cours connu');
  if (sansCours) ajouter(sansCours, 'au montant saisi, sans cours');
  return bouts.join(', ') + '.';
}

function tableauSituation(s, actions) {
  const cible = new Set(); /* les ISIN encore proposés par la sélection */
  if (actions) {
    const sel = selectionCourante();
    if (sel) sel.lignes.forEach(l => cible.add(l.etf.isin));
  }
  return '<div class="tableau-defilant"><table><thead><tr>' +
    '<th>Support</th><th>ISIN</th><th class="num">Quantité</th><th class="num">Cours</th>' +
    '<th>Cours du</th><th class="num">Valorisation</th><th class="num">Poids</th>' +
    (actions ? '<th>Suivi</th>' : '') +
    '</tr></thead><tbody>' +
    s.lignes.map(l => {
      let st = LIBELLES_STATUT[l.statut] || LIBELLES_STATUT.seance;
      /* Un cours de la veille sur une date tombant un samedi n'est pas une
         réserve : on ne signale le report que s'il dépasse le week-end. */
      if (l.statut === 'anterieur' && l.dateCours &&
          (Date.parse(s.date) - Date.parse(l.dateCours)) / 86400000 <= 4) {
        st = LIBELLES_STATUT.seance;
      }
      return '<tr><td>' + (l.classe ? '<span class="pastille" style="background:' +
          (COULEURS_CLASSES[l.classe] || 'var(--gris-doux)') + '"></span>' : '') +
        '<button class="lien-support" data-fiche="' + echapper(l.isin) + '">' +
        echapper(l.libelle) + '</button>' +
        (st.texte ? ' <span class="badge ' + st.classe + '">' + st.texte + '</span>' : '') + '</td>' +
        '<td style="font-family:monospace;font-size:12px">' + echapper(l.isin) + '</td>' +
        '<td class="num">' + (l.quantite ? l.quantite.toLocaleString('fr-FR') : '—') + '</td>' +
        '<td class="num">' + (l.cours ? l.cours.toFixed(2).replace('.', ',') + ' €' : '—') + '</td>' +
        '<td style="font-size:12px;color:var(--gris-doux)">' + (l.dateCours ? dateFr(l.dateCours) : '—') + '</td>' +
        '<td class="num">' + euro(l.montant) + '</td>' +
        '<td class="num">' + pct(l.poids) + '</td>' +
        (actions ? '<td>' + celluleSuivi(l, cible) + '</td>' : '') +
        '</tr>';
    }).join('') +
    '</tbody><tfoot><tr><td colspan="5">Total</td>' +
    '<td class="num">' + euro(s.total) + '</td><td class="num">100,0 %</td>' +
    (actions ? '<td></td>' : '') + '</tr></tfoot></table></div>';
}

/* Trois états possibles pour une ligne du suivi vivant. « Hors cible » n'est
   pas une alerte : c'est une position réelle que la sélection ne retient
   plus, et c'est l'arbitrage qui dira quoi en faire. */
function celluleSuivi(l, cible) {
  if (l.possession === 'a-investir') {
    return '<button class="bouton petit" data-confirmer="' + echapper(l.isin) + '">Confirmer l\'achat</button>';
  }
  if (!cible.has(l.isin)) {
    return '<span class="badge orange" title="Détenu, mais la sélection ne le retient plus. ' +
      'Les arbitrages proposeront de le céder.">hors cible</span>';
  }
  return '<span class="badge vert">détenu</span>';
}

function repartitionSituation(s) {
  const ordre = ['actions', 'obligations', 'diversifiants', 'monetaire'];
  const classes = Object.keys(s.parClasse)
    .sort((a, b) => (ordre.indexOf(a) + 9) % 9 - (ordre.indexOf(b) + 9) % 9);
  if (!classes.length) return '';
  return '<div class="carte"><h3>Répartition par classe d\'actifs</h3>' +
    '<table><thead><tr><th>Classe</th><th class="num">Valorisation</th><th class="num">Poids</th></tr></thead><tbody>' +
    classes.map(cl => '<tr><td><span class="pastille" style="background:' +
      (COULEURS_CLASSES[cl] || 'var(--gris-doux)') + '"></span>' +
      echapper(LIBELLES_CLASSES[cl] || cl) + '</td>' +
      '<td class="num">' + euro(s.parClasse[cl].montant) + '</td>' +
      '<td class="num">' + pct(s.parClasse[cl].poids) + '</td></tr>').join('') +
    '</tbody></table></div>';
}

/* ------------------------------------------------------------
   L'ACCUSÉ DE RÉCEPTION D'UNE CONFIRMATION
   ------------------------------------------------------------
   « Vos arbitrages sont confirmés » doit se lire là où l'on
   ATTERRIT, pas là d'où l'on vient : c'est ce qui ferme la boucle
   proposer → confirmer → retrouver.

   Le lien de retour rend la détention d'avant. Il ne vit que dans
   cette page-ci : quitter la vue le consomme. Une annulation qui
   traverse les jours n'est plus une annulation, c'est une seconde
   vérité qui coexisterait avec la première.
   ------------------------------------------------------------ */
function bandeauConfirmation() {
  if (typeof Confirmation === 'undefined' || !Confirmation.bandeau) return '';
  return '<div class="message succes sans-impression"><strong>' +
    echapper(Confirmation.bandeau) + '</strong>' +
    (Confirmation.avant
      ? ' <button class="lien" id="btn-annuler-confirmation">' +
        echapper(T('arbitrages.annuler')) + '</button>'
      : '') +
    '</div>';
}

function rendreSituation() {
  const c = $('#situation-contenu');

  if (!Etat.detention.length) { c.innerHTML = etatVide('situation'); return; }

  const aujourd = aujourdhuiISO();
  const date = Etat.situationDate || aujourd;
  const figee = Etat.situations.find(s => s.date === date) || null;
  const s = situationCourante(date);
  const debut = debutHistorique();
  const arretes = MoteurSituation.datesReference(aujourd, debut, 4);
  const enQuantites = Etat.detention.filter(l => Number(l.quantite) > 0).length;
  const aInvestir = lignesAInvestir();
  const montantAInvestir = aInvestir.reduce((a, l) => a + (Number(l.montant) || 0), 0);

  c.innerHTML =
    /* Le bandeau de retour d'une confirmation d'arbitrages, avec son lien de
       retour en arrière. Il ne survit ni au rechargement ni à un passage par
       une autre vue : c'est un accusé de réception, pas un état du dossier. */
    bandeauConfirmation() +

    /* Le portefeuille arrive ici dès que la sélection existe. Tant que rien
       n'est confirmé, le total affiché n'est pas une valeur détenue : il faut
       le dire au-dessus du tableau, pas en note de bas de page. */
    (aInvestir.length
      ? '<div class="message info"><strong>' + aInvestir.length + ' ligne' +
        (aInvestir.length > 1 ? 's restent' : ' reste') + ' à investir</strong>, pour ' +
        euro(montantAInvestir) + '. Elles figurent ci-dessous au montant de l\'allocation cible : ' +
        'ce sont des recommandations, pas des positions. Confirmez chaque achat une fois passé — ' +
        'les arbitrages ne se déclencheront qu\'ensuite, sur la dérive.</div>'
      : '') +
    /* --- Choix de la date --- */
    '<div class="carte"><div class="filtres">' +
      '<div class="champ"><label for="situation-date">Situation au</label>' +
        '<input type="date" id="situation-date" value="' + date + '"' +
        (debut ? ' min="' + debut + '"' : '') + ' max="' + aujourd + '"></div>' +
      '<div class="champ" style="flex:1"><label>Arrêtés</label><div class="barre-actions" style="margin:0">' +
        '<button class="bouton secondaire" data-situation-date="' + aujourd + '">Aujourd\'hui</button>' +
        arretes.map(d => '<button class="bouton' + (d === date ? '' : ' secondaire') +
          '" data-situation-date="' + d + '">' + dateFr(d) + '</button>').join('') +
      '</div></div>' +
    '</div></div>' +

    /* --- Nature du relevé --- */
    (figee
      ? '<div class="message succes"><strong>Situation figée.</strong> Relevé enregistré le ' +
        dateFr(figee.figeeLe) + (figee.origine === 'automatique' ? ', à l\'échéance de l\'arrêté' : '') +
        '. Les quantités et les cours sont ceux de l\'enregistrement.</div>'
      : '<div class="message ' + (date === aujourd ? 'info' : 'alerte') + '">' +
        (date === aujourd
          ? '<strong>Situation du jour.</strong> Calculée sur les quantités saisies et les derniers cours connus.'
          : '<strong>Situation reconstituée.</strong> Les quantités d\'aujourd\'hui sont revalorisées aux cours ' +
            'du ' + dateFr(date) + '. Elle n\'est exacte que si le portefeuille n\'a pas bougé depuis cette date.') +
        '</div>') +

    /* --- Réserves de calcul --- */
    ((s.alertes.horsPeriode || s.alertes.sansCours || s.alertes.enMontant ||
      s.alertes.deviseAutre || s.alertes.tropAncien)
      ? '<div class="message alerte"><strong>Réserves sur ce relevé.</strong><ul>' +
        (s.alertes.horsPeriode ? '<li>' + s.alertes.horsPeriode + ' ligne(s) valorisée(s) au dernier cours connu, ' +
          'postérieur à la date demandée : ces supports ne sont pas cotés sur Euronext et n\'ont pas d\'historique.</li>' : '') +
        (s.alertes.sansCours ? '<li>' + s.alertes.sansCours + ' ligne(s) sans aucun cours : le montant saisi est repris tel quel.</li>' : '') +
        /* Un cours existe, mais il est inutilisable : le dire, plutôt que de
           laisser croire qu'il n'y en a pas. */
        (s.alertes.deviseAutre ? '<li>' + s.alertes.deviseAutre + ' ligne(s) valorisée(s) au montant cible — ' +
          'cours dans une autre devise. L\'application ne convertit pas : elle n\'a pas de taux de change.</li>' : '') +
        (s.alertes.tropAncien ? '<li>' + s.alertes.tropAncien + ' ligne(s) valorisée(s) au montant cible — ' +
          'relevé trop ancien (plus de ' + MoteurSituation.AGE_MAX_REPLI + ' jours).</li>' : '') +
        /* Une ligne encore à investir n'a pas été « saisie en montant » : elle
           porte le montant de l'allocation cible, faute de cours connu pour
           son ISIN. Envoyer l'utilisateur saisir une quantité pour un support
           qu'il n'a pas acheté n'a aucun sens — on dit ce qui est. */
        (s.alertes.enMontant ? '<li>' + s.alertes.enMontant + ' ligne(s) sans quantité : leur valeur ne suit ' +
          'pas les cours. ' + (aInvestir.length
            ? 'Pour les lignes encore à investir, c\'est le montant de l\'allocation cible qui est repris ; '
              + 'la quantité se saisit une fois l\'achat passé.'
            : 'Saisissez la quantité dans « ' + echapper(T('vue.arbitrages.nav')) +
              ' » pour qu\'elles se revalorisent.') + '</li>' : '') +
        '</ul></div>' : '') +

    '<div class="grille quatre">' +
      kpi(euro(s.total), 'Valeur du portefeuille', dateFr(date)) +
      /* Un décompte de ce que porte le dossier, pas un résultat de
         calcul. Les trois autres — valeur, plus-value, couverture —
         sont produites, et restent blanches. */
      kpi(String(s.lignes.length - aInvestir.length), 'Lignes détenues',
        aInvestir.length ? aInvestir.length + ' encore à investir'
                         : enQuantites + ' suivie(s) en quantités',
        '', 'menthe') +
      kpi(euro(s.pvLatente), 'Plus-value latente', 'saisie dans le portefeuille') +
      kpi(s.fiable ? 'Complète' : 'Partielle', 'Couverture des cours',
        s.fiable ? 'toutes les lignes valorisées à la date'
                 : (s.alertes.horsPeriode + s.alertes.sansCours) + ' ligne(s) sans cours de la période') +
    '</div>' +

    /* Sous le total, et pas dans un sous-titre d'indicateur : c'est une
       réserve sur le chiffre au-dessus, elle doit se lire avec lui. */
    '<p class="intro origine-cours">' + echapper(origineDesCours(s)) + '</p>' +

    '<div class="carte"><h3>Détail des positions</h3>' + tableauSituation(s, !figee) +
      '<div class="barre-actions">' +
        (aInvestir.length
          ? '<button class="bouton" id="btn-tout-confirmer">Confirmer les ' + aInvestir.length +
            ' achat' + (aInvestir.length > 1 ? 's' : '') + '</button>'
          : '') +
        (figee
          ? '<button class="bouton secondaire" data-degeler="' + date + '">Supprimer ce relevé figé</button>'
          : '<button class="bouton' + (aInvestir.length ? ' secondaire' : '') +
            '" data-figer="' + date + '">Figer cette situation</button>') +
        '<button class="bouton secondaire" id="btn-imprimer-situation">Imprimer / enregistrer en PDF</button>' +
        '<button class="bouton secondaire" id="btn-reinit-suivi">Réinitialiser le suivi sur l\'allocation cible</button>' +
      '</div>' +
      '<p class="intro" style="font-size:11px;margin-top:6px">Figer un relevé l\'enregistre dans ce navigateur ' +
      'avec ses quantités et ses cours : il ne bougera plus, même si le portefeuille change ensuite. ' +
      'Les arrêtés du 30 juin et du 31 décembre se figent d\'eux-mêmes à leur échéance.</p>' +
    '</div>' +

    repartitionSituation(s) +
    blocAvantApres() +
    blocRelevesFiges();

  $('#situation-date').onchange = e => {
    Etat.situationDate = e.target.value || aujourdhuiISO();
    sauver(true); rendreSituation();
  };
  const btnImp = $('#btn-imprimer-situation');
  if (btnImp) btnImp.onclick = () => {
    const vue = $('#vue-situation');
    vue.classList.add('impression');
    window.print();
    setTimeout(() => vue.classList.remove('impression'), 500);
  };
}

/** Comparaison du portefeuille actuel et de ce qu'il deviendrait après les ordres. */
function blocAvantApres() {
  const r = resultatProfil();
  if (!r) {
    return '<div class="carte"><h3>Avant et après arbitrage</h3>' +
      '<p class="intro">Le questionnaire doit être complété pour que l\'allocation cible, ' +
      'et donc les ordres, puissent être calculés.</p></div>';
  }

  const sel = selectionCourante();
  /* `lignesDetenues()` et non `Etat.detention` : une ligne encore à
     investir n'est pas détenue — voir dossier.js. */
  const analyse = MoteurArbitrage.analyser(
    lignesDetenues(), sel.lignes,
    { enveloppe: Etat.identite.enveloppe || 'AV', apport: apportDisponible() },
    universSelection()
  );
  if (!analyse) return '';

  const aujourd = aujourdhuiISO();
  const avant = MoteurSituation.valoriser(Etat.detention, aujourd, { univers: Etat.univers });
  const detentionApres = MoteurSituation.apresArbitrage(Etat.detention, analyse.ordres, Etat.univers);
  const apres = MoteurSituation.valoriser(detentionApres, aujourd, { univers: Etat.univers });

  if (analyse.aucunMouvement) {
    return '<div class="carte"><h3>Avant et après arbitrage</h3>' +
      '<p class="intro">Aucun mouvement n\'est proposé : chaque ligne est dans sa bande de tolérance. ' +
      'La situation après arbitrage serait identique à celle d\'aujourd\'hui.</p></div>';
  }

  const classes = ['actions', 'obligations', 'diversifiants', 'monetaire']
    .filter(cl => (avant.parClasse[cl] || apres.parClasse[cl]));

  const poids = (situation, cl) => (situation.parClasse[cl] || { poids: 0 }).poids;

  return '<div class="carte"><h3>Avant et après arbitrage</h3>' +
    '<p class="intro">Effet des ' + analyse.ordres.length + ' mouvement(s) proposés dans l\'onglet ' +
    '« Arbitrages »' + (analyse.apport ? ', apport de ' + euro(analyse.apport) + ' inclus' : '') + '.</p>' +

    '<div class="tableau-defilant"><table><thead><tr><th>Classe d\'actifs</th>' +
    '<th class="num">Avant</th><th class="num">Poids</th>' +
    '<th class="num">Après</th><th class="num">Poids</th><th class="num">Écart</th>' +
    '</tr></thead><tbody>' +
    classes.map(cl => {
      const ecart = poids(apres, cl) - poids(avant, cl);
      return '<tr><td><span class="pastille" style="background:' +
        (COULEURS_CLASSES[cl] || 'var(--gris-doux)') + '"></span>' + echapper(LIBELLES_CLASSES[cl] || cl) + '</td>' +
        '<td class="num">' + euro((avant.parClasse[cl] || {}).montant || 0) + '</td>' +
        '<td class="num">' + pct(poids(avant, cl)) + '</td>' +
        '<td class="num">' + euro((apres.parClasse[cl] || {}).montant || 0) + '</td>' +
        '<td class="num">' + pct(poids(apres, cl)) + '</td>' +
        '<td class="num">' + (Math.abs(ecart) < 0.05 ? '—' : signe(ecart)) + '</td></tr>';
    }).join('') +
    '</tbody><tfoot><tr><td>Total</td>' +
    '<td class="num">' + euro(avant.total) + '</td><td class="num">100,0 %</td>' +
    '<td class="num">' + euro(apres.total) + '</td><td class="num">100,0 %</td>' +
    '<td class="num">' + (analyse.apport ? '+' + euro(analyse.apport) : '—') + '</td></tr></tfoot></table></div>' +

    '<div class="grille deux" style="margin-top:16px">' +
      '<div><h4 style="margin:0 0 8px">Situation avant arbitrage</h4>' + tableauSituation(avant) + '</div>' +
      '<div><h4 style="margin:0 0 8px">Situation après arbitrage</h4>' + tableauSituation(apres) + '</div>' +
    '</div>' +

    '<p class="intro" style="font-size:11px;margin-top:10px">Les quantités d\'après arbitrage sont déduites ' +
    'des montants au dernier cours connu : elles seront arrondies à l\'exécution réelle. ' +
    'Fiscalité estimée sur les cessions : ' + euro(analyse.fiscalite.impotEstime) + '.</p>' +
    '</div>';
}

function blocRelevesFiges() {
  if (!Etat.situations.length) return '';
  return '<div class="carte"><h3>Relevés figés</h3>' +
    '<table><thead><tr><th>Date</th><th>Nature</th><th class="num">Valeur</th>' +
    '<th class="num">Lignes</th><th>Figé le</th><th></th></tr></thead><tbody>' +
    Etat.situations.map(s =>
      '<tr><td><a href="#" data-situation-date="' + s.date + '">' + dateFr(s.date) + '</a></td>' +
      '<td>' + (s.date.slice(5) === '12-31' || s.date.slice(5) === '06-30'
        ? echapper(MoteurSituation.libelleReference(s.date)) : 'Relevé ponctuel') +
        (s.origine === 'automatique' ? ' <span class="badge gris">automatique</span>' : '') + '</td>' +
      '<td class="num">' + euro(s.total) + '</td>' +
      '<td class="num">' + s.lignes.length + '</td>' +
      '<td style="font-size:12px;color:var(--gris-doux)">' + dateFr(s.figeeLe) + '</td>' +
      '<td><button class="bouton secondaire" data-degeler="' + s.date + '">✕</button></td></tr>').join('') +
    '</tbody></table></div>';
}

/* ============================================================
   VUE 10 — REVENUS
   ============================================================ */

const CHAMPS_REVENUS = [
  { id: 'besoin',        label: 'Revenu net souhaité', type: 'number', min: 0, pas: 50, suffixe: '€ par échéance' },
  { id: 'frequence',     label: 'Périodicité', type: 'select',
    options: Object.keys(MoteurRevenus.FREQUENCES).map(k => ({ valeur: k, label: MoteurRevenus.FREQUENCES[k].libelle })) },
  { id: 'coussinMois',   label: 'Coussin de sécurité en monétaire', type: 'number', min: 0, max: 60, pas: 6, suffixe: 'mois de revenus' },
  { id: 'anciennete',    label: 'Ancienneté de l\'enveloppe', type: 'number', min: 0, max: 40, pas: 1, suffixe: 'années' },
  { id: 'primesVersees', label: 'Total des versements effectués', type: 'number', min: 0, pas: 1000, suffixe: '€ — base de calcul de la part taxable' },
  { id: 'couple',        label: 'Situation fiscale', type: 'select',
    options: [{ valeur: '0', label: 'Personne seule' }, { valeur: '1', label: 'Couple soumis à imposition commune' }] }
];

function rendreRevenus() {
  rendreChampsRevenus();
  rendreRevenusContenuSeul();
}

function rendreChampsRevenus() {
  $('#champs-revenus').innerHTML = CHAMPS_REVENUS.map(f => {
    const val = Etat.revenus[f.id];
    let saisie;
    if (f.type === 'select') {
      saisie = '<select data-revenu="' + f.id + '">' + f.options.map(o =>
        '<option value="' + o.valeur + '"' + (String(val === true ? '1' : val === false ? '0' : val) === o.valeur ? ' selected' : '') +
        '>' + echapper(o.label) + '</option>').join('') + '</select>';
    } else {
      saisie = '<input type="number" data-revenu="' + f.id + '" value="' + (val || 0) + '"' +
        (f.min !== undefined ? ' min="' + f.min + '"' : '') + (f.max !== undefined ? ' max="' + f.max + '"' : '') +
        ' step="' + (f.pas || 1) + '">';
    }
    return '<div class="champ"><label>' + echapper(f.label) + '</label>' + saisie +
      (f.suffixe ? '<span class="suffixe">' + echapper(f.suffixe) + '</span>' : '') + '</div>';
  }).join('');
}

function rendreRevenusContenuSeul() {
  const c = $('#revenus-contenu');
  if (!c) return;
  const r = resultatProfil();
  if (!r) { c.innerHTML = etatVide('revenus'); return; }

  const parAn = MoteurRevenus.FREQUENCES[Etat.revenus.frequence].parAn;
  const besoinAnnuel = Number(Etat.revenus.besoin) * parAn;

  if (!besoinAnnuel) {
    c.innerHTML = '<div class="message info">Renseignez un revenu souhaité pour obtenir le plan de prélèvement, ' +
      'le coût fiscal et la projection de capital.</div>';
    return;
  }

  if (!Etat.detention.length) {
    c.innerHTML = '<div class="message alerte"><strong>Aucune détention saisie.</strong> ' +
      'Le plan de prélèvement s\'appuie sur le portefeuille réellement détenu. Rendez-vous dans l\'onglet ' +
      '« Arbitrages » : saisissez les lignes, ou cliquez sur « Partir de l\'allocation cible ».</div>';
    return;
  }

  const sel = selectionCourante();
  const metriques = MoteurAllocation.metriques(allocationCourante().classes);
  const plan = MoteurRevenus.planifier(Etat.detention, sel.lignes, {
    enveloppe: Etat.identite.enveloppe || 'AV',
    besoinAnnuel,
    frequence: Etat.revenus.frequence,
    coussinMois: Number(Etat.revenus.coussinMois),
    anciennete: Number(Etat.revenus.anciennete),
    couple: Etat.revenus.couple === true || Etat.revenus.couple === '1',
    primesVersees: Number(Etat.revenus.primesVersees) || 0,
    rendementEspere: metriques.rendement
  }, universSelection());

  if (!plan) { c.innerHTML = '<div class="message alerte">Détention insuffisante pour établir un plan.</div>'; return; }

  const etapes = {};
  CASCADE_REVENUS.forEach(e => { etapes[e.id] = e; });

  c.innerHTML =
    '<div class="grille quatre">' +
      /* Le besoin est saisi, pas calculé — c'est la donnée d'entrée de
         toute la vue. Les trois autres en découlent. */
      kpi(euro(plan.besoinParEcheance), 'Revenu par échéance',
          plan.frequence.libelle.toLowerCase() + ' · ' + euro(plan.besoinAnnuel) + ' / an',
          '', 'corail') +
      kpi(pct(plan.tauxRetrait, 2), 'Taux de retrait brut', 'soutenable jusqu\'à ' + pct(plan.projection.tauxSoutenable, 2)) +
      kpi(euro(plan.fiscalite.total), 'Fiscalité annuelle', 'soit ' + pct(plan.fiscalite.tauxEffectif) + ' du montant retiré') +
      kpi(plan.projection.epuisement ? 'An ' + plan.projection.epuisement : euro(plan.projection.capital30ans),
          plan.projection.epuisement ? 'Épuisement du capital' : 'Capital à 30 ans', 'hypothèses de rendement long terme') +
    '</div>' +

    plan.alertes.map(a => '<div class="message ' + a.niveau + '">' + echapper(a.texte) + '</div>').join('') +

    '<div class="carte"><h3>Sur quels supports prélever</h3>' +
      '<p class="intro" style="font-size:12px">Ordre appliqué : ' +
      CASCADE_REVENUS.map((e, i) => (i + 1) + '. ' + e.libelle).join(' → ') + '.</p>' +

      (plan.dividendesDisponibles > 0
        ? '<div class="message succes">' + euro(plan.dividendesDisponibles) + ' de coupons et dividendes sont encaissés ' +
          'chaque année sur le compte espèces, soit ' + plan.partCouverteParDividendes + ' % du besoin. ' +
          'Cette part est servie <strong>sans vendre aucune part</strong>. Le solde de ' + euro(plan.aPrelever) +
          ' est prélevé sur les supports ci-dessous.</div>'
        : (Etat.identite.enveloppe === 'AV'
          ? '<div class="message info">En assurance-vie, les coupons des unités de compte sont réinvestis dans le contrat : ' +
            'ils ne constituent pas un revenu disponible. Le revenu est servi par <strong>rachats partiels programmés</strong>, ' +
            'répartis ci-dessous. Le portefeuille génère par ailleurs ' + euro(plan.dividendesBruts) +
            ' de revenus internes par an, qui alimentent la valorisation du contrat.</div>'
          : '<div class="message info">Les supports retenus sont capitalisants : aucun revenu n\'est distribué en numéraire. ' +
            'Le revenu est servi par ventes partielles.</div>')) +

      '<div class="tableau-defilant"><table><thead><tr>' +
      '<th>Support à prélever</th><th>Poche</th><th class="num">Par échéance</th><th class="num">Par an</th>' +
      '<th class="num">% du capital</th>' + (Etat.identite.enveloppe === 'CTO' ? '<th class="num">PV réalisée</th>' : '') +
      '<th>Pourquoi celui-ci</th></tr></thead><tbody>' +
      plan.supports.map(s =>
        '<tr><td><span class="pastille" style="background:' + (COULEURS_CLASSES[s.classe] || '#999') + '"></span>' +
        echapper(s.libelle) + '</td>' +
        '<td>' + echapper(LIBELLES_POCHES[s.poche] || '—') + '</td>' +
        '<td class="num"><strong>' + euro(s.parEcheance) + '</strong></td>' +
        '<td class="num">' + euro(s.montant) + '</td>' +
        '<td class="num">' + pct(s.pct) + '</td>' +
        (Etat.identite.enveloppe === 'CTO' ? '<td class="num">' + (s.plusValue ? euro(s.plusValue) : '—') + '</td>' : '') +
        '<td style="font-size:12px;color:var(--gris-doux)">' +
          s.etapes.map(e => echapper((etapes[e] || {}).libelle || e)).join(' puis ') + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="2">Total prélevé</td>' +
      '<td class="num">' + euro(plan.supports.reduce((a, s) => a + s.parEcheance, 0)) + '</td>' +
      '<td class="num">' + euro(plan.supports.reduce((a, s) => a + s.montant, 0)) + '</td>' +
      '<td colspan="' + (Etat.identite.enveloppe === 'CTO' ? 3 : 2) + '"></td></tr></tfoot></table></div>' +

      '<div style="margin-top:14px">' + CASCADE_REVENUS.filter(e => plan.supports.some(s => s.etapes.indexOf(e.id) >= 0))
        .map(e => '<p style="font-size:12px;color:var(--gris-doux);margin:4px 0"><strong>' + echapper(e.libelle) +
          '</strong> — ' + echapper(e.explication) + '</p>').join('') + '</div>' +
    '</div>' +

    '<div class="grille deux">' +
      '<div class="carte"><h3>Coussin de sécurité</h3>' +
        '<div class="jauge"><div class="tete"><span>Monétaire détenu</span><strong>' + euro(plan.monetaireTotal) + '</strong></div>' +
        '<div class="piste"><div style="width:' + Math.min(100, 100 * plan.monetaireTotal / Math.max(1, plan.coussinCible)) +
        '%;background:' + (plan.coussinSuffisant ? 'var(--vert)' : 'var(--orange)') + '"></div></div></div>' +
        '<p class="intro" style="font-size:12px">Cible : ' + euro(plan.coussinCible) + ', soit ' + Etat.revenus.coussinMois +
        ' mois de revenus. Ce matelas évite de vendre des actions pendant une baisse : c\'est le principal facteur de survie ' +
        'd\'un portefeuille servant une rente. Il est automatiquement intégré à l\'allocation cible.</p>' +
      '</div>' +
      '<div class="carte"><h3>Fiscalité du retrait</h3>' +
        '<table><tbody>' + plan.fiscalite.detail.map(d =>
          '<tr><td style="color:var(--gris-doux)">' + echapper(d.libelle) + '</td>' +
          '<td class="num"><strong>' + euro(d.valeur) + '</strong></td></tr>').join('') +
        '<tr><td><strong>Coût fiscal annuel</strong></td><td class="num"><strong>' + euro(plan.fiscalite.total) +
        '</strong></td></tr></tbody></table>' +
        '<p class="intro" style="font-size:11px;margin-top:10px">' + echapper(plan.fiscalite.regime) + '</p>' +
        '<p class="intro" style="font-size:11px">Pour servir ' + euro(plan.besoinAnnuel) + ' net, il faut retirer environ ' +
        euro(plan.besoinAnnuel + plan.fiscalite.total) + ' brut (taux de retrait réel ' + pct(plan.tauxRetraitNet, 2) + ').</p>' +
      '</div>' +
    '</div>' +

    '<div class="carte"><h3>Projection du capital</h3>' +
      '<p class="intro" style="font-size:12px">Retrait indexé sur une inflation de ' + pct(FISCALITE_PARAMS.inflation * 100) +
      ', rendement annuel de ' + pct(metriques.rendement) + ' conforme au profil ' + r.profil.nom.toLowerCase() +
      '. Projection déterministe : elle ignore la séquence des rendements, qui est le principal risque d\'une phase de retrait.</p>' +
      '<table><thead><tr><th>Échéance</th><th class="num">Capital nominal</th><th class="num">Capital en pouvoir d\'achat</th></tr></thead><tbody>' +
      plan.projection.points.map(pt => '<tr><td>Dans ' + pt.an + ' ans</td>' +
        '<td class="num">' + euro(pt.capital) + '</td><td class="num">' + euro(pt.pouvoirAchat) + '</td></tr>').join('') +
      '</tbody></table>' +
    '</div>';
}

/* ============================================================
   VUE 9 — JOURNAL
   ============================================================ */

function rendreJournal() {
  const c = $('#journal-contenu');
  if (!Etat.journal.length) { c.innerHTML = etatVide('journal'); return; }
  c.innerHTML = Etat.journal.map((j, i) =>
    '<div class="carte"><div style="display:flex;justify-content:space-between;align-items:center">' +
      '<h3 style="margin:0">Revue du ' + dateFr(j.date) + '</h3>' +
      '<div><span class="badge">' + echapper(j.profil) + '</span> <span class="badge gris">' + echapper(j.enveloppe) + '</span>' +
      ' <button class="bouton secondaire" data-supprimer-journal="' + i + '">Supprimer</button></div></div>' +
      '<p class="intro" style="font-size:12px;margin:8px 0">Scénario dominant : <strong>' +
        echapper((SCENARIOS.find(s => s.id === j.scenarioDominant) || {}).nom ||
                 'aucun contexte renseigné') + '</strong> · ' +
        j.nbOrdres + ' mouvement(s) · rotation ' + pct(j.rotation) +
        (j.impot ? ' · fiscalité estimée ' + euro(j.impot) : '') + '</p>' +
      (j.ordres.length ? '<table><thead><tr><th>Sens</th><th>Support</th><th class="num">Montant</th></tr></thead><tbody>' +
        j.ordres.map(o => '<tr><td><span class="badge ' + (o.sens === 'Achat' ? 'vert' : 'rouge') + '">' + o.sens + '</span></td>' +
          '<td>' + echapper(o.libelle) + '</td><td class="num">' + euro(o.montant) + '</td></tr>').join('') +
        '</tbody></table>' : '<p class="intro">Aucun mouvement : portefeuille dans ses bandes de tolérance.</p>') +
    '</div>').join('');
}
