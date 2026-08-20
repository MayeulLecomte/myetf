/* =============================================================
   SOCLE
   -------------------------------------------------------------
   L'état du dossier, sa persistance, et les quelques fonctions dont tout le
   reste se sert : les deux raccourcis de sélection, la mise en forme des
   nombres et des dates, l'échappement, les petits dessins — jauge, anneau,
   légende, indicateur.

   Chargé en premier : rien ici ne dépend du reste.

   Déplacé depuis js/app.js sans une virgule de changement.
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
  /* Le suivi a-t-il été amorcé sur l'allocation cible ? Ce drapeau sépare
     deux histoires que rien d'autre ne distingue : un dossier parti de zéro,
     dont le portefeuille suivi DESCEND de la cible et doit la suivre quand
     elle bouge ; et un dossier où quelqu'un a saisi des positions réelles à
     la main, auquel on n'a rien à ajouter. Absent d'un dossier antérieur,
     donc faux : aucune ligne n'y sera jamais poussée sans qu'on le demande. */
  suiviAmorce: false,
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

/* ------------------------------------------------------------
   LE TRAIT BLEU SOUS UN MOT DU TITRE
   ------------------------------------------------------------
   Le dernier mot du titre reçoit un trait, posé sous la ligne de
   base et arrêté avant les jambages. C'est le seul ornement de
   l'interface, et il tient en une classe.

   Le DERNIER mot, et non un mot choisi à la main : « Allocation
   cible », « Mes placements », « Profil de risque » — c'est celui
   qui distingue le titre de ses voisins. Une table de mots
   soulignés par vue aurait été un second endroit à tenir à jour.

   Rend du HTML : le texte est échappé, le balisage ne l'est pas.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   LES ILLUSTRATIONS
   ------------------------------------------------------------
   Huit dessins au trait, une tache bleue, fond transparent. Ce
   sont les seuls éléments dessinés de l'interface.

   Trois règles, et elles tiennent ici :

   • UN SEUL par carte. Deux dessins sur un même écran se
     disputent l'attention et n'en donnent aucune au contenu.
   • JAMAIS dans un tableau. Une ligne de tableau se lit en
     balayant une colonne ; une vignette par ligne casse ce
     balayage.
   • JAMAIS sur le papier. La feuille d'impression les masque, et
     le rapport reste de l'encre noire.

   `alt` vide et `aria-hidden` : ce sont des ornements. Le titre
   qu'ils accompagnent dit déjà ce que dit le dessin, et un
   lecteur d'écran qui annonce « balance » avant « Allocation
   cible » ne fait que répéter.
   DEUX TAILLES, et deux seulement. Elles vivaient en cinq
   littéraux dispersés — 30 en tête de vue, 140 en état vide, 150
   et 160 en bannière —, et la règle « même taille partout » ne se
   lisait alors dans aucun fichier. Une troisième existe, à part :
   les 44 px du bandeau d'avis, qui est une vignette de marge et
   non une illustration de tête.
   ------------------------------------------------------------ */
const TAILLE_ILLUSTRATION_TITRE = 38;
const TAILLE_ILLUSTRATION_BANNIERE = 180;
/* En ouverture de vue : plus grand que dans un titre, plus petit qu'une
   bannière d'accueil — c'est le sujet du premier écran, pas sa décoration.
   Il rapetisse à 160 px sur téléphone (feuille de style, pas ici : le style
   en ligne posé par `illustration()` y est surchargé en `!important`).

   Le port a été recadré au passage : c'est un dessin EN LARGEUR, et centré
   dans un carré il ne remplissait que 85 % de sa boîte quand la balance ou
   le journal en occupent 91 %. À taille de boîte égale il paraissait plus
   petit — ce n'était pas la boîte qu'il fallait changer, c'était le
   cadrage du fichier. */
const TAILLE_ILLUSTRATION_OUVERTURE = 240;

/* CERTAINS DESSINS SONT EN LARGEUR, et à boîte égale ils pèsent moins :
   la boîte est carrée, eux ne le sont pas. Le port occupe 70 % de la
   hauteur de la sienne quand la balance ou le journal en occupent 91 % —
   posés côte à côte, l'un paraît deux tiers de l'autre alors que les deux
   font 240 pixels.

   Le facteur porte sur le DESSIN, jamais sur la vue. C'est une propriété
   du fichier, pas une exception d'écran : le jour où l'un d'eux est
   redessiné plus haut, on retire sa ligne et rien d'autre ne bouge. Une
   taille par vue aurait rendu la règle « une seule taille » fausse pour
   toujours. */
const ECHELLE_DESSIN = {
  port:     1.34,   /* 70 % de hauteur */
  contexte: 1.34,   /* 48 %, deux pupitres posés côte à côte */
  rapport:  1.28,   /* 64 % */
  carnet:   1.30,   /* 61 % */
  cafe:     1.34    /* 28 %, deux tasses et une soucoupe : le plus plat */
};

function tailleOuverture(dessin) {
  return Math.round(TAILLE_ILLUSTRATION_OUVERTURE * (ECHELLE_DESSIN[dessin] || 1));
}

function illustration(nom, taille) {
  return '<img class="illustration" src="img/' + nom + '.png" alt="" aria-hidden="true" ' +
    'width="' + taille + '" height="' + taille + '" style="width:' + taille + 'px;height:' + taille + 'px">';
}

/* UNE VUE, UN DESSIN, ET AUCUN DOUBLON.

   La table en portait huit pour seize vues : la boussole servait à la
   note ET au contexte, les fiches aux supports ET à l'univers, la
   longue-vue au backtest ET à la méthode. Un dessin qui désigne deux
   écrans ne désigne plus rien — on arrive sur le second en croyant
   reconnaître le premier.

   Huit dessins ont été ajoutés pour lever les doublons. Chacun ouvre
   sa vue en pleine page, et une seule. */
const ILLUSTRATIONS_VUES = {
  accueil:      'cafe',
  client:       'enveloppe',
  questionnaire:'carnet',
  profil:       'profil',
  note:         'boussole',
  macro:        'contexte',
  /* Un camembert au trait, une part remplie : la répartition se lit avant
     qu'on ait lu le titre. La balance qu'il remplace est passée aux
     arbitrages, où elle dit ce qu'elle sait dire — rééquilibrer deux
     plateaux.

     ⚠ SA PART EST VIOLETTE (#6C63FF), et c'est voulu : le dessin est déjà
     prêt pour la bascule pastel à venir. C'est aujourd'hui la seule entorse
     au « bleu, seule couleur » — ne pas la « corriger » en croyant à un
     oubli. */
  allocation:   'repartition',
  portefeuille: 'fiches',
  /* La balance : deux plateaux qu'on rééquilibre, c'est exactement un
     arbitrage. Elle ouvrait « Mon allocation », où elle disait un dosage
     et non un mouvement. */
  arbitrages:   'balance',
  situation:    'port',
  revenus:      'revenus',
  journal:      'journal',
  rapport:      'rapport',
  backtest:     'longue-vue',
  univers:      'univers',
  methode:      'methode'
};

/* Cinq vues n'ont pas de phrase d'introduction dans la page : les onze
   autres en ont une, écrite de longue date, et c'est elle qui sert de
   sous-titre à l'ouverture. Ces cinq-là en reçoivent une ici — ce sont
   les seules phrases neuves du chantier. */
const SOUS_TITRES_VUES = {
  /* L'accueil n'a pas de `h2[data-titre]` dans la page — son contenu est
     monté à l'exécution —, mais son ouverture se construit de la même
     matière : `ouvertureAccueil()` lit cette phrase-ci. */
  accueil:      "Ce qui a bougé, ce qu'il y a à faire, et de quand datent les données.",
  profil:       'Ce que les réponses déterminent, et ce que cela veut dire pour le portefeuille.',
  allocation:   "Ce que le profil commande, poche par poche — et ce qui l'en écarte.",
  portefeuille: "Les supports retenus dans le catalogue, poche par poche, sur des critères qu'on peut relire.",
  backtest:     "Ce qu'aurait donné cette allocation sur les années passées — pour se convaincre, pas pour promettre.",
  rapport:      "Le document remis et signé, et la relecture qui précède son impression."
};

/* Le mot du mode, ou celui d'origine. `T()` rend la clé quand elle n'existe
   nulle part : c'est ce test qui sert d'aiguillage, et qui évite de recopier
   dans la table tout ce que le mode ne change pas. */
function mot(cle, defaut) {
  const texte = T(cle);
  return texte === cle ? defaut : texte;
}

function titreSouligne(texte) {
  const t = String(texte || '').trim();
  const i = t.lastIndexOf(' ');
  if (i < 0) return '<span class="souligne">' + echapper(t) + '</span>';
  return echapper(t.slice(0, i + 1)) + '<span class="souligne">' + echapper(t.slice(i + 1)) + '</span>';
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
      suiviAmorce: Etat.suiviAmorce,
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

function jauge(titre, valeur, couleur) {
  return '<div class="jauge"><div class="tete"><span>' + titre + '</span><strong>' + valeur + ' / 100</strong></div>' +
    '<div class="piste"><div style="width:' + valeur + '%;background:' + couleur + '"></div></div></div>';
}

function ligne(cle, valeur) {
  return '<tr><td style="color:var(--gris-doux)">' + cle + '</td><td class="num"><strong>' + echapper(valeur) + '</strong></td></tr>';
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
