/* =============================================================
   CATALOGUE ET UNIVERS
   -------------------------------------------------------------
   Le catalogue européen — chargement à la demande, recherche, ajout à l'univers
   —, le rapprochement avec la liste des supports du contrat, l'entonnoir de
   sélection et la fiche d'un support.

   Déplacé depuis js/app.js sans une virgule de changement.
   ============================================================= */

/* ------------------------------------------------------------
   LA FICHE D'UN SUPPORT
   ------------------------------------------------------------
   Ouverte d'un clic sur le nom, dans la sélection comme dans le
   suivi. Elle ne dit que ce qu'on sait, et d'où on le sait : une
   fiche qui invente une donnée manquante est pire qu'une case
   vide, parce qu'on la recopie.

   Les deux performances viennent du catalogue Morningstar, qui
   les calcule en VL DIVIDENDES RÉINVESTIS. Nos propres cours
   Euronext sont des prix nus : sur un distribuant, les deux ne
   coïncident pas, et c'est écrit dans la fiche. Elles datent du
   jour où le catalogue a été relevé, pas d'aujourd'hui.
   ------------------------------------------------------------ */
/* Quatre mille cinq cents lignes reparcourues à chaque appel, quarante-deux
   fois par rendu de l'univers : l'index est construit une fois par version du
   catalogue. */
let _indexCatalogue = null;

function indexCatalogue() {
  if (typeof CATALOGUE_ETF === 'undefined' || !CATALOGUE_ETF) return null;
  if (_indexCatalogue && _indexCatalogue.genere === CATALOGUE_ETF.genere) return _indexCatalogue;
  const par = {};
  CATALOGUE_ETF.lignes.forEach(l => { par[l[0]] = l; });
  _indexCatalogue = {
    genere: CATALOGUE_ETF.genere, par,
    col: nom => CATALOGUE_ETF.colonnes.indexOf(nom)
  };
  return _indexCatalogue;
}

function donneesCatalogue(isin) {
  const ix = indexCatalogue();
  return ix ? (ix.par[isin] || null) : null;
}

/* La performance depuis le 1er janvier, telle que la fiche l'affiche — MÊME
   source, même chiffre. Deux lectures du catalogue finiraient par diverger,
   et l'on ne saurait plus laquelle croire. */
function perfAnneeDe(isin) {
  const ix = indexCatalogue();
  if (!ix) return null;
  const l = ix.par[isin];
  if (!l) return null;
  const v = l[ix.col('perfAnnee')];
  return v == null ? null : v;
}

function ficheEtf(isin) {
  const ref = universSelection().find(e => e.isin === isin) ||
              Etat.univers.find(e => e.isin === isin) || null;
  const cat = donneesCatalogue(isin);
  const indices = (typeof CATALOGUE_ETF !== 'undefined' && CATALOGUE_ETF && CATALOGUE_ETF.indices) || [];

  const nom = (ref && ref.nom) ||
              (Etat.detention.find(l => l.isin === isin) || {}).libelle || isin;
  const indice = cat && cat[15] != null ? indices[cat[15]] : null;
  const ter = ref && ref.ter != null ? ref.ter : (cat ? cat[5] : null);
  const perf1an = cat ? cat[13] : null;
  const perfAnnee = cat ? cat[14] : null;
  const genere = (typeof CATALOGUE_ETF !== 'undefined' && CATALOGUE_ETF) ? CATALOGUE_ETF.genere : null;

  const ligne = (etiquette, valeur, sourdine) =>
    '<div class="fiche-ligne"><span>' + echapper(etiquette) + '</span>' +
    '<strong' + (sourdine ? ' class="sourdine"' : '') + '>' + valeur + '</strong></div>';

  const perf = v => v == null ? '<span class="sourdine">non publiée</span>'
                              : '<span class="' + (v >= 0 ? 'positif' : 'negatif') + '">' + signe(v, 2) + '</span>';

  return '<div class="fiche">' +
    '<p class="fiche-nom">' + echapper(nom) + '</p>' +
    ligne('ISIN', '<span style="font-family:monospace">' + echapper(isin) + '</span>') +
    ligne('Indice répliqué', indice ? echapper(indice) : '<span class="sourdine">non publié</span>', !indice) +
    ligne('Frais courants', ter != null ? pct(ter, 2) : '<span class="sourdine">non publiés</span>', ter == null) +
    ligne('Performance 12 mois', perf(perf1an)) +
    ligne('Depuis le 1er janvier', perf(perfAnnee)) +
    (cat
      ? '<p class="fiche-source">Source : Morningstar, relevé le ' + (genere ? dateFr(genere) : '—') +
        '. Performances calculées en valeur liquidative, <strong>dividendes réinvestis</strong> — elles ne ' +
        'coïncident donc pas avec l\'évolution du seul cours pour un support distribuant. Elles datent du ' +
        'relevé, pas d\'aujourd\'hui.</p>'
      : '<p class="fiche-source">Le catalogue n\'est pas chargé : les performances et l\'indice en viennent. ' +
        'Ouvrez « ' + echapper(T('vue.univers.nav')) + ' » pour le charger.</p>') +
    '<div class="barre-actions">' +
      '<a class="bouton secondaire" target="_blank" rel="noopener noreferrer" ' +
      'href="https://www.justetf.com/fr/etf-profile.html?isin=' + encodeURIComponent(isin) + '">' +
      'Fiche justETF ↗</a>' +
    '</div>' +
  '</div>';
}

function ouvrirFicheEtf(isin) {
  /* Le catalogue porte l'indice et les performances : s'il n'est pas encore
     là, on le demande et l'on rouvrira la fiche complète à son arrivée. */
  if (typeof CATALOGUE_ETF === 'undefined') {
    chargerCatalogue(() => {
      const f = $('#feuille');
      if (f && !f.hidden) $('#feuille-corps').innerHTML = ficheEtf(isin);
    });
  }
  ouvrirFeuille('Fiche du support', ficheEtf(isin));
}

/* ============================================================
   VUE 10 — UNIVERS
   ============================================================ */

/* ============================================================
   CATALOGUE EUROPÉEN
   -------------------------------------------------------------
   Un annuaire de recherche, pas un univers : rien n'y est vérifié
   et rien n'entre dans la sélection avant d'avoir été versé dans
   l'univers de travail, où il arrive avec le drapeau « Contrat »
   à faux comme n'importe quelle ligne non contrôlée.

   Le fichier pèse un demi-mégaoctet : il n'est chargé que si l'on
   ouvre le catalogue. Un <script> injecté fonctionne aussi bien en
   file:// qu'en ligne, là où un fetch échouerait sur un double-clic.
   ============================================================ */

/* `montre` est le nombre de lignes affichées : il grandit à mesure qu'on
   descend, et repart à sa valeur de départ dès que la recherche change.
   Deux mille lignes posées d'un coup dans le document tiennent la page
   bloquée une seconde entière sur un téléphone. */
const PAS_CATALOGUE = 60;

const Catalogue = { etat: 'absent', recherche: '', euronextSeul: false,
                    pocheSeule: '', montre: PAS_CATALOGUE,
                    /* Ce que l'on veut refaire une fois le catalogue arrivé.
                       Un demi-mégaoctet met un moment à descendre, et ce qui
                       l'attend n'est pas toujours la vue à l'écran — la fiche
                       d'un support en dépend aussi. */
                    attentes: [] };

/** @param {Function} [apres] rappelé quand le catalogue est utilisable. */
function chargerCatalogue(apres) {
  if (Catalogue.etat === 'pret') { if (apres) apres(); return; }
  if (apres) Catalogue.attentes.push(apres);
  if (Catalogue.etat !== 'absent') return;
  Catalogue.etat = 'chargement';
  rendreCatalogue();

  const s = document.createElement('script');
  s.src = 'js/data/catalogue-etf.js?v=' + Date.now();
  s.onload = () => {
    Catalogue.etat = (typeof CATALOGUE_ETF !== 'undefined') ? 'pret' : 'erreur';
    majLibelleSource();
    /* Le catalogue peut être devenu la source de la sélection pendant son
       chargement : la vue à l'écran doit alors être refaite, pas seulement
       la liste de recherche. */
    if (Etat.filtres.sourceUnivers === 'catalogue') { majNav(); rendre(vueCourante()); }
    else rendreCatalogue();
    const attentes = Catalogue.attentes.splice(0);
    if (Catalogue.etat === 'pret') attentes.forEach(f => f());
  };
  s.onerror = () => { Catalogue.etat = 'erreur'; majLibelleSource(); rendreCatalogue(); };
  document.head.appendChild(s);
}

/** Lignes du catalogue correspondant à la recherche, jusqu'au rang demandé. */
function chercherCatalogue(limite) {
  const c = CATALOGUE_ETF;
  const mots = Catalogue.recherche.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const dansUnivers = new Set(Etat.univers.map(e => e.isin));
  const resultats = [];
  let total = 0;

  for (const l of c.lignes) {
    if (Catalogue.euronextSeul && !/XPAR|XAMS|XBRU|XLIS/.test(l[8])) continue;
    if (Catalogue.pocheSeule && l[9] !== Catalogue.pocheSeule) continue;
    if (mots.length) {
      const foin = (l[0] + ' ' + l[1] + ' ' + l[2] + ' ' +
                    c.emetteurs[l[3]] + ' ' + c.categories[l[4]]).toLowerCase();
      if (!mots.every(m => foin.indexOf(m) >= 0)) continue;
    }
    total++;
    if (resultats.length < limite) {
      resultats.push({
        isin: l[0], nom: l[1], ticker: l[2], emetteur: c.emetteurs[l[3]],
        categorie: c.categories[l[4]], ter: l[5], note: l[6], devise: l[7],
        places: l[8].split(','), poche: l[9], encours: l[10], srri: l[11],
        creation: l[12], deja: dansUnivers.has(l[0])
      });
    }
  }
  return { resultats, total };
}

function rendreCatalogue() {
  const c = $('#catalogue-contenu');
  if (!c) return;

  if (Catalogue.etat === 'absent') {
    c.innerHTML = '<div class="barre-actions" style="margin-top:0">' +
      '<button class="bouton" id="btn-charger-catalogue">Ouvrir le catalogue</button></div>' +
      '<p class="intro" style="font-size:11px">Un demi-mégaoctet à télécharger, une seule fois par session.</p>';
    $('#btn-charger-catalogue').onclick = chargerCatalogue;
    return;
  }
  if (Catalogue.etat === 'chargement') { c.innerHTML = '<p class="intro">Chargement du catalogue…</p>'; return; }
  if (Catalogue.etat === 'erreur') {
    c.innerHTML = '<div class="message erreur"><strong>Catalogue introuvable.</strong> ' +
      'Le fichier <code>js/data/catalogue-etf.js</code> doit être présent à côté de l\'application. ' +
      'Il se régénère par <code>node scripts/catalogue.mjs</code>.</div>';
    return;
  }

  const { resultats, total } = chercherCatalogue(Catalogue.montre);
  const poches = Object.keys(LIBELLES_POCHES);

  c.innerHTML =
    '<div class="filtres">' +
      '<div class="champ" style="flex:1;min-width:220px"><label for="catalogue-q">Rechercher</label>' +
        '<input type="search" id="catalogue-q" placeholder="nom, ISIN, émetteur, catégorie" value="' +
        echapper(Catalogue.recherche) + '"></div>' +
      '<div class="champ"><label for="catalogue-poche">Poche</label>' +
        '<select id="catalogue-poche"><option value="">Toutes</option>' +
        poches.map(p => '<option value="' + p + '"' + (Catalogue.pocheSeule === p ? ' selected' : '') + '>' +
          echapper(LIBELLES_POCHES[p]) + '</option>').join('') + '</select></div>' +
      '<div class="champ"><label for="catalogue-euronext">Places</label>' +
        '<select id="catalogue-euronext">' +
          '<option value="0"' + (Catalogue.euronextSeul ? '' : ' selected') + '>Toutes</option>' +
          '<option value="1"' + (Catalogue.euronextSeul ? ' selected' : '') + '>Euronext seulement</option>' +
        '</select></div>' +
    '</div>' +

    '<div class="catalogue-compte">' +
      '<strong>' + total.toLocaleString('fr-FR') + '</strong> support(s) · ' +
      CATALOGUE_ETF.lignes.length.toLocaleString('fr-FR') + ' au catalogue du ' +
      dateFr(CATALOGUE_ETF.genere) + '</div>' +

    (resultats.length
      ? '<div class="catalogue-liste">' + resultats.map(r => ligneCatalogue(r)).join('') + '</div>' +
        (total > resultats.length
          ? '<div class="catalogue-suite" id="catalogue-suite">' +
              '<button class="bouton secondaire" id="btn-catalogue-plus">Afficher ' +
                Math.min(PAS_CATALOGUE, total - resultats.length) + ' supports de plus</button>' +
              '<span>' + resultats.length.toLocaleString('fr-FR') + ' sur ' +
                total.toLocaleString('fr-FR') + '</span>' +
            '</div>'
          : '<div class="catalogue-suite"><span>Fin de la liste — ' +
              total.toLocaleString('fr-FR') + ' support(s).</span></div>')
      : '<div class="message info">Aucun support ne correspond à cette recherche.</div>');

  const q = $('#catalogue-q');
  /* La saisie est temporisée : filtrer quatre mille cinq cents lignes à
     chaque lettre rend la frappe poisseuse sur un téléphone. */
  q.oninput = () => {
    clearTimeout(window.__catTimer);
    window.__catTimer = setTimeout(() => {
      Catalogue.recherche = q.value;
      Catalogue.montre = PAS_CATALOGUE;
      rendreCatalogue();
      const n = $('#catalogue-q');
      n.focus();
      n.setSelectionRange(n.value.length, n.value.length);
    }, 220);
  };
  $('#catalogue-poche').onchange = e => {
    Catalogue.pocheSeule = e.target.value; Catalogue.montre = PAS_CATALOGUE; rendreCatalogue();
  };
  $('#catalogue-euronext').onchange = e => {
    Catalogue.euronextSeul = e.target.value === '1'; Catalogue.montre = PAS_CATALOGUE; rendreCatalogue();
  };

  const plus = $('#btn-catalogue-plus');
  if (plus) {
    plus.onclick = () => { Catalogue.montre += PAS_CATALOGUE; rendreCatalogue(); };
    /* Et sans attendre le bouton : dès que le pied de liste approche du
       bas de l'écran, la tranche suivante s'ajoute. Le bouton reste pour
       ceux qui n'utilisent pas la molette, et quand l'observateur manque. */
    if (typeof IntersectionObserver !== 'undefined') {
      if (Catalogue.veilleur) Catalogue.veilleur.disconnect();
      Catalogue.veilleur = new IntersectionObserver(entrees => {
        if (entrees.some(x => x.isIntersecting)) {
          Catalogue.veilleur.disconnect();
          Catalogue.montre += PAS_CATALOGUE;
          rendreCatalogue();
        }
      }, { rootMargin: '600px 0px' });
      Catalogue.veilleur.observe($('#catalogue-suite'));
    }
  }
}

/* Une ligne de catalogue : une carte, pas une rangée de tableau. Sur un
   téléphone, sept colonnes se réduisent à des colonnes illisibles ; empilées,
   les mêmes données se lisent d'un regard et le doigt trouve son bouton. */
function ligneCatalogue(r) {
  const menu = [
    r.ter == null ? null : pct(r.ter, 2) + ' de frais',
    r.encours == null ? null : (r.encours >= 1000
      ? (r.encours / 1000).toFixed(1).replace('.', ',') + ' Md€'
      : r.encours.toLocaleString('fr-FR') + ' M€'),
    r.devise || null,
    r.creation ? 'créé en ' + r.creation.slice(0, 4) : null
  ].filter(Boolean);

  return '<div class="catalogue-ligne' + (r.deja ? ' deja' : '') + '">' +
    '<div class="catalogue-corps">' +
      '<div class="catalogue-nom">' + echapper(r.nom) + '</div>' +
      '<div class="catalogue-meta">' + echapper(r.emetteur) +
        (r.ticker ? ' · ' + echapper(r.ticker) : '') +
        ' · <span style="font-family:monospace">' + echapper(r.isin) + '</span></div>' +
      '<div class="catalogue-marques">' +
        (r.poche
          ? '<span class="badge">' + echapper(LIBELLES_POCHES[r.poche] || r.poche) + '</span>'
          : '<span class="badge orange">poche à choisir</span>') +
        (r.note == null ? '' : '<span class="badge gris">' + etoiles(r.note) + '</span>') +
        menu.map(x => '<span class="catalogue-fait">' + echapper(x) + '</span>').join('') +
      '</div>' +
    '</div>' +
    '<div class="catalogue-action">' + (r.deja
      ? '<span class="badge vert">dans l\'univers</span>'
      : '<button class="bouton secondaire" data-catalogue-ajout="' + echapper(r.isin) + '">Ajouter</button>') +
    '</div>' +
  '</div>';
}

/** Verse un support du catalogue dans l'univers de travail. */
function ajouterDepuisCatalogue(isin) {
  const c = CATALOGUE_ETF;
  const l = c.lignes.find(x => x[0] === isin);
  if (!l) return;
  if (Etat.univers.some(e => e.isin === isin)) { notifier('Ce support est déjà dans l\'univers.', 'info'); return; }

  const poche = l[9] || 'act-monde';
  const euronext = /XPAR|XAMS|XBRU|XLIS/.test(l[8]);

  Etat.univers.unshift({
    isin: l[0], ticker: l[2], nom: l[1], emetteur: c.emetteurs[l[3]],
    classe: MoteurSelection.classeDePoche(poche), poche,
    ter: l[5] == null ? 0.20 : l[5], encours: 0, morningstar: l[6], sri: 4,
    replication: 'Physique', devise: l[7] || 'EUR', hedge: false, capitalisation: true, isr: false,
    pea: false, enveloppes: ['AV', 'CTO'], contratsAV: ['av-large'], verifie: false,
    donneesLe: c.genere, donneesSource: 'Morningstar (catalogue)',
    notationLe: l[6] == null ? undefined : c.genere,
    note: 'Ajouté depuis le catalogue le ' + dateFr() + '. ' +
      (l[9] ? 'Poche déduite de la catégorie « ' + c.categories[l[4]] + ' ».'
            : 'Catégorie « ' + c.categories[l[4]] + ' » sans poche correspondante : poche à choisir.') +
      ' Encours, réplication, capitalisation et éligibilité PEA restent à renseigner.' +
      (euronext ? '' : ' Non coté sur Euronext : sa valeur ne se rafraîchira pas toute seule.')
  });

  /* Un support versé depuis le catalogue pendant qu'un rapprochement est
     affiché doit y entrer aussitôt, sinon il apparaît encore comme absent
     de l'univers dans le rapport qui vient de le faire ajouter. */
  if (Rapprochement.rapport && $('#zone-contrat')) {
    Rapprochement.rapport = MoteurContrat.rapprocher(Etat.univers, $('#zone-contrat').value);
  }

  sauver(true);
  rendreUnivers();
  notifier('« ' + l[1] + ' » ajouté à l\'univers — sa ligne reste à contrôler.');
}

/* ============================================================
   RAPPROCHEMENT AVEC LA LISTE DES SUPPORTS DU CONTRAT
   -------------------------------------------------------------
   Le rapprochement est calculé puis montré ; il n'est reporté sur
   l'univers qu'au clic sur « Appliquer ». Entre les deux, rien
   n'a bougé : c'est le seul contrôle qui engage le conseil, il ne
   doit pas se faire dans le dos du conseiller.
   ============================================================ */

const Rapprochement = { rapport: null };

function rendreRapprochement() {
  const c = $('#rapprochement-contenu');
  if (!c) return;
  const r = Rapprochement.rapport;

  if (!r) {
    const valides = Etat.univers.filter(e => e.verifie);
    c.innerHTML = valides.length
      ? '<div class="message succes" style="margin-bottom:0">' + valides.length + ' support(s) sur ' +
        Etat.univers.length + ' validés au contrat' +
        (valides[0].verifieSource ? ' — ' + echapper(valides[0].verifieSource) : '') + '.</div>'
      : '<div class="message info" style="margin-bottom:0"><strong>Aucun support n\'est encore validé.</strong> ' +
        'Tant que la colonne « Contrat » est vide, la sélection porte sur des supports dont rien ne dit ' +
        'qu\'ils sont souscriptibles : chaque ligne du portefeuille proposé porte la mention ' +
        '« contrat à vérifier ».</div>';
    return;
  }

  const nomPoche = p => LIBELLES_POCHES[p] || p;
  const parIsin = r.trouves.filter(t => t.par === 'isin').length;
  const parNom = r.trouves.length - parIsin;

  const bloc = (titre, corps, classe) =>
    '<div class="message ' + classe + '"><strong>' + titre + '</strong><br>' + corps + '</div>';

  let html = '<div style="border-top:1px solid var(--gris-ligne);margin-top:16px;padding-top:14px">' +
    '<h4 style="margin:0 0 10px">Rapprochement — ' + r.lignesLues + ' ligne(s) lues, ' +
    r.isinsLus + ' ISIN reconnus</h4>';

  html += bloc(r.trouves.length + ' support(s) de l\'univers retrouvés dans la liste',
    (parIsin ? parIsin + ' par leur ISIN' : '') +
    (parNom ? (parIsin ? ', ' : '') + parNom + ' par leur nom seul — à relire' : '') + '.' +
    (r.trouves.length
      ? '<div style="margin-top:8px;font-size:12px;max-height:180px;overflow:auto">' +
        r.trouves.map(t => '<div>' + (t.par === 'nom' ? '<span class="badge orange">par le nom</span> ' : '') +
          echapper(t.nom) + ' <span style="font-family:monospace;color:var(--gris-doux)">' +
          echapper(t.isin) + '</span></div>').join('') + '</div>'
      : ''),
    r.trouves.length ? 'succes' : 'erreur');

  if (r.absents.length) {
    html += bloc(r.absents.length + ' support(s) de l\'univers absents de la liste',
      'Ils ne sont pas souscriptibles dans ce contrat. Décochez-les — ou retirez-les de l\'univers ' +
      'si le contrat est le seul que vous travaillez.' +
      '<div style="margin-top:8px;font-size:12px;max-height:180px;overflow:auto">' +
      r.absents.map(a => '<div>' + echapper(a.nom) + ' <span style="font-family:monospace;color:var(--gris-doux)">' +
        echapper(a.isin) + '</span> · ' + echapper(nomPoche(a.poche)) + '</div>').join('') + '</div>',
      'alerte');
  }

  if (r.pochesVidees.length) {
    html += bloc(r.pochesVidees.length + ' poche(s) resteraient sans aucun support',
      'L\'allocation cible attribuera un poids à ces poches sans pouvoir le remplir : ' +
      r.pochesVidees.map(p => echapper(nomPoche(p.poche)) + ' (' + p.total + ' support(s) écartés)').join(' · ') +
      '. Cherchez dans le catalogue européen ce que le contrat référence pour ces poches.',
      'erreur');
  }

  if (r.ambigus.length) {
    html += bloc(r.ambigus.length + ' ligne(s) désignant plusieurs supports',
      'Aucune n\'a été tranchée : cochez à la main dans le tableau ci-dessous.' +
      '<div style="margin-top:8px;font-size:12px">' +
      r.ambigus.map(a => '<div style="margin-bottom:6px">« ' + echapper(a.ligne) + ' » → ' +
        a.candidats.map(x => echapper(x.nom)).join(' · ') + '</div>').join('') + '</div>',
      'alerte');
  }

  if (r.horsUnivers.length) {
    html += bloc(r.horsUnivers.length + ' ISIN de la liste absents de votre univers',
      'Ce sont les supports que le contrat référence et que l\'outil ne connaît pas. ' +
      'Ceux qui figurent au catalogue européen s\'ajoutent d\'un clic.' +
      '<div style="margin-top:8px;font-size:12px;max-height:200px;overflow:auto" id="hors-univers-liste">' +
      r.horsUnivers.map(h => '<div style="margin-bottom:4px"><span style="font-family:monospace">' +
        echapper(h.isin) + '</span> <span style="color:var(--gris-doux)">' +
        echapper(h.ligne.length > 90 ? h.ligne.slice(0, 90) + '…' : h.ligne) + '</span>' +
        (Catalogue.etat === 'pret'
          ? ' <button class="bouton secondaire" style="padding:1px 8px;font-size:11px" data-catalogue-ajout="' +
            echapper(h.isin) + '">Ajouter</button>' : '') + '</div>').join('') +
      '</div>' +
      (Catalogue.etat === 'pret' ? ''
        : '<p style="font-size:11px;margin:8px 0 0">Ouvrez le catalogue européen, plus bas, pour les ajouter d\'un clic.</p>'),
      'info');
  }

  if (r.sansCorrespondance.length) {
    html += '<p class="intro" style="font-size:11px">' + r.sansCorrespondance.length +
      ' ligne(s) sans ISIN ni nom reconnaissable ont été ignorées (en-têtes, totaux, fonds en euros, ' +
      'unités de compte non ETF).</p>';
  }

  const aDecocher = ($('#contrat-decocher') && $('#contrat-decocher').checked)
    ? r.absents.filter(a => a.verifie).length : 0;

  html += '<div class="barre-actions">' +
    '<button class="bouton" id="btn-appliquer-rapprochement">Appliquer — cocher ' + r.trouves.length +
      ' support(s)' + (aDecocher ? ', en décocher ' + aDecocher : '') + '</button>' +
    '<button class="bouton secondaire" id="btn-abandonner-rapprochement">Abandonner</button>' +
    '</div></div>';

  c.innerHTML = html;
  $('#btn-appliquer-rapprochement').onclick = appliquerRapprochement;
  $('#btn-abandonner-rapprochement').onclick = () => { Rapprochement.rapport = null; rendreUnivers(); };
}

function appliquerRapprochement() {
  const r = Rapprochement.rapport;
  if (!r) return;
  const res = MoteurContrat.appliquer(Etat.univers, r, {
    contrat: $('#contrat-nom').value,
    date: aujourdhuiISO(),
    decocherAbsents: $('#contrat-decocher').checked
  });
  Rapprochement.rapport = null;
  sauver(true);
  rendre('univers');
  majNav();
  notifier(res.coches + ' support(s) validés au contrat' +
    (res.decoches ? ', ' + res.decoches + ' invalidés' : '') + '.');
}

/* Les supports que les filtres de l'onglet laissent voir. Les actions de
   masse portent exactement sur cette liste : ce qui est coché est ce qui
   est affiché, jamais davantage. */
function universFiltre() {
  const f = Etat.filtreUnivers;
  return Etat.univers.filter(e => {
    if (f.classe && e.classe !== f.classe) return false;
    if (f.enveloppe && e.enveloppes.indexOf(f.enveloppe) < 0) return false;
    if (f.texte) {
      const t = f.texte.toLowerCase();
      if ((e.nom + ' ' + e.isin + ' ' + e.emetteur + ' ' + (e.ticker || '')).toLowerCase().indexOf(t) < 0) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------
   L'ENTONNOIR, POUR LES DEUX ÉCRANS
   ------------------------------------------------------------
   Un testeur croyait l'outil choisir parmi les 4 533 ETF du
   catalogue. Il choisit parmi 866, et en retient une douzaine.
   Les deux endroits qui l'expliquent — la ligne de l'onglet
   Univers et le tableau de « Méthode & limites » — lisent la
   MÊME fonction du moteur : deux comptes séparés finiraient par
   se contredire, et c'est l'outil qui perdrait sa crédibilité
   sur sa propre méthode.
   ------------------------------------------------------------ */
function entonnoirCourant() {
  if (typeof CATALOGUE_ETF === 'undefined' || !CATALOGUE_ETF) return null;
  const e = MoteurUnivers.entonnoir(CATALOGUE_ETF, Etat.univers, Etat.filtres);
  /* Le dernier resserrement dépend du dossier : sans profil, il n'y a pas
     encore de portefeuille retenu. */
  const sel = selectionCourante();
  e.retenus = sel ? sel.nbSupports : null;
  return e;
}

/* Une ligne, en tête de l'univers. Elle dit d'où sort la sélection, et
   distingue les deux ensembles que le testeur confondait. */
function ligneEntonnoir() {
  const e = entonnoirCourant();
  const travail = Etat.filtres.sourceUnivers !== 'catalogue';
  const lien = ' <button class="lien" data-aller="methode">comment ?</button>';

  if (!e) {
    return '<p class="intro entonnoir-ligne">Sélection parmi les ' + Etat.univers.length +
      ' supports de l\'univers de travail, relevés à la main. Le catalogue européen n\'est pas ' +
      'chargé.' + lien + '</p>';
  }
  if (travail) {
    return '<p class="intro entonnoir-ligne">Sélection parmi les <strong>' + e.universTravail +
      ' supports de l\'univers de travail</strong>, relevés à la main · catalogue européen ' +
      'disponible : ' + e.brut.toLocaleString('fr-FR') + ' ETF, relevé du ' + dateFr(e.genere) +
      lien + '</p>';
  }
  return '<p class="intro entonnoir-ligne">Sélection parmi <strong>' +
    e.candidats.toLocaleString('fr-FR') + ' ETF du catalogue</strong> (sur ' +
    e.brut.toLocaleString('fr-FR') + ', relevé du ' + dateFr(e.genere) +
    ') · univers de travail : ' + e.universTravail + ' supports relevés à la main' + lien + '</p>';
}

function celluleAnnee(isin) {
  const ix = indexCatalogue();
  if (!ix) return '<span class="sourdine" title="Le catalogue n\'est pas chargé : ' +
    'c\'est lui qui porte les performances.">—</span>';
  const v = perfAnneeDe(isin);
  if (v == null) return '<span class="sourdine" title="Non publiée par Morningstar pour ce support.">—</span>';
  return '<span class="' + (v >= 0 ? 'positif' : 'negatif') + '" title="Depuis le 1er janvier, ' +
    'en valeur liquidative dividendes réinvestis. Source : Morningstar, relevé le ' +
    dateFr(CATALOGUE_ETF.genere) + '.">' + signe(v, 2) + '</span>';
}

/* ============================================================
   LA CARTE DE RAPPROCHEMENT AVEC LE CATALOGUE
   ------------------------------------------------------------
   Écrite chaque mois par `scripts/ecarts.mjs`, lue ici. Elle ne
   corrige rien : elle dit quelles fiches justETF rouvrir au
   prochain relevé trimestriel.

   ELLE PARAÎT TOUJOURS, y compris à zéro écart. « Aucun écart »
   et « le rapprochement n'a pas tourné » sont deux choses très
   différentes, et une carte qui disparaît quand tout va bien ne
   permet plus de les distinguer.
   ============================================================ */
function carteEcartsCatalogue() {
  if (typeof ECARTS_UNIVERS === 'undefined' || !ECARTS_UNIVERS) return '';
  const e = ECARTS_UNIVERS;
  const n = (e.lignes || []).length;

  const entete = '<div class="carte"><h3>Rapprochement avec le catalogue Morningstar</h3>';

  /* La phrase des exclusions n'est pas une précaution de style : sans elle,
     on cherche l'encours dans le tableau et l'on conclut que le contrôle
     est incomplet. */
  const limites = '<p class="intro">Le catalogue mensuel sert de deuxième regard sur le relevé ' +
    'justETF. <strong>Seuls les frais et la présence au catalogue y sont rapprochés</strong> : ' +
    "l'encours de Morningstar porte sur le fonds entier quand celui de justETF porte sur la part, " +
    'et sa devise est celle de la part cotée, non celle du fonds. Les comparer ferait crier ' +
    'trente lignes par mois sans rien dire.</p>';

  const date = 'Rapprochement du ' + dateFr(e.genere) + ' · catalogue du ' + dateFr(e.catalogue) +
    ' · ' + e.controles + ' supports contrôlés';

  if (!n) {
    return entete + limites +
      '<div class="message info" style="margin-top:12px"><strong>Aucun écart.</strong> ' +
      echapper(date) + '.</div></div>';
  }

  const libelleChamp = { ter: 'Frais courants', presence: 'Présence au catalogue' };

  return entete + limites +
    '<p class="intro" style="margin-top:10px">' + echapper(date) + '. ' +
    '<strong>' + n + ' ligne' + (n > 1 ? 's' : '') + ' à revérifier sur justETF.</strong> ' +
    "Rien n'a été modifié : le relevé manuel reste la référence — au premier passage, sur les " +
    "deux écarts revérifiés, c'est le catalogue qui avait tort les deux fois.</p>" +
    '<div class="tableau-defilant"><table><thead><tr><th>Support</th><th>Champ</th>' +
    '<th class="num">Relevé justETF</th><th class="num">Catalogue</th><th>Au catalogue</th>' +
    '</tr></thead><tbody>' +
    e.lignes.map(l =>
      '<tr><td><a href="https://www.justetf.com/fr/etf-profile.html?isin=' + echapper(l.isin) + '"' +
        ' target="_blank" rel="noopener">' + echapper(l.nom) + '</a>' +
        '<div style="font-size:11.5px;color:var(--texte-doux)">' + echapper(l.isin) + '</div></td>' +
      '<td>' + echapper(libelleChamp[l.champ] || l.champ) + '</td>' +
      '<td class="num">' + echapper(l.champ === 'ter' ? pct(l.releve, 2) : String(l.releve)) + '</td>' +
      '<td class="num">' + echapper(l.champ === 'ter' ? pct(l.catalogue, 2) : String(l.catalogue)) + '</td>' +
      /* Le nom du catalogue est là pour l'œil : c'est ce qui permet de voir
         qu'un ISIN désigne un autre fonds, là où aucun seuil ne le peut. */
      '<td style="font-size:12px;color:var(--texte-doux)">' + echapper(l.nomCatalogue || '—') + '</td>' +
      '</tr>').join('') +
    '</tbody></table></div>' +
    '<p class="intro" style="font-size:12px">La procédure de relevé trimestriel commence par cette ' +
    'liste : ne rouvrez que ces fiches-là.</p></div>';
}

function rendreUnivers() {
  const f = Etat.filtreUnivers;
  rendreCatalogue();
  rendreRapprochement();

  const tete = $('#entonnoir-univers');
  if (tete) tete.innerHTML = ligneEntonnoir() + carteEcartsCatalogue();

  $('#filtres-univers').innerHTML =
    '<div class="champ"><label>Classe d\'actifs</label><select data-filtre-univers="classe">' +
      '<option value="">Toutes</option>' + Object.keys(LIBELLES_CLASSES).map(c =>
        '<option value="' + c + '"' + (f.classe === c ? ' selected' : '') + '>' + LIBELLES_CLASSES[c] + '</option>').join('') +
    '</select></div>' +
    '<div class="champ"><label>Enveloppe</label><select data-filtre-univers="enveloppe">' +
      '<option value="">Toutes</option><option value="AV"' + (f.enveloppe === 'AV' ? ' selected' : '') + '>Assurance-vie</option>' +
      '<option value="PEA"' + (f.enveloppe === 'PEA' ? ' selected' : '') + '>PEA</option>' +
      '<option value="CTO"' + (f.enveloppe === 'CTO' ? ' selected' : '') + '>Compte-titres</option>' +
    '</select></div>' +
    '<div class="champ" style="flex:1"><label>Recherche (nom, ISIN, émetteur)</label>' +
      '<input type="text" data-filtre-univers="texte" value="' + echapper(f.texte) + '" placeholder="iShares, IE00B..."></div>' +
    '<div style="font-size:12px;color:var(--gris-doux);padding-bottom:10px" id="compteur-univers"></div>';

  const liste = universFiltre();

  $('#compteur-univers').innerHTML = echapper(liste.length + ' / ' + Etat.univers.length + ' supports · ' +
    Etat.univers.filter(e => e.donneesLe).length + ' aux données contrôlées · ' +
    Etat.univers.filter(e => e.verifie).length + ' validés au contrat · ' +
    Etat.univers.filter(e => e.morningstar == null).length + ' sans notation') +
    /* Un demi-mégaoctet ne se télécharge pas sans qu'on l'ait demandé : la
       colonne reste vide et l'on propose, plutôt que d'imposer. */
    (indexCatalogue() ? ''
      : ' · <button class="lien" id="btn-charger-perfs">charger le catalogue pour les performances</button>');

  const options = Object.keys(LIBELLES_POCHES);

  $('#corps-univers').innerHTML = liste.map(e => {
    const i = Etat.univers.indexOf(e);
    return '<tr>' +
      '<td><input type="text" data-etf="nom" data-index="' + i + '" value="' + echapper(e.nom) + '" style="min-width:230px"></td>' +
      '<td><input type="text" data-etf="isin" data-index="' + i + '" value="' + echapper(e.isin) + '" style="font-family:monospace;min-width:120px"></td>' +
      '<td><select data-etf="poche" data-index="' + i + '">' + options.map(p =>
          '<option value="' + p + '"' + (e.poche === p ? ' selected' : '') + '>' + LIBELLES_POCHES[p] + '</option>').join('') + '</select></td>' +
      '<td class="num"><input type="number" data-etf="ter" data-index="' + i + '" value="' + e.ter + '" step="0.01" style="width:70px"></td>' +
      '<td class="num"><input type="number" data-etf="encours" data-index="' + i + '" value="' + e.encours + '" step="100" style="width:90px"></td>' +
      /* La seule colonne de ce tableau qui ne se saisit pas : elle est
         SOURCÉE, comme la fiche, et une case modifiable laisserait croire
         qu'on peut la corriger à la main. */
      '<td class="num">' + celluleAnnee(e.isin) + '</td>' +
      '<td class="num"><select data-etf="morningstar" data-index="' + i + '" style="width:60px"' +
          (e.notationLe ? ' title="Note relevée le ' + dateFr(e.notationLe) + ' chez Morningstar"'
                        : ' title="Morningstar ne note pas ce support : monétaire, ETC, matières premières ou fonds de moins de trois ans"') + '>' +
          '<option value=""' + (e.morningstar == null ? ' selected' : '') + '>—</option>' +
          [1, 2, 3, 4, 5].map(n => '<option value="' + n + '"' + (e.morningstar === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></td>' +
      '<td><select data-etf="replication" data-index="' + i + '">' +
          ['Physique', 'Synthétique', 'Physique (ETC)'].map(x =>
            '<option value="' + x + '"' + (e.replication === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></td>' +
      '<td style="text-align:center"><input type="checkbox" data-etf="pea" data-index="' + i + '"' + (e.pea ? ' checked' : '') + '></td>' +
      '<td><select data-etf="contratAV" data-index="' + i + '">' +
          '<option value="">Hors assurance-vie</option>' +
          '<option value="av-restreint"' + ((e.contratsAV || []).indexOf('av-restreint') >= 0 ? ' selected' : '') + '>Restreint</option>' +
          '<option value="av-standard"' + ((e.contratsAV || []).indexOf('av-standard') >= 0 ? ' selected' : '') + '>Standard</option>' +
          '<option value="av-large"' + ((e.contratsAV || []).indexOf('av-large') >= 0 ? ' selected' : '') + '>Large</option>' +
        '</select></td>' +
      '<td style="text-align:center;font-size:11px;color:var(--gris-doux);white-space:nowrap"' +
        (e.donneesLe ? ' title="Caractéristiques de marché relevées le ' + dateFr(e.donneesLe) +
          (e.donneesSource ? ' sur ' + echapper(e.donneesSource) : '') + '"' : '') + '>' +
        (e.donneesLe ? e.donneesLe.slice(8, 10) + '/' + e.donneesLe.slice(5, 7) + '/' + e.donneesLe.slice(2, 4) : '—') + '</td>' +
      '<td style="text-align:center"><input type="checkbox" data-etf="isr" data-index="' + i + '"' + (e.isr ? ' checked' : '') + '></td>' +
      '<td style="text-align:center"' +
        (e.verifie && e.verifieLe
          ? ' title="Référencement contrôlé le ' + dateFr(e.verifieLe) +
            (e.verifieSource ? ' — ' + echapper(e.verifieSource) : '') + '"'
          : ' title="Non contrôlé : ce support peut ne pas être référencé au contrat"') + '>' +
        '<input type="checkbox" data-etf="verifie" data-index="' + i + '"' + (e.verifie ? ' checked' : '') + '>' +
        (e.verifie && e.verifieLe
          ? '<div style="font-size:10px;color:var(--gris-doux)">' + e.verifieLe.slice(8, 10) + '/' +
            e.verifieLe.slice(5, 7) + '/' + e.verifieLe.slice(2, 4) + '</div>' : '') +
      '</td>' +
      '<td><button class="bouton secondaire" data-supprimer-etf="' + i + '">✕</button></td>' +
    '</tr>';
  }).join('');

  $('#liste-sources').innerHTML = SOURCES_DONNEES.map(s =>
    '<li><a href="' + s.url + '" target="_blank" rel="noopener">' + echapper(s.nom) + '</a> — ' + echapper(s.usage) + '</li>').join('');
}
