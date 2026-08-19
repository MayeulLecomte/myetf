/* =============================================================
   VUES — AUJOURD'HUI ET PROFIL
   -------------------------------------------------------------
   L'accueil et le bloc Profil : accroche, écran d'entrée, fil des poches,
   verdict du jour, client & enveloppe, questionnaire, profil de risque.

   Déplacé depuis js/app.js sans une virgule de changement.
   ============================================================= */

/* La note porte la date des COURS qu'elle commente, pas celle de sa
   rédaction. « Note du 14 août » un lundi se lit comme un retard alors
   que c'est la dernière clôture publiée : le relevé tourne du mardi au
   samedi et lit toujours la séance de la veille, si bien qu'un lundi
   regarde forcément le vendredi. On nomme donc le jour de la semaine, et
   l'on ne signale un retard que s'il en est vraiment un. */
function libelleCloture(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const jours = Math.round((new Date(aujourdhuiISO()) - d) / 86400000);
  const nom = d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  return { texte: 'clôtures du ' + nom, retard: jours > 4, jours };
}

function blocNoteAccueil() {
  /* La note est masquée en mode particulier : la reprendre à l'accueil, avec
     le bouton qui y mène, contredirait le masquage. */
  if (vueMasquee('note')) return '';
  const n = (typeof NOTE_MARCHE !== 'undefined' && NOTE_MARCHE) ? NOTE_MARCHE : null;
  if (!n || !n.note) return '';
  return '<div class="carte"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">' +
      '<h3 style="margin:0">' + echapper(n.note.titre) + '</h3>' +
      (function (f) {
        return '<span class="badge ' + (f.retard ? 'orange' : 'gris') + '"' +
          ' title="La note commente la dernière séance publiée. Le relevé tourne du mardi au ' +
          'samedi et lit la clôture de la veille : un lundi regarde donc le vendredi.">' +
          echapper(f.texte) + (f.retard ? ' · ' + f.jours + ' jours' : '') + '</span>';
      })(libelleCloture(n.genere)) + '</div>' +
    '<p class="intro" style="margin:8px 0 0">' + echapper(n.note.synthese) + '</p>' +
    '<div class="barre-actions"><button class="bouton secondaire" data-aller="note">Lire la note de marché</button></div>' +
    '</div>';
}

/* ------------------------------------------------------------
   LE FIL DES POCHES
   Une bande horizontale, en tête d'accueil : une pastille par
   poche, l'anneau teinté par la variation du jour, du vert au
   rouge en passant par le gris quand la séance n'a rien dit.

   Elle ne remplace pas la note de marché, elle la précède : la
   note explique, la bande montre. Les poches sont classées par
   amplitude du jour — ce qui a bougé se lit en premier, ce qui
   n'a pas bougé finit la bande sans encombrer le regard.
   ------------------------------------------------------------ */

function tonVariation(v) {
  if (v == null) return 'neutre';
  if (v >= 0.75) return 'hausse-forte';
  if (v > 0.08) return 'hausse';
  if (v <= -0.75) return 'baisse-forte';
  if (v < -0.08) return 'baisse';
  return 'plat';
}

function filPoches() {
  /* Sur un dossier vierge, cette bande occupait le premier écran pour rien :
     onze pastilles et leurs variations du jour ne disent rien à qui n'a pas
     encore de portefeuille, et elles repoussaient les étapes à remplir sous
     la ligne de flottaison. Elle revient dès la première saisie. */
  if (!dossierEntame()) return '';
  if (typeof VARIATIONS_POCHES === 'undefined' || !VARIATIONS_POCHES) return '';
  const v = VARIATIONS_POCHES.variations || {};
  const poches = Object.keys(v)
    .filter(p => LIBELLES_POCHES[p])
    .sort((a, b) => Math.abs(v[b].jour || 0) - Math.abs(v[a].jour || 0));
  if (!poches.length) return '';

  const f = libelleCloture(VARIATIONS_POCHES.genere);

  return '<div class="fil-entete">' +
      '<h4 style="margin:0">Les poches aujourd\'hui</h4>' +
      '<span class="fil-date">' + echapper(f.texte) + '</span>' +
    '</div>' +
    '<div class="fil" role="list">' +
    poches.map(p => {
      const d = v[p];
      const ton = tonVariation(d.jour);
      const nom = LIBELLES_POCHES[p];
      return '<button class="fil-item ' + ton + '" role="listitem" data-poche="' + echapper(p) + '"' +
        ' title="' + echapper(nom + ' — ' + (d.instrument || '')) + '">' +
        '<span class="fil-anneau"><span class="fil-pastille" style="background:' +
          teintePoche(p) + '">' +
          echapper(initialesPoche(nomCourtPoche(nom))) + '</span></span>' +
        '<span class="fil-nom">' + echapper(nomCourtPoche(nom)) + '</span>' +
        '<span class="fil-var">' + (d.jour == null ? '—' : signe(d.jour, 2)) + '</span>' +
      '</button>';
    }).join('') +
    '</div>';
}

/** Deux lettres pour la pastille : la poche se reconnaît, le rond reste rond. */
function initialesPoche(nom) {
  const mots = nom.replace(/[()/.]/g, ' ').split(/\s+/).filter(m => m.length > 1);
  if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase();
  return (mots[0] || nom).slice(0, 2).toUpperCase();
}

/* La pastille garde la couleur de sa classe d'actifs — quatre familles,
   lisibles d'un coup d'œil — mais s'éclaircit d'un cran à chaque poche de
   la famille. Dix-neuf teintes franchement distinctes seraient au-delà de
   ce qu'un œil sépare ; une famille dégradée se lit, elle, sans effort. */
function teintePoche(poche) {
  const classe = MoteurSelection.classeDePoche(poche);
  const soeurs = Object.keys(LIBELLES_POCHES).filter(p => MoteurSelection.classeDePoche(p) === classe);
  const rang = Math.max(0, soeurs.indexOf(poche));
  const part = soeurs.length > 1 ? rang / (soeurs.length - 1) : 0;
  /* De −16 % à +26 % de blanc : la famille reste reconnaissable aux deux
     bouts, alors qu'une amplitude plus large ferait virer les extrêmes. */
  const blanc = Math.round(-16 + part * 42);
  return blanc >= 0
    ? 'color-mix(in srgb, ' + COULEURS_CLASSES[classe] + ' ' + (100 - blanc) + '%, white)'
    : 'color-mix(in srgb, ' + COULEURS_CLASSES[classe] + ' ' + (100 + blanc) + '%, black)';
}

function nomCourtPoche(nom) {
  return nom
    .replace(/^Obligations? /, 'Obl. ')
    .replace(/^Actions /, '')
    .replace(/ \(.*\)$/, '')
    .replace(/ \/ .*$/, '');
}

/** Détail d'une poche, ouvert au toucher d'une pastille du fil. */
function ouvrirPoche(poche) {
  const v = (typeof VARIATIONS_POCHES !== 'undefined' && VARIATIONS_POCHES.variations[poche]) || null;
  if (!v) return;
  const nom = LIBELLES_POCHES[poche] || poche;
  const ligne = (l, x) => '<div class="feuille-ligne"><span>' + l + '</span><strong class="' +
    tonVariation(x) + '">' + (x == null ? '—' : signe(x, 2)) + '</strong></div>';

  ouvrirFeuille(nom,
    '<p class="intro" style="font-size:12.5px;margin-bottom:14px">Mesuré sur ' +
      echapper(v.instrument || 'le support de référence de la poche') +
      ', aux clôtures du ' + dateFr(v.date) + '.</p>' +
    ligne('Jour', v.jour) + ligne('Semaine', v.semaine) +
    ligne('Mois', v.mois) + ligne('Un an', v.annee) +
    '<div class="barre-actions"><button class="bouton secondaire" data-aller="allocation">' +
      'Voir l\'allocation cible</button></div>');
}

/* ------------------------------------------------------------
   L'ACCROCHE, LA FRAÎCHEUR, LA DÉCOUVERTE
   Trois choses qu'on ne peut apprendre nulle part ailleurs dans
   l'application : à quoi elle sert et pour qui, de quand datent
   les données sur lesquelles elle raisonne, et comment la voir
   fonctionner sans avoir rien à saisir.
   ------------------------------------------------------------ */

/* L'ouverture de l'accueil : le dessin et les mots qu'il accompagne sur
   une même ligne. Un café pour le conseiller — deux tasses, on travaille
   à deux —, une pousse pour le particulier, qui fait pousser son épargne.

   Ils étaient posés l'un SOUS l'autre, et sur un écran large le dessin
   restait seul à gauche d'une demi-page vide, entre l'accroche et le
   titre qu'il n'introduisait ni l'une ni l'autre. Côte à côte, il ouvre
   le texte au lieu de l'interrompre.

   Le dessin ne paraît QUE sur un dossier neuf : vu tous les jours, il
   cesserait d'être vu. Sur un dossier entamé il ne reste que l'accroche
   courte, seule et sans dessin — c'est la même règle qu'avant. */
function ouvertureAccueil() {
  if (dossierEntame()) return accroche();
  return '<div class="ouverture">' +
    illustration(Etat.mode === 'particulier' ? 'logo' : 'cafe', TAILLE_ILLUSTRATION_BANNIERE) +
    '<div class="ouverture-texte">' + accroche() + '</div>' +
  '</div>';
}

function accroche() {
  /* Deux phrases pour qui découvre, une ligne pour qui revient : la même
     accroche tous les jours cesse d'être lue et ne fait plus qu'occuper le
     haut de l'écran. */
  if (dossierEntame()) {
    return '<div class="accroche courte">' +
      '<p>' + T('phrase.accroche.courte') + '</p>' +
      fraicheurDonnees() + '</div>';
  }
  return '<div class="accroche">' +
    '<p>' + T('phrase.accroche.longue') + '</p>' +
    fraicheurDonnees() +
    (dossierEntame() ? '' :
      '<div class="barre-actions" style="margin-top:14px">' +
        '<button class="bouton" id="btn-decouvrir">Découvrir avec un dossier exemple</button>' +
      '</div>' +
      /* Rien ne disait que c'était réversible, et un conseiller prudent n'y
         touchait pas, de peur d'avoir à tout défaire. « Nouveau dossier »
         existe dans l'en-tête, mais aucun lien ne le rattachait à ce
         bouton-ci : c'est ici qu'il faut le savoir. */
      '<p class="accroche-note">Un dossier complet se charge, pour parcourir l\'outil de bout en ' +
        'bout. « Nouveau dossier », en haut de l\'écran, remet tout à zéro.</p>') +
    '</div>';
}

/* De quand datent les données. Il y a quatre relevés distincts, qui ne
   vieillissent pas au même rythme : les cours bougent chaque séance, les
   notations chaque mois, les caractéristiques à l'occasion. Les afficher
   tous les quatre serait illisible ; n'en afficher qu'un serait faux. Trois
   suffisent, le quatrième — le catalogue — n'entre en jeu que dans l'onglet
   Univers, où il porte déjà sa date. */
function fraicheurDonnees() {
  const dateMax = champ => {
    const d = ETF_UNIVERS.map(e => e[champ]).filter(Boolean).sort();
    return d[d.length - 1] || null;
  };
  const entrees = [
    { l: 'Caractéristiques', d: dateMax('donneesLe'), s: 'justETF' },
    { l: 'Notations', d: dateMax('notationLe'), s: 'Morningstar' },
    { l: 'Cours', d: (typeof VARIATIONS_POCHES !== 'undefined' && VARIATIONS_POCHES.genere) || null,
      s: 'Euronext' }
  ].filter(x => x.d);
  if (!entrees.length) return '';

  return '<div class="fraicheur">' + entrees.map(x =>
    '<span title="' + echapper(x.l + ' relevées le ' + dateFr(x.d) + ' sur ' + x.s) + '">' +
      '<i></i>' + echapper(x.l) + ' <b>' + dateFr(x.d).replace(/ \d{4}$/, '') + '</b>' +
      ' <em>' + echapper(x.s) + '</em></span>').join('') +
    '</div>';
}

/* Remplit un dossier de démonstration. Deux profondeurs : le questionnaire
   seul, depuis l'onglet 2, ou le dossier entier depuis l'accueil — montant,
   enveloppe, réponses et lignes détenues — pour que l'application se montre
   en marche sans qu'on ait rien à saisir. */
function remplirExemple(complet) {
  QUESTIONS.forEach(q => { Etat.reponses[q.id] = Math.min(2, q.options.length - 1); });
  Etat.reponses.q_horizon = 3; Etat.reponses.q_perteMax = 3; Etat.reponses.q_reaction = 2;
  Etat.reponses.q_esg = 1;
  if (!Etat.identite.nom) Etat.identite.nom = 'Dossier exemple';

  if (complet) {
    Etat.identite.age = Etat.identite.age || 45;
    Etat.identite.montant = 250000;
    Etat.identite.enveloppe = 'AV';
    Etat.identite.contratAV = 'av-large';
    /* Un portefeuille volontairement déséquilibré : à l'équilibre, l'accueil
       afficherait « rien à faire » et la démonstration ne montrerait rien. */
    Etat.detention = [
      { isin: 'IE00B4L5Y983', libelle: 'iShares Core MSCI World UCITS ETF USD (Acc)',
        montant: 150000, pvLatente: 28000 },
      { isin: 'IE00B4WXJJ64', libelle: 'iShares Core € Govt Bond UCITS ETF (Dist)',
        montant: 70000, pvLatente: 1200 },
      { isin: 'IE00B4ND3602', libelle: 'iShares Physical Gold ETC',
        montant: 30000, pvLatente: 9400 }
    ];
  }
  sauver(true);
}

/* ------------------------------------------------------------
   L'ÉCRAN D'ENTRÉE
   ------------------------------------------------------------
   Deux boutons, dans l'accueil et non dans une fenêtre : une
   modale sortirait du routage par ancres, et le test de fumée ne
   la verrait pas.

   Il ne paraît que sur un dossier vierge dont le mode n'est pas
   choisi. Un dossier existant est forcément entamé — il ne le
   voit donc jamais et s'ouvre en conseiller, comme avant.
   ------------------------------------------------------------ */
function ecranEntree() {
  /* TROIS ÉCRANS QUI SE DÉROULENT, et non trois blocs empilés.

     Le premier ne porte que le signe et le nom : on arrive quelque part
     avant qu'on ne demande quoi que ce soit. Le deuxième dit ce que fait
     l'outil, et par quels écrans. Le troisième seulement pose la
     question du mode — largement détaché, pour qu'on sente qu'on passe
     de « ce que c'est » à « ce que je fais ».

     Les trois blocs du parcours sont lus dans GROUPES : les nommer ici
     en ferait une seconde définition, qui finirait par en dévier. */
  const parcours = GROUPES.filter(g => !g.secondaire && g.vues.length > 1).map(g =>
    '<div class="entree-etape">' +
      '<span class="entree-etape-signe" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24"><path d="' + g.icone + '"/></svg></span>' +
      '<span class="entree-etape-corps">' +
        '<strong>' + echapper(g.libelle) + '</strong>' +
        '<span>' + echapper(g.vues.filter(v => !vueMasquee(v)).map(libelleVue).join(', ')) + '</span>' +
      '</span>' +
    '</div>').join('');

  return '<div class="entree-ouverture">' +
      illustration('logo', TAILLE_ILLUSTRATION_OUVERTURE) +
      '<div class="entree-nom">myetf</div>' +
      '<div class="ouverture-suite" aria-hidden="true"><span>Faites défiler</span>' +
        '<svg viewBox="0 0 24 24"><path d="M6 9.5 12 15.5 18 9.5"/></svg></div>' +
    '</div>' +

    '<div class="entree-propos">' +
      '<div class="accroche">' +
        '<p><strong>myetf construit et suit une allocation d\'ETF</strong> — du questionnaire de ' +
        'profilage aux ordres à passer, en assurance-vie, PEA ou compte-titres.</p>' +
      '</div>' +
      '<div class="entree-parcours">' + parcours + '</div>' +
      fraicheurDonnees() +
    '</div>' +

    '<div class="entree-choisir">' +
      '<h2>' + titreSouligne('Pour commencer') + '</h2>' +
      '<p class="intro">Ce choix ne change ni les calculs ni le dossier : seulement le vocabulaire et ' +
        'les écrans montrés. Il se modifie ensuite dans « ' + echapper(T('vue.client.nav')) + ' ».</p>' +
      '<div class="entree">' +
        MODES.map(m =>
          '<button class="entree-choix" data-mode="' + echapper(m.id) + '">' +
            '<strong>' + echapper(m.bouton) + '</strong>' +
            '<span>' + echapper(m.sous) + '</span>' +
          '</button>').join('') +
      '</div>' +
    '</div>';
}

function choisirMode(id) {
  if (!MODES.some(m => m.id === id)) return;
  Etat.mode = id;
  sauver(true);
  /* Le vocabulaire change en place : ni rechargement, ni perte de saisie. */
  poserNav(); poserTitres(); poserOuvertures(); poserBarresParcours(); majNav();
  rendre('accueil');
}

function rendreAccueil() {
  const c = $('#accueil-contenu');
  if (!Etat.mode && !dossierEntame()) { c.innerHTML = ecranEntree(); return; }
  const etapes = etapesDossier();
  const aFaire = etapes.filter(e => !e.fait);

  /* --- Dossier incomplet : dire ce qui manque, pas « complétez le dossier » --- */
  if (aFaire.length) {
    c.innerHTML =
      ouvertureAccueil() +
      filPoches() +
      '<h2>' + titreSouligne('Remplissez le dossier') + '</h2>' +
      '<p class="intro">Ni allocation ni arbitrage ne peuvent être proposés tant que ces étapes ne sont ' +
        'pas renseignées.</p>' +
      /* Cette phrase reste ici, et pas seulement dans « Méthode & limites » :
         c'est le moment où l'on commence à saisir, donc le moment où il faut
         le savoir. Une page de référence se lit après coup, ou jamais. */
      '<p class="intro rappel-local">Vos données restent dans ce navigateur — exportez votre dossier ' +
        'régulièrement. <button class="lien" data-aller="methode">Méthode &amp; limites</button></p>' +

      '<div class="carte"><h3>' + aFaire.length + ' étape' + (aFaire.length > 1 ? 's' : '') + ' à compléter</h3>' +
        '<div class="etapes-dossier">' +
        etapes.map(e =>
          '<div class="etape' + (e.fait ? ' faite' : '') + '">' +
            /* Ni numéro, ni rang : une puce pleine pour ce qui est fait, un
               anneau creux pour ce qui reste. L'ordre se lit dans la liste. */
            '<span class="etape-marque">' + (e.fait ? '✓' : '') + '</span>' +
            '<div class="etape-corps"><strong>' + echapper(e.titre) + '</strong>' +
              '<div class="etape-detail">' + (e.fait ? 'Renseigné.' : echapper(e.reste)) +
                (e.duree && !e.fait ? ' <span class="etape-duree">' + echapper(e.duree) + '</span>' : '') +
              '</div></div>' +
            (e.fait ? '' : '<button class="bouton' + (e === aFaire[0] ? '' : ' secondaire') +
              '" data-aller="' + e.vue + '">Ouvrir</button>') +
          '</div>').join('') +
        '</div></div>' +

      blocNoteAccueil();
    return;
  }

  /* --- Dossier complet : verdict d'abord, détail ensuite --- */
  const r = resultatProfil();
  const sel = selectionCourante();
  const analyse = MoteurArbitrage.analyser(
    Etat.detention, sel.lignes,
    { enveloppe: Etat.identite.enveloppe || 'AV', apport: Number(Etat.apport) || 0 },
    universSelection()
  );

  const derive = analyse.ecarts.reduce((m, e) => Math.max(m, Math.abs(e.pctCible - e.pctActuel)), 0);
  const derniere = Etat.journal.length
    ? Etat.journal.map(j => j.date).sort().slice(-1)[0] : null;
  const rien = analyse.aucunMouvement;
  const aInvestir = lignesAInvestir();

  c.innerHTML =
    accroche() +
    filPoches() +
    '<h2>' + titreSouligne('Aujourd\'hui') + '</h2>' +

    /* Tant que des achats n'ont pas été passés, ils passent avant le verdict
       d'arbitrage : dire « rien à faire » à quelqu'un qui n'a rien acheté
       serait faux, et l'arbitrage ne mesure une dérive que sur un
       portefeuille constitué. */
    (aInvestir.length
      ? '<div class="verdict action">' +
          '<div class="verdict-titre">' + aInvestir.length + ' ligne' +
            (aInvestir.length > 1 ? 's à investir' : ' à investir') + '</div>' +
          '<p class="verdict-texte">Le portefeuille recommandé vous attend dans « ' +
            echapper(T('vue.situation.nav')) + ' », pour ' +
            euro(aInvestir.reduce((a, l) => a + (Number(l.montant) || 0), 0)) +
            '. Confirmez chaque achat une fois passé.</p>' +
          '<div class="barre-actions"><button class="bouton" data-aller="situation">Ouvrir le suivi</button></div>' +
        '</div>'
      : '<div class="verdict ' + (rien ? 'calme' : 'action') + '">' +
        '<div class="verdict-titre">' + (rien ? 'Rien à faire' : analyse.ordres.length + ' mouvement' +
          (analyse.ordres.length > 1 ? 's' : '') + ' à passer') + '</div>' +
        '<p class="verdict-texte">' + (rien
          ? 'Chaque ligne reste dans sa bande de tolérance : aucun écart n\'atteint le seuil de déclenchement de ' +
            euro(analyse.seuilMontant) + '. Laisser le portefeuille en l\'état est la décision par défaut.'
          : 'Écart le plus fort : ' + pct(derive) + ' de l\'encours. Rotation ' + pct(analyse.rotation) +
            ', fiscalité estimée ' + euro(analyse.fiscalite.impotEstime) + '.') + '</p>' +
      '</div>') +

    '<div class="grille quatre">' +
      kpi(euro(analyse.total), 'Encours', r.profil.nom) +
      kpi(pct(derive), 'Dérive maximale', 'seuil ' + euro(analyse.seuilMontant), 'derive') +
      kpi(String(sel.nbSupports), 'Supports cibles', pct(sel.terMoyen, 2) + ' de frais moyens') +
      kpi(derniere ? dateFr(derniere) : '—', 'Dernière revue',
        derniere ? Etat.journal.length + ' revue(s) au journal' : 'aucune revue enregistrée') +
    '</div>' +

    (rien ? '' :
      '<div class="carte"><h3>Mouvements proposés</h3>' +
        '<div class="tableau-defilant"><table><thead><tr><th>Sens</th><th>Support</th>' +
        '<th class="num">Montant</th><th>Motif</th></tr></thead><tbody>' +
        analyse.ordres.map(o =>
          '<tr><td><span class="badge ' + (o.sens === 'Achat' ? 'vert' : 'rouge') + '">' + echapper(o.sens) + '</span></td>' +
          '<td>' + echapper(o.libelle) + '</td>' +
          '<td class="num">' + euro(o.montant) + '</td>' +
          '<td style="font-size:12px;color:var(--gris-doux)">' + echapper(o.motif || '') + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<div class="barre-actions"><button class="bouton" data-aller="arbitrages">Ouvrir les arbitrages</button>' +
        '<button class="bouton secondaire" data-aller="rapport">Voir le rapport</button></div></div>') +


    blocNoteAccueil();
}

/* ============================================================
   VUE 1 — IDENTITÉ
   ============================================================ */

function rendreIdentite() {
  const c = $('#champs-identite');
  c.innerHTML = IDENTITE.map(f => {
    if (f.dependDe && Etat.identite[f.dependDe.champ] !== f.dependDe.valeur) return '';
    const val = Etat.identite[f.id] !== undefined ? Etat.identite[f.id] : (f.defaut !== undefined ? f.defaut : '');
    let saisie;
    if (f.type === 'select') {
      saisie = '<select data-identite="' + f.id + '">' + f.options.map(o =>
        '<option value="' + o.valeur + '"' + (String(val) === o.valeur ? ' selected' : '') + '>' + echapper(o.label) + '</option>'
      ).join('') + '</select>';
    } else {
      saisie = '<input type="' + f.type + '" data-identite="' + f.id + '" value="' + echapper(val) + '"' +
        (f.min !== undefined ? ' min="' + f.min + '"' : '') +
        (f.max !== undefined ? ' max="' + f.max + '"' : '') +
        (f.exemple ? ' placeholder="' + echapper(T('champ.' + f.id + '.exemple')) + '"' : '') + '>';
    }
    return '<div class="champ"><label>' + echapper(T('champ.' + f.id)) + '</label>' + saisie +
      (f.suffixe ? '<span class="suffixe">' + echapper(f.suffixe) + '</span>' : '') + '</div>';
  }).join('') +
    /* Le mode se change ici, et non dans un réglage d'application : c'est une
       propriété du dossier, elle voyage avec lui à l'export. */
    '<div class="champ"><label for="f-mode">Mode de lecture</label>' +
      '<select id="f-mode">' + MODES.map(m =>
        '<option value="' + echapper(m.id) + '"' +
        ((Etat.mode || MODE_DEFAUT) === m.id ? ' selected' : '') + '>' +
        echapper(m.bouton) + '</option>').join('') + '</select>' +
      '<span class="suffixe">Ne change ni les calculs ni le dossier.</span></div>';

  /* Les contraintes de sélection sont l'outillage du conseiller : notation
     minimale, encours, frais, réplication, univers, référencement au contrat,
     intensité tactique. Un particulier hérite des mêmes valeurs par défaut
     sans avoir à les régler — et l'intensité n'a de toute façon aucun effet
     dans un mode qui n'applique pas de déviation. */
  const contraintes = $('#carte-contraintes');
  if (contraintes) contraintes.hidden = (Etat.mode === 'particulier');

  $('#f-etoiles').value = Etat.filtres.etoilesMin;
  $('#f-encours').value = Etat.filtres.encoursMin;
  $('#f-ter').value = Etat.filtres.terMax;
  $('#f-synthetique').value = Etat.filtres.exclureSynthetique ? '1' : '0';
  $('#f-contrat').value = Etat.filtres.contratSeulement ? '1' : '0';
  $('#f-source').value = Etat.filtres.sourceUnivers || 'travail';
  majLibelleSource();
  $('#f-intensite').value = Math.round(Etat.filtres.intensite * 100);
  majLibelleIntensite();
}

function majLibelleSource() {
  const s = $('#f-source-val');
  if (!s) return;
  if (Etat.filtres.sourceUnivers !== 'catalogue') {
    s.textContent = Etat.univers.length + ' supports, relevés un à un et cochables au contrat';
    return;
  }
  if (typeof CATALOGUE_ETF === 'undefined') { s.textContent = 'Chargement du catalogue…'; return; }
  const e = MoteurUnivers.ecartes(CATALOGUE_ETF);
  s.textContent = e.retenus.toLocaleString('fr-FR') + ' supports sélectionnables · ' +
    (e.sansPoche + e.sansFrais + e.sansEncours).toLocaleString('fr-FR') + ' écartés faute de poche, de frais ou d\'encours';
}

function majLibelleIntensite() {
  const v = Number($('#f-intensite').value);
  const libelles = [
    [0, 'purement stratégique, aucun arbitrage tactique'],
    [30, 'déviations légères'],
    [60, 'déviations modérées'],
    [80, 'déviations affirmées'],
    [100, 'déviations maximales autorisées']
  ];
  let txt = libelles[0][1];
  libelles.forEach(l => { if (v >= l[0]) txt = l[1]; });
  const p = resultatProfil();
  const forcee = p && p.preferences.gestion === 'passive'
    ? ' — neutralisée : le client a demandé une allocation figée' : '';
  $('#f-intensite-val').textContent = v + ' % — ' + txt + forcee;
}

/* ============================================================
   VUE 2 — QUESTIONNAIRE
   ============================================================ */

function rendreQuestionnaire() {
  const sections = [];
  QUESTIONS.forEach(q => { if (sections.indexOf(q.section) < 0) sections.push(q.section); });

  $('#questions').innerHTML = sections.map(sec => {
    const qs = QUESTIONS.filter(q => q.section === sec);
    return '<div class="carte section-q"><h3>' + echapper(sec) + '</h3>' + qs.map(q => {
      const rep = Etat.reponses[q.id];
      return '<div class="question"><div class="enonce">' + echapper(q.texte) + '</div>' +
        (q.aide ? '<div class="aide">' + echapper(q.aide) + '</div>' : '') +
        '<div class="options">' + q.options.map((o, i) =>
          '<label class="' + (rep === i ? 'choisi' : '') + '">' +
          '<input type="radio" name="' + q.id + '" value="' + i + '" data-question="' + q.id + '"' +
          (rep === i ? ' checked' : '') + '> ' +
          echapper(o.cle ? T(o.cle) : o.label) + '</label>').join('') +
        '</div></div>';
    }).join('') + '</div>';
  }).join('');

  majProgression();
}

function majProgression() {
  const total = QUESTIONS.filter(q => q.poids > 0).length + 1;   // + question ESG
  const repondues = QUESTIONS.filter(q => Etat.reponses[q.id] !== undefined).length;
  const p = Math.round(100 * repondues / total);
  $('#barre-progression').style.width = p + '%';
  $('#txt-progression').textContent = repondues + ' / ' + total + ' questions renseignées';
  majSectionCourante();
}

/* Le repère nomme la section sous les yeux pendant le défilement. Cinq
   cartes seulement : on relit leur position à chaque défilement plutôt
   que d'entretenir un observateur d'intersection, et l'on nomme la
   dernière carte dont le haut est passé sous le repère. */
function majSectionCourante() {
  const champ = $('#txt-section');
  const vue = $('#vue-questionnaire');
  if (!champ || !vue || !vue.classList.contains('actif')) return;

  const cartes = $$('#questions .section-q');
  if (!cartes.length) { champ.textContent = ''; return; }

  const repere = $('#repere-questionnaire');
  const seuil = repere ? repere.getBoundingClientRect().bottom : 0;
  let courante = cartes[0];
  cartes.forEach(c => { if (c.getBoundingClientRect().top <= seuil + 8) courante = c; });

  const h = courante.querySelector('h3');
  champ.textContent = h ? h.textContent.trim() : '';
}

/* ============================================================
   VUE 3 — PROFIL
   ============================================================ */

function rendreProfil() {
  const r = resultatProfil();
  const c = $('#profil-contenu');

  if (!r) { c.innerHTML = etatVide('profil'); return; }

  const alloc = allocationCourante();
  const metriques = MoteurAllocation.metriques(alloc.classes);
  const stress = MoteurProfil.stressTest(alloc.classes);

  c.innerHTML =
    '<div class="bandeau-profil" style="background:' + r.profil.couleur + '">' +
      '<div><div class="meta">PROFIL RETENU</div><div class="nom">' + r.profil.nom + '</div>' +
      '<div class="meta">Indicateur de risque SRI ' + r.profil.sri + ' · horizon minimum recommandé ' + r.profil.horizonMin + ' ans</div></div>' +
      '<div style="margin-left:auto;text-align:right">' +
        '<div class="meta">Score retenu</div><div class="nom">' + r.scores.retenu + '<span style="font-size:16px">/100</span></div>' +
      '</div>' +
    '</div>' +

    (r.declasse ? '<div class="message alerte"><strong>Profil plafonné.</strong> Le score brut situait le client en ' +
      r.profilTheorique.nom + '. Les contraintes suivantes ont abaissé le profil :<ul>' +
      r.plafondsAppliques.map(p => '<li>' + echapper(p) + '</li>').join('') + '</ul></div>' : '') +

    (r.alertes.length ? '<div class="message info"><strong>Points de vigilance à documenter.</strong><ul>' +
      r.alertes.map(a => '<li>' + echapper(a) + '</li>').join('') + '</ul></div>' : '') +

    '<div class="grille deux">' +
      '<div class="carte"><h3>Décomposition du score</h3>' +
        jauge('Capacité de perte', r.scores.capacite, 'var(--axe-capacite)') +
        jauge('Tolérance au risque', r.scores.tolerance, 'var(--axe-tolerance)') +
        jauge('Connaissance &amp; expérience', r.scores.connaissance, 'var(--axe-connaissance)') +
        '<p class="intro" style="font-size:12px;margin-top:12px">Le score retenu est le <strong>minimum</strong> ' +
        'entre capacité et tolérance : on ne peut exposer un client ni au-delà de ce qu\'il peut perdre, ni ' +
        'au-delà de ce qu\'il accepte de perdre. La connaissance agit ensuite comme plafond.</p>' +
      '</div>' +
      '<div class="carte"><h3>Caractéristiques du profil</h3>' +
        '<p>' + echapper(r.profil.description) + '</p>' +
        '<table><tbody>' +
        ligne('Volatilité cible', r.profil.volatiliteCible) +
        ligne('Volatilité estimée du portefeuille', pct(metriques.volatilite)) +
        ligne('Rendement annuel espéré (hypothèses LT)', pct(metriques.rendement)) +
        ligne('Perte annuelle à 95 % de confiance', pct(metriques.perteAnnuelle95)) +
        ligne('Perte maximale de référence', r.profil.perteMax) +
        ligne('Horizon minimum', r.profil.horizonMin + ' ans') +
        ligne('Préférences ESG', { aucune: 'Aucune', souhaitee: 'Souhaitées', prioritaire: 'Prioritaires' }[r.preferences.esg]) +
        ligne('Mode de gestion accepté', { passive: 'Allocation figée', conseillee: 'Arbitrages sur conseil', active: 'Gestion active' }[r.preferences.gestion]) +
        '</tbody></table>' +
      '</div>' +
    '</div>' +

    '<div class="carte"><h3>Résistance du portefeuille cible aux chocs historiques</h3>' +
      '<p class="intro" style="font-size:12px">Impact instantané estimé sur la valeur du portefeuille, chocs appliqués par classe d\'actifs.</p>' +
      '<table><thead><tr><th>Scénario de stress</th><th class="num">Impact estimé</th><th class="num">Valeur résiduelle</th></tr></thead><tbody>' +
      stress.map(s => '<tr><td>' + echapper(s.nom) + '</td>' +
        '<td class="num negatif">' + pct(s.impact) + '</td>' +
        '<td class="num">' + euro((Number(Etat.identite.montant) || 0) * (1 + s.impact / 100)) + '</td></tr>').join('') +
      '</tbody></table>' +
      '<p class="intro" style="font-size:11px;margin-top:10px">Chocs calibrés sur des épisodes de marché passés. ' +
      'Les performances passées ne préjugent pas des performances futures.</p>' +
    '</div>';
}
