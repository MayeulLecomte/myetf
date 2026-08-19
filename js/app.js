/* =============================================================
   APPLICATION — état, rendu et interactions
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

function rendreUnivers() {
  const f = Etat.filtreUnivers;
  rendreCatalogue();
  rendreRapprochement();

  const tete = $('#entonnoir-univers');
  if (tete) tete.innerHTML = ligneEntonnoir();

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

function brancher() {

  /* Dans cet ordre : la colonne porte les libellés que la barre de parcours
     y relit ensuite. */
  poserNav();
  poserTitres();
  poserBarresParcours();

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
    const b = e.target.closest('button[data-groupe]');
    if (!b) return;
    const g = GROUPES.find(x => x.id === b.dataset.groupe);
    if (!g) return;
    if (groupeDeVue(vueCourante()).id === g.id) window.scrollTo({ top: 0, behavior: 'smooth' });
    else afficher(g.vues[0]);
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
      poserNav(); poserTitres(); poserBarresParcours(); majNav();
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
    poserNav(); poserTitres();
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

(function init() {
  verifierVersion();
  const restaure = charger();
  const remplacees = injecterCoursMarche();
  IDENTITE.forEach(f => {
    if (Etat.identite[f.id] === undefined && f.defaut !== undefined) Etat.identite[f.id] = f.defaut;
  });
  brancher();

  /* Les arrêtés du 30 juin et du 31 décembre franchis depuis la dernière
     ouverture sont enregistrés d'office : c'est le moment où les quantités
     connues sont encore celles de l'arrêté. */
  const arretes = figerArretesFranchis();
  if (arretes) sauver(true);

  /* Le widget iOS ouvre une section précise par une ancre (…/#note).
     On la consomme puis on l'efface : hors ce cas, et à chaque
     rechargement, l'application s'ouvre sur « Aujourd'hui ». */
  const demandee = (location.hash || '').replace(/^#/, '');
  const existe = demandee && document.getElementById('vue-' + demandee);
  if (existe) history.replaceState(null, '', location.pathname + location.search);
  afficher(existe ? demandee : 'accueil');
  /* Le dossier restauré peut avoir le catalogue pour source de sélection :
     il faut alors le charger avant que la première vue ne soit rendue sur
     les seuls 42 supports de l'univers de travail. */
  if (Etat.filtres.sourceUnivers === 'catalogue') chargerCatalogue();
  if (restaure) notifier('Dossier précédent restauré.', 'info');
  if (arretes) notifier(arretes + ' arrêté(s) semestriel(s) figé(s).', 'info',
                        { libelle: 'Voir la situation', vue: 'situation' });
  if (remplacees) console.info(remplacees + ' performances annuelles alimentées par les cours de marché.');
})();
