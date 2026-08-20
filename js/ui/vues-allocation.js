/* =============================================================
   VUES — ALLOCATION
   -------------------------------------------------------------
   Le bloc Allocation : note du jour, contexte, allocation cible, sélection des
   supports, arbitrages, backtest.

   Déplacé depuis js/app.js sans une virgule de changement.
   ============================================================= */

/* ============================================================
   VUE 4 — NOTE DE MARCHÉ
   ============================================================ */

function rendreNote() {
  const c = $('#note-contenu');
  const dispo = typeof NOTE_MARCHE !== 'undefined' && NOTE_MARCHE;

  if (!dispo) {
    c.innerHTML =
      '<div class="message alerte"><strong>Aucune note disponible.</strong> ' +
      'La rédaction quotidienne n\'est pas encore activée.</div>' +
      '<div class="carte"><h3>Activer la note</h3>' +
      '<p class="intro">La note est rédigée par l\'API Claude à partir des cours relevés chaque matin, ' +
      'puis publiée avec le site. Elle coûte environ <strong>1,30 $ par mois</strong> en appels d\'API.</p>' +
      '<ol style="font-size:13px;line-height:1.8">' +
      '<li>Créez une clé sur <a href="https://platform.claude.com" target="_blank" rel="noopener">platform.claude.com</a> ' +
      'et créditez le compte (5 $ minimum, soit environ quatre mois).</li>' +
      '<li>Dans le dépôt GitHub : <em>Settings → Secrets and variables → Actions → New repository secret</em>, ' +
      'nommé <code>ANTHROPIC_API_KEY</code>.</li>' +
      '<li>La tâche planifiée s\'en charge ensuite seule. Pour un essai immédiat, déclenchez ' +
      '« Mise à jour des cours » depuis l\'onglet <em>Actions</em>.</li>' +
      '</ol>' +
      '<p class="intro" style="font-size:12px">La clé reste dans les secrets du dépôt, chiffrée. ' +
      'Elle n\'apparaît jamais dans le code publié — une clé placée dans le JavaScript d\'un site public ' +
      'serait lisible par tous et consommée en quelques jours.</p></div>';
    return;
  }

  const n = NOTE_MARCHE.note;
  c.innerHTML =
    '<div class="message alerte"><strong>Document de travail interne.</strong> ' +
    'Cette note décrit des mouvements de marché et des points à contrôler. Elle ne constitue pas une ' +
    'recommandation d\'investissement et ne doit pas être remise à un client en l\'état. Rédigée ' +
    'automatiquement à partir des cours : vérifiez ce qu\'elle avance avant de vous en servir.</div>' +

    '<div class="carte">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px">' +
        '<h3 style="margin:0">' + echapper(n.titre) + '</h3>' +
        (function (f) {
          return '<span class="badge ' + (f.retard ? 'orange' : 'gris') + '">' +
            echapper(f.texte.charAt(0).toUpperCase() + f.texte.slice(1)) +
            (f.retard ? ' · ' + f.jours + ' jours' : '') + '</span>';
        })(libelleCloture(NOTE_MARCHE.genere)) +
      '</div>' +
      '<p style="margin-top:12px;font-size:15px;line-height:1.6">' + echapper(n.synthese) + '</p>' +
    '</div>' +

    (n.mouvements && n.mouvements.length ?
      '<div class="carte"><h3>Ce qui a bougé</h3>' +
        n.mouvements.map(m =>
          '<div style="border-left:3px solid var(--gris-ligne);padding-left:14px;margin-bottom:16px">' +
          '<div style="font-weight:600;margin-bottom:2px">' + echapper(m.poche) + '</div>' +
          '<div style="font-size:13px">' + echapper(m.constat) + '</div>' +
          '<div style="font-size:13px;color:var(--gris-doux);margin-top:2px">' + echapper(m.lecture) + '</div>' +
          '</div>').join('') +
      '</div>' : '') +

    '<div class="grille deux">' +
      (n.aVerifier && n.aVerifier.length ?
        '<div class="carte"><h3>À vérifier dans les dossiers</h3><ul style="font-size:13px;line-height:1.7">' +
        n.aVerifier.map(x => '<li>' + echapper(x) + '</li>').join('') + '</ul></div>' : '') +
      (n.indicateursASurveiller && n.indicateursASurveiller.length ?
        '<div class="carte"><h3>Lectures macro à réexaminer</h3><ul style="font-size:13px;line-height:1.7">' +
        n.indicateursASurveiller.map(x => '<li>' + echapper(x) + '</li>').join('') + '</ul>' +
        '<div class="barre-actions"><button class="bouton secondaire" data-aller="macro">' +
        'Ouvrir le contexte macro →</button></div></div>' : '') +
    '</div>' +

    /* D'où vient la note, en une ligne. Elle est rédigée à partir du SEUL
       relevé de cours : `scripts/note-marche.mjs` ne reçoit que
       `data/variations.json`. Le contexte macro saisi par le conseiller
       n'y entre pas, et la mention ne peut donc pas le dire — écrire
       « et du contexte renseigné » serait faux même un jour où le
       contexte est rempli. */
    '<p class="intro" style="font-size:11px">Note calculée à partir des cours relevés le ' +
    echapper(dateFr(NOTE_MARCHE.genere)) + ' — sans source d\'actualité.</p>';
}

/* ============================================================
   VUE 5 — MACRO
   ============================================================ */

function rendreMacro() {
  const groupes = [];
  INDICATEURS.forEach(i => { if (groupes.indexOf(i.groupe) < 0) groupes.push(i.groupe); });

  $('#indicateurs').innerHTML = '<h3>Lecture du contexte</h3>' + groupes.map(g =>
    '<div class="groupe-macro"><h4>' + echapper(g) + '</h4>' +
    INDICATEURS.filter(i => i.groupe === g).map(ind => {
      /* UNE OPTION VIDE, ET ELLE EST SÉLECTIONNÉE PAR DÉFAUT.

         La liste présélectionnait la valeur de repli — « Stabilisation »,
         « Neutres », « Dans la moyenne ». Onze listes paraissaient donc
         remplies au-dessus d'un bandeau disant « aucun indicateur n'est
         renseigné » : deux affirmations contraires sur le même écran, et
         c'est l'écran qui avait tort.

         Ce que l'on voit dit maintenant ce que l'application calcule. */
      const choisi = Etat.macroChoix[ind.id] !== undefined;
      const val = choisi ? Etat.macroChoix[ind.id] : '';
      return '<div class="indicateur"><label>' + echapper(ind.label) + '</label>' +
        (ind.aide ? '<div class="aide">' + echapper(ind.aide) + '</div>' : '') +
        '<select data-macro="' + ind.id + '"' + (choisi ? '' : ' class="non-renseigne"') + '>' +
          '<option value=""' + (choisi ? '' : ' selected') + '>— non renseigné</option>' +
          ind.options.map(o =>
            '<option value="' + o.valeur + '"' + (o.valeur === val ? ' selected' : '') + '>' +
            echapper(o.label) + '</option>'
          ).join('') + '</select></div>';
    }).join('') + '</div>').join('');

  const m = macroCourante();
  $('#scenarios').innerHTML = SCENARIOS.map(s =>
    '<div class="scenario" style="border-left:4px solid ' + s.couleur + '">' +
      '<div class="tete"><span class="nom">' + echapper(s.nom) + '</span>' +
      '<span class="proba" style="color:' + s.couleur + '">' + Math.round(m.probas[s.id]) + ' %</span></div>' +
      '<div class="desc">' + echapper(s.description) + '</div>' +
      '<input type="range" min="0" max="100" step="5" value="' + Math.round(m.probas[s.id]) + '" data-scenario="' + s.id + '">' +
      '<div class="desc" style="margin-top:4px">Inflexions : ' +
        Object.keys(s.tilts).filter(k => s.tilts[k] !== 0)
          .map(k => LIBELLES_CLASSES[k] + ' ' + signe(s.tilts[k], 0)).join(' · ') +
      '</div>' +
    '</div>').join('') +
    (Etat.scenariosManuels
      ? '<div class="message info" style="margin-top:10px">Probabilités ajustées manuellement.</div>'
      /* Sans indicateur renseigné, les probabilités affichées sont celles du
         repli — 66,7 % sur l'atterrissage en douceur. Les montrer sans le dire
         reviendrait à présenter une vue de marché par défaut comme une lecture
         du conseiller ; c'est exactement ce qu'elles ne sont pas. */
      /* TROIS ÉTATS, ET NON UN TOUT-OU-RIEN.

         « Renseigné » n'est pas binaire : entre zéro et onze indicateurs, il
         y a neuf situations où le conseiller a commencé sans finir. Lui dire
         « aucun » quand il en a choisi trois est faux, et lui laisser croire
         que les onze pèsent l'est tout autant.

         Ce que le bandeau doit dire, c'est CE QUI ENTRE DANS LE CALCUL :
         dès le premier indicateur choisi, la déviation s'applique — et les
         indicateurs laissés vides y pèsent leur valeur de repli. C'est
         mesurable : un seul choix sur « cycle » fait passer l'atterrissage
         de 66,7 % à 41,7 %. Le taire reviendrait à présenter une lecture
         partielle comme une lecture complète. */
      : !m.exprime
        ? '<div class="message alerte" style="margin-top:10px"><strong>Aucun des ' +
          INDICATEURS.length + ' indicateurs n\'est renseigné.</strong> Les probabilités ' +
          'ci-dessus sont celles du repli, pas une lecture du marché : tant qu\'aucun ' +
          'indicateur n\'est choisi, elles n\'entrent dans aucun calcul et l\'allocation ' +
          'cible reste strictement stratégique.</div>'
        : (function () {
            const n = INDICATEURS.length;
            const k = Object.keys(Etat.macroChoix).length;
            if (k >= n) {
              return '<div class="message info" style="margin-top:10px"><strong>Les ' + n +
                ' indicateurs sont renseignés.</strong> Les probabilités ci-dessus sont votre ' +
                'lecture du marché, et la déviation tactique en découle.</div>';
            }
            return '<div class="message info" style="margin-top:10px"><strong>' + k +
              ' indicateur' + (k > 1 ? 's' : '') + ' renseigné' + (k > 1 ? 's' : '') +
              ' sur ' + n + '.</strong> La déviation tactique s\'applique dès le premier ' +
              'choix. Les ' + (n - k) + ' indicateur' + (n - k > 1 ? 's' : '') +
              ' laissé' + (n - k > 1 ? 's' : '') + ' vide' + (n - k > 1 ? 's' : '') +
              ' pèsent leur valeur de repli dans le calcul — la lecture est partielle, ' +
              'pas neutre.</div>';
          })());

  const alloc = allocationCourante();
  $('#overlays-macro').innerHTML = '<h3>Déviations appliquées</h3>' +
    (!alloc ? '<div class="message alerte">Complétez le questionnaire pour visualiser les déviations appliquées.</div>' :
      (intensiteEffective() === 0
        ? '<div class="message info"><strong>Aucune déviation tactique n\'est appliquée.</strong> ' +
          (contexteExprime()
            ? 'La gestion tactique est neutralisée par les préférences du client.'
            : 'Aucun indicateur de contexte n\'est renseigné : l\'allocation cible reste ' +
              'strictement celle du profil de risque.') + '</div>'
        : '') +
      (alloc.explications.length === 0
        ? '<p class="intro">Le contexte renseigné ne justifie aucune déviation significative.</p>'
        : '<table><thead><tr><th>Poche</th><th class="num">Déviation</th></tr></thead><tbody>' +
          alloc.explications.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)).map(e =>
            '<tr><td><span class="pastille" style="background:' + COULEURS_CLASSES[e.classe] + '"></span>' +
            echapper(LIBELLES_POCHES[e.poche] || e.poche) + '</td>' +
            '<td class="num ' + (e.deviation > 0 ? 'positif' : 'negatif') + '">' + signe(e.deviation) + '</td></tr>').join('') +
          '</tbody></table>') +
      (m.journal.length ? '<h4 style="margin-top:16px">Origine des surcouches</h4><ul style="font-size:12px;color:var(--gris-doux);padding-left:18px">' +
        m.journal.map(j => '<li><strong>' + echapper(j.indicateur) + '</strong> — ' + echapper(j.choix) + '</li>').join('') + '</ul>' : '')
    );
}

/* ============================================================
   VUE 5 — ALLOCATION
   ============================================================ */

function rendreAllocation() {
  const r = resultatProfil();
  const c = $('#allocation-contenu');
  if (!r) { c.innerHTML = etatVide('allocation'); return; }

  const alloc = allocationCourante();
  const m = macroCourante();
  const scenarioDominant = SCENARIOS.find(s => s.id === m.dominant);
  const metriquesStrat = MoteurAllocation.metriques(alloc.strategique.classes);
  const metriquesTact  = MoteurAllocation.metriques(alloc.classes);

  const poches = Object.keys(alloc.poches).filter(p => alloc.poches[p] > 0)
    .sort((a, b) => alloc.poches[b] - alloc.poches[a]);

  /* Le sous-titre de chaque classe n'est pas écrit à la main : ce sont ses
     POCHES retenues, dans l'ordre de poids. Une liste écrite en dur aurait
     annoncé « Or · immobilier coté » même le jour où l'une des deux tombe
     à zéro. Trois au plus — au-delà, la ligne déborde et n'apprend plus
     rien qu'une lecture du tableau ne dise mieux. */
  const pochesParClasse = {};
  poches.forEach(p => {
    const cl = MoteurSelection.classeDePoche(p);
    /* Le nom de la classe se répète dans celui de chaque poche —
       « Actions Monde », « Actions Europe », « Actions États-Unis ». Sous
       un titre qui dit déjà « Actions », le redire trois fois occupe la
       ligne sans rien apprendre. On le retire en tête, et seulement en
       tête : « Or » et « Immobilier coté » n'ont pas de préfixe et
       ressortent intacts. */
    /* La parenthèse part avec : « Immobilier coté (SIIC / REITs) » est une
       définition, et une définition n'a pas sa place dans une légende de
       trois mots. Elle reste au tableau, juste dessous. */
    const brut = (LIBELLES_POCHES[p] || p).replace(/\s*\([^)]*\)/g, '');
    const prefixe = LIBELLES_CLASSES[cl] + ' ';
    (pochesParClasse[cl] = pochesParClasse[cl] || [])
      .push(brut.indexOf(prefixe) === 0 ? brut.slice(prefixe.length) : brut);
  });

  /* Triées par poids décroissant : l'anneau se lit alors dans le sens des
     aiguilles en partant de la plus grosse part, et la légende suit le même
     ordre que le dessin. Sans tri, l'oeil fait l'aller-retour. */
  const segments = Object.keys(alloc.classes).map(cl => ({
    label: LIBELLES_CLASSES[cl], valeur: alloc.classes[cl], couleur: COULEURS_CLASSES[cl],
    sous: (pochesParClasse[cl] || []).slice(0, 3).join(' · ')
  })).sort((a, b) => b.valeur - a.valeur);

  /* Le centre de l'anneau dit la classe dominante. C'est le chiffre qu'on
     vient chercher en premier — « combien d'actions ? » —, et le lire au
     coeur du dessin évite de comparer quatre arcs à l'oeil. */
  const dominante = segments.filter(g => g.valeur > 0)
    .reduce((a, b) => (b.valeur > a.valeur ? b : a), { valeur: -1 });

  /* Sans contexte, la vue s'affiche quand même — l'allocation stratégique du
     profil est une réponse complète, pas un pis-aller. Elle dit seulement
     qu'aucune vue de marché n'y est mêlée, et propose d'aller en exprimer une. */
  const sansContexte = !contexteExprime();

  /* Un dossier constitué avant cette version a pu produire un rapport où
     l'allocation portait une déviation issue des probabilités par défaut.
     Les chiffres ont changé : le dire une fois vaut mieux que laisser
     découvrir l'écart en comparant deux rapports. Une fois lu, l'avis ne
     revient pas — il vieillirait en bandeau permanent. */
  /* Cet avis compare à un rapport antérieur produit avec des probabilités par
     défaut. Un mode qui n'a jamais eu de contexte n'a jamais eu ce rapport. */
  const avisChangement = sansContexte && !Etat.avisTactiqueLu && !vueMasquee('macro')
    ? '<div class="message alerte" id="avis-tactique">' +
      '<strong>Ce que l\'application calcule a changé.</strong> Depuis cette version, un dossier ' +
      'sans contexte saisi ne reçoit plus aucune déviation tactique : l\'allocation cible est ' +
      'exactement l\'allocation stratégique du profil. Auparavant, un contexte vierge appliquait ' +
      'des probabilités par défaut — les chiffres ci-dessous peuvent donc différer d\'un rapport ' +
      'antérieur, jusqu\'à trois points sur une classe d\'actifs.' +
      '<div class="barre-actions"><button class="bouton secondaire" id="btn-avis-lu">J\'ai compris</button>' +
      '<button class="bouton secondaire" data-aller="macro">Renseigner le contexte</button></div></div>'
    : '';

  c.innerHTML =
    avisChangement +
    (sansContexte
      ? '<div class="message info">' + T('phrase.sansContexte.allocation') + '</div>'
      : '') +
    /* « Scénario dominant » ne peut jamais rien valoir dans un mode sans
       contexte : un indicateur structurellement vide occupe une place et
       n'apprend rien. Il tombe, et les trois autres s'élargissent. */
    '<div class="grille ' + (vueMasquee('macro') ? 'trois' : 'quatre') + '">' +
      /* Le SRI quitte la carte du profil comme il a quitté l'en-tête de
         « Mon profil » : il reste au rapport, où il justifie un classement.
         Ici, un chiffre de 1 à 7 sans échelle ne dit rien. */
      kpi(r.profil.nom, 'Profil',
          T('alloc.kpi.gain') === 'alloc.kpi.gain' && r.profil.sri ? 'SRI ' + r.profil.sri : '') +
      /* Les deux mêmes métriques, dites en euros quand un montant existe.
         Sans montant, les taux — afficher « 0 € » serait faux. */
      kpiMontant('alloc.kpi.gain', 'Rendement espéré', 'hypothèses long terme',
                 pct(metriquesTact.rendement), metriquesTact.rendement) +
      kpiMontant('alloc.kpi.amplitude', 'Volatilité estimée',
                 'contre ' + pct(metriquesStrat.volatilite) + ' en stratégique',
                 pct(metriquesTact.volatilite), metriquesTact.volatilite) +
      (vueMasquee('macro') ? '' :
        kpi(scenarioDominant ? Math.round(m.probas[m.dominant]) + ' %' : '—', 'Scénario dominant',
            scenarioDominant ? scenarioDominant.nom : 'aucun contexte renseigné')) +
    '</div>' +

    (alloc.coussin ? '<div class="message info"><strong>Allocation ajustée pour servir un revenu.</strong> ' +
      'La poche monétaire est portée à ' + pct(alloc.coussin.coussinPct) + ' (' + euro(alloc.coussin.coussinEuros) +
      ', soit ' + Etat.revenus.coussinMois + ' mois de retraits) contre ' + pct(alloc.coussin.monetaireAvant) +
      ' pour le profil seul. Ce coussin évite d\'avoir à vendre des actions pendant une baisse de marché.</div>' : '') +

    '<div class="grille deux">' +
      '<div class="carte carte-repartition">' +
        '<div class="tete-carte"><h3>Répartition par classe d\'actifs</h3>' +
        /* Le badge dit la NATURE de ce qui est montré, là où on le regarde.
           Le bandeau « aucun contexte renseigné » le dit déjà en toutes
           lettres plus haut ; le badge le redit sur la carte elle-même, pour
           qui arrive par le graphique et non par le texte. */
        (sansContexte ? '<span class="badge violet">' +
          echapper(mot('alloc.badge.strategique', 'Stratégique seule')) + '</span>' : '') +
        '</div>' +
        '<div class="graphique">' +
          donut(segments, 208, 30, dominante.valeur > 0
            ? { valeur: pct(dominante.valeur), libelle: dominante.label } : null) +
          '<div style="flex:1;min-width:220px">' + legende(segments) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="carte"><h3>' + echapper(mot('alloc.barres.titre', 'Stratégique vs tactique')) + '</h3>' +
        '<div class="barres">' + Object.keys(alloc.classes).map(cl => {
          const t = alloc.classes[cl], s = alloc.strategique.classes[cl], d = t - s;
          return '<div class="barre"><div class="tete"><span>' + LIBELLES_CLASSES[cl] + '</span>' +
            '<span>' + pct(t) + ' <span style="color:var(--gris-doux)">' +
            echapper(T('alloc.barres.cible') === 'alloc.barres.cible'
              ? '(cible stratégique ' + pct(s) + ')'
              : T('alloc.barres.cible', { pct: pct(s) })) + '</span> ' +
            (Math.abs(d) >= 0.1 ? '<strong class="' + (d > 0 ? 'positif' : 'negatif') + '">' + signe(d) + '</strong>' : '') +
            '</span></div>' +
            '<div class="piste"><div class="part" style="width:' + t + '%;background:' + COULEURS_CLASSES[cl] + '"></div>' +
            '<div class="cible" style="left:calc(' + s + '% - 1px)" title="Cible stratégique"></div></div></div>';
        }).join('') + '</div>' +
        '<p class="intro" style="font-size:11px;margin-top:10px">' +
        echapper(T('alloc.barres.note') === 'alloc.barres.note'
          ? 'Le repère vertical marque l\'allocation stratégique du profil. Les déviations tactiques ' +
            'sont bornées à ±' + BORNES_TACTIQUES.actions + ' points sur les actions.'
          : T('alloc.barres.note', { points: BORNES_TACTIQUES.actions })) + '</p>' +
      '</div>' +
    '</div>' +

    '<div class="carte"><h3>Détail par poche</h3>' +
      '<div class="tableau-defilant"><table><thead><tr>' +
      '<th>Poche' + aide('poche') + '</th><th>Classe</th>' +
      '<th class="num">' + echapper(mot('alloc.colonne.strategique', 'Stratégique')) + '</th>' +
      '<th class="num">' + echapper(mot('alloc.colonne.tactique', 'Tactique')) + '</th>' +
      '<th class="num">Écart</th><th class="num">Montant</th>' +
      '</tr></thead><tbody>' +
      poches.map(p => {
        const t = alloc.poches[p], s = alloc.strategique.poches[p] || 0, d = t - s;
        const cl = MoteurSelection.classeDePoche(p);
        return '<tr><td><span class="pastille" style="background:' + COULEURS_CLASSES[cl] + '"></span>' +
          echapper(LIBELLES_POCHES[p] || p) + '</td>' +
          '<td>' + LIBELLES_CLASSES[cl] + '</td>' +
          '<td class="num">' + pct(s) + '</td><td class="num"><strong>' + pct(t) + '</strong></td>' +
          '<td class="num ' + (Math.abs(d) < 0.1 ? '' : d > 0 ? 'positif' : 'negatif') + '">' + (Math.abs(d) < 0.1 ? '—' : signe(d)) + '</td>' +
          '<td class="num">' + euro((Number(Etat.identite.montant) || 0) * t / 100) + '</td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="3">Total</td><td class="num">' +
      pct(poches.reduce((a, p) => a + alloc.poches[p], 0)) + '</td><td></td><td class="num">' +
      euro(Number(Etat.identite.montant) || 0) + '</td></tr></tfoot></table></div>' +
    '</div>';
}

/* ============================================================
   VUE 6 — SÉLECTION ETF
   ============================================================ */

function rendrePortefeuille() {
  const r = resultatProfil();
  const c = $('#portefeuille-contenu');
  if (!r) { c.innerHTML = etatVide('portefeuille'); return; }

  const sel = selectionCourante();
  const ctx = contexteSelection();
  const alloc = allocationCourante();
  const nonVerifies = sel.lignes.filter(l => !l.etf.verifie).length;
  const sansNotation = sel.lignes.filter(l => l.etf.morningstar == null).length;
  const duCatalogue = sel.lignes.filter(l => l.etf.deduit).length;

  /* Écart entre l'allocation visée et celle réellement implémentable */
  const derives = Object.keys(alloc.classes)
    .map(cl => ({ cl, ecart: (sel.classesObtenues[cl] || 0) - alloc.classes[cl] }))
    .filter(d => Math.abs(d.ecart) >= 2);

  /* Les deux tuiles disaient le même nombre : « frais moyens » en taux et
     « coût annuel » en euros. En mode particulier la première porte déjà le
     montant — la seconde devient un doublon, et trois tuiles valent mieux que
     quatre dont deux répètent. */
  const fraisEnEuros = T('supports.kpi.frais') !== 'supports.kpi.frais' &&
                       (Number(Etat.identite.montant) || 0) > 0;

  c.innerHTML =
    '<div class="grille ' + (fraisEnEuros ? 'trois' : 'quatre') + '">' +
      /* Deux tuiles désignées, et deux seulement : ce qu'on a mis, et
         dans quoi on a puisé. Les deux autres — frais, coût annuel —
         sont des résultats, et restent blanches. */
      kpi(String(sel.nbSupports), 'Supports retenus', 'sur ' + sel.universEligible + ' éligibles',
          '', 'corail') +
      /* Un taux de frais ne se sent pas ; un montant annuel, si. Le calcul est
         celui de la tuile « Coût annuel » juste à côté — les deux disent la
         même chose, l'une en taux, l'autre en euros. */
      (fraisEnEuros
        ? kpi(pct(sel.terMoyen, 2), T('supports.kpi.frais'),
              T('supports.kpi.frais.detail',
                { montant: euro((Number(Etat.identite.montant) || 0) * sel.terMoyen / 100) }))
        : kpi(pct(sel.terMoyen, 2), 'Frais courants moyens', 'pondérés par les encours cibles')) +
      kpi(euro(Number(Etat.identite.montant) || 0), 'Montant investi', libelleEnveloppe(),
          '', 'menthe') +
      (fraisEnEuros ? '' :
        kpi(euro((Number(Etat.identite.montant) || 0) * sel.terMoyen / 100), 'Coût annuel des supports',
            'hors frais de contrat')) +
    '</div>' +

    (catalogueAttendu()
      ? '<div class="message info">Chargement du catalogue européen… la sélection ci-dessous porte encore ' +
        'sur les ' + Etat.univers.length + ' supports de l\'univers de travail.</div>' : '') +

    (duCatalogue ? '<div class="message alerte"><strong>' + duCatalogue + ' des ' + sel.lignes.length +
      ' supports retenus viennent du catalogue européen.</strong> ' +
      'Frais courants, encours, note et SRI sont sourcés chez Morningstar. En revanche la couverture de ' +
      'change, la part capitalisante ou distribuante et le label de durabilité sont <em>déduits du nom</em>, ' +
      'la réplication n\'est pas connue, et <strong>l\'éligibilité PEA n\'est pas publiée</strong> — un support ' +
      'du catalogue est réputé non éligible faute d\'information, pas parce qu\'il ne l\'est pas. ' +
      'Avant toute remise au client, versez les supports retenus dans l\'univers de travail depuis l\'onglet ' +
      '« Univers ETF » et contrôlez leur ligne.</div>' : '') +

    (nonVerifies ? bandeauSupportsAVerifier(nonVerifies) : '') +

    (sansNotation ? '<div class="message info"><strong>' + sansNotation + ' support(s) sans notation Morningstar.</strong> ' +
      'Morningstar ne note ni les monétaires, ni les ETC, ni les fonds de moins de trois ans. Pour ces supports, ' +
      'la notation est retirée du barème du score et le filtre « étoiles minimum » ne s\'applique pas.</div>' : '') +

    (derives.length ? '<div class="message ' + (derives.some(d => d.cl === 'actions' && d.ecart > 0) ? 'erreur' : 'alerte') + '">' +
      '<strong>' + echapper(mot('phrase.supports.derive',
        'Le portefeuille réalisable s\'écarte de l\'allocation cible.')) + '</strong> ' +
      derives.map(d => LIBELLES_CLASSES[d.cl] + ' ' + signe(d.ecart)).join(' · ') +
      '. Cet écart provient des contraintes de l\'univers disponible' +
      (Object.keys(sel.classesNonImplementables).length ? ' (classes non représentées dans l\'enveloppe)' : '') +
      '. ' + echapper(mot('phrase.supports.derive.fin',
        'Vérifiez que le portefeuille obtenu reste compatible avec le profil ' +
        r.profil.nom.toLowerCase() + '.')) + '</div>' : '') +

    (sel.residuel > 0 ? bandeauNonInvesti(sel) : '') +

    (sel.avertissements.length ? '<div class="message info"><strong>' +
      echapper(mot('supports.adaptations.titre', 'Adaptations à l\'univers disponible.')) + '</strong><ul>' +
      lignesAdaptations(sel) + '</ul></div>' : '') +

    '<div class="carte"><h3>Portefeuille proposé</h3>' +
      '<div class="tableau-defilant"><table><thead><tr>' +
      '<th>Support</th><th>ISIN</th><th>Poche</th><th class="num">Note</th><th class="num">Frais</th>' +
      '<th class="num">Encours</th><th class="num">Poids</th><th class="num">Montant</th><th class="num">Score</th>' +
      '</tr></thead><tbody>' +
      sel.lignes.map(l =>
        '<tr><td><span class="pastille" style="background:' + COULEURS_CLASSES[l.classe] + '"></span>' +
          '<button class="lien-support" data-fiche="' + echapper(l.etf.isin) + '">' +
          echapper(l.etf.nom) + '</button>' +
          (l.etf.isr ? ' <span class="badge vert">ISR</span>' : '') +
          (l.etf.hedge ? ' <span class="badge gris">couvert €</span>' : '') +
          (!l.etf.verifie ? ' <span class="badge orange">contrat à vérifier</span>' : '') + '</td>' +
        '<td style="font-family:monospace;font-size:12px">' + echapper(l.etf.isin) + '</td>' +
        '<td>' + echapper(LIBELLES_POCHES[l.poche] || l.poche) + '</td>' +
        '<td class="num">' + etoiles(l.etf.morningstar) + '</td>' +
        '<td class="num">' + pct(l.etf.ter, 2) + '</td>' +
        '<td class="num">' + (l.etf.encours >= 1000 ? (l.etf.encours / 1000).toFixed(1).replace('.', ',') + ' Md€' : l.etf.encours + ' M€') + '</td>' +
        '<td class="num"><strong>' + pct(l.poids) + '</strong></td>' +
        '<td class="num">' + euro(l.montant) + '</td>' +
        '<td class="num">' + l.score.total.toFixed(0) + '</td></tr>' +
        (l.alternatives.length ? '<tr style="font-size:11px;color:var(--gris-doux)"><td colspan="9" style="padding-top:0;border-top:0">' +
          'Alternatives : ' + l.alternatives.map(a => echapper(a.etf.nom) + ' (' + a.score.toFixed(0) + ')').join(' · ') + '</td></tr>' : '')
      ).join('') +
      '</tbody><tfoot><tr><td colspan="6">Total</td>' +
      '<td class="num">' + pct(sel.lignes.reduce((a, l) => a + l.poids, 0)) + '</td>' +
      '<td class="num">' + euro(sel.lignes.reduce((a, l) => a + l.montant, 0)) + '</td><td></td></tr></tfoot></table></div>' +
      (T('phrase.supports.choix') !== 'phrase.supports.choix'
        ? '<p class="intro" style="font-size:11px;margin-top:10px">' +
          echapper(T('phrase.supports.choix', {
            etoiles: ctx.etoilesMin, encours: ctx.encoursMin, frais: pct(ctx.terMax, 2)
          })) + '</p>'
        : '') +
      (T('phrase.supports.choix') !== 'phrase.supports.choix' ? '' :
      '<p class="intro" style="font-size:11px;margin-top:10px">Score de sélection ramené sur 100 : notation Morningstar (40 pts, ' +
      'écartée du barème lorsqu\'elle n\'est pas renseignée), ' +
      'frais courants relatifs à la poche (20), encours (15), mode de réplication (10)' +
      (ctx.esg === 'aucune' ? '' : ', label ISR (' + (ctx.esg === 'prioritaire' ? 15 : 8) + ')') + '. ' +
      'Filtres appliqués : ' + ctx.etoilesMin + ' étoiles minimum, encours ≥ ' + ctx.encoursMin + ' M€, frais ≤ ' + pct(ctx.terMax, 2) +
      (ctx.exclureSynthetique ? ', réplication physique uniquement' : '') +
      (ctx.contratSeulement ? ', supports validés au contrat uniquement' : '') + '.</p>') +
    '</div>';
}

/* ============================================================
   VUE 7 — ARBITRAGES
   ============================================================ */

function rendreDetention() {
  const corps = $('#corps-detention');
  corps.innerHTML = Etat.detention.map((l, i) => {
    const cote = cotation(l.isin);
    const valorise = cote && Number(l.quantite) > 0;
    return '<tr>' +
    '<td><input type="text" data-detention="libelle" data-index="' + i + '" value="' + echapper(l.libelle || '') + '" placeholder="Nom du support"></td>' +
    '<td><input type="text" data-detention="isin" data-index="' + i + '" value="' + echapper(l.isin || '') + '" placeholder="ISIN" list="liste-isin"></td>' +
    '<td class="num"><input type="number" data-detention="quantite" data-index="' + i + '" value="' + (l.quantite || '') +
      '" min="0" step="1" placeholder="—"' + (cote ? ' title="Dernier cours connu : ' + cote.cours + ' € au ' + dateFr(cote.date) + '"' : '') + '></td>' +
    '<td class="num"><input type="number" data-detention="montant" data-index="' + i + '" value="' + (l.montant || 0) + '" min="0" step="100"' +
      (valorise ? ' readonly style="background:var(--fond-marche)" title="Calculé automatiquement : ' + l.quantite + ' × ' + cote.cours + ' € (cours du ' + dateFr(cote.date) + ')"' : '') + '></td>' +
    '<td class="num"><input type="number" data-detention="pvLatente" data-index="' + i + '" value="' + (l.pvLatente || 0) + '" step="1"></td>' +
    '<td><button class="bouton secondaire" data-supprimer-detention="' + i + '" title="Supprimer">✕</button></td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="6" style="color:var(--gris-doux)">Aucune ligne saisie.</td></tr>';

  if (!$('#liste-isin')) {
    const dl = document.createElement('datalist');
    dl.id = 'liste-isin';
    document.body.appendChild(dl);
  }
  $('#liste-isin').innerHTML = Etat.univers.map(e =>
    '<option value="' + echapper(e.isin) + '">' + echapper(e.nom) + '</option>').join('');

  $('#total-detention').textContent = euro(Etat.detention.reduce((a, l) => a + (Number(l.montant) || 0), 0));
  $('#f-apport').value = Etat.apport || 0;
}

function rendreArbitrages() {
  rendreDetention();
  const r = resultatProfil();
  const c = $('#arbitrages-contenu');
  if (!r) { c.innerHTML = etatVide('arbitrages'); return; }

  const sel = selectionCourante();
  /* `lignesDetenues()` et non `Etat.detention` : une ligne encore à
     investir n'est pas détenue — voir dossier.js. */
  const analyse = MoteurArbitrage.analyser(
    lignesDetenues(), sel.lignes,
    { enveloppe: Etat.identite.enveloppe || 'AV', apport: apportDisponible() },
    universSelection()
  );

  if (!analyse) {
    c.innerHTML = '<div class="message info">Saisissez au moins une ligne détenue ou un apport pour générer ' +
      'des propositions d\'arbitrage. Le plan d\'investissement initial figure dans la sélection des supports.' +
      '<div class="barre-actions"><button class="bouton secondaire" data-aller="portefeuille">' +
      'Ouvrir la sélection des supports</button></div></div>';
    return;
  }

  const m = macroCourante();
  const scenarioDominant = SCENARIOS.find(s => s.id === m.dominant);

  c.innerHTML =
    '<div class="grille quatre">' +
      kpi(String(analyse.ordres.length), 'Mouvements proposés', 'seuil de déclenchement ' + euro(analyse.seuilMontant)) +
      kpi(pct(analyse.rotation), mot('arbitrages.kpi.rotation', 'Rotation du portefeuille'),
          mot('arbitrages.kpi.rotation.detail', 'part de l\'encours arbitrée'), 'rotation') +
      /* « Enveloppe non imposable » est juste, et ne dit pas POURQUOI. Le
         détail particulier explique le mécanisme : ce n'est pas l'arbitrage
         qui déclenche l'impôt, c'est le retrait. */
      kpi(euro(analyse.fiscalite.impotEstime), mot('arbitrages.kpi.impot', 'Fiscalité estimée'),
          analyse.fiscalite.taux ? 'PFU 30 %'
            : (T('arbitrages.kpi.impot.detail') === 'arbitrages.kpi.impot.detail'
                ? 'enveloppe non imposable'
                : T('arbitrages.kpi.impot.detail', { enveloppe: Etat.identite.enveloppe || 'AV' }))) +
      kpi(euro(analyse.total), mot('arbitrages.kpi.encours', 'Encours après opération'),
          'dont apport ' + euro(analyse.apport)) +
    '</div>' +

    (function () {
      const d = dateValorisation();
      const enQuantites = Etat.detention.filter(l => Number(l.quantite) > 0).length;
      if (!d) return '';
      return '<div class="message info"><strong>Portefeuille valorisé au ' + dateFr(d) + '.</strong> ' +
        enQuantites + ' ligne(s) sur ' + Etat.detention.length + ' sont suivies en quantités et se revalorisent ' +
        'automatiquement à chaque relevé de cours. Les autres restent saisies en euros.</div>';
    })() +

    (function () {
      const hors = analyse.ecarts.filter(e => e.declenche);
      return hors.length
        ? '<div class="message alerte"><strong>' +
          echapper(T('arbitrages.hors.titre') === 'arbitrages.hors.titre'
            ? hors.length + ' ligne(s) hors bande de tolérance.'
            : T('arbitrages.hors.titre', { n: hors.length })) + '</strong> ' +
          hors.slice(0, 5).map(e => echapper(e.libelle) + ' ' + signe(e.pctCible - e.pctActuel)).join(' · ') +
          (hors.length > 5 ? ' …' : '') + '. ' +
          echapper(T('arbitrages.hors.seuil') === 'arbitrages.hors.seuil'
            ? 'Bande retenue : ' + pct(SEUILS_ARBITRAGE.ecartAbsoluMin) + ' de l\'encours, soit ' +
              euro(analyse.seuilMontant) + '.'
            : T('arbitrages.hors.seuil', {
                montant: euro(analyse.seuilMontant), pct: pct(SEUILS_ARBITRAGE.ecartAbsoluMin)
              })) + '</div>'
        : '<div class="message succes"><strong>Portefeuille dans ses bandes de tolérance.</strong> ' +
          'Aucune ligne ne s\'écarte de plus de ' + pct(SEUILS_ARBITRAGE.ecartAbsoluMin) + ' de sa cible.</div>';
    })() +

    (m.exprime ? '' :
      '<div class="message ' + (vueMasquee('macro') ? 'info' : 'alerte') + '">' +
      T('phrase.sansContexte.arbitrages') + '</div>') +
    (!m.exprime ? '' :
    '<div class="message info"><strong>Justification du contexte.</strong> Scénario dominant retenu : ' +
      (scenarioDominant ? echapper(scenarioDominant.nom) + ' (' + Math.round(m.probas[m.dominant]) + ' %)' : 'non déterminé') +
      '. ' + (scenarioDominant ? echapper(scenarioDominant.description) : '') + '</div>') +

    (analyse.inconnus.length ? '<div class="message alerte"><strong>Supports non reconnus.</strong> ' +
      analyse.inconnus.map(l => echapper(l.libelle)).join(', ') +
      ' — ISIN absent de l\'univers référencé. Ces lignes sont traitées comme intégralement à céder. ' +
      'Ajoutez-les à l\'univers ETF si elles doivent être conservées.' +
      '<div class="barre-actions"><button class="bouton secondaire" data-aller="univers">' +
      'Ouvrir l\'univers ETF</button></div></div>' : '') +

    '<div class="carte"><h3>' +
      echapper(mot('arbitrages.classes.titre', 'Écart d\'allocation par classe d\'actifs')) + '</h3>' +
      '<div class="barres">' + Object.keys(analyse.parClasse).map(cl => {
        const p = analyse.parClasse[cl];
        return '<div class="barre"><div class="tete"><span>' + LIBELLES_CLASSES[cl] + '</span>' +
          '<span>actuel ' + pct(p.actuelPct) + ' → cible ' + pct(p.ciblePct) + ' ' +
          (Math.abs(p.ciblePct - p.actuelPct) >= 0.1 ? '<strong class="' + (p.ciblePct > p.actuelPct ? 'positif' : 'negatif') + '">' +
            signe(p.ciblePct - p.actuelPct) + '</strong>' : '') + '</span></div>' +
          '<div class="piste"><div class="part" style="width:' + p.actuelPct + '%;background:' + COULEURS_CLASSES[cl] + ';opacity:.55"></div>' +
          '<div class="cible" style="left:calc(' + p.ciblePct + '% - 1px)"></div></div></div>';
      }).join('') + '</div>' +
      '<p class="intro" style="font-size:11px">Barre pleine : allocation actuelle. Repère vertical : allocation cible.</p>' +
    '</div>' +

    (analyse.aucunMouvement
      ? '<div class="message succes"><strong>Aucun arbitrage nécessaire.</strong> Tous les écarts constatés sont ' +
        'inférieurs au seuil de déclenchement (' + euro(analyse.seuilMontant) + ' ou ' + pct(SEUILS_ARBITRAGE.ecartAbsoluMin) +
        ' de l\'encours). Arbitrer coûterait plus qu\'il ne rapporterait.</div>'
      : (T('arbitrages.intro.titre') === 'arbitrages.intro.titre' ? ''
          /* Au-DESSUS de la carte, et pas dedans : le titre de carte nomme ce
             qu'on lit, cette phrase-ci dit ce qu'on en fait. Les deux ne
             disent pas la même chose et ne se remplacent pas. */
          : '<h3 class="arbitrages-intro">' + echapper(T('arbitrages.intro.titre')) + '</h3>' +
            '<p class="intro">' + echapper(T('arbitrages.intro.texte')) + '</p>') +
        '<div class="carte"><h3>' + echapper(mot('arbitrages.ordres.titre', 'Ordres à passer')) + '</h3>' +
        '<div class="tableau-defilant"><table><thead><tr>' +
        '<th>Sens</th><th>Support</th><th>ISIN</th><th class="num">Montant</th><th class="num">% encours</th>' +
        (analyse.fiscalite.taux ? '<th class="num">PV réalisée</th><th class="num">Impôt estimé</th>' : '') +
        '<th>Motif</th></tr></thead><tbody>' +
        analyse.ordres.map(o =>
          '<tr><td><span class="badge ' + (o.sens === 'Achat' ? 'vert' : 'rouge') + '">' + o.sens + '</span></td>' +
          '<td>' + echapper(o.libelle) + '</td>' +
          '<td style="font-family:monospace;font-size:12px">' + echapper(o.isin) + '</td>' +
          '<td class="num"><strong>' + euro(o.montant) + '</strong></td>' +
          '<td class="num">' + pct(o.pct) + '</td>' +
          (analyse.fiscalite.taux ? '<td class="num">' + (o.plusValue ? euro(o.plusValue) : '—') + '</td>' +
            '<td class="num">' + (o.impot ? euro(o.impot) : '—') + '</td>' : '') +
          '<td style="font-size:12px;color:var(--gris-doux)">' + echapper(motifLisible(o.motif)) +
          '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="3">Total ventes / achats</td><td class="num">' +
        euro(analyse.ordres.filter(o => o.sens === 'Vente').reduce((a, o) => a + o.montant, 0)) + ' / ' +
        euro(analyse.ordres.filter(o => o.sens === 'Achat').reduce((a, o) => a + o.montant, 0)) +
        '</td><td colspan="' + (analyse.fiscalite.taux ? 4 : 2) + '"></td></tr></tfoot></table></div>' +
        '<div class="message ' + (analyse.fiscalite.taux ? 'alerte' : 'info') + '" style="margin-top:14px">' +
          echapper(analyse.fiscalite.regime) +
          (analyse.fiscalite.taux ? ' Impôt estimé sur cette revue : <strong>' + euro(analyse.fiscalite.impotEstime) +
            '</strong>. Privilégier l\'affectation des versements aux poches sous-pondérées plutôt que des ventes.' : '') +
        '</div>' +
      '</div>') +

    /* DEUX MÉTIERS, DEUX GESTES.
       Le conseiller garde ses deux boutons séparés : il journalise souvent
       sans appliquer, parce qu'il attend l'exécution réelle chez l'assureur.
       Fondre les deux lui ferait perdre une distinction qu'il utilise.

       Celui qui gère son propre argent n'a pas cette attente : il décide,
       il passe ses ordres, et il veut les retrouver dans son suivi. Un seul
       bouton fait donc les trois gestes — journal, portefeuille, redirection
       — et la simulation reste disponible, au second rang. */
    '<div class="barre-actions sans-impression">' +
      (T('arbitrages.bouton.confirmer') === 'arbitrages.bouton.confirmer'
        ? '<button class="bouton" id="btn-journaliser">' +
            echapper(mot('arbitrages.bouton.journal', 'Valider la revue et l\'inscrire au journal')) + '</button>'
        : '<button class="bouton" id="btn-confirmer">' +
            echapper(T('arbitrages.bouton.confirmer')) + '</button>') +
      '<button class="bouton secondaire" id="btn-appliquer">' +
        echapper(mot('arbitrages.bouton.appliquer', 'Appliquer les ordres à la détention saisie')) + '</button>' +
      /* L'envoi existe dans les deux modes : un conseiller adresse la
         proposition à son client, un particulier se l'envoie à lui-même ou à
         son courtier. Rien ne part de l'application — voir `texteProposition`. */
      (analyse.ordres.length
        ? '<button class="bouton secondaire" id="btn-mail">' +
            echapper(T('arbitrages.mail.bouton')) + '</button>' +
          '<button class="bouton discret" id="btn-copier-proposition">' +
            echapper(T('arbitrages.mail.copier')) + '</button>'
        : '') +
    '</div>';

  const bj = $('#btn-journaliser');
  if (bj) bj.onclick = () => {
    Etat.journal.unshift(MoteurArbitrage.entreeJournal(analyse, {
      dateISO: new Date().toISOString(),
      profilNom: r.profil.nom,
      enveloppe: Etat.identite.enveloppe || 'AV'
    }, m));
    sauver(true);
    notifier('Revue inscrite au journal.');
    rendre('arbitrages');
  };

  /* ------------------------------------------------------------
     CONFIRMER : TROIS GESTES, UNE QUESTION, ET UN RETOUR EN ARRIÈRE
     ------------------------------------------------------------
     C'est le seul endroit de l'application qui change DEUX choses à la
     fois — le portefeuille détenu et le journal. Un clic mal placé
     réécrirait la détention sans qu'on l'ait voulu : d'où la question,
     posée avec le nombre de mouvements.

     Et d'où le retour en arrière. Le journal garde la trace de ce qui a
     été confirmé, mais la détention D'AVANT est perdue : elle est donc
     mise de côté, et le bandeau d'arrivée porte le lien qui la rend.
     Cette mémoire ne survit pas au rechargement, et c'est voulu — une
     annulation qui traverse les jours n'est plus une annulation, c'est
     une seconde vérité. */
  const bc = $('#btn-confirmer');
  if (bc) bc.onclick = () => {
    const n = analyse.ordres.length;
    if (!confirm(T('arbitrages.confirmation', { n }))) return;

    Confirmation.avant = {
      detention: JSON.parse(JSON.stringify(Etat.detention)),
      apport: Etat.apport,
      journal: Etat.journal.length
    };

    Etat.journal.unshift(MoteurArbitrage.entreeJournal(analyse, {
      dateISO: new Date().toISOString(),
      profilNom: r.profil.nom,
      enveloppe: Etat.identite.enveloppe || 'AV'
    }, m));
    appliquerOrdres(analyse);
    sauver(true);

    Confirmation.bandeau = T('arbitrages.confirme', { date: dateFr(), n });
    afficher('situation');
  };

  const bm = $('#btn-mail');
  if (bm) bm.onclick = () => {
    const dest = (Etat.identite.email || '').trim();
    const objet = T('arbitrages.mail.objet', {
      dossier: (Etat.identite.nom || '').trim() || '—', date: dateFr()
    });
    /* ~2 000 caractères : au-delà, des clients de messagerie tronquent ou
       refusent le lien. On coupe la LISTE, jamais la réserve — la phrase qui
       dit que rien n'est exécuté doit survivre à la troncature.

       ⚠ LA LIMITE PORTE SUR L'URL ENCODÉE, PAS SUR LE TEXTE. Un accent
       devient trois caractères, un retour à la ligne aussi : 1 500 signes de
       français en font 2 600 une fois encodés. Budgéter sur le texte brut
       laissait donc passer des liens d'un tiers trop longs. On resserre tant
       que l'URL ne tient pas. */
    const lien = corps => 'mailto:' + encodeURIComponent(dest) +
      '?subject=' + encodeURIComponent(objet) + '&body=' + encodeURIComponent(corps);

    let brut = 1500, url = lien(texteProposition(analyse, brut));
    while (url.length > 1900 && brut > 300) {
      brut = Math.round(brut * 0.8);
      url = lien(texteProposition(analyse, brut));
    }
    window.location.href = url;
  };

  const bcp = $('#btn-copier-proposition');
  if (bcp) bcp.onclick = () => {
    const texte = texteProposition(analyse, Infinity);
    const fini = () => notifier(T('arbitrages.mail.copie'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).then(fini, () => copierParSelection(texte, fini));
    } else {
      copierParSelection(texte, fini);
    }
  };

  const ba = $('#btn-appliquer');
  if (ba) ba.onclick = () => {
    appliquerOrdres(analyse);
    sauver(true);
    notifier('Ordres appliqués à la détention.');
    rendre('arbitrages');
  };
}

/* ============================================================
   VUE 9 — BACKTEST
   ============================================================ */

function optionsBacktest() {
  return {
    capital: Number(Etat.backtest.capital) || 100000,
    fraisContrat: Number(Etat.backtest.frais) || 0,
    retraitAnnuel: Number(Etat.backtest.retrait) || 0,
    historique: Etat.historique
  };
}

function montrerBacktest(actif) {
  ['#backtest-intro', '#backtest-reglages', '#backtest-series'].forEach(sel => {
    const el = $(sel);
    if (el) el.hidden = !actif;
  });
}

function poidsTestes() {
  const alloc = allocationCourante();
  if (!alloc) return null;
  /* Sans déviation, « tactique » et « stratégique » désignent la même
     allocation : on rend la stratégique dans les deux cas plutôt qu'une
     tactique qui n'en diffère que par un arrondi de 0,1 point — un écart
     sans cause visible est plus troublant qu'une égalité. */
  if (intensiteEffective() === 0) return alloc.strategique.poches;
  return Etat.backtest.allocation === 'strategique' ? alloc.strategique.poches : alloc.poches;
}

/* La fraîcheur des séries, à côté de leur part sourcée — même mécanique que
   les trois pastilles de l'accueil : au-delà du seuil, la pastille écrit son
   âge, et le nombre de jours EST l'alerte.

   400 jours : une série gagne une année civile par an, et l'on ne la relève
   qu'une fois l'année close et publiée. */
/* Une tuile qui dit un taux au conseiller et un montant au particulier. Le
   calcul est le même des deux côtés — c'est l'affichage qui change, et
   seulement si un montant existe : sans lui, « 0 € » serait faux. */
/* ------------------------------------------------------------
   LES SUPPORTS À VÉRIFIER — TROIS BANDEAUX, PAS UN
   ------------------------------------------------------------
   Ce qu'il y a à vérifier n'est pas la même chose selon l'enveloppe.

   • En ASSURANCE-VIE, c'est le contrat de l'assureur qui décide de ce
     qui est accessible : la liste des supports se colle, et le
     rapprochement coche la colonne « Contrat ».
   • En PEA et en COMPTE-TITRES, il n'existe aucun contrat de ce
     genre. C'est le courtier qui référence, et la question est de
     savoir si l'ETF est négociable — avant de passer l'ordre, pas
     avant de remettre un document.

   Et surtout : ni l'un ni l'autre de ces deux derniers ne doit parler
   de « remise au client ». Il n'y a pas de client.

   Le mode conseiller garde son bandeau unique, mot pour mot : la
   clé absente rend la clé, et c'est le repli. */
/* Le motif d'un ordre est écrit par le moteur, qui ne connaît aucun mode :
   « Surpondération de 4,2 pts sur Actions Monde ». Le chiffre est juste et le
   mot est du métier. En particulier, seul le mot change — le reste de la
   phrase, poche et écart, dit déjà tout. */
/* Ce que « confirmer » a mis de côté, le temps qu'on puisse revenir dessus.
   Vit en mémoire seulement : une annulation qui traverse un rechargement
   n'est plus une annulation. */
const Confirmation = { avant: null, bandeau: null };

/* ------------------------------------------------------------
   LA PROPOSITION EN TEXTE SIMPLE
   ------------------------------------------------------------
   Un e-mail n'a ni tableau ni police : la liste s'écrit en lignes.
   Le même texte sert au `mailto:` et au presse-papier — deux
   versions du même message finiraient par diverger, et c'est
   celle qu'on envoie qui serait la mauvaise.

   La seule différence est la LONGUEUR : un `mailto:` au-delà de
   deux mille caractères est tronqué ou refusé par certains
   clients de messagerie. On coupe alors la liste, et l'on dit
   qu'on l'a coupée. LA RÉSERVE NE SE COUPE JAMAIS : « rien n'est
   exécuté » doit survivre à la troncature, sans quoi le message
   tronqué devient un ordre.
   ------------------------------------------------------------ */
function texteProposition(analyse, limite) {
  const l = [];
  l.push(T('arbitrages.mail.entete', { date: dateFr() }));
  l.push('');

  const lignes = analyse.ordres.map(o =>
    '- ' + o.sens + ' · ' + o.libelle + ' (' + o.isin + ') · ' + euro(o.montant));

  /* On mesure ce que la liste peut prendre : l'en-tête, le total, la réserve
     et la signature sont incompressibles. */
  const ventes = analyse.ordres.filter(o => o.sens === 'Vente').reduce((a, o) => a + o.montant, 0);
  const achats = analyse.ordres.filter(o => o.sens === 'Achat').reduce((a, o) => a + o.montant, 0);
  const pied = [
    '',
    T('arbitrages.mail.total', { ventes: euro(ventes), achats: euro(achats) }),
    '',
    T('arbitrages.mail.reserve')
  ];
  const signature = signatureProposition();
  if (signature) pied.push('', signature);

  const fixe = l.join('\n').length + pied.join('\n').length;
  let place = limite - fixe;
  const retenues = [];
  let tronque = false;
  lignes.forEach(ligne => {
    if (place - (ligne.length + 1) > 0) { retenues.push(ligne); place -= ligne.length + 1; }
    else tronque = true;
  });

  return l.concat(retenues,
    tronque ? ['', T('arbitrages.mail.tronque')] : [],
    pied).join('\n');
}

/* Le conseiller signe de son nom quand il l'a renseigné. Un particulier qui
   s'envoie sa propre liste n'a personne à qui se présenter. */
function signatureProposition() {
  if ((Etat.mode || MODE_DEFAUT) === 'particulier') return '';
  const nom = [Etat.identite.prenom, Etat.identite.nomFamille]
    .map(x => (x || '').trim()).filter(Boolean).join(' ');
  return nom ? nom : '';
}

/* Repli de copie pour les navigateurs sans presse-papier asynchrone — et
   pour les pages ouvertes en `file://`, où il n'existe pas. */
function copierParSelection(texte, fini) {
  const z = document.createElement('textarea');
  z.value = texte;
  z.setAttribute('readonly', '');
  z.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(z);
  z.select();
  try { document.execCommand('copy'); fini(); }
  catch (e) { notifier('Copie impossible — sélectionnez le texte à la main.', 'alerte'); }
  z.remove();
}

/* Les ordres portés sur la détention. Le même code sert à simuler et à
   confirmer — deux chemins vers un seul calcul, sinon ils divergent. */
function appliquerOrdres(analyse) {
  analyse.ordres.forEach(o => {
    let ligne = Etat.detention.find(l => l.isin === o.isin);
    if (!ligne) { ligne = { isin: o.isin, libelle: o.libelle, montant: 0, pvLatente: 0 }; Etat.detention.push(ligne); }
    ligne.montant = Math.max(0, (Number(ligne.montant) || 0) + (o.sens === 'Achat' ? o.montant : -o.montant));
  });
  Etat.detention = Etat.detention.filter(l => Number(l.montant) > 0);
  Etat.apport = 0;
}

function motifLisible(motif) {
  if (T('arbitrages.motif.sur') === 'arbitrages.motif.sur') return motif;
  return String(motif || '')
    .replace(/^Surpondération de /, T('arbitrages.motif.sur') + ', ')
    .replace(/^Sous-pondération de /, T('arbitrages.motif.sous') + ', ');
}

/* ------------------------------------------------------------
   POURQUOI CETTE PART N'EST PAS PLACÉE — DEUX RAISONS
   ------------------------------------------------------------
   « Élargissez les filtres ou complétez l'univers ETF » suppose
   qu'une solution existe. En PEA, pour les poches obligataires,
   l'or et les matières premières, IL N'Y EN A PAS : le PEA ne
   peut pas les détenir. Mesuré sur le catalogue européen entier —
   4 530 supports, 35 éligibles au PEA — il n'existe aucun ETF PEA
   obligataire, aucun sur l'or, aucun sur les matières premières.
   Ce n'est pas un trou de données, c'est la loi.

   Envoyer quelqu'un régler un filtre pour une chose qui n'existe
   pas, c'est lui faire perdre une heure et sa confiance. La phrase
   dit donc l'impossibilité, et ce qu'on fait à la place.

   ⚠ Le mode conseiller garde sa phrase d'origine, mot pour mot :
   la version qui dit l'impossibilité lui est proposée, pas encore
   appliquée. */
function bandeauNonInvesti(sel) {
  const montant = Number(Etat.identite.montant) || 0;
  const enEuros = euro(montant * sel.residuel / 100);

  /* Structurel : toutes les poches non couvertes sont hors du champ du PEA. */
  const horsChamp = (sel.pochesSansSupport || []).length > 0 &&
    Etat.identite.enveloppe === 'PEA' &&
    sel.pochesSansSupport.every(x => {
      const cl = MoteurSelection.classeDePoche(x.poche);
      return cl === 'obligations' || cl === 'diversifiants' || cl === 'monetaire';
    });

  if (horsChamp && T('phrase.supports.residuel.pea') !== 'phrase.supports.residuel.pea' && montant) {
    /* Le bouton vient APRÈS l'impossibilité, et dit lui-même qu'il ne la lèvera
       pas : sans cette précision on le prendrait pour la solution. */
    return '<div class="message erreur"><strong>' +
      echapper(T('phrase.supports.residuel.pea', { montant: enEuros, pct: pct(sel.residuel) })) +
      '</strong>' + boutonCatalogue(T('supports.catalogue.inutile')) + '</div>';
  }

  if (T('phrase.supports.residuel') === 'phrase.supports.residuel' || !montant) {
    return '<div class="message erreur"><strong>' + pct(sel.residuel) + ' non investis.</strong> ' +
      'Aucun support de l\'univers ne couvre ces poches. Élargissez les filtres ou complétez ' +
      'l\'univers ETF.</div>';
  }

  return '<div class="message erreur"><strong>' +
    echapper(T('phrase.supports.residuel', { montant: enEuros, enveloppe: T('vue.client.nav') })) +
    '</strong>' + boutonCatalogue('') + '</div>';
}

/* Le bouton qui bascule la sélection sur le catalogue européen. Il n'apparaît
   que si l'on n'y est pas déjà, et il DEMANDE avant : le catalogue est plus
   large, mais aucune de ses lignes n'a été relue. C'est un échange, pas une
   amélioration — et l'échange doit être dit avant, pas découvert après. */
function boutonCatalogue(reserve) {
  if (T('supports.catalogue.bouton') === 'supports.catalogue.bouton') return '';
  if (Etat.filtres.sourceUnivers === 'catalogue') return '';
  return (reserve ? '<p class="intro" style="font-size:12px;margin:10px 0 0">' +
            echapper(reserve) + '</p>' : '') +
    '<div class="barre-actions"><button class="bouton secondaire" id="btn-passer-catalogue">' +
    echapper(T('supports.catalogue.bouton')) + '</button></div>';
}

function bandeauSupportsAVerifier(nombre) {
  const enveloppe = Etat.identite.enveloppe || 'AV';
  const cle = 'supports.contrat.' + enveloppe;

  if (T(cle) === cle) {
    return '<div class="message alerte"><strong>' + nombre + ' support(s) non validé(s) au contrat.</strong> ' +
      'Leurs caractéristiques de marché ont été relevées sur source publique, mais leur référencement effectif ' +
      'dans le contrat reste à contrôler avant remise au client : collez la liste des supports de l\'assureur ' +
      'le rapprochement avec la liste des supports coche la colonne « Contrat » pour vous.' +
      '<div class="barre-actions"><button class="bouton secondaire" data-aller="univers">' +
      'Ouvrir l\'univers ETF</button></div></div>';
  }

  return '<div class="message alerte"><strong>' +
    echapper(T(cle + '.titre', { n: nombre })) + '</strong> ' +
    echapper(T(cle)) +
    '<div class="barre-actions"><button class="bouton secondaire" data-aller="univers">' +
    echapper(T('supports.contrat.bouton')) + '</button></div></div>';
}

/* Les adaptations, dites en euros quand une poche n'a pas de support. Le
   moteur porte les morceaux (`pochesSansSupport`) : découper à l'expression
   régulière une phrase déjà écrite casserait au premier mot changé. */
function lignesAdaptations(sel) {
  const montant = Number(Etat.identite.montant) || 0;
  if (T('supports.adaptations.ligne') === 'supports.adaptations.ligne' || !montant ||
      !sel.pochesSansSupport || !sel.pochesSansSupport.length) {
    return sel.avertissements.map(a => '<li>' + echapper(a) + '</li>').join('');
  }
  const reformulees = sel.pochesSansSupport.map(x =>
    '<li>' + echapper(T('supports.adaptations.ligne', {
      poche: x.nom, montant: euro(montant * x.pct / 100)
    })) + '</li>').join('');
  /* Les autres avertissements — classe non implémentable, durabilité — ne
     sont pas de cette forme : ils restent tels quels. */
  const autres = sel.avertissements
    .filter(a => a.indexOf('Aucun support disponible pour') !== 0)
    .map(a => '<li>' + echapper(a) + '</li>').join('');
  return reformulees + autres;
}

function kpiMontant(cle, libelleDefaut, detailDefaut, valeurPct, taux) {
  const montant = Number(Etat.identite.montant) || 0;
  if (T(cle) === cle || !montant) return kpi(valeurPct, libelleDefaut, detailDefaut);
  const cent = x => Math.round(x / 100) * 100;
  const part = euro(cent(montant * Math.abs(taux) / 100));
  return kpi(valeurPct, T(cle),
             T(cle + '.detail', { gain: part, ecart: part, montant: euro(montant) }));
}

/* ------------------------------------------------------------
   LA CARTE DES SÉRIES SE REPLIE, ELLE NE DISPARAÎT PAS
   ------------------------------------------------------------
   Elle s'adresse au conseiller qui source ses séries : dix-neuf
   lignes, cinq colonnes, deux boutons CSV. Pour qui teste son
   propre profil, c'est l'écran le moins utile de l'application —
   et le plus intimidant.

   Elle passe donc sous un `<details>` en mode particulier. Repliée,
   pas supprimée : les données restent modifiables, et le lien dit
   ce qu'on y trouve. C'est la même règle que pour le SRI ou les
   pourcentages détaillés — on déplace, on ne cache pas.
   ------------------------------------------------------------ */
function replierSeries() {
  const carte = $('#backtest-series');
  if (!carte) return;
  const libelle = T('backtest.series.repli');
  const deja = carte.parentElement && carte.parentElement.tagName === 'DETAILS';

  if (libelle === 'backtest.series.repli') {
    /* Mode conseiller : la carte reprend sa place pleine si elle avait été
       repliée par un passage en particulier. */
    if (deja) {
      const d = carte.parentElement;
      d.parentNode.insertBefore(carte, d);
      d.remove();
    }
    return;
  }
  if (deja) {
    carte.parentElement.querySelector('summary').textContent = libelle;
    return;
  }
  const details = document.createElement('details');
  details.className = 'repli-series sans-impression';
  const resume = document.createElement('summary');
  resume.textContent = libelle;
  details.appendChild(resume);
  carte.parentNode.insertBefore(details, carte);
  details.appendChild(carte);
}

function pastilleReleveSeries() {
  if (typeof HISTORIQUE_RELEVE === 'undefined' || !HISTORIQUE_RELEVE.le) return '';
  const SEUIL = 400;
  const jours = Math.round((new Date(aujourdhuiISO()) - new Date(HISTORIQUE_RELEVE.le)) / 86400000);
  const perime = jours > SEUIL;
  return '<div class="fraicheur" style="margin:0">' +
    '<span' + (perime ? ' class="perime"' : '') + ' title="' +
      echapper('Séries relevées le ' + dateFr(HISTORIQUE_RELEVE.le) + ' sur ' +
        (HISTORIQUE_RELEVE.source || 'source documentée') +
        (perime ? ' — ' + jours + ' jours, au-delà des ' + SEUIL + ' attendus' : '')) + '">' +
      '<i></i>Séries <b>' + echapper(dateFr(HISTORIQUE_RELEVE.le).replace(/ \d{4}$/, '')) + '</b>' +
      ' <em>' + echapper(HISTORIQUE_RELEVE.source || '') + '</em>' +
      (perime ? ' <strong class="fraicheur-age">· ' + jours + ' jours</strong>' : '') +
    '</span></div>';
}

function rendreBacktest() {
  $('#bt-capital').value = Etat.backtest.capital;
  $('#bt-frais').value = Etat.backtest.frais;
  $('#bt-retrait').value = Etat.backtest.retrait;
  $('#bt-allocation').value = Etat.backtest.allocation;

  rendreSeriesHistorique();
  replierSeries();

  const poids = poidsTestes();
  const c = $('#backtest-contenu');
  const banniere = $('#backtest-fiabilite');

  if (!poids) {
    banniere.innerHTML = '';
    c.innerHTML = etatVide('backtest');
    /* Comme toutes les autres vues bloquées : l'état vide reste seul. Ses
       réglages et ses séries s'affichaient en entier — trois cent vingt-sept
       mots et quinze colonnes — alors que la vue annonçait par ailleurs qu'il
       manquait le questionnaire. */
    montrerBacktest(false);
    return;
  }
  montrerBacktest(true);

  const opt = optionsBacktest();
  const fiab = MoteurBacktest.fiabilite(poids, Etat.historique);
  const periode = ANNEES_HISTORIQUE[0] + ' – ' + ANNEES_HISTORIQUE[ANNEES_HISTORIQUE.length - 1];

  banniere.innerHTML =
    /* Sans conseiller pour la traduire, la réserve passe en tête et en clair
       plutôt qu'en note de bas de page. */
    (T('phrase.backtest.avertissement')
      ? '<div class="message alerte">' + T('phrase.backtest.avertissement') + '</div>' : '') +
    /* La mise en garde descend de l'intro jusqu'ici : elle doit être sous les
       yeux au moment où l'on lit les chiffres, pas trois écrans plus haut. */
    '<p class="intro rappel-local">Mesure le comportement du modèle, ne prédit rien. ' +
      '<button class="lien" data-aller="methode">Méthode &amp; limites</button></p>' +
    '<div class="fil-entete" style="margin-top:0"><h4 style="margin:0">Part sourcée du backtest</h4>' +
      pastilleReleveSeries() + '</div>' +
    (fiab.estime > 0
      ? (T('phrase.backtest.estime') !== 'phrase.backtest.estime'
          ? '<div class="message ' + (fiab.estime > 40 ? 'erreur' : 'alerte') + '">' +
            echapper(T('phrase.backtest.estime')) + '</div>'
          : '<div class="message ' + (fiab.estime > 40 ? 'erreur' : 'alerte') + '"><strong>' + pct(fiab.estime) +
        ' de l\'allocation testée repose encore sur des séries estimées, non vérifiées.</strong> ' +
        pct(fiab.marche) + ' proviennent des cours de marché relevés automatiquement et ' +
        pct(fiab.source) + ' d\'une source documentée. ' +
        'Ce backtest éprouve le comportement du modèle d\'allocation ; il ne constitue pas une mesure de performance ' +
        'et ne doit pas être présenté à un client. Remplacez les séries ci-dessous par vos extractions ' +
        'Quantalys ou Morningstar pour obtenir un résultat exploitable.</div>')
      : '<div class="message succes"><strong>Toutes les séries utilisées sont sourcées</strong> (' +
        pct(fiab.marche) + ' relevées sur les cours de marché). ' +
        'Vérifiez qu\'elles correspondent bien aux supports effectivement retenus, nets de frais et en euros.</div>') +
    (fiab.absent > 0 ? '<div class="message alerte">' + pct(fiab.absent) + ' de l\'allocation n\'a aucune série ' +
      'historique : cette part est exclue du calcul, qui est renormalisé sur le reste.</div>' : '');

  const r = MoteurBacktest.simuler(poids, opt);
  if (!r) { c.innerHTML = '<div class="message alerte">Aucune série exploitable pour cette allocation.</div>'; return; }

  const profil = resultatProfil().profil;
  const contrib = MoteurBacktest.contributions(r, poids);
  const reb = MoteurBacktest.effetRebalancement(poids, opt);
  const refs = MoteurBacktest.references(opt);
  const profils = MoteurBacktest.comparerProfils(opt);
  const seq = opt.retraitAnnuel > 0 ? MoteurBacktest.risqueSequence(poids, opt) : null;

  const maxAbs = Math.max.apply(null, r.annees.map(a => Math.abs(a.rendement)).concat([1]));

  c.innerHTML =
    '<div class="grille quatre">' +
      kpi(signe(r.perfCumulee), mot('backtest.kpi.cumul', 'Performance cumulée'),
          periode + ' · ' + r.nbAnnees + ' ans') +
      kpi(r.annualisee === null ? signe(r.twrAnnualise) : signe(r.annualisee),
          mot('backtest.kpi.paran', 'Par an'),
          r.annualisee === null ? 'pondérée dans le temps (retraits)'
            : mot('backtest.kpi.paran.detail', 'annualisée')) +
      kpi(pct(r.volatilite), mot('backtest.kpi.volatilite', 'Volatilité annuelle'),
          mot('backtest.kpi.volatilite.detail', 'écart-type des ' + r.nbAnnees + ' rendements')) +
      kpi(pct(r.maxDrawdown), mot('backtest.kpi.baisse', 'Plus forte baisse'),
          mot('backtest.kpi.baisse.detail', 'de fin d\'année à fin d\'année')) +
    '</div>' +

    '<div class="grille deux">' +
      '<div class="carte"><h3>Année par année — profil ' + profil.nom + '</h3>' +
        '<div class="barres">' + r.annees.map(a =>
          '<div class="barre"><div class="tete"><span>' + a.annee +
          (a.retrait ? ' <span style="color:var(--gris-doux)">(retrait ' + euro(a.retrait) + ')</span>' : '') + '</span>' +
          '<span class="' + (a.rendement >= 0 ? 'positif' : 'negatif') + '">' + signe(a.rendement) +
          ' <span style="color:var(--gris-doux);font-weight:400">' + euro(a.capital) + '</span></span></div>' +
          '<div class="piste" style="display:flex;justify-content:center">' +
          '<div style="width:50%;display:flex;justify-content:flex-end">' +
          (a.rendement < 0 ? '<div style="height:100%;border-radius:3px;background:var(--rouge);width:' +
            (100 * Math.abs(a.rendement) / maxAbs) + '%"></div>' : '') + '</div>' +
          '<div style="width:50%">' +
          (a.rendement >= 0 ? '<div style="height:100%;border-radius:3px;background:var(--vert);width:' +
            (100 * a.rendement / maxAbs) + '%"></div>' : '') + '</div></div></div>').join('') + '</div>' +
        '<table style="margin-top:12px"><tbody>' +
        ligne('Capital initial', euro(r.capitalInitial)) +
        (r.retraitsCumules ? ligne('Retraits cumulés', euro(r.retraitsCumules)) : '') +
        ligne('Capital final', euro(r.capitalFinal)) +
        ligne('Années négatives', r.anneesNegatives + ' sur ' + r.nbAnnees) +
        ligne('Meilleure année', r.meilleureAnnee.annee + ' (' + signe(r.meilleureAnnee.rendement) + ')') +
        ligne('Pire année', r.pireAnnee.annee + ' (' + signe(r.pireAnnee.rendement) + ')') +
        /* Un ratio sans échelle ni explication est du bruit : 0,68 ne se
           compare à rien pour qui n'a pas l'habitude. Il reste au conseiller,
           qui sait ce qu'il vaut. */
        (r.ratioRendementRisque !== null && T('backtest.kpi.cumul') === 'backtest.kpi.cumul'
          ? ligne('Rendement / volatilité', r.ratioRendementRisque.toFixed(2).replace('.', ',')) : '') +
        '</tbody></table>' +
      '</div>' +

      '<div class="carte"><h3>Comparaison</h3>' +
        (T('backtest.comparaison.intro') === 'backtest.comparaison.intro' ? ''
          : '<p class="intro" style="font-size:12px">' +
            echapper(T('backtest.comparaison.intro')) + '</p>') +
        '<div class="tableau-defilant"><table><thead><tr><th>Allocation</th><th class="num">Cumul</th><th class="num">Par an</th>' +
        '<th class="num">Volat.</th><th class="num">Pire année</th></tr></thead><tbody>' +
        profils.map(p => '<tr' + (p.profil.id === profil.id ? ' style="background:var(--bleu-pale);font-weight:600"' : '') + '>' +
          '<td><span class="pastille" style="background:' + p.profil.couleur + '"></span>' + p.profil.nom + '</td>' +
          '<td class="num">' + signe(p.perfCumulee) + '</td>' +
          '<td class="num">' + signe(p.annualisee === null ? p.twrAnnualise : p.annualisee) + '</td>' +
          '<td class="num">' + p.volatilite.toFixed(1).replace('.', ',') + '</td>' +
          '<td class="num negatif">' + signe(p.pireAnnee.rendement) + '</td></tr>').join('') +
        '<tr><td colspan="5" style="padding:4px 0"></td></tr>' +
        refs.map(x => '<tr style="color:var(--gris-doux)"><td><em>' + echapper(x.nom) + '</em></td>' +
          '<td class="num">' + signe(x.perfCumulee) + '</td>' +
          '<td class="num">' + signe(x.annualisee === null ? x.twrAnnualise : x.annualisee) + '</td>' +
          '<td class="num">' + x.volatilite.toFixed(1).replace('.', ',') + '</td>' +
          '<td class="num">' + signe(x.pireAnnee.rendement) + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<p class="intro" style="font-size:11px;margin-top:10px">Sur une période où les actions dominent, un profil ' +
        'prudent paraîtra toujours médiocre. Ce tableau mesure la cohérence du dispositif de risque, pas la qualité ' +
        'd\'un profil : le bon profil est celui que le client peut tenir dans la pire année, ici ' +
        r.pireAnnee.annee + '.</p>' +
      '</div>' +
    '</div>' +

    '<div class="carte"><h3>D\'où vient la performance</h3>' +
      '<div class="tableau-defilant"><table><thead><tr><th>Poche' + aide('poche') + '</th><th class="num">Poids</th>' +
      '<th class="num">Gain / perte</th><th class="num">Points de performance</th><th class="num">Part du résultat</th>' +
      '</tr></thead><tbody>' +
      contrib.map(x => '<tr><td><span class="pastille" style="background:' +
        COULEURS_CLASSES[MoteurSelection.classeDePoche(x.poche)] + '"></span>' +
        echapper(LIBELLES_POCHES[x.poche] || x.poche) + '</td>' +
        '<td class="num">' + pct(x.poids) + '</td>' +
        '<td class="num ' + (x.gain >= 0 ? 'positif' : 'negatif') + '">' + euro(x.gain) + '</td>' +
        '<td class="num">' + signe(x.pointsDePerf) + '</td>' +
        '<td class="num">' + pct(x.partDuGain) + '</td></tr>').join('') +
      '</tbody></table></div>' +
    '</div>' +

    (reb ? '<div class="carte"><h3>Le rééquilibrage annuel a-t-il servi ?</h3>' +
      '<div class="tableau-defilant"><table><thead><tr><th>Gestion</th><th class="num">Cumul</th><th class="num">Volatilité</th>' +
      '<th class="num">Pire année</th><th class="num">Capital final</th></tr></thead><tbody>' +
      '<tr><td>Rééquilibrage annuel</td><td class="num">' + signe(reb.avec.perfCumulee) + '</td>' +
      '<td class="num">' + pct(reb.avec.volatilite) + '</td><td class="num negatif">' + signe(reb.avec.pireAnnee.rendement) + '</td>' +
      '<td class="num">' + euro(reb.avec.capitalFinal) + '</td></tr>' +
      '<tr><td>Aucun arbitrage (buy &amp; hold)</td><td class="num">' + signe(reb.sans.perfCumulee) + '</td>' +
      '<td class="num">' + pct(reb.sans.volatilite) + '</td><td class="num negatif">' + signe(reb.sans.pireAnnee.rendement) + '</td>' +
      '<td class="num">' + euro(reb.sans.capitalFinal) + '</td></tr>' +
      '</tbody></table></div>' +
      '<p class="intro" style="font-size:12px;margin-top:10px">' +
      (reb.gainPerf >= 0
        ? 'Sur cette période, le rééquilibrage a ajouté ' + signe(reb.gainPerf) + ' de performance cumulée.'
        : 'Sur cette période, le rééquilibrage a coûté ' + pct(Math.abs(reb.gainPerf)) + ' de performance cumulée : ' +
          'il vend mécaniquement ce qui monte. C\'est le prix du contrôle du risque — la contrepartie est ' +
          pct(reb.gainVol) + ' de volatilité en moins et une exposition actions qui ne dérive pas au-delà du profil.') +
      '</p></div>' : '') +

    (seq ? '<div class="carte"><h3>Risque de séquence</h3>' +
      '<p class="intro" style="font-size:12px">Mêmes rendements, mêmes retraits, ordre des années inversé. ' +
      'En phase de retrait, l\'ordre dans lequel les performances surviennent compte autant que leur moyenne.</p>' +
      '<table><thead><tr><th>Ordre des années</th><th class="num">Retraits cumulés</th><th class="num">Capital final</th></tr></thead><tbody>' +
      '<tr><td>Chronologique</td><td class="num">' + euro(seq.chrono.retraitsCumules) + '</td>' +
      '<td class="num">' + euro(seq.chrono.capitalFinal) + '</td></tr>' +
      '<tr><td>Inversé</td><td class="num">' + euro(seq.inverse.retraitsCumules) + '</td>' +
      '<td class="num">' + euro(seq.inverse.capitalFinal) + '</td></tr>' +
      '<tr><td><strong>Écart</strong></td><td class="num">—</td>' +
      '<td class="num"><strong>' + euro(seq.ecart) + ' (' + signe(seq.ecartPct) + ')</strong></td></tr>' +
      '</tbody></table></div>' : '') +

    '<div class="message alerte"><strong>Limites de ce backtest.</strong><ul>' +
      '<li>Le pas est <strong>annuel</strong> : la plus forte baisse est mesurée de fin d\'année à fin d\'année ' +
      'et sous-estime nettement la baisse réellement vécue en cours d\'année.</li>' +
      '<li>Cinq années ne constituent pas un échantillon statistique. Volatilité et ratios calculés sur ' +
      r.nbAnnees + ' observations sont indicatifs.</li>' +
      '<li>Le calcul porte sur des <strong>indices par poche</strong>, pas sur les ETF réellement retenus : ' +
      'écarts de suivi, frais de transaction et frais d\'arbitrage ne sont pas reproduits. ' +
      (opt.fraisContrat ? 'Les frais de contrat de ' + pct(opt.fraisContrat) + ' par an sont appliqués.'
        : 'Aucun frais de contrat n\'est appliqué — renseignez-les ci-dessus.') + '</li>' +
      '<li>L\'allocation testée est celle d\'aujourd\'hui, appliquée rétrospectivement. Le portefeuille réel ' +
      'aurait connu des arbitrages tactiques différents à chaque revue.</li>' +
      '<li>Les performances passées ne préjugent pas des performances futures.</li>' +
    '</ul></div>';
}

function rendreSeriesHistorique() {
  $('#entete-historique').innerHTML = '<th>Poche' + aide('poche') + '</th>' +
    ANNEES_HISTORIQUE.map(a => '<th class="num">' + a + '</th>').join('') +
    '<th class="num">Cumul</th><th>Référence</th><th>Sourcé</th>';

  $('#corps-historique').innerHTML = Object.keys(Etat.historique).map(p => {
    const s = Etat.historique[p];
    const cumul = 100 * (s.valeurs.reduce((a, v) => a * (1 + v / 100), 1) - 1);
    return '<tr><td>' + echapper(LIBELLES_POCHES[p] || p) + '</td>' +
      s.valeurs.map((v, i) => {
        const prov = (s.provenance || [])[i] || (s.source === 'source' ? 'source' : 'estime');
        const fond = prov === 'marche' ? 'var(--fond-marche)'
          : prov === 'source' ? 'var(--fond-source)' : 'var(--fond-estime)';
        const titre = prov === 'marche' ? 'Relevé sur les cours de marché'
          : prov === 'source' ? 'Source documentée' : 'Estimation non vérifiée';
        return '<td class="num"><input type="number" step="0.1" style="width:72px;background:' + fond +
          '" title="' + titre + '" data-serie="' + p + '" data-annee="' + i + '" value="' + v + '"></td>';
      }).join('') +
      '<td class="num ' + (cumul >= 0 ? 'positif' : 'negatif') + '">' + signe(cumul) + '</td>' +
      '<td style="font-size:11px;color:var(--gris-doux)">' + echapper(s.instrument || s.reference || '') +
        (s.url ? ' <a href="' + s.url + '" target="_blank" rel="noopener">source</a>' : '') + '</td>' +
      '<td style="text-align:center"><input type="checkbox" data-serie-source="' + p + '"' +
        (s.source === 'source' ? ' checked' : '') + '></td></tr>';
  }).join('');
}
