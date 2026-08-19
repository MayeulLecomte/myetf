/* =============================================================
   RAPPORT ET MÉTHODE
   -------------------------------------------------------------
   Le document remis, et la page qui explique comment il a été produit :
   méthode & limites, entonnoir détaillé, annexe, situation de départ, et la
   liste de contrôle qui se lit avant d'imprimer.

   Déplacé depuis js/app.js sans une virgule de changement.
   ============================================================= */

/* ============================================================
   MÉTHODE & LIMITES
   -------------------------------------------------------------
   Un outil qui produit des chiffres doit dire d'où ils viennent.
   Cette vue est l'écran de travail du conseiller : elle dit tout,
   y compris ce qui n'a pas sa place devant un client — que les
   allocations stratégiques sont calibrées à la main, que la
   plupart des séries du backtest sont estimées, que rien n'est
   sauvegardé ailleurs que dans ce navigateur.

   L'annexe jointe au rapport en reprend trois sections sur cinq :
   d'où vient l'allocation, ce qu'est une déviation tactique, ce
   que l'outil ne fait pas. Ni le détail du backtest, ni le
   stockage — ce sont des sujets d'outil, pas de conseil.
   ============================================================ */

/* Le détail de l'entonnoir, alimenté par la même fonction que la ligne de
   l'onglet Univers. Une phrase par étape : un tableau de chiffres sans motif
   se lit comme une justification, pas comme une explication. */
function blocEntonnoirMethode() {
  const e = entonnoirCourant();
  if (!e) {
    return '<div class="carte"><h3>3. Sur quels ETF l\'outil choisit</h3>' +
      '<p>Le catalogue européen n\'est pas chargé : ouvrez « ' +
      echapper(T('vue.univers.nav')) + ' » pour voir le détail du vivier.</p></div>';
  }

  const etape = (libelle, valeur, motif, retrait) =>
    '<tr' + (retrait ? ' class="entonnoir-retrait"' : '') + '>' +
      '<td>' + libelle + '</td>' +
      '<td class="num"><strong>' + (valeur == null ? '—' : valeur.toLocaleString('fr-FR')) + '</strong></td>' +
      '<td style="font-size:12px;color:var(--texte-doux)">' + motif + '</td></tr>';

  return '<div class="carte"><h3>3. Sur quels ETF l\'outil choisit</h3>' +
    '<p>La sélection ne parcourt pas tout le catalogue européen. Cinq resserrements la ramènent ' +
    'de plusieurs milliers de lignes à une douzaine de supports. Les chiffres ci-dessous sont ' +
    'calculés sur le relevé du <strong>' + dateFr(e.genere) + '</strong> et sur vos filtres ' +
    'actuels — ils bougent avec les deux.</p>' +

    '<div class="tableau-defilant"><table><thead><tr>' +
    '<th>Étape</th><th class="num">Supports</th><th>Ce qu\'elle écarte, et pourquoi</th>' +
    '</tr></thead><tbody>' +

    etape('Catalogue européen', e.brut,
      'Tous les ETF cotés sur les sept places suivies. Les produits à levier, inverses et les ' +
      'actifs numériques en sont déjà exclus : ils n\'ont pas leur place dans une allocation ' +
      'patrimoniale en unités de compte.') +

    etape('− sans poche du modèle', e.sansPoche,
      'Leur catégorie Morningstar ne correspond à aucune des dix-neuf poches du modèle — fonds ' +
      'thématiques étroits, stratégies non couvertes. Ils restent cherchables et ajoutables à la ' +
      'main dans l\'univers de travail.', true) +

    etape('− sans frais courants publiés', e.sansFrais,
      'Conseiller un fonds dont on ignore les frais n\'est pas conseiller. Un zéro y est traité ' +
      'comme une absence : sur les supports affichés à 0 %, plusieurs facturent en réalité des ' +
      'frais connus, et ce zéro leur donnait le meilleur score.', true) +

    etape('− sans encours publié', e.sansEncours,
      'La taille d\'un fonds conditionne sa liquidité et son risque de fermeture. Sans elle, le ' +
      'support n\'est pas comparable aux autres.', true) +

    etape('<strong>Exploitables</strong>', e.exploitables,
      'Ce qui porte les trois données exigées : une poche, des frais, un encours.') +

    etape('+ univers de travail', e.offert,
      'Les ' + e.universTravail + ' supports relevés un à un à la main, avec leur réplication, leur ' +
      'éligibilité PEA et leur notation vérifiée. Quelques-uns ne figurent pas au catalogue ; ils ' +
      's\'ajoutent au vivier.') +

    etape('− vos trois filtres', e.candidats,
      'Notation minimale ' + (e.filtres.etoilesMin || 0) + ' étoile(s), encours minimum ' +
      (e.filtres.encoursMin || 0).toLocaleString('fr-FR') + ' M€, frais maximum ' +
      pct(e.filtres.terMax, 2) + '. <strong>Ces trois seuils se modifient</strong> dans « ' +
      echapper(T('vue.client.nav')) + ' » : les élargir ouvre le vivier, les resserrer le referme. ' +
      'Un support sans notation n\'est pas écarté par le filtre étoiles — Morningstar ne note ni ' +
      'les monétaires, ni les ETC, ni les fonds de moins de trois ans.', true) +

    etape('<strong>Retenus pour ce dossier</strong>', e.retenus,
      e.retenus == null
        ? 'Le questionnaire n\'est pas complété : sans profil, aucune allocation cible, donc aucun ' +
          'support retenu.'
        : 'Un support par poche de l\'allocation cible, choisi au meilleur score — frais, encours, ' +
          'notation, adéquation à la poche. Les poches à poids nul ne reçoivent rien.') +

    '</tbody></table></div>' +

    '<p style="margin-top:12px">Deux ensembles à ne pas confondre. Le <strong>catalogue</strong> est ' +
    'un annuaire de recherche : rien n\'y est vérifié, et c\'est la source de la sélection ' +
    'automatique. L\'<strong>univers de travail</strong> est la liste courte que vous tenez, seule à ' +
    'porter le référencement au contrat — le seul contrôle qui engage le conseil.</p>' +
    '</div>';
}

function rendreMethode() {
  const c = $('#methode-contenu');
  if (!c) return;

  const p = resultatProfil();
  const bornes = Object.keys(BORNES_TACTIQUES).filter(k => k !== 'poche')
    .map(k => (LIBELLES_CLASSES[k] || k) + ' ± ' + BORNES_TACTIQUES[k] + ' pts').join(' · ');

  /* La part estimée est calculée en direct plutôt qu'écrite en dur : elle
     baisse à chaque série documentée, et un chiffre figé mentirait vite. */
  const poids = p ? MoteurAllocation.strategique(p.profil.id).poches : null;
  const fiab = poids ? MoteurBacktest.fiabilite(poids, Etat.historique) : null;

  c.innerHTML =
    '<div class="carte"><h3>1. D\'où viennent les allocations stratégiques</h3>' +
      '<p>Chacun des ' + PROFILS.length + ' profils porte une répartition entre actions, obligations, ' +
      'monétaire et diversifiants, puis une sous-répartition en poches. Ces pondérations sont ' +
      '<strong>calibrées à la main</strong>, à partir des pratiques de place et d\'hypothèses de long ' +
      'terme paramétrées dans <code>js/engine/allocation.js</code>.</p>' +
      '<p><strong>Ce n\'est pas une optimisation moyenne-variance.</strong> Aucune frontière efficiente ' +
      'n\'est calculée, et la corrélation entre classes est traitée par une moyenne unique. Les ' +
      'allocations sont défendables ; elles ne sont pas optimales au sens mathématique, et ne prétendent ' +
      'pas l\'être.</p>' +
      '<p>Le profil lui-même sort du questionnaire : capacité à subir une perte, tolérance déclarée, ' +
      'connaissance et expérience. Le plus faible des trois plafonne le résultat — un client averti mais ' +
      'sans capacité de perte reste prudent.</p>' +
    '</div>' +

    '<div class="carte"><h3>2. Comment sont calculées les déviations tactiques</h3>' +
      '<p>' + INDICATEURS.length + ' indicateurs de contexte que vous renseignez — cycle, inflation, ' +
      'crédit, politique monétaire, géopolitique… — alimentent ' + SCENARIOS.length + ' scénarios : ' +
      echapper(SCENARIOS.map(x => x.nom).join(', ')) + '. Chaque scénario incline certaines classes et ' +
      'certaines poches ; l\'inclinaison retenue est la moyenne pondérée par les probabilités.</p>' +
      '<p>Cette déviation est ensuite <strong>bornée</strong> (' + echapper(bornes) + ', et ± ' +
      BORNES_TACTIQUES.poche + ' pts par poche), puis multipliée par l\'intensité que vous réglez. ' +
      'Une déviation ne peut donc jamais transformer un profil prudent en profil offensif.</p>' +

      '<div class="message alerte"><strong>Un contexte non renseigné n\'applique aucune déviation.</strong> ' +
      'Tant qu\'aucun indicateur n\'est choisi et qu\'aucune probabilité n\'est forcée à la main, ' +
      'l\'allocation cible est <strong>strictement l\'allocation stratégique du profil</strong>. ' +
      'Concrètement : aucun scénario dominant n\'est nommé ni inscrit au journal, le backtest rend la ' +
      'même allocation en mode tactique et stratégique, et les écarts d\'arbitrage sont mesurés contre ' +
      'la stratégique. Les probabilités affichées dans « Contexte » sont alors des valeurs de repli, ' +
      'qui n\'entrent dans aucun calcul.</div>' +

      '<p>Les probabilités peuvent être forcées à la main : c\'est alors votre lecture qui prime, et ' +
      'elle est enregistrée telle quelle au journal.</p>' +
    '</div>' +

    /* Inséré en 3 : la question « sur quoi choisit-il ? » vient avant
       « comment se comporte-t-il ? ». Les sections suivantes glissent d'un
       rang, et le rapport les renumérote seul à l'assemblage. */
    blocEntonnoirMethode() +

    '<div class="carte"><h3>4. Ce que le backtest mesure, et ne mesure pas</h3>' +
      '<p>Il rejoue l\'allocation sur des <strong>performances annuelles calendaires</strong>, en euros, ' +
      'dividendes réinvestis, avec rééquilibrage en fin d\'année. Il mesure le comportement du <em>modèle ' +
      'd\'allocation</em> — pas celui des supports retenus, pas celui d\'un portefeuille réel.</p>' +
      '<p><strong>Il ne mesure pas :</strong> les frais du contrat, la fiscalité, les frais d\'arbitrage, ' +
      'l\'écart entre un ETF et son indice, ni le moment des versements. Le pas annuel efface tout ce ' +
      'qui se passe à l\'intérieur d\'une année : une baisse de 30 % en mars suivie d\'un rebond n\'y ' +
      'laisse aucune trace, alors qu\'elle aurait fait vendre bien des clients.</p>' +
      '<p><strong>Il ignore le risque de séquence.</strong> Deux portefeuilles de même rendement moyen ' +
      'finissent très différemment selon l\'ordre des années, et cet ordre compte d\'autant plus qu\'on ' +
      'retire du capital.</p>' +
      (fiab
        ? '<div class="message ' + (fiab.estime > 40 ? 'alerte' : 'info') + '">' +
          '<strong>' + pct(fiab.estime) + ' des séries utilisées sont des estimations</strong> — sur ' +
          'l\'allocation stratégique de votre profil actuel. ' + pct(fiab.marche) + ' proviennent des ' +
          'cours relevés automatiquement et ' + pct(fiab.source) + ' d\'une source documentée. Une série ' +
          'estimée est un ordre de grandeur que j\'ai posé, pas une donnée : elle se remplace dans ' +
          '« Backtest », où chaque série peut être saisie et marquée comme sourcée.</div>'
        : '<p class="intro">Complétez le questionnaire pour connaître la part estimée sur votre profil.</p>') +
    '</div>' +

    '<div class="carte"><h3>5. Tout est stocké dans ce navigateur</h3>' +
      '<p>Aucun serveur, aucun compte, aucune transmission. Le dossier vit dans le stockage local de ' +
      '<strong>ce navigateur, sur cet appareil</strong>. C\'est ce qui garantit qu\'aucune donnée client ' +
      'ne circule — et c\'est aussi ce qui le rend fragile.</p>' +
      '<p><strong>Le dossier est perdu si :</strong> vous changez de navigateur ou d\'appareil ; vous ' +
      'effacez les données de site dans les réglages ; vous travaillez en navigation privée et fermez ' +
      'la fenêtre ; le navigateur fait le ménage de lui-même après une longue inactivité.</p>' +
      '<p><strong>L\'export est la seule sauvegarde.</strong> Il produit un fichier JSON qui contient ' +
      'tout — identité, réponses, détention, univers, journal, arrêtés — et se réimporte à l\'identique, ' +
      'sur n\'importe quel appareil. Exportez à chaque revue, et avant toute manipulation des réglages ' +
      'de votre navigateur.</p>' +
      '<div class="barre-actions">' +
        '<button class="bouton" data-relais="btn-exporter">Exporter le dossier maintenant</button>' +
        '<button class="bouton secondaire" data-relais="btn-importer">Importer un dossier</button>' +
      '</div>' +
    '</div>' +

    '<div class="carte"><h3>6. Ce que l\'outil ne fait pas</h3>' +
      '<p><strong>Il ne conseille pas.</strong> Il produit un support de travail. La préconisation ' +
      'n\'existe qu\'une fois validée, complétée et signée par vous dans le rapport d\'adéquation.</p>' +
      '<p><strong>Il ne passe aucun ordre</strong> et n\'est connecté à aucun contrat. Les mouvements ' +
      'proposés sont à saisir chez l\'assureur ou le teneur de compte.</p>' +
      '<p><strong>Il ne surveille rien.</strong> Aucune alerte de marché, aucun contrôle quotidien : le ' +
      'suivi se déclenche quand vous ouvrez une revue, jamais tout seul. C\'est un choix — une alerte ' +
      'pousse à agir, et les bandes de tolérance servent précisément à ne pas agir.</p>' +
      '<p><strong>Il ne vérifie pas le référencement au contrat.</strong> Aucune source publique ne ' +
      'connaît la liste des supports d\'un contrat donné : ce contrôle vous revient, et il est le seul ' +
      'qui engage le conseil.</p>' +
      '<p><strong>Il ne relève pas le SRI</strong> des documents d\'informations clés, ni ne suit les ' +
      'changements d\'indice, de frais ou de politique de distribution d\'un support.</p>' +
    '</div>';
}

/* L'annexe jointe au rapport : trois sections sur cinq, resserrées à une
   demi-page. Ni le détail du backtest, ni le stockage — ce sont des sujets
   d'outil, pas de conseil, et le client n'a pas à en connaître. */
function annexeMethode(numero) {
  const m = macroCourante();
  return '<div class="carte saut-page"><h3>' + numero + '. Annexe — méthode</h3>' +
    '<p style="font-size:11.5px;line-height:1.55"><strong>D\'où vient l\'allocation.</strong> ' +
    'Le questionnaire détermine un profil de risque à partir de trois axes — capacité à subir une ' +
    'perte, tolérance déclarée, connaissance et expérience — dont le plus faible plafonne le résultat. ' +
    'À chaque profil correspond une répartition entre actions, obligations, monétaire et diversifiants, ' +
    'calibrée sur des hypothèses de long terme. Il ne s\'agit pas d\'une optimisation mathématique.</p>' +

    '<p style="font-size:11.5px;line-height:1.55"><strong>Ce qu\'est une déviation tactique.</strong> ' +
    'Une lecture du contexte économique et géopolitique, traduite en probabilités de scénarios, incline ' +
    'temporairement l\'allocation autour de sa cible. Cette inclinaison est bornée et ne peut pas ' +
    'changer la nature du profil. ' +
    (m.exprime
      ? 'Elle est appliquée dans le présent document.'
      : '<strong>Aucune déviation n\'est appliquée dans le présent document</strong> : aucun contexte ' +
        'n\'ayant été renseigné, l\'allocation proposée est strictement celle du profil de risque.') +
    '</p>' +

    '<p style="font-size:11.5px;line-height:1.55"><strong>Ce que cet outil ne fait pas.</strong> ' +
    T('phrase.methode.nefaitpas') + '</p>' +
    '</div>';
}

/* ============================================================
   VUE 10 — RAPPORT
   ============================================================ */

/* Le rapport s'ouvre sur l'état des lieux : d'où l'on part, avant de dire
   où l'on va. Le relevé détaillé, lui, reste dans l'onglet « Situation »,
   qui seul permet de choisir la date et de figer un arrêté. */
function blocSituationRapport(numero) {
  const aujourd = aujourdhuiISO();

  if (!Etat.detention.length) {
    return '<div class="carte"><h3>' + numero + '. Situation de départ</h3>' +
      '<p>Aucun portefeuille n\'est détenu à ce jour. La préconisation porte sur un investissement ' +
      'initial de ' + euro(Number(Etat.identite.montant) || 0) + ' dans ' + libelleEnveloppe() + '.</p></div>';
  }

  const s = situationCourante(aujourd);
  const classes = ['actions', 'obligations', 'diversifiants', 'monetaire'].filter(cl => s.parClasse[cl]);
  const arrete = Etat.situations.filter(x => x.date !== aujourd)[0] || null;
  const dateCours = s.lignes.map(l => l.dateCours).filter(Boolean).sort().slice(-1)[0];

  return '<div class="carte"><h3>' + numero + '. Situation de départ</h3>' +
    '<p>Portefeuille détenu au ' + dateFr(aujourd) + ', valorisé ' + euro(s.total) +
    (dateCours && dateCours !== aujourd ? ' sur les cours de clôture du ' + dateFr(dateCours) : '') + '.</p>' +
    /* Le document remis dit d'où viennent ses chiffres. Sans cette ligne, un
       client lisant « valorisé au 19 août » croirait tout le portefeuille
       coté ce jour-là, alors qu'une partie vient d'un relevé antérieur. */
    '<p style="font-size:11.5px;color:#444">' + echapper(origineDesCours(s)) + '</p>' +

    '<table><thead><tr><th>Support</th><th>ISIN</th><th class="num">Valorisation</th>' +
    '<th class="num">Poids</th></tr></thead><tbody>' +
    s.lignes.map(l => '<tr><td>' + echapper(l.libelle) + '</td>' +
      '<td style="font-family:monospace;font-size:11px">' + echapper(l.isin) + '</td>' +
      '<td class="num">' + euro(l.montant) + '</td>' +
      '<td class="num">' + pct(l.poids) + '</td></tr>').join('') +
    '</tbody><tfoot><tr><td colspan="2">Total</td><td class="num">' + euro(s.total) +
    '</td><td class="num">100,0 %</td></tr></tfoot></table>' +

    (classes.length ? '<p style="margin-top:10px">Répartition par classe d\'actifs : ' +
      classes.map(cl => echapper(LIBELLES_CLASSES[cl] || cl) + ' ' + pct(s.parClasse[cl].poids)).join(' · ') +
      '.</p>' : '') +

    (arrete ? '<p>Pour mémoire, ' + MoteurSituation.libelleReference(arrete.date).toLowerCase() +
      ' au ' + dateFr(arrete.date) + ' : ' + euro(arrete.total) +
      (arrete.total ? ', soit une évolution de ' + signe(100 * (s.total - arrete.total) / arrete.total) +
        ' depuis cette date' : '') + '.</p>' : '') +

    (s.alertes.horsPeriode || s.alertes.sansCours || s.alertes.deviseAutre || s.alertes.tropAncien
      ? '<p style="font-size:11px;color:var(--gris-doux)">' +
        (s.alertes.sansCours ? s.alertes.sansCours + ' ligne(s) sans cours de marché : la valeur retenue est celle saisie. ' : '') +
        (s.alertes.horsPeriode ? s.alertes.horsPeriode + ' ligne(s) valorisée(s) au dernier cours connu. ' : '') +
        (s.alertes.deviseAutre ? s.alertes.deviseAutre + ' ligne(s) dont le cours est publié dans une autre ' +
          'devise : la valeur retenue est celle saisie. ' : '') +
        (s.alertes.tropAncien ? s.alertes.tropAncien + ' ligne(s) dont le dernier cours connu est trop ancien ' +
          'pour être retenu : la valeur retenue est celle saisie. ' : '') +
        '</p>' : '') +
    '</div>';
}

/* ------------------------------------------------------------
   LA LISTE DE CONTRÔLE AVANT IMPRESSION
   ------------------------------------------------------------
   Chacune de ces réserves existe déjà quelque part dans
   l'application — sur quatre vues différentes. Aucune ne se
   présentait au moment où l'on clique sur « Imprimer », c'est-à-
   dire à l'instant où le document cesse d'être un écran de travail
   pour devenir une pièce remise et signée.

   Elle ne bloque rien, et c'est délibéré. Un outil qui refuse
   d'imprimer se contourne, et le conseiller reste seul juge de ce
   qu'il remet. C'est une relecture, pas un garde-fou.

   Une case cochée retient l'état exact qu'elle a validé. Si cet
   état change — un support de plus, un contexte saisi, un nom
   corrigé —, la coche tombe d'elle-même : une relecture porte sur
   ce qui a été relu, pas sur la ligne qui l'annonçait.
   ------------------------------------------------------------ */
function controlesRapport() {
  const sel = selectionCourante();
  const liste = [];

  const nonVerifies = sel ? sel.lignes.filter(l => !l.etf.verifie).length : 0;
  liste.push({
    id: 'contrat',
    titre: 'Référencement des supports au contrat',
    ok: !!sel && nonVerifies === 0,
    signature: 'contrat:' + (sel ? nonVerifies + '/' + sel.lignes.length : '-'),
    detail: !sel ? 'Aucun support n\'est encore sélectionné.'
      : nonVerifies === 0
        ? 'Les ' + sel.lignes.length + ' supports proposés sont cochés comme référencés au contrat.'
        : nonVerifies + ' des ' + sel.lignes.length + ' supports proposés ne portent pas la coche ' +
          '« référencé au contrat ». Un support absent du contrat ne peut pas être souscrit, et ' +
          'le rapport le propose pourtant.',
    vue: 'univers', bouton: 'Ouvrir l\'univers ETF'
  });

  /* Un contexte non renseigné n'est pas un défaut : l'allocation stratégique
     seule est une réponse complète. Cette ligne n'est donc pas une réserve,
     mais un point à confirmer — ce qui est remis doit être ce qu'on voulait
     remettre. */
  const exprime = contexteExprime();
  const intensite = intensiteEffective();
  /* Une ligne sur laquelle on ne peut rien faire n'est pas un contrôle : dans
     un mode sans contexte, l'absence de déviation est une propriété du mode,
     dite une fois dans le document, et non une réserve à lever. */
  if (!vueMasquee('macro')) liste.push({
    id: 'contexte',
    titre: 'Vue de marché appliquée au document',
    neutre: true,
    ok: exprime && intensite > 0,
    signature: 'contexte:' + (exprime ? '1' : '0') + ':' + intensite,
    detail: !exprime
      ? 'Aucun indicateur de contexte n\'est renseigné : le document présente l\'allocation ' +
        'stratégique du profil, sans aucune déviation tactique.'
      : intensite === 0
        ? 'Le contexte est renseigné, mais l\'intensité tactique est nulle — le client a demandé ' +
          'une allocation figée. Le document présente l\'allocation stratégique.'
        : 'Le contexte est renseigné : le document présente une allocation déviée, à ' +
          pct(intensite * 100) + ' de l\'intensité maximale.',
    vue: 'macro', bouton: 'Ouvrir le contexte'
  });

  const poids = poidsTestes();
  const fiab = poids ? MoteurBacktest.fiabilite(poids, Etat.historique) : null;
  liste.push({
    id: 'backtest',
    titre: 'Part estimée des séries du backtest',
    neutre: true,
    ok: !!fiab && fiab.estime === 0,
    signature: 'backtest:' + (fiab ? Math.round(fiab.estime) : '-'),
    detail: !fiab ? 'Aucune allocation n\'est encore rejouée.'
      : fiab.estime === 0
        ? 'Toutes les séries rejouées viennent des cours relevés ou d\'une source documentée.'
        : pct(fiab.estime) + ' de l\'allocation testée repose sur des séries estimées, non ' +
          'vérifiées. Le backtest ne figure pas au rapport : ce contrôle porte sur ce qui a servi ' +
          'à se convaincre, pas sur ce qui est remis.',
    vue: 'backtest', bouton: 'Ouvrir le backtest'
  });

  /* Le nom est facultatif en mode particulier — on ne se donne pas une
     référence de dossier à soi-même. On ne contrôle pas un champ facultatif. */
  const nom = (Etat.identite.nom || '').trim();
  if (Etat.mode !== 'particulier') liste.push({
    id: 'nom',
    titre: 'Nom ou référence du dossier',
    ok: !!nom,
    signature: 'nom:' + nom,
    detail: nom
      ? 'Le document sera remis au nom de « ' + nom + ' ».'
      : 'Le champ est vide : le rapport imprimera un tiret à la place du nom.',
    vue: 'client', bouton: 'Ouvrir « Client & enveloppe »'
  });

  return liste;
}

function rendreControlesRapport() {
  const zone = $('#rapport-controles');
  if (!zone) return;
  /* Sans profil, la vue est un état vide : il n'y a rien à relire. */
  if (!resultatProfil()) { zone.innerHTML = ''; return; }

  const liste = controlesRapport();
  const coches = (Etat.rapport && Etat.rapport.controles) || {};
  const aRegarder = liste.filter(x => !x.ok).length;
  const relues = liste.filter(x => coches[x.id] === x.signature).length;

  zone.innerHTML = '<div class="carte controles">' +
    '<div class="controles-tete">' +
      '<h3>Avant d\'imprimer</h3>' +
      '<span class="badge ' + (aRegarder ? 'orange' : 'vert') + '">' +
        (aRegarder ? aRegarder + (aRegarder > 1 ? ' points à regarder' : ' point à regarder')
                   : 'rien à signaler') + '</span>' +
    '</div>' +
    '<p class="intro">Rien n\'est bloqué : le rapport s\'imprime dans tous les cas. Ces lignes ' +
      'rassemblent, à l\'instant où le document part, ce que l\'application dit ailleurs.</p>' +
    liste.map(ctrl => {
      const coche = coches[ctrl.id] === ctrl.signature;
      return '<div class="controle' + (ctrl.ok ? ' ok' : '') + (coche ? ' relu' : '') + '">' +
        '<input type="checkbox" id="ctrl-' + ctrl.id + '" data-controle="' + ctrl.id + '"' +
          (coche ? ' checked' : '') + '>' +
        '<div class="controle-corps">' +
          '<label for="ctrl-' + ctrl.id + '"><strong>' + echapper(ctrl.titre) + '</strong></label> ' +
          '<span class="badge ' + (ctrl.ok ? 'vert' : (ctrl.neutre ? 'gris' : 'orange')) + '">' +
            (ctrl.ok ? 'rien à signaler' : (ctrl.neutre ? 'à confirmer' : 'à vérifier')) + '</span>' +
          '<div class="controle-detail">' + echapper(ctrl.detail) + '</div>' +
          (ctrl.ok ? '' : '<button type="button" class="lien" data-aller="' + ctrl.vue + '">' +
            echapper(ctrl.bouton) + '</button>') +
        '</div></div>';
    }).join('') +
    '<div class="controles-pied">' + relues + ' des ' + liste.length +
      ' lignes relues pour ce dossier.</div>' +
    '</div>';
}

function rendreRapport() {
  const r = resultatProfil();
  const c = $('#rapport-contenu');
  const caseAnnexe = $('#opt-annexe-methode');
  if (caseAnnexe) caseAnnexe.checked = !Etat.rapport || Etat.rapport.annexeMethode !== false;
  rendreControlesRapport();
  if (!r) { c.innerHTML = etatVide('rapport'); return; }

  const alloc = allocationCourante();
  const sel = selectionCourante();
  const m = macroCourante();
  const metriques = MoteurAllocation.metriques(alloc.classes);
  const stress = MoteurProfil.stressTest(alloc.classes);
  const segments = Object.keys(alloc.classes).map(cl => ({
    label: LIBELLES_CLASSES[cl], valeur: alloc.classes[cl], couleur: COULEURS_CLASSES[cl]
  }));

  /* Les sections sont numérotées à l'assemblage : « Revenus programmés »
     ne figure au rapport que si un besoin est renseigné, et une numérotation
     écrite en dur y laissait un trou. */
  let nSection = 0;
  const titre = (t, classe) => '<div class="carte' + (classe ? ' ' + classe : '') + '">' +
    '<h3>' + (++nSection) + '. ' + t + '</h3>';

  c.innerHTML =
    /* En tête du document, et pas seulement en annexe : sans professionnel
       entre l'outil et celui qui décide, la réserve doit se lire d'abord. */
    (T('phrase.rapport.avertissement')
      ? '<div class="carte avertissement-rapport">' + T('phrase.rapport.avertissement') + '</div>' : '') +
    '<div class="carte">' +
      '<h3>Proposition d\'allocation d\'actifs</h3>' +
      '<table><tbody>' +
      ligne(T('rapport.ligne.client'), Etat.identite.nom || '—') +
      ligne('Date', dateFr()) +
      ligne('Enveloppe', libelleEnveloppe()) +
      ligne('Montant', euro(Number(Etat.identite.montant) || 0)) +
      ligne('Versement programmé', euro(Number(Etat.identite.versement) || 0) + ' / mois') +
      ligne('Profil retenu', r.profil.nom + ' (SRI ' + r.profil.sri + ')') +
      ligne('Horizon déclaré', r.preferences.horizon + ' ans') +
      '</tbody></table>' +
    '</div>' +

    blocSituationRapport(++nSection) +

    titre('Détermination du profil') +
      '<p>Le questionnaire évalue trois axes indépendants. Le profil retenu correspond au minimum entre la ' +
      '<strong>capacité de perte</strong> (' + r.scores.capacite + '/100) et la <strong>tolérance au risque</strong> (' +
      r.scores.tolerance + '/100), plafonné le cas échéant par la connaissance des marchés (' + r.scores.connaissance + '/100).</p>' +
      (r.declasse ? '<p><strong>Plafonnement appliqué :</strong> ' + r.plafondsAppliques.map(echapper).join(' ; ') + '.</p>' : '') +
      (r.alertes.length ? '<p><strong>Points de vigilance :</strong></p><ul>' +
        r.alertes.map(a => '<li>' + echapper(a) + '</li>').join('') + '</ul>' : '') +
      '<p>' + echapper(r.profil.description) + ' Volatilité attendue : ' + pct(metriques.volatilite) +
      '. Rendement annuel espéré sur la durée de placement : ' + pct(metriques.rendement) + '.</p>' +
    '</div>' +

    /* Sans contexte saisi, `macroCourante()` rend des probabilités de repli
       qui pèsent 66,7 % sur l'atterrissage en douceur. Les imprimer sous le
       titre « distribution retenue » les présentait au client comme une vue
       de marché que personne n'avait exprimée — la dernière fuite des
       probabilités par défaut, et la plus visible, puisqu'elle était dans le
       document remis. Sans contexte, il n'y a pas de tableau : il y a une
       phrase qui dit qu'il n'y en a pas. */
    titre('Lecture du contexte de marché') +
      (contexteExprime()
        ? '<p>Distribution de scénarios retenue à la date du ' + dateFr() + ' :</p>' +
          '<table><thead><tr><th>Scénario</th><th class="num">Probabilité</th><th>Implications</th></tr></thead><tbody>' +
          SCENARIOS.slice().sort((a, b) => m.probas[b.id] - m.probas[a.id]).map(s =>
            '<tr><td><span class="pastille" style="background:' + s.couleur + '"></span><strong>' + s.nom + '</strong></td>' +
            '<td class="num"><strong>' + Math.round(m.probas[s.id]) + ' %</strong></td>' +
            '<td style="font-size:12px">' + echapper(s.description) + '</td></tr>').join('') +
          '</tbody></table>' +
          (alloc.explications.length && intensiteEffective() > 0
            ? '<p style="margin-top:12px">Déviations tactiques retenues : ' +
              alloc.explications.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)).slice(0, 8)
                .map(e => (LIBELLES_POCHES[e.poche] || e.poche) + ' ' + signe(e.deviation)).join(' · ') + '.</p>'
            : '<p style="margin-top:12px">Aucune déviation tactique significative n\'est retenue à ce stade.</p>')
        : '<p>' + T('phrase.rapport.contexte.absent') + '</p>') +
    '</div>' +

    titre('Allocation cible', 'saut-page') +
      '<div class="graphique">' + donut(segments, 170, 32) + '<div style="flex:1;min-width:220px">' + legende(segments) + '</div></div>' +
      '<table style="margin-top:14px"><thead><tr><th>Poche</th><th class="num">Poids</th><th class="num">Montant</th></tr></thead><tbody>' +
      Object.keys(alloc.poches).filter(p => alloc.poches[p] > 0).sort((a, b) => alloc.poches[b] - alloc.poches[a]).map(p =>
        '<tr><td>' + echapper(LIBELLES_POCHES[p] || p) + '</td><td class="num">' + pct(alloc.poches[p]) + '</td>' +
        '<td class="num">' + euro((Number(Etat.identite.montant) || 0) * alloc.poches[p] / 100) + '</td></tr>').join('') +
      '</tbody></table>' +
    '</div>' +

    titre('Supports retenus') +
      '<table><thead><tr><th>Support</th><th>ISIN</th><th class="num">Note</th><th class="num">Frais</th>' +
      '<th class="num">Poids</th><th class="num">Montant</th></tr></thead><tbody>' +
      sel.lignes.map(l => '<tr><td>' + echapper(l.etf.nom) + '</td>' +
        '<td style="font-family:monospace;font-size:11px">' + echapper(l.etf.isin) + '</td>' +
        '<td class="num">' + (l.etf.morningstar == null ? '—' : l.etf.morningstar + '★') + '</td>' +
        '<td class="num">' + pct(l.etf.ter, 2) + '</td>' +
        '<td class="num">' + pct(l.poids) + '</td><td class="num">' + euro(l.montant) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="3">Frais courants moyens pondérés</td><td class="num">' + pct(sel.terMoyen, 2) + '</td>' +
      '<td class="num">100,0 %</td><td class="num">' + euro(sel.lignes.reduce((a, l) => a + l.montant, 0)) + '</td></tr></tfoot></table>' +
      '<p style="font-size:11px;color:var(--gris-doux);margin-top:8px">Ces frais s\'ajoutent aux frais de gestion du contrat ' +
      'et, le cas échéant, aux frais d\'arbitrage.</p>' +
    '</div>' +

    titre('Simulation de perte') +
      '<table><thead><tr><th>Scénario de stress</th><th class="num">Impact</th><th class="num">Valeur du portefeuille</th></tr></thead><tbody>' +
      stress.map(s => '<tr><td>' + echapper(s.nom) + '</td><td class="num negatif">' + pct(s.impact) + '</td>' +
        '<td class="num">' + euro((Number(Etat.identite.montant) || 0) * (1 + s.impact / 100)) + '</td></tr>').join('') +
      '</tbody></table>' +
    '</div>' +

    (function () {
      const parAn = MoteurRevenus.FREQUENCES[Etat.revenus.frequence].parAn;
      const besoinAnnuel = Number(Etat.revenus.besoin) * parAn;
      if (!besoinAnnuel || !Etat.detention.length) return '';
      const plan = MoteurRevenus.planifier(Etat.detention, sel.lignes, {
        enveloppe: Etat.identite.enveloppe || 'AV', besoinAnnuel, frequence: Etat.revenus.frequence,
        coussinMois: Number(Etat.revenus.coussinMois), anciennete: Number(Etat.revenus.anciennete),
        couple: Etat.revenus.couple === true || Etat.revenus.couple === '1',
        primesVersees: Number(Etat.revenus.primesVersees) || 0, rendementEspere: metriques.rendement
      }, universSelection());
      if (!plan) return '';
      return titre('Revenus programmés', 'saut-page') +
        '<p>Revenu net souhaité : <strong>' + euro(plan.besoinParEcheance) + '</strong> par échéance ' +
        plan.frequence.libelle.toLowerCase() + ', soit ' + euro(plan.besoinAnnuel) + ' par an — taux de retrait de ' +
        pct(plan.tauxRetrait, 2) + ' pour un rendement réel espéré de ' + pct(plan.projection.tauxSoutenable, 2) + '. ' +
        'Coût fiscal annuel estimé : ' + euro(plan.fiscalite.total) + '.</p>' +
        '<table><thead><tr><th>Support prélevé</th><th class="num">Par échéance</th><th class="num">Par an</th><th>Motif</th></tr></thead><tbody>' +
        plan.supports.map(s => '<tr><td>' + echapper(s.libelle) + '</td>' +
          '<td class="num">' + euro(s.parEcheance) + '</td><td class="num">' + euro(s.montant) + '</td>' +
          '<td style="font-size:11px">' + s.etapes.map(e => echapper((CASCADE_REVENUS.find(x => x.id === e) || {}).libelle || e)).join(', ') +
          '</td></tr>').join('') + '</tbody></table>' +
        '<p style="font-size:11px;color:var(--gris-doux);margin-top:8px">' + echapper(plan.fiscalite.regime) + '</p>' +
        (plan.alertes.filter(a => a.niveau !== 'succes').length
          ? '<p><strong>Points d\'attention :</strong></p><ul>' +
            plan.alertes.filter(a => a.niveau !== 'succes').map(a => '<li>' + echapper(a.texte) + '</li>').join('') + '</ul>'
          : '') +
      '</div>';
    })() +

    titre('Suivi et arbitrages') +
      '<p>Le portefeuille fait l\'objet d\'une revue au moins semestrielle et à chaque évolution significative du ' +
      'contexte économique, géopolitique ou fiscal. Un arbitrage n\'est proposé que si l\'écart à l\'allocation cible ' +
      'dépasse ' + pct(SEUILS_ARBITRAGE.ecartAbsoluMin) + ' de l\'encours, afin d\'éviter une rotation inutile. ' +
      echapper((MoteurArbitrage.FISCALITE[Etat.identite.enveloppe || 'AV'] || {}).libelle || '') + '</p>' +
      (Etat.journal.length ? '<p>Revues déjà réalisées : ' + Etat.journal.length +
        ', dernière le ' + dateFr(Etat.journal[0].date) + '.</p>' : '') +
    '</div>' +

    (Etat.rapport && Etat.rapport.annexeMethode === false ? '' : annexeMethode(++nSection)) +

    '<div class="carte mentions"><h3>Mentions</h3>' +
      '<h4>Nature du document</h4>' +
      '<p>' + T('phrase.mentions.nature') + '</p>' +
      '<h4>Risques</h4>' +
      '<p>Les investissements en unités de compte présentent un risque de perte en capital. L\'assureur ne s\'engage ' +
      'que sur le nombre d\'unités de compte et non sur leur valeur. Les performances passées ne préjugent pas des ' +
      'performances futures. Les rendements et volatilités indiqués sont des estimations fondées sur des hypothèses ' +
      'de long terme et ne constituent pas une garantie.</p>' +
      '<h4>Données</h4>' +
      '<p>Les caractéristiques des supports (ISIN, frais courants, encours, notations, éligibilité) doivent être ' +
      'vérifiées dans le document d\'informations clés (DIC) de chaque produit et dans la liste des supports du ' +
      'contrat à la date de souscription. Les notations Morningstar sont des indicateurs quantitatifs rétrospectifs ' +
      'et ne constituent pas une prévision de performance.</p>' +
      '<h4>Scénarios</h4>' +
      '<p>' + T('phrase.mentions.scenarios') + '</p>' +
      '<p style="margin-top:14px">' + T('phrase.mentions.signature', { date: dateFr() }) + '</p>' +
    '</div>';
}
