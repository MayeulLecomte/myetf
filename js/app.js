/* =============================================================
   APPLICATION — état, rendu et interactions
   ============================================================= */

const CLE_STOCKAGE = 'allocation-etf-dossier-v1';

const Etat = {
  identite: {},
  /* Notation minimale à 3 étoiles : la note Morningstar est relative et à
     distribution forcée — un tiers des fonds y est par construction. Sur les
     ETF obligataires indiciels, qui se comparent à des gérants actifs libres
     de charger le crédit ou la duration, elle plafonne à 3 sans que le support
     ait rien de médiocre. À 4, le filtre écartait neuf obligataires sur dix et
     reportait les poches longues sur du court terme : un filtre de qualité ne
     doit pas déformer l'allocation issue du profil de risque. Il écarte donc
     ce qui est franchement mauvais ; le choix du meilleur revient au score. */
  /* `contratSeulement` reste à faux tant que le rapprochement n'a pas été
     fait : à vrai sur un univers non validé, la sélection ne rendrait rien.

     `sourceUnivers` vaut « catalogue » d'emblée : sélectionner dans deux
     mille supports plutôt que dans quarante-deux abaisse les frais du
     portefeuille et remplit toutes les poches. L'univers de travail reste
     joint à la sélection, et l'onglet Sélection dit en toutes lettres ce
     que le catalogue ne sait pas — à commencer par l'éligibilité PEA. */
  filtres: { etoilesMin: 3, encoursMin: 500, terMax: 0.60, exclureSynthetique: false,
             contratSeulement: false, sourceUnivers: 'catalogue', intensite: 0.6 },
  reponses: {},
  macroChoix: {},
  scenariosManuels: null,
  detention: [],
  apport: 0,
  revenus: { besoin: 0, frequence: 'mensuelle', coussinMois: 24, anciennete: 8, couple: false, primesVersees: 0 },
  backtest: { capital: 100000, frais: 0, retrait: 0, allocation: 'tactique' },
  historique: JSON.parse(JSON.stringify(HISTORIQUE_POCHES)),
  univers: JSON.parse(JSON.stringify(ETF_UNIVERS)),
  journal: [],
  situations: [],                 /* relevés figés, du plus récent au plus ancien */
  situationDate: null,            /* date observée dans l'onglet Situation */
  avisTactiqueLu: false,          /* avis de changement de calcul, lu une fois */
  /* `controles` retient, pour chaque ligne de la liste de contrôle relue
     avant impression, l'état exact qui a été relu — pas un simple oui. */
  rapport: { annexeMethode: true, controles: {} },
  filtreUnivers: { classe: '', enveloppe: '', texte: '' },
  /* Le mode de lecture — « conseiller » ou « particulier ». `null` signifie
     « pas encore choisi » et fait paraître l'écran d'entrée ; un dossier
     enregistré avant ce champ s'ouvre donc en conseiller, par le repli de
     `T()`. Il est déclaré ici, et non simplement absent, pour que l'import
     d'un dossier le rapporte : `lireFichier` ne recopie que les clés que
     l'état connaît déjà. */
  mode: null
};

/* ============================================================
   UTILITAIRES
   ============================================================ */

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

function euro(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('fr-FR') + ' €';
}
function pct(n, d) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(d === undefined ? 1 : d).replace('.', ',') + ' %';
}
function signe(n, d) { return (n > 0 ? '+' : '') + pct(n, d); }
function etoiles(n) {
  if (n === null || n === undefined || n === '') {
    return '<span style="color:var(--gris-doux)" title="Notation Morningstar non renseignée">—</span>';
  }
  return '<span class="etoiles" title="' + n + ' étoiles Morningstar">' +
    '★★★★★'.slice(0, n) + '<span style="color:var(--gris-ligne)">' + '★★★★★'.slice(0, 5 - n) + '</span></span>';
}
function echapper(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function dateFr(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function donut(segments, taille, epaisseur) {
  taille = taille || 190; epaisseur = epaisseur || 36;
  const r = (taille - epaisseur) / 2, cx = taille / 2, cy = taille / 2;
  const total = segments.reduce((a, s) => a + s.valeur, 0);
  if (total <= 0) return '<svg width="' + taille + '" height="' + taille + '"></svg>';
  /* Un espace de 2 px sépare les segments : sans lui, deux teintes
     voisines se touchent et la frontière devient une illusion
     d'optique plutôt qu'une donnée. */
  const jeu = 2 / r;
  let angle = -Math.PI / 2, contenu = '';
  segments.forEach(s => {
    if (s.valeur <= 0) return;
    const arc = 2 * Math.PI * s.valeur / total;
    const fin = angle + arc;
    /* La couleur passe par `style` et non par l'attribut `stroke` :
       un attribut de présentation SVG n'accepte pas var(--…). */
    const trait = 'style="stroke:' + s.couleur + '" stroke-width="' + epaisseur + '" fill="none"';
    if (arc >= 2 * Math.PI - 0.0001) {
      contenu += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' + trait + '/>';
    } else {
      const a = angle + jeu / 2, b = Math.max(a, fin - jeu / 2);
      const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
      const x2 = cx + r * Math.cos(b), y2 = cy + r * Math.sin(b);
      contenu += '<path d="M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' +
        ((b - a) > Math.PI ? 1 : 0) + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) +
        '" ' + trait + '/>';
    }
    angle = fin;
  });
  return '<svg width="' + taille + '" height="' + taille + '" viewBox="0 0 ' + taille + ' ' + taille + '">' + contenu + '</svg>';
}

function legende(segments) {
  return '<div class="legende">' + segments.filter(s => s.valeur > 0).map(s =>
    '<div class="item"><span class="pastille" style="background:' + s.couleur + '"></span>' +
    echapper(s.label) + '<span class="valeur">' + pct(s.valeur) + '</span></div>').join('') + '</div>';
}

/* ============================================================
   PERSISTANCE
   ============================================================ */

function sauver(silencieux) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({
      identite: Etat.identite, filtres: Etat.filtres, reponses: Etat.reponses,
      macroChoix: Etat.macroChoix, scenariosManuels: Etat.scenariosManuels,
      detention: Etat.detention, apport: Etat.apport, univers: Etat.univers, journal: Etat.journal,
      revenus: Etat.revenus, backtest: Etat.backtest, historique: Etat.historique,
      situations: Etat.situations, situationDate: Etat.situationDate,
      avisTactiqueLu: Etat.avisTactiqueLu, rapport: Etat.rapport, mode: Etat.mode,
      dernierAcces: Etat.dernierAcces
    }));
    if (!silencieux) notifier('Dossier enregistré dans ce navigateur.');
  } catch (e) { notifier('Enregistrement impossible : ' + e.message, 'erreur'); }
}

function charger() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return false;
    const d = JSON.parse(brut);
    Object.keys(d).forEach(k => { if (d[k] !== undefined && d[k] !== null) Etat[k] = d[k]; });
    return true;
  } catch (e) { return false; }
}

/**
 * @param {string} texte
 * @param {string} [type]   succes | info | alerte | erreur
 * @param {Object} [action] {libelle, vue} — nommer une étape sans pouvoir y
 *                          aller était le dernier endroit où l'on renvoyait
 *                          l'utilisateur chercher un onglet lui-même.
 */
function notifier(texte, type, action) {
  const div = document.createElement('div');
  div.className = 'message ' + (type || 'succes');
  /* Le message se pose au-dessus de la barre basse plutôt que derrière :
     `bottom` compte depuis le bord de l'écran, pas depuis le contenu. */
  div.style.cssText = 'position:fixed;right:16px;left:auto;z-index:200;max-width:380px;' +
    'box-shadow:var(--ombre-3);bottom:calc(20px + var(--marge-barre, 0px))';
  div.textContent = texte;
  if (action) {
    const b = document.createElement('button');
    b.className = 'bouton secondaire';
    b.style.cssText = 'margin-top:10px;width:100%';
    b.textContent = action.libelle;
    b.onclick = () => { div.remove(); afficher(action.vue); };
    div.appendChild(b);
  }
  document.body.appendChild(div);
  setTimeout(() => div.remove(), action ? 9000 : 4000);
}

/* ============================================================
   CALCULS DÉRIVÉS
   ============================================================ */

function resultatProfil() {
  return MoteurProfil.calculer(Etat.reponses, Etat.identite);
}

function macroCourante() {
  const agrege = MoteurAllocation.agregerMacro(Etat.macroChoix);
  const probas = Etat.scenariosManuels ? Object.assign({}, Etat.scenariosManuels) : agrege.probas;
  MoteurAllocation.normaliserA100(probas);
  /* `agregerMacro({})` rend des probabilités par défaut qui pèsent 66,7 % sur
     l'atterrissage en douceur. Un contexte vierge produisait donc un
     « scénario dominant » nommé, chiffré, affiché dans quatre vues et
     ENREGISTRÉ AU JOURNAL comme s'il avait été retenu. Le dominant n'existe
     que si une vue a été exprimée ; sinon il vaut null, et chaque affichage
     doit le dire au lieu d'inventer. */
  const exprime = contexteExprime();
  const dominant = exprime
    ? Object.keys(probas).sort((a, b) => probas[b] - probas[a])[0]
    : null;
  return { probas, overlays: agrege.overlays, journal: agrege.journal, dominant,
           calculees: agrege.probas, exprime };
}

/* ============================================================
   UNIVERS SUR LEQUEL PORTE LA SÉLECTION
   -------------------------------------------------------------
   Deux sources, et l'écart entre elles est un écart de garantie,
   pas de taille :

   • « travail » — les supports que le conseiller a retenus, dont
     les caractéristiques ont été relevées une à une et dont le
     référencement au contrat peut être coché. C'est le seul
     univers qui puisse être opposable.
   • « catalogue » — près de trois mille supports européens tels
     que Morningstar les publie. Frais, encours, note et SRI sont
     sourcés ; la couverture de change, la part capitalisante et
     le label de durabilité sont déduits du nom ; l'éligibilité
     PEA n'est pas connue. Rien n'y est vérifié au contrat.

   En source « catalogue », l'univers de travail reste présent :
   ses 42 lignes y sont mieux renseignées que leur homologue du
   catalogue, et les supports détenus doivent rester reconnus.
   ============================================================ */

let __catalogueDerive = null;

function universSelection() {
  if (Etat.filtres.sourceUnivers !== 'catalogue') return Etat.univers;
  if (typeof CATALOGUE_ETF === 'undefined') return Etat.univers;

  if (!__catalogueDerive || __catalogueDerive.genere !== CATALOGUE_ETF.genere) {
    __catalogueDerive = {
      genere: CATALOGUE_ETF.genere,
      supports: MoteurUnivers.depuisCatalogue(CATALOGUE_ETF)
    };
  }
  const connus = new Set(Etat.univers.map(e => e.isin));
  return Etat.univers.concat(__catalogueDerive.supports.filter(s => !connus.has(s.isin)));
}

/** Le catalogue est-il demandé comme source sans être encore chargé ? */
function catalogueAttendu() {
  return Etat.filtres.sourceUnivers === 'catalogue' && typeof CATALOGUE_ETF === 'undefined';
}

function contexteSelection() {
  const p = resultatProfil();
  return {
    enveloppe: Etat.identite.enveloppe || 'AV',
    contratAV: Etat.identite.contratAV || 'av-large',
    etoilesMin: Number(Etat.filtres.etoilesMin),
    encoursMin: Number(Etat.filtres.encoursMin),
    terMax: Number(Etat.filtres.terMax),
    exclureSynthetique: !!Etat.filtres.exclureSynthetique,
    contratSeulement: !!Etat.filtres.contratSeulement,
    esg: p ? p.preferences.esg : 'aucune',
    objectifRevenus: besoinDeRevenu(),
    montant: Number(Etat.identite.montant) || 0
  };
}

/** Le client attend-il un revenu régulier de ce placement ? */
function besoinDeRevenu() {
  const p = resultatProfil();
  return Number(Etat.revenus.besoin) > 0 || (p && p.preferences.objectif === 'revenus');
}

/** Dernier cours connu pour un ISIN, relevé par la tâche planifiée. */
function cotation(isin) {
  if (!isin || typeof DERNIERS_COURS === 'undefined') return null;
  return DERNIERS_COURS[isin] || null;
}

/** Recalcule les montants des lignes saisies en quantités. */
function revaloriser() {
  let lignes = 0, sansCours = [];
  Etat.detention.forEach(l => {
    const q = Number(l.quantite) || 0;
    if (q <= 0) return;
    const c = cotation(l.isin);
    if (!c) { sansCours.push(l.libelle || l.isin); return; }
    l.montant = Math.round(q * c.cours);
    lignes++;
  });
  return { lignes, sansCours };
}

/** Date de valorisation la plus récente utilisée par la détention. */
function dateValorisation() {
  const dates = Etat.detention
    .filter(l => Number(l.quantite) > 0)
    .map(l => (cotation(l.isin) || {}).date)
    .filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/** Capital de référence : détention saisie si elle existe, sinon montant à investir. */
function capitalReference() {
  const detenu = Etat.detention.reduce((a, l) => a + (Number(l.montant) || 0), 0);
  return detenu > 0 ? detenu : (Number(Etat.identite.montant) || 0);
}

/* Le conseiller a-t-il exprimé une vue de marché ? Un indicateur du contexte
   renseigné, ou des probabilités de scénarios forcées à la main. */
function contexteExprime() {
  return Object.keys(Etat.macroChoix).length > 0 || !!Etat.scenariosManuels;
}

/* L'intensité de la gestion tactique, ramenée à zéro dans deux cas.

   Le second corrige un défaut de fond : `agregerMacro({})` rend des
   probabilités par défaut qui pèsent 66,7 % sur l'atterrissage en douceur.
   Un contexte jamais renseigné produisait donc une allocation déviée —
   jusqu'à 2,7 points sur un profil équilibré, le monétaire tombant de 10 %
   à 7,3 %. L'outil affirmait une vue de marché que personne n'avait
   exprimée, et le rapport la présentait au client comme un choix.

   Sans contexte, l'allocation cible est donc strictement stratégique. Elle
   reste affichée : c'est une allocation parfaitement défendable, celle qui
   découle du seul profil de risque. */
function intensiteEffective() {
  const p = resultatProfil();
  if (p && p.preferences.gestion === 'passive') return 0;
  if (!contexteExprime()) return 0;
  return Number(Etat.filtres.intensite);
}

function allocationCourante() {
  const p = resultatProfil();
  if (!p) return null;
  const m = macroCourante();
  const base = MoteurAllocation.tactique(p.profil.id, m.probas, m.overlays, intensiteEffective());

  /* Un revenu régulier impose un coussin monétaire : il modifie l'allocation cible. */
  const besoin = Number(Etat.revenus.besoin) * (MoteurRevenus.FREQUENCES[Etat.revenus.frequence] || { parAn: 12 }).parAn;
  if (besoin > 0) {
    const r = MoteurRevenus.contrainteCoussin(base, besoin, Number(Etat.revenus.coussinMois), capitalReference());
    if (r.applique) { r.allocation.coussin = r; return r.allocation; }
  }
  return base;
}

function selectionCourante() {
  const a = allocationCourante();
  if (!a) return null;
  return MoteurSelection.construire(a.poches, contexteSelection(), universSelection());
}

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
  $$('h2[data-titre]').forEach(h => { h.textContent = T('vue.' + h.dataset.titre + '.titre'); });
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
  const b = $('#nav button.actif');
  return b ? b.dataset.vue : 'accueil';
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

  barre.innerHTML = GROUPES.filter(g => !g.secondaire).map(g =>
    '<button data-groupe="' + g.id + '"' + (g.id === groupe.id ? ' class="actif"' : '') + '>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + g.icone + '"/></svg>' +
      '<span>' + echapper(g.libelle) + '</span>' +
    '</button>').join('');

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

function rendre(vue) {
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

/* L'identité a-t-elle été renseignée, ou porte-t-elle encore ses valeurs
   d'usine ? L'initialisation pose 45 ans, 100 000 €, assurance-vie et
   architecture ouverte : un dossier vierge est donc « rempli » sans que
   personne n'ait rien saisi. L'annoncer « renseigné » ferait croire à
   l'utilisateur qu'il a fait quelque chose qu'il n'a pas fait. */
function identiteRenseignee() {
  if (Etat.identite.nom) return true;
  return IDENTITE.some(f => f.defaut !== undefined &&
    Etat.identite[f.id] !== undefined &&
    String(Etat.identite[f.id]) !== String(f.defaut));
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

/* ============================================================
   ACCUEIL — « Aujourd'hui »
   -------------------------------------------------------------
   L'écran d'ouverture répond à une seule question : y a-t-il
   quelque chose à faire aujourd'hui ? La réponse est le plus
   souvent non, et c'est cette réponse-là qui doit s'afficher en
   premier. Un écran d'accueil qui présente d'emblée une liste
   d'ordres pousse à la rotation, alors que les bandes de
   tolérance servent précisément à l'éviter : le verdict passe
   donc avant le détail, qui reste juste en dessous.
   ============================================================ */

/* Les trois étapes sans lesquelles rien ne peut être proposé. */
function etapesDossier() {
  const manquantes = MoteurProfil.questionsManquantes(Etat.reponses).length;
  return [
    {
      vue: 'client', titre: 'Montant et enveloppe',
      fait: identiteRenseignee(),
      reste: 'Encore aux valeurs par défaut — ' + euro(Number(Etat.identite.montant) || 0) +
             ' en ' + libelleEnveloppe() + '. Le montant et l\'enveloppe déterminent ' +
             "l'univers de supports réellement accessible."
    },
    {
      vue: 'questionnaire', titre: 'Questionnaire de profilage',
      fait: manquantes === 0,
      /* Dix-huit questions à choix unique, en cinq sections. Sans durée
         annoncée, on ne sait pas si l'on en a pour deux minutes ou vingt —
         et c'est cela, pas le nombre de questions, qui décide si l'on
         commence maintenant ou « plus tard ». */
      duree: 'comptez environ 7 minutes',
      /* Le même décompte qu'à l'état vide : une seule façon de compter, sinon
         l'accueil et la section annoncent deux totaux pour un questionnaire. */
      reste: PREALABLES.questionnaire.reste()
    },
    {
      vue: 'arbitrages', titre: 'Portefeuille détenu',
      fait: Etat.detention.length > 0,
      reste: "Sans les lignes détenues, le portefeuille réel ne peut pas être comparé à l'allocation cible."
    }
  ];
}

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

/* ------------------------------------------------------------
   L'ACCROCHE, LA FRAÎCHEUR, LA DÉCOUVERTE
   Trois choses qu'on ne peut apprendre nulle part ailleurs dans
   l'application : à quoi elle sert et pour qui, de quand datent
   les données sur lesquelles elle raisonne, et comment la voir
   fonctionner sans avoir rien à saisir.
   ------------------------------------------------------------ */

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

/* Un dossier est entamé dès qu'une saisie a eu lieu — pas seulement quand il
   est complet. C'est ce qui décide si le bouton de démonstration s'affiche,
   et s'il faut demander confirmation avant d'écraser.

   `montant` ne peut PAS servir de témoin : l'initialisation lui pose 100 000 €
   par défaut, comme à l'âge et à l'enveloppe. Un dossier vierge en porterait
   donc un, et le bouton ne se serait jamais montré. Seuls comptent les champs
   qu'aucune valeur par défaut ne remplit. */
function dossierEntame() {
  return !!Etat.identite.nom ||
         Object.keys(Etat.reponses).length > 0 ||
         Etat.detention.length > 0 ||
         Etat.journal.length > 0 ||
         Etat.situations.length > 0;
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
  return '<div class="accroche">' +
      '<p><strong>myetf construit et suit une allocation d\'ETF</strong> — du questionnaire de ' +
      'profilage aux ordres à passer, en assurance-vie, PEA ou compte-titres.</p>' +
      fraicheurDonnees() +
    '</div>' +
    '<h2>Pour commencer</h2>' +
    '<p class="intro">Ce choix ne change ni les calculs ni le dossier : seulement le vocabulaire et ' +
      'les écrans montrés. Il se modifie ensuite dans « ' + echapper(T('vue.client.nav')) + ' ».</p>' +
    '<div class="entree">' +
      MODES.map(m =>
        '<button class="entree-choix" data-mode="' + echapper(m.id) + '">' +
          '<strong>' + echapper(m.bouton) + '</strong>' +
          '<span>' + echapper(m.sous) + '</span>' +
        '</button>').join('') +
    '</div>';
}

function choisirMode(id) {
  if (!MODES.some(m => m.id === id)) return;
  Etat.mode = id;
  sauver(true);
  /* Le vocabulaire change en place : ni rechargement, ni perte de saisie. */
  poserNav(); poserTitres(); poserBarresParcours(); majNav();
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
      accroche() +
      filPoches() +
      '<h2>Remplissez le dossier</h2>' +
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

  c.innerHTML =
    accroche() +
    filPoches() +
    '<h2>Aujourd\'hui</h2>' +

    '<div class="verdict ' + (rien ? 'calme' : 'action') + '">' +
      '<div class="verdict-titre">' + (rien ? 'Rien à faire' : analyse.ordres.length + ' mouvement' +
        (analyse.ordres.length > 1 ? 's' : '') + ' à passer') + '</div>' +
      '<p class="verdict-texte">' + (rien
        ? 'Chaque ligne reste dans sa bande de tolérance : aucun écart n\'atteint le seuil de déclenchement de ' +
          euro(analyse.seuilMontant) + '. Laisser le portefeuille en l\'état est la décision par défaut.'
        : 'Écart le plus fort : ' + pct(derive) + ' de l\'encours. Rotation ' + pct(analyse.rotation) +
          ', fiscalité estimée ' + euro(analyse.fiscalite.impotEstime) + '.') + '</p>' +
    '</div>' +

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

function jauge(titre, valeur, couleur) {
  return '<div class="jauge"><div class="tete"><span>' + titre + '</span><strong>' + valeur + ' / 100</strong></div>' +
    '<div class="piste"><div style="width:' + valeur + '%;background:' + couleur + '"></div></div></div>';
}
function ligne(cle, valeur) {
  return '<tr><td style="color:var(--gris-doux)">' + cle + '</td><td class="num"><strong>' + echapper(valeur) + '</strong></td></tr>';
}

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

    '<p class="intro" style="font-size:11px">Rédigée par ' + echapper(NOTE_MARCHE.modele) +
    ' à partir des seules variations de cours relevées — le modèle ne dispose d\'aucune information ' +
    'd\'actualité et n\'a pas connaissance des dossiers clients.</p>';
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
      kpi(r.profil.nom, 'Profil', r.profil.sri ? 'SRI ' + r.profil.sri : '') +
      kpi(pct(metriquesTact.rendement), 'Rendement espéré', 'hypothèses long terme') +
      kpi(pct(metriquesTact.volatilite), 'Volatilité estimée', 'contre ' + pct(metriquesStrat.volatilite) + ' en stratégique') +
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
      '<div class="carte"><h3>Stratégique vs tactique</h3>' +
        '<div class="barres">' + Object.keys(alloc.classes).map(cl => {
          const t = alloc.classes[cl], s = alloc.strategique.classes[cl], d = t - s;
          return '<div class="barre"><div class="tete"><span>' + LIBELLES_CLASSES[cl] + '</span>' +
            '<span>' + pct(t) + ' <span style="color:var(--gris-doux)">(cible stratégique ' + pct(s) + ')</span> ' +
            (Math.abs(d) >= 0.1 ? '<strong class="' + (d > 0 ? 'positif' : 'negatif') + '">' + signe(d) + '</strong>' : '') +
            '</span></div>' +
            '<div class="piste"><div class="part" style="width:' + t + '%;background:' + COULEURS_CLASSES[cl] + '"></div>' +
            '<div class="cible" style="left:calc(' + s + '% - 1px)" title="Cible stratégique"></div></div></div>';
        }).join('') + '</div>' +
        '<p class="intro" style="font-size:11px;margin-top:10px">Le repère vertical marque l\'allocation stratégique du profil. ' +
        'Les déviations tactiques sont bornées à ±' + BORNES_TACTIQUES.actions + ' points sur les actions.</p>' +
      '</div>' +
    '</div>' +

    '<div class="carte"><h3>Détail par poche</h3>' +
      '<div class="tableau-defilant"><table><thead><tr>' +
      '<th>Poche' + aide('poche') + '</th><th>Classe</th><th class="num">Stratégique</th><th class="num">Tactique</th><th class="num">Écart</th><th class="num">Montant</th>' +
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

/* ------------------------------------------------------------
   LES TROIS TERMES DE MÉTIER QU'ON GARDE
   Poche, dérive, rotation sont le vocabulaire du conseiller et
   n'ont pas à être traduits — les remplacer par leur définition
   ferait un libellé bavard et moins précis. Une phrase au survol
   suffit à les lever pour qui hésite, sans encombrer l'écran de
   qui les connaît.
   ------------------------------------------------------------ */
const INFOBULLES = {
  poche: 'Une subdivision d\'une classe d\'actifs — actions monde, obligations souveraines ' +
         'euro à court terme… C\'est le niveau auquel l\'allocation est pilotée et un support choisi.',
  derive: 'L\'écart le plus fort, en points d\'encours, entre le poids réellement détenu par une ' +
          'ligne et son poids cible. C\'est lui qui déclenche un arbitrage lorsqu\'il franchit le seuil.',
  rotation: 'La part de l\'encours qui changerait de support si les ordres proposés étaient passés. ' +
            'Une rotation élevée coûte en frais et, hors assurance-vie, en fiscalité.'
};

/** Le repère qui porte l'infobulle. Discret, et jamais dans un lien. */
function aide(cle) {
  return '<span class="infobulle" tabindex="0" role="note" aria-label="' + echapper(INFOBULLES[cle]) +
    '" title="' + echapper(INFOBULLES[cle]) + '">?</span>';
}

/**
 * @param {string} [cle] clé d'infobulle attachée au libellé
 */
function kpi(valeur, libelle, detail, cle) {
  return '<div class="carte kpi"><div class="valeur">' + echapper(valeur) + '</div>' +
    '<div class="libelle">' + echapper(libelle) + (cle ? ' ' + aide(cle) : '') + '</div>' +
    (detail ? '<div class="detail">' + echapper(detail) + '</div>' : '') + '</div>';
}

/* ============================================================
   LES PRÉALABLES
   -------------------------------------------------------------
   Chaque vue dépend de ce qui a été renseigné avant elle. Faute
   de le déclarer, six d'entre elles affichaient le même « Profil
   non déterminé », qui ne disait ni quelle réponse manquait, ni
   combien, ni où aller la remplir — un cul-de-sac poli.

   Les dépendances sont donc écrites une fois, ici, et l'état vide
   s'en déduit : ce qui manque, pourquoi la vue ne peut rien en
   dire, et le bouton qui y mène.
   ============================================================ */

const PREALABLES = {
  questionnaire: {
    vue: 'questionnaire',
    titre: 'Le questionnaire de profilage n\'est pas terminé',
    bouton: 'Reprendre le questionnaire',
    pourquoi: 'Le profil de risque se calcule à partir de ces réponses, et toute la suite en découle : ' +
              'allocation cible, sélection des supports, arbitrages.',
    /* Le blocage porte sur les questions NOTÉES : la préférence de durabilité
       n'entre pas dans le score et n'empêche pas de calculer un profil.
       Le décompte affiché, lui, porte sur toutes les questions — sans quoi
       la barre de progression annonçait un total et cette phrase un autre,
       et l'on cherchait laquelle des deux mentait. */
    satisfait: () => MoteurProfil.questionsManquantes(Etat.reponses).length === 0,
    reste: () => {
      const n = QUESTIONS.filter(q => Etat.reponses[q.id] === undefined).length;
      return n + (n > 1 ? ' réponses manquantes' : ' réponse manquante') +
             ' sur les ' + QUESTIONS.length + ' du questionnaire.';
    }
  },
  detention: {
    vue: 'arbitrages',
    titre: 'Aucune ligne détenue n\'est saisie',
    bouton: 'Saisir le portefeuille détenu',
    ici: 'Le tableau de saisie se trouve ci-dessus.',
    pourquoi: 'Sans le portefeuille réel, il n\'y a rien à comparer à l\'allocation cible : ni écart, ' +
              'ni ordre à passer, ni situation à dater.',
    satisfait: () => Etat.detention.length > 0,
    reste: () => 'Le collage d\'un relevé d\'assureur suffit — un ISIN et un montant par ligne.'
  },
  revue: {
    vue: 'arbitrages',
    titre: 'Aucune revue n\'a encore été enregistrée',
    bouton: 'Ouvrir les arbitrages',
    pourquoi: 'Le journal conserve la trace des revues validées : ce qui a été décidé, quand, et pourquoi.',
    satisfait: () => Etat.journal.length > 0,
    reste: () => 'Une revue s\'enregistre depuis les arbitrages, une fois les ordres arrêtés.'
  }
};

/* Ce dont chaque vue a besoin pour montrer quelque chose. L'ordre compte :
   c'est celui dans lequel les manques sont présentés, donc celui dans lequel
   il faut les combler. */
const DEPENDANCES = {
  profil:       ['questionnaire'],
  allocation:   ['questionnaire'],
  portefeuille: ['questionnaire'],
  backtest:     ['questionnaire'],
  rapport:      ['questionnaire'],
  arbitrages:   ['questionnaire', 'detention'],
  revenus:      ['questionnaire', 'detention'],
  situation:    ['detention'],
  journal:      ['revue']
};

function manquePour(vue) {
  return (DEPENDANCES[vue] || []).filter(k => !PREALABLES[k].satisfait());
}

/** L'état vide d'une vue : ce qui manque, pourquoi, et par où commencer. */
function etatVide(vue) {
  const manques = manquePour(vue);
  if (!manques.length) return '';

  return '<div class="etat-vide">' +
    '<h3>' + (manques.length > 1
      ? 'Deux étapes manquent avant de pouvoir afficher cette section'
      : 'Une étape manque avant de pouvoir afficher cette section') + '</h3>' +
    manques.map((k, i) => {
      const pre = PREALABLES[k];
      return '<div class="etat-vide-etape">' +
        '<span class="etat-vide-marque">' + (i + 1) + '</span>' +
        '<div>' +
          '<strong>' + echapper(pre.titre) + '</strong>' +
          '<div class="etat-vide-reste">' + echapper(pre.reste()) + '</div>' +
          '<div class="etat-vide-pourquoi">' + echapper(pre.pourquoi) + '</div>' +
          /* Un bouton qui renvoie à la vue déjà ouverte ne mène nulle part :
             quand ce qui manque se saisit ici même, on le dit au lieu de
             proposer un aller-retour sur place. */
          (pre.vue === vue
            ? '<div class="etat-vide-ici">' + echapper(pre.ici || 'À renseigner sur cette page.') + '</div>'
            : '<div class="barre-actions" style="margin-top:10px">' +
                '<button class="bouton' + (i ? ' secondaire' : '') + '" data-aller="' + pre.vue + '">' +
                  echapper(pre.bouton) + '</button>' +
              '</div>') +
        '</div>' +
      '</div>';
    }).join('') +
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
          echapper(l.etf.nom) + (l.etf.isr ? ' <span class="badge vert">ISR</span>' : '') +
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

function libelleEnveloppe() {
  const e = Etat.identite.enveloppe || 'AV';
  if (e !== 'AV') return e === 'PEA' ? 'PEA' : 'Compte-titres';
  const c = (IDENTITE.find(f => f.id === 'contratAV').options.find(o => o.valeur === (Etat.identite.contratAV || 'av-large')) || {}).label;
  return 'Assurance-vie — ' + (c || '');
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
   VUE 9 — SITUATION DES PLACEMENTS
   -------------------------------------------------------------
   Un relevé daté, et non une préconisation : ce qui est détenu,
   à quel cours, pour quelle valeur. Deux natures cohabitent —
   une situation figée est un enregistrement, une situation
   reconstituée est un calcul à quantités inchangées. L'écran ne
   les mélange jamais.
   ============================================================ */

function aujourdhuiISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
}

/** Première séance de l'historique publié : rien n'est calculable avant. */
function debutHistorique() {
  return (typeof COURS_HISTORIQUE !== 'undefined' && COURS_HISTORIQUE.dates.length)
    ? COURS_HISTORIQUE.dates[0] : null;
}

function situationCourante(dateISO) {
  return MoteurSituation.valoriser(Etat.detention, dateISO, { univers: Etat.univers });
}

/** Enregistre le relevé du jour demandé. */
function figerSituation(dateISO, origine) {
  const s = situationCourante(dateISO);
  Etat.situations = Etat.situations.filter(x => x.date !== dateISO);
  Etat.situations.push({
    date: dateISO,
    figeeLe: aujourdhuiISO(),
    origine: origine || 'manuelle',
    total: s.total,
    pvLatente: s.pvLatente,
    fiable: s.fiable,
    lignes: s.lignes.map(l => ({
      isin: l.isin, libelle: l.libelle, poche: l.poche, classe: l.classe,
      quantite: l.quantite, cours: l.cours, dateCours: l.dateCours,
      montant: l.montant, poids: l.poids, statut: l.statut
    }))
  });
  Etat.situations.sort((a, b) => a.date < b.date ? 1 : -1);
  return s;
}

/**
 * Fige d'office les arrêtés franchis depuis la dernière ouverture.
 * On ne fige jamais rétroactivement un arrêté antérieur à la première
 * utilisation : enregistrer une reconstitution comme un relevé
 * reviendrait à lui prêter une exactitude qu'elle n'a pas.
 */
function figerArretesFranchis() {
  const aujourd = aujourdhuiISO();
  const precedent = Etat.dernierAcces;
  Etat.dernierAcces = aujourd;
  if (!precedent || !Etat.detention.length) return 0;

  const franchis = MoteurSituation.datesReference(aujourd, precedent, 4)
    .filter(d => d > precedent && !Etat.situations.some(s => s.date === d));

  franchis.forEach(d => figerSituation(d, 'automatique'));
  return franchis.length;
}

const LIBELLES_STATUT = {
  seance:    { texte: '', classe: '' },
  anterieur: { texte: 'séance antérieure', classe: 'gris' },
  actuel:    { texte: 'hors période', classe: 'orange' },
  montant:   { texte: 'montant saisi', classe: 'gris' },
  absent:    { texte: 'sans cours', classe: 'rouge' }
};

function tableauSituation(s) {
  return '<div class="tableau-defilant"><table><thead><tr>' +
    '<th>Support</th><th>ISIN</th><th class="num">Quantité</th><th class="num">Cours</th>' +
    '<th>Cours du</th><th class="num">Valorisation</th><th class="num">Poids</th>' +
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
        echapper(l.libelle) +
        (st.texte ? ' <span class="badge ' + st.classe + '">' + st.texte + '</span>' : '') + '</td>' +
        '<td style="font-family:monospace;font-size:12px">' + echapper(l.isin) + '</td>' +
        '<td class="num">' + (l.quantite ? l.quantite.toLocaleString('fr-FR') : '—') + '</td>' +
        '<td class="num">' + (l.cours ? l.cours.toFixed(2).replace('.', ',') + ' €' : '—') + '</td>' +
        '<td style="font-size:12px;color:var(--gris-doux)">' + (l.dateCours ? dateFr(l.dateCours) : '—') + '</td>' +
        '<td class="num">' + euro(l.montant) + '</td>' +
        '<td class="num">' + pct(l.poids) + '</td></tr>';
    }).join('') +
    '</tbody><tfoot><tr><td colspan="5">Total</td>' +
    '<td class="num">' + euro(s.total) + '</td><td class="num">100,0 %</td></tr></tfoot></table></div>';
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

  c.innerHTML =
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
    ((s.alertes.horsPeriode || s.alertes.sansCours || s.alertes.enMontant)
      ? '<div class="message alerte"><strong>Réserves sur ce relevé.</strong><ul>' +
        (s.alertes.horsPeriode ? '<li>' + s.alertes.horsPeriode + ' ligne(s) valorisée(s) au dernier cours connu, ' +
          'postérieur à la date demandée : ces supports ne sont pas cotés sur Euronext et n\'ont pas d\'historique.</li>' : '') +
        (s.alertes.sansCours ? '<li>' + s.alertes.sansCours + ' ligne(s) sans aucun cours : le montant saisi est repris tel quel.</li>' : '') +
        (s.alertes.enMontant ? '<li>' + s.alertes.enMontant + ' ligne(s) saisie(s) en montant et non en quantité : ' +
          'leur valeur ne suit pas les cours. Saisissez la quantité dans « Arbitrages » pour qu\'elles se revalorisent.</li>' : '') +
        '</ul></div>' : '') +

    '<div class="grille quatre">' +
      kpi(euro(s.total), 'Valeur du portefeuille', dateFr(date)) +
      kpi(String(s.lignes.length), 'Lignes détenues', enQuantites + ' suivie(s) en quantités') +
      kpi(euro(s.pvLatente), 'Plus-value latente', 'saisie dans le portefeuille') +
      kpi(s.fiable ? 'Complète' : 'Partielle', 'Couverture des cours',
        s.fiable ? 'toutes les lignes valorisées à la date'
                 : (s.alertes.horsPeriode + s.alertes.sansCours) + ' ligne(s) sans cours de la période') +
    '</div>' +

    '<div class="carte"><h3>Détail des positions</h3>' + tableauSituation(s) +
      '<div class="barre-actions">' +
        (figee
          ? '<button class="bouton secondaire" data-degeler="' + date + '">Supprimer ce relevé figé</button>'
          : '<button class="bouton" data-figer="' + date + '">Figer cette situation</button>') +
        '<button class="bouton secondaire" id="btn-imprimer-situation">Imprimer / enregistrer en PDF</button>' +
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
  const analyse = MoteurArbitrage.analyser(
    Etat.detention, sel.lignes,
    { enveloppe: Etat.identite.enveloppe || 'AV', apport: Number(Etat.apport) || 0 },
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
      kpi(euro(plan.besoinParEcheance), 'Revenu par échéance', plan.frequence.libelle.toLowerCase() + ' · ' + euro(plan.besoinAnnuel) + ' / an') +
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
    '<h4 style="margin:0 0 8px">Part sourcée du backtest</h4>' +
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
        '<table><thead><tr><th>Allocation</th><th class="num">Cumul</th><th class="num">Par an</th>' +
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
        '</tbody></table>' +
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
      '<table><thead><tr><th>Gestion</th><th class="num">Cumul</th><th class="num">Volatilité</th>' +
      '<th class="num">Pire année</th><th class="num">Capital final</th></tr></thead><tbody>' +
      '<tr><td>Rééquilibrage annuel</td><td class="num">' + signe(reb.avec.perfCumulee) + '</td>' +
      '<td class="num">' + pct(reb.avec.volatilite) + '</td><td class="num negatif">' + signe(reb.avec.pireAnnee.rendement) + '</td>' +
      '<td class="num">' + euro(reb.avec.capitalFinal) + '</td></tr>' +
      '<tr><td>Aucun arbitrage (buy &amp; hold)</td><td class="num">' + signe(reb.sans.perfCumulee) + '</td>' +
      '<td class="num">' + pct(reb.sans.volatilite) + '</td><td class="num negatif">' + signe(reb.sans.pireAnnee.rendement) + '</td>' +
      '<td class="num">' + euro(reb.sans.capitalFinal) + '</td></tr>' +
      '</tbody></table>' +
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
                    pocheSeule: '', montre: PAS_CATALOGUE };

function chargerCatalogue() {
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

function rendreUnivers() {
  const f = Etat.filtreUnivers;
  rendreCatalogue();
  rendreRapprochement();

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

  $('#compteur-univers').textContent = liste.length + ' / ' + Etat.univers.length + ' supports · ' +
    Etat.univers.filter(e => e.donneesLe).length + ' aux données contrôlées · ' +
    Etat.univers.filter(e => e.verifie).length + ' validés au contrat · ' +
    Etat.univers.filter(e => e.morningstar == null).length + ' sans notation';

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

    '<div class="carte"><h3>3. Ce que le backtest mesure, et ne mesure pas</h3>' +
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

    '<div class="carte"><h3>4. Tout est stocké dans ce navigateur</h3>' +
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

    '<div class="carte"><h3>5. Ce que l\'outil ne fait pas</h3>' +
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

    (s.alertes.horsPeriode || s.alertes.sansCours
      ? '<p style="font-size:11px;color:var(--gris-doux)">' +
        (s.alertes.sansCours ? s.alertes.sansCours + ' ligne(s) sans cours de marché : la valeur retenue est celle saisie. ' : '') +
        (s.alertes.horsPeriode ? s.alertes.horsPeriode + ' ligne(s) valorisée(s) au dernier cours connu. ' : '') +
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
    const degeler = e.target.closest('[data-degeler]');
    if (degeler) {
      const d = degeler.dataset.degeler;
      Etat.situations = Etat.situations.filter(s => s.date !== d);
      sauver(true); rendreSituation();
      notifier('Relevé du ' + dateFr(d) + ' supprimé.', 'info');
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

  $('#btn-charger-cible').onclick = () => {
    const sel = selectionCourante();
    if (!sel) { notifier('Complétez d\'abord le questionnaire.', 'alerte'); return; }
    Etat.detention = sel.lignes.map(l => {
      const c = cotation(l.etf.isin);
      return {
        isin: l.etf.isin, libelle: l.etf.nom, montant: l.montant, pvLatente: 0,
        quantite: c ? Math.round(l.montant / c.cours) : undefined
      };
    });
    revaloriser();
    sauver(true); rendre('arbitrages'); notifier('Détention initialisée sur l\'allocation cible.');
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
