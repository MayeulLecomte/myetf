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
      const val = Etat.macroChoix[ind.id] !== undefined ? Etat.macroChoix[ind.id] : MoteurAllocation.valeurDefaut(ind);
      return '<div class="indicateur"><label>' + echapper(ind.label) + '</label>' +
        (ind.aide ? '<div class="aide">' + echapper(ind.aide) + '</div>' : '') +
        '<select data-macro="' + ind.id + '">' + ind.options.map(o =>
          '<option value="' + o.valeur + '"' + (o.valeur === val ? ' selected' : '') + '>' + echapper(o.label) + '</option>'
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
      : !m.exprime
        ? '<div class="message alerte" style="margin-top:10px"><strong>Aucun indicateur n\'est ' +
          'renseigné.</strong> Les probabilités ci-dessus sont celles du repli, pas une lecture du ' +
          'marché : tant qu\'aucun indicateur n\'est choisi, elles n\'entrent dans aucun calcul et ' +
          'l\'allocation cible reste strictement stratégique.</div>'
        : '');

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

  const segments = Object.keys(alloc.classes).map(cl => ({
    label: LIBELLES_CLASSES[cl], valeur: alloc.classes[cl], couleur: COULEURS_CLASSES[cl]
  }));

  const poches = Object.keys(alloc.poches).filter(p => alloc.poches[p] > 0)
    .sort((a, b) => alloc.poches[b] - alloc.poches[a]);

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
      '<div class="carte"><h3>Répartition par classe d\'actifs</h3>' +
        '<div class="graphique">' + donut(segments) + '<div style="flex:1;min-width:200px">' + legende(segments) + '</div></div>' +
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

  c.innerHTML =
    '<div class="grille quatre">' +
      kpi(String(sel.nbSupports), 'Supports retenus', 'sur ' + sel.universEligible + ' éligibles') +
      kpi(pct(sel.terMoyen, 2), 'Frais courants moyens', 'pondérés par les encours cibles') +
      kpi(euro(Number(Etat.identite.montant) || 0), 'Montant investi', libelleEnveloppe()) +
      kpi(euro((Number(Etat.identite.montant) || 0) * sel.terMoyen / 100), 'Coût annuel des supports', 'hors frais de contrat') +
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

    (nonVerifies ? '<div class="message alerte"><strong>' + nonVerifies + ' support(s) non validé(s) au contrat.</strong> ' +
      'Leurs caractéristiques de marché ont été relevées sur source publique, mais leur référencement effectif ' +
      'dans le contrat reste à contrôler avant remise au client : collez la liste des supports de l\'assureur ' +
      'le rapprochement avec la liste des supports coche la colonne « Contrat » pour vous.' +
      '<div class="barre-actions"><button class="bouton secondaire" data-aller="univers">' +
      'Ouvrir l\'univers ETF</button></div></div>' : '') +

    (sansNotation ? '<div class="message info"><strong>' + sansNotation + ' support(s) sans notation Morningstar.</strong> ' +
      'Morningstar ne note ni les monétaires, ni les ETC, ni les fonds de moins de trois ans. Pour ces supports, ' +
      'la notation est retirée du barème du score et le filtre « étoiles minimum » ne s\'applique pas.</div>' : '') +

    (derives.length ? '<div class="message ' + (derives.some(d => d.cl === 'actions' && d.ecart > 0) ? 'erreur' : 'alerte') + '">' +
      '<strong>Le portefeuille réalisable s\'écarte de l\'allocation cible.</strong> ' +
      derives.map(d => LIBELLES_CLASSES[d.cl] + ' ' + signe(d.ecart)).join(' · ') +
      '. Cet écart provient des contraintes de l\'univers disponible' +
      (Object.keys(sel.classesNonImplementables).length ? ' (classes non représentées dans l\'enveloppe)' : '') +
      '. Vérifiez que le portefeuille obtenu reste compatible avec le profil ' + r.profil.nom.toLowerCase() + '.</div>' : '') +

    (sel.residuel > 0 ? '<div class="message erreur"><strong>' + pct(sel.residuel) + ' non investis.</strong> ' +
      'Aucun support de l\'univers ne couvre ces poches. Élargissez les filtres ou complétez l\'univers ETF.</div>' : '') +

    (sel.avertissements.length ? '<div class="message info"><strong>Adaptations à l\'univers disponible.</strong><ul>' +
      sel.avertissements.map(a => '<li>' + echapper(a) + '</li>').join('') + '</ul></div>' : '') +

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
      '<p class="intro" style="font-size:11px;margin-top:10px">Score de sélection ramené sur 100 : notation Morningstar (40 pts, ' +
      'écartée du barème lorsqu\'elle n\'est pas renseignée), ' +
      'frais courants relatifs à la poche (20), encours (15), mode de réplication (10)' +
      (ctx.esg === 'aucune' ? '' : ', label ISR (' + (ctx.esg === 'prioritaire' ? 15 : 8) + ')') + '. ' +
      'Filtres appliqués : ' + ctx.etoilesMin + ' étoiles minimum, encours ≥ ' + ctx.encoursMin + ' M€, frais ≤ ' + pct(ctx.terMax, 2) +
      (ctx.exclureSynthetique ? ', réplication physique uniquement' : '') +
      (ctx.contratSeulement ? ', supports validés au contrat uniquement' : '') + '.</p>' +
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
  const analyse = MoteurArbitrage.analyser(
    Etat.detention, sel.lignes,
    { enveloppe: Etat.identite.enveloppe || 'AV', apport: Number(Etat.apport) || 0 },
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
      kpi(pct(analyse.rotation), 'Rotation du portefeuille', 'part de l\'encours arbitrée', 'rotation') +
      kpi(euro(analyse.fiscalite.impotEstime), 'Fiscalité estimée', analyse.fiscalite.taux ? 'PFU 30 %' : 'enveloppe non imposable') +
      kpi(euro(analyse.total), 'Encours après opération', 'dont apport ' + euro(analyse.apport)) +
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
        ? '<div class="message alerte"><strong>' + hors.length + ' ligne(s) hors bande de tolérance.</strong> ' +
          hors.slice(0, 5).map(e => echapper(e.libelle) + ' ' + signe(e.pctCible - e.pctActuel)).join(' · ') +
          (hors.length > 5 ? ' …' : '') + '. Bande retenue : ' + pct(SEUILS_ARBITRAGE.ecartAbsoluMin) +
          ' de l\'encours, soit ' + euro(analyse.seuilMontant) + '.</div>'
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

    '<div class="carte"><h3>Écart d\'allocation par classe d\'actifs</h3>' +
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
      : '<div class="carte"><h3>Ordres à passer</h3>' +
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
          '<td style="font-size:12px;color:var(--gris-doux)">' + echapper(o.motif) + '</td></tr>').join('') +
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

    '<div class="barre-actions sans-impression">' +
      '<button class="bouton" id="btn-journaliser">Valider la revue et l\'inscrire au journal</button>' +
      '<button class="bouton secondaire" id="btn-appliquer">Appliquer les ordres à la détention saisie</button>' +
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

  const ba = $('#btn-appliquer');
  if (ba) ba.onclick = () => {
    analyse.ordres.forEach(o => {
      let ligne = Etat.detention.find(l => l.isin === o.isin);
      if (!ligne) { ligne = { isin: o.isin, libelle: o.libelle, montant: 0, pvLatente: 0 }; Etat.detention.push(ligne); }
      ligne.montant = Math.max(0, (Number(ligne.montant) || 0) + (o.sens === 'Achat' ? o.montant : -o.montant));
    });
    Etat.detention = Etat.detention.filter(l => Number(l.montant) > 0);
    Etat.apport = 0;
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
function kpiMontant(cle, libelleDefaut, detailDefaut, valeurPct, taux) {
  const montant = Number(Etat.identite.montant) || 0;
  if (T(cle) === cle || !montant) return kpi(valeurPct, libelleDefaut, detailDefaut);
  const cent = x => Math.round(x / 100) * 100;
  const part = euro(cent(montant * Math.abs(taux) / 100));
  return kpi(valeurPct, T(cle),
             T(cle + '.detail', { gain: part, ecart: part, montant: euro(montant) }));
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
      ? '<div class="message ' + (fiab.estime > 40 ? 'erreur' : 'alerte') + '"><strong>' + pct(fiab.estime) +
        ' de l\'allocation testée repose encore sur des séries estimées, non vérifiées.</strong> ' +
        pct(fiab.marche) + ' proviennent des cours de marché relevés automatiquement et ' +
        pct(fiab.source) + ' d\'une source documentée. ' +
        'Ce backtest éprouve le comportement du modèle d\'allocation ; il ne constitue pas une mesure de performance ' +
        'et ne doit pas être présenté à un client. Remplacez les séries ci-dessous par vos extractions ' +
        'Quantalys ou Morningstar pour obtenir un résultat exploitable.</div>'
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
      kpi(signe(r.perfCumulee), 'Performance cumulée', periode + ' · ' + r.nbAnnees + ' ans') +
      kpi(r.annualisee === null ? signe(r.twrAnnualise) : signe(r.annualisee), 'Par an',
          r.annualisee === null ? 'pondérée dans le temps (retraits)' : 'annualisée') +
      kpi(pct(r.volatilite), 'Volatilité annuelle', 'écart-type des ' + r.nbAnnees + ' rendements') +
      kpi(pct(r.maxDrawdown), 'Plus forte baisse', 'de fin d\'année à fin d\'année') +
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
        (r.ratioRendementRisque !== null ? ligne('Rendement / volatilité', r.ratioRendementRisque.toFixed(2).replace('.', ',')) : '') +
        '</tbody></table>' +
      '</div>' +

      '<div class="carte"><h3>Comparaison</h3>' +
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
