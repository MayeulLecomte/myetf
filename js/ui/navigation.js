/* =============================================================
   NAVIGATION
   -------------------------------------------------------------
   Les blocs, la colonne, le ruban mobile, la barre basse, la barre de parcours,
   et l'aiguillage qui rend une vue. La colonne reste la source des libellés :
   le ruban, la barre basse et le parcours l'y lisent tous les trois.

   La feuille de détail vit ici aussi — c'est une destination, pas une vue.

   Déplacé depuis js/app.js sans une virgule de changement.
   ============================================================= */

/* ============================================================
   NAVIGATION
   ============================================================ */

/* ============================================================
   NAVIGATION
   -------------------------------------------------------------
   Quinze onglets tiennent dans une colonne latérale sur un écran
   large. Sur un téléphone, ils devenaient un ruban de quinze
   pilules qu'il fallait faire glisser pour trouver la sixième :
   on ne sait jamais où l'on est ni ce qui reste.

   D'où deux étages sur mobile, comme dans les applications qu'on
   ouvre tous les jours : cinq destinations dans une barre basse,
   à portée de pouce, et les vues du groupe courant dans un ruban
   segmenté sous l'en-tête. Deux touchers suffisent pour aller
   n'importe où, et la barre basse dit en permanence où l'on est.

   La colonne latérale reste seule maîtresse au-dessus de 820 px :
   elle montre les quinze d'un coup, ce qu'aucune barre basse ne
   sait faire.
   ============================================================ */

const GROUPES = [
  { id: 'aujourdhui', libelle: 'Aujourd\'hui', vues: ['accueil'],
    icone: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5' },
  { id: 'profil', libelle: 'Profil', vues: ['client', 'questionnaire', 'profil'],
    icone: 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.8-3.6 3.9-5.5 7.5-5.5s6.7 1.9 7.5 5.5' },
  { id: 'allocation', libelle: 'Allocation',
    vues: ['note', 'macro', 'allocation', 'portefeuille', 'arbitrages', 'backtest'],
    icone: 'M3 17.5 9 11l4 4 8-8.5M15.5 6.5H21V12' },
  { id: 'suivi', libelle: 'Suivi', vues: ['situation', 'revenus', 'journal', 'rapport'],
    icone: 'M4 7h12m0 0-3.5-3.5M16 7l-3.5 3.5M20 17H8m0 0 3.5-3.5M8 17l3.5 3.5' },
  /* Les données ne sont pas une étape du parcours : elles n'ont pas d'entrée
     dans la barre basse, où un cinquième onglet de même taille contredirait
     leur caractère secondaire. On y accède depuis « Sélection des supports »
     et depuis la feuille du bouton « ••• ». */
  { id: 'donnees', libelle: 'Données', vues: ['univers', 'methode'], secondaire: true,
    icone: 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' }
];

function groupeDeVue(vue) {
  return GROUPES.find(g => g.vues.indexOf(vue) >= 0) || GROUPES[0];
}

/* ------------------------------------------------------------
   LA BARRE DE PARCOURS
   ------------------------------------------------------------
   Treize vues s'enchaînent, et chacune n'offrait qu'un « suivant ».
   Sur téléphone, le balayage ramène en arrière ; sur un écran large,
   il fallait viser la colonne de gauche — l'application avançait,
   elle ne reculait pas.

   Les deux boutons sont posés par le code plutôt qu'écrits dans la
   page. Les six barres en dur avaient déjà divergé de l'ordre
   affiché : « Profil de risque » enchaînait sur le contexte macro en
   sautant la note du jour, qui le précède pourtant dans le bloc. Il
   n'y a donc plus qu'une seule définition de l'ordre — celle des
   groupes de navigation — et l'on ne peut plus les désaccorder.
   ------------------------------------------------------------ */
function parcours() {
  return GROUPES
    .filter(g => !g.secondaire && g.vues[0] !== 'accueil')
    .reduce((tout, g) => tout.concat(g.vues), [])
    .filter(v => !vueMasquee(v));
}

/* Le libellé est celui de la navigation, relu dans la page : une
   seconde table de noms finit toujours par contredire la première. */
function libelleVue(vue) {
  const b = $('#nav button[data-vue="' + vue + '"]');
  return b ? b.textContent.trim() : vue;
}

/* ------------------------------------------------------------
   LA COLONNE DE NAVIGATION ET LES TITRES DE VUE
   ------------------------------------------------------------
   Tous deux posés depuis `js/data/libelles.js`, parce que leur
   texte dépend du mode. La colonne reste ensuite la source des
   libellés pour le ruban mobile, la barre basse et la barre de
   parcours, qui l'y lisent déjà : renommer une vue dans la table
   les suit toutes les trois sans les toucher.
   ------------------------------------------------------------ */
function poserNav() {
  const nav = $('#nav');
  if (!nav) return;
  nav.innerHTML = GROUPES.map(g => {
    const vues = g.vues.filter(v => !vueMasquee(v));
    if (!vues.length) return '';
    /* Le premier groupe n'a qu'une vue et se nomme comme elle : lui poser
       un titre de bloc écrirait deux fois le même mot. */
    const titre = vues.length > 1
      ? '<div class="bloc-titre' + (g.secondaire ? ' secondaire' : '') + '">' +
        echapper(g.libelle) + '</div>'
      : '';
    return titre + vues.map(v =>
      '<button data-vue="' + v + '"' +
        (v === 'accueil' ? ' class="actif accueil"' : (g.secondaire ? ' class="secondaire"' : '')) +
        '><span class="num"></span> ' + echapper(T('vue.' + v + '.nav')) + '</button>').join('');
  }).join('');
}

function poserTitres() {
  $$('h2[data-titre]').forEach(h => {
    h.innerHTML = titreSouligne(T('vue.' + h.dataset.titre + '.titre'));
  });
}

/* ------------------------------------------------------------
   L'OUVERTURE D'UNE VUE
   ------------------------------------------------------------
   Le dessin ne se pose plus À CÔTÉ du titre, à trente-huit
   pixels : il tient le premier écran avec lui, et le contenu
   ne paraît qu'au défilement.

   Ce qui change vraiment, c'est ce sur quoi on arrive. Avant,
   une vue s'ouvrait sur un formulaire, un tableau ou un chiffre
   — on était dedans avant d'avoir lu le titre. Maintenant on
   arrive sur une image et un nom, et l'on descend quand on a
   compris où l'on est.

   LA PHRASE D'INTRODUCTION DEVIENT LE SOUS-TITRE. Onze vues en
   avaient déjà une, écrite de longue date, posée juste sous le
   titre ; elle est déplacée dans l'ouverture plutôt que
   réécrite. Les cinq qui n'en avaient pas la reçoivent de
   `SOUS_TITRES_VUES`.

   Posée une fois à l'amorçage, et reposée à chaque changement
   de mode — le vocabulaire des titres en dépend. La fonction
   est idempotente : elle reconnaît une ouverture déjà montée et
   ne la remonte pas.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   L'ÉCRAN D'OUVERTURE — trois secondes
   ------------------------------------------------------------
   Le signe seul sur le fond de page, puis il s'efface en fondu
   et la présentation paraît.

   TROIS GARDE-FOUS, et chacun répond à une façon de rester
   coincé derrière :

   • Il ne paraît que sur un dossier vierge dont le mode n'est
     pas choisi — le même critère que l'écran d'entrée. Un
     conseiller qui ouvre son dossier vingt fois par jour ne
     traverse pas vingt fois un voile.
   • Il se retire par une MINUTERIE, pas par la fin d'une
     animation : `animationend` ne se déclenche pas si
     l'animation est neutralisée, et `prefers-reduced-motion`
     la neutralise. L'écran serait resté pour toujours chez qui
     demande moins de mouvement.
   • Un clic le retire aussi. Trois secondes, c'est long quand
     on est pressé.
   ------------------------------------------------------------ */
function poserEcranOuverture() {
  if (Etat.mode || dossierEntame()) return;

  const voile = document.createElement('div');
  voile.className = 'ecran-ouverture';
  voile.setAttribute('aria-hidden', 'true');
  voile.innerHTML = illustration('logo', 132);
  document.body.appendChild(voile);

  let parti = false;
  const retirer = () => {
    if (parti) return;
    parti = true;
    voile.classList.add('parti');
    setTimeout(() => voile.remove(), 500);
  };
  voile.addEventListener('click', retirer);
  setTimeout(retirer, 3000);
}

/* ------------------------------------------------------------
   LA HAUTEUR DE L'EN-TÊTE, MESURÉE ET NON DEVINÉE
   ------------------------------------------------------------
   Le ruban colle sous l'en-tête, et il collait à `top: 52px` —
   un nombre écrit à la main. L'en-tête ne fait 52 px NULLE PART :
   53 sur écran large, 66 sur iPhone, davantage encore sur un
   modèle à encoche, puisqu'il porte `env(safe-area-inset-top)`.
   Quatorze pixels de ruban passaient donc SOUS l'en-tête dès
   qu'on descendait : les pastilles paraissaient se raccourcir,
   et rien ne pouvait le signaler — la hauteur ne se connaît
   qu'à l'exécution.

   Elle est mesurée et posée en variable. Tout ce qui doit se
   ranger sous l'en-tête lit `--h-entete` ; le repli à 52 px ne
   sert qu'au cas où cette fonction ne tournerait pas.
   ------------------------------------------------------------ */
function mesurerEntete() {
  const entete = $('.entete');
  if (!entete) return;
  const h = Math.round(entete.getBoundingClientRect().height);
  if (h > 0) document.documentElement.style.setProperty('--h-entete', h + 'px');
}

function poserOuvertures() {
  $$('h2[data-titre]').forEach(h => {
    const vue = h.dataset.titre;
    if (h.parentElement && h.parentElement.classList.contains('ouverture-vue')) return;

    const bloc = document.createElement('div');
    bloc.className = 'ouverture-vue sans-impression';

    /* Une vue sans dessin reçoit quand même son ouverture : le titre et sa
       phrase tiennent l'écran seuls. Mieux vaut une ouverture nue qu'un
       dessin emprunté à la vue d'à côté — c'est le doublon qu'on vient de
       lever, et il reviendrait par la porte de service. */
    bloc.innerHTML = ILLUSTRATIONS_VUES[vue]
      ? illustration(ILLUSTRATIONS_VUES[vue], tailleOuverture(ILLUSTRATIONS_VUES[vue])) : '';
    h.parentNode.insertBefore(bloc, h);
    bloc.appendChild(h);

    /* La phrase qui suivait le titre le suit encore, un cran plus bas. */
    const suivant = bloc.nextElementSibling;
    if (suivant && suivant.tagName === 'P' && suivant.classList.contains('intro')) {
      bloc.appendChild(suivant);
    } else if (SOUS_TITRES_VUES[vue]) {
      const p = document.createElement('p');
      p.className = 'intro';
      p.textContent = SOUS_TITRES_VUES[vue];
      bloc.appendChild(p);
    }

    bloc.insertAdjacentHTML('beforeend',
      '<div class="ouverture-suite" aria-hidden="true">' +
        '<span>Faites défiler</span>' +
        '<svg viewBox="0 0 24 24"><path d="M6 9.5 12 15.5 18 9.5"/></svg>' +
      '</div>');
  });
}

function poserBarresParcours() {
  /* Reposée telle quelle à chaque changement de mode : l'enchaînement saute
     les vues que le mode ne montre pas. */
  $$('.barre-parcours').forEach(b => b.remove());
  const suite = parcours();
  suite.forEach((vue, i) => {
    const section = $('#vue-' + vue);
    if (!section) return;
    const precedent = suite[i - 1];
    const suivant = suite[i + 1];
    const barre = document.createElement('div');
    /* Une navigation n'a rien à faire sur un document imprimé. */
    barre.className = 'barre-actions barre-parcours sans-impression';
    barre.innerHTML =
      (precedent ? '<button class="bouton secondaire precedent" data-aller="' + precedent + '">← ' +
        echapper(libelleVue(precedent)) + '</button>' : '') +
      (suivant ? '<button class="bouton suivant" data-aller="' + suivant + '">' +
        echapper(libelleVue(suivant)) + ' →</button>' : '');
    section.appendChild(barre);
  });
}

function afficher(vue) {
  $$('.vue').forEach(v => v.classList.remove('actif'));
  const cible = $('#vue-' + vue);
  if (cible) cible.classList.add('actif');
  $$('#nav button').forEach(b => b.classList.toggle('actif', b.dataset.vue === vue));
  window.scrollTo(0, 0);
  rendre(vue);
}

/** Vue actuellement à l'écran, pour la rafraîchir sans changer d'onglet. */
function vueCourante() {
  /* LA VUE AFFICHÉE, pas l'entrée de navigation allumée. Elle se lisait sur
     `#nav button.actif` — et une vue MASQUÉE dans le mode courant n'a pas
     d'entrée : la classe ne se posait nulle part, la fonction retombait sur
     « accueil », et la barre basse allumait Aujourd'hui pendant qu'on lisait
     la note du jour. Le ruban, lui, disparaissait.

     Le défaut existait avant que la navigation ne descende en bas ; il ne se
     voyait que sur téléphone, où le ruban et la barre étaient seuls à s'y
     fier. Ils le sont maintenant partout. */
  const s = $('section.vue.actif');
  return s ? s.id.replace('vue-', '') : 'accueil';
}

/* La barre basse et le ruban segmenté se déduisent entièrement de la
   colonne latérale : un seul jeu de libellés, un seul état d'avancement,
   et rien à tenir à jour en double le jour où une vue s'ajoute. */
function rendreNavMobile(vue) {
  const barre = $('#tabbar');
  const ruban = $('#sous-nav');
  if (!barre || !ruban) return;

  const groupe = groupeDeVue(vue);
  const libelle = v => {
    const b = $('#nav button[data-vue="' + v + '"]');
    return b ? b.textContent.replace(/^\s*[\d·]+\s*/, '').trim() : v;
  };
  /* Les trois états sont lus sur la colonne latérale plutôt que recalculés :
     un seul endroit décide de l'avancement, et le ruban ne peut pas en
     diverger. */
  const etat = v => {
    const b = $('#nav button[data-vue="' + v + '"]');
    if (!b) return '';
    if (b.classList.contains('complet')) return 'complet';
    if (b.classList.contains('encours')) return 'encours';
    return '';
  };

  /* Les quatre blocs, plus une porte vers les secondaires. Sur téléphone
     l'en-tête porte déjà un « ••• » et celui-ci reste masqué ; sur écran
     large, la colonne de gauche ayant disparu, c'est le seul chemin qui
     mène encore à l'univers ETF et à Méthode & limites. */
  barre.innerHTML = GROUPES.filter(g => !g.secondaire).map(g =>
    '<button data-groupe="' + g.id + '"' + (g.id === groupe.id ? ' class="actif"' : '') + '>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + g.icone + '"/></svg>' +
      '<span>' + echapper(g.libelle) + '</span>' +
    '</button>').join('') +
    '<span class="tabbar-filet" aria-hidden="true"></span>' +
    '<button class="tabbar-plus" id="btn-dossier-large" aria-label="Dossier et données">•••</button>';

  /* Un groupe d'une seule vue n'a pas de ruban : il n'y aurait qu'une
     pilule, qui ne dirait rien de plus que la barre basse. */
  const vuesGroupe = groupe.vues.filter(v => !vueMasquee(v));
  if (vuesGroupe.length < 2) { ruban.hidden = true; ruban.innerHTML = ''; return; }
  ruban.hidden = false;
  ruban.innerHTML = vuesGroupe.map(v => {
    const e = etat(v);
    return '<button data-vue="' + v + '"' + (v === vue ? ' class="actif"' : '') +
      (e === 'complet' ? ' data-complet="1"' : '') +
      (e === 'encours' ? ' data-etat="encours"' : '') +
      '>' + echapper(libelle(v)) + '</button>';
  }).join('');

  const actif = ruban.querySelector('button.actif');
  if (actif) actif.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

/* Les vues qui montrent le portefeuille suivi, et donc celles où il doit
   être à jour. Ailleurs, y toucher serait une écriture d'état déclenchée par
   un simple affichage — et la sélection coûte un parcours de deux mille
   supports qu'il est inutile de refaire pour rendre le journal. */
const VUES_SUIVI = ['accueil', 'portefeuille', 'arbitrages', 'situation', 'rapport'];

function rendre(vue) {
  if (VUES_SUIVI.indexOf(vue) >= 0 && synchroniserSuivi()) sauver(true);
  switch (vue) {
    case 'accueil':       rendreAccueil(); break;
    case 'client':        rendreIdentite(); break;
    case 'questionnaire': rendreQuestionnaire(); break;
    case 'profil':        rendreProfil(); break;
    case 'note':          rendreNote(); break;
    case 'macro':         rendreMacro(); break;
    case 'allocation':    rendreAllocation(); break;
    case 'portefeuille':  rendrePortefeuille(); break;
    case 'arbitrages':    rendreArbitrages(); break;
    case 'situation':     rendreSituation(); break;
    case 'revenus':       rendreRevenus(); break;
    case 'backtest':      rendreBacktest(); break;
    case 'univers':       rendreUnivers(); break;
    case 'journal':       rendreJournal(); break;
    case 'methode':       rendreMethode(); break;
    case 'rapport':       rendreRapport(); break;
  }
  majNav();
}

function majNav() {
  const p = resultatProfil();
  const repondues = QUESTIONS.filter(q => Etat.reponses[q.id] !== undefined).length;

  const complet = {
    client: identiteRenseignee(),
    questionnaire: MoteurProfil.questionsManquantes(Etat.reponses).length === 0,
    profil: !!p,
    note: typeof NOTE_MARCHE !== 'undefined' && !!NOTE_MARCHE,
    macro: Object.keys(Etat.macroChoix).length > 0,
    allocation: !!p, portefeuille: !!p,
    arbitrages: Etat.detention.length > 0,
    situation: Etat.detention.length > 0,
    revenus: Number(Etat.revenus.besoin) > 0,
    backtest: Object.keys(Etat.historique).some(k => Etat.historique[k].source === 'source'),
    journal: Etat.journal.length > 0, rapport: !!p
    /* Ni « univers », ni « methode » : ce sont des références, pas des
       étapes, et leur donner un avancement laisserait croire qu'on doit
       les finir. */
  };

  /* Trois états et non deux. « En cours » est celui d'une étape entamée et
     pas finie — un questionnaire à moitié rempli, une identité laissée à ses
     valeurs d'usine. Sans lui, ces deux cas se confondaient avec « à faire »,
     alors qu'ils ne demandent pas le même effort.

     L'univers ETF n'a aucun des trois : ce n'est pas une étape du parcours
     mais une référence, et lui donner un avancement laisserait croire qu'on
     doit le « finir ». */
  const encours = {
    client: !complet.client,
    questionnaire: !complet.questionnaire && repondues > 0
  };

  $$('#nav button').forEach(b => {
    const v = b.dataset.vue;
    b.classList.toggle('complet', !!complet[v]);
    b.classList.toggle('encours', !complet[v] && !!encours[v]);
  });

  /* Le compteur du questionnaire vit dans index.html, où il est écrit
     « 0 / 0 » en dur, et n'était calculé qu'à l'ouverture de l'onglet 2.
     Quelqu'un qui ne s'y rendait pas lisait donc un total faux. Il se
     recalcule maintenant à chaque rendu, dès le premier. */
  majProgression();
  rendreNavMobile(vueCourante());
}

/* Une feuille qui monte du bas : sur un téléphone, c'est le geste
   qu'on attend d'un détail — on la referme en la repoussant, sans
   perdre l'écran d'où l'on vient. */
function ouvrirFeuille(titre, contenu) {
  const f = $('#feuille');
  $('#feuille-titre').textContent = titre;
  $('#feuille-corps').innerHTML = contenu;
  f.hidden = false;
  requestAnimationFrame(() => f.classList.add('ouverte'));
}

function fermerFeuille() {
  const f = $('#feuille');
  if (!f || f.hidden) return;
  f.classList.remove('ouverte');
  setTimeout(() => { f.hidden = true; }, 260);
}

/* ============================================================
   ÉVÉNEMENTS
   ============================================================ */

/* Balayage horizontal : d'une vue à l'autre à l'intérieur du groupe.
   Le geste s'arrête aux frontières du groupe plutôt que de traverser
   les quinze vues — sans quoi on quitte « Dossier » sans l'avoir voulu.

   Trois gardes : le geste doit être franchement horizontal, il ne doit
   pas partir d'une zone qui défile elle-même — un tableau large, un
   ruban, le fil des poches —, et il ignore les champs de saisie, où
   glisser sert à placer le curseur. */
function brancherBalayage() {
  const zone = $('.contenu');
  let x0 = null, y0 = null, valable = false;

  zone.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { valable = false; return; }
    valable = !e.target.closest('.tableau-defilant, .fil, .sous-nav, input, textarea, select, .graphique');
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });

  zone.addEventListener('touchend', e => {
    if (!valable || x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * .6) return;

    const vue = vueCourante();
    const g = groupeDeVue(vue);
    const i = g.vues.indexOf(vue) + (dx < 0 ? 1 : -1);
    if (i < 0 || i >= g.vues.length) return;
    afficher(g.vues[i]);
  }, { passive: true });
}
