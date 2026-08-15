// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: chart-line;

/* =============================================================
   ALLOCATION ETF — widget iOS (Scriptable)
   -------------------------------------------------------------
   Répond à une seule question : qu'est-ce qui bouge aujourd'hui ?
   Le mouvement le plus marquant du jour occupe le haut du widget,
   la note du matin vient ensuite, et chaque section ouvre l'onglet
   correspondant de l'application.

   INSTALLATION
   1. Installez « Scriptable » depuis l'App Store.
   2. Ouvrez Scriptable, touchez « + », collez ce fichier,
      nommez-le « Allocation ETF ».
   3. Écran d'accueil : appui long → « + » → Scriptable →
      choisissez la taille, puis « Ajouter le widget ».
   4. Appui long sur le widget → « Modifier le widget » →
      Script : « Allocation ETF ».

   Aucune donnée personnelle ne transite : le widget ne lit que
   des variations de marché publiques. Le portefeuille reste dans
   le navigateur, il n'est jamais envoyé nulle part — ce widget ne
   peut donc pas afficher le portefeuille lui-même.
   ============================================================= */

const SITE = 'https://mayeullecomte.github.io/myetf/';
const SOURCE = SITE + 'data/widget.json';

/* ---------- Palette ----------
   Les mêmes jetons que l'application, réétagés pour la surface
   sombre comme dans la feuille de style : pas une autre palette,
   la même repositionnée. Le widget suit l'apparence du système. */
const SOMBRE = Device.isUsingDarkAppearance();

const C = SOMBRE ? {
  fond:    new Color('#171a21'),
  fond2:   new Color('#1f232c'),
  texte:   new Color('#f2f4f7'),
  doux:    new Color('#98a2b0'),
  ligne:   new Color('#ffffff', 0.12),
  bleu:    new Color('#5c9dff'),
  or:      new Color('#e0ac4e'),
  vert:    new Color('#45c96f'),
  rouge:   new Color('#ff6961')
} : {
  fond:    new Color('#ffffff'),
  fond2:   new Color('#f7f8fa'),
  texte:   new Color('#0f1419'),
  doux:    new Color('#5b6673'),
  ligne:   new Color('#000000', 0.09),
  bleu:    new Color('#1f5aa8'),
  or:      new Color('#c08a2e'),
  vert:    new Color('#1f8a4c'),
  rouge:   new Color('#d0342c')
};

async function charger() {
  const requete = new Request(SOURCE);
  requete.timeoutInterval = 15;
  return await requete.loadJSON();
}

function pourcent(x, decimales) {
  if (x === null || x === undefined) return '—';
  return (x > 0 ? '+' : '') + x.toFixed(decimales === undefined ? 2 : decimales).replace('.', ',') + ' %';
}

function couleur(x) {
  if (x === null || x === undefined) return C.doux;
  return x > 0 ? C.vert : x < 0 ? C.rouge : C.doux;
}

function dateCourte(iso) {
  const [, m, j] = iso.split('-');
  return `${j}/${m}`;
}

/* Toutes les poches relevées, hausses et baisses confondues. */
function toutes(donnees) {
  return [].concat(donnees.hausses || [], donnees.baisses || [], donnees.reperes || []);
}

/* Le mouvement du jour le plus marquant, à la hausse comme à la
   baisse : c'est lui qui répond à « qu'est-ce qui bouge ? ».
   Le monétaire est écarté — il ne bouge pas, par construction. */
function marquant(donnees) {
  const candidats = toutes(donnees)
    .filter(p => p.jour !== null && p.jour !== undefined && !/Monétaire|Liquidit/i.test(p.poche));
  if (!candidats.length) return null;
  return candidats.sort((a, b) => Math.abs(b.jour) - Math.abs(a.jour))[0];
}

function repere(donnees) {
  return (donnees.reperes || []).find(r => /Monde/.test(r.poche)) || (donnees.reperes || [])[0] || null;
}

/* ---------- Briques d'affichage ---------- */

function titreSection(pile, texte) {
  const t = pile.addText(texte.toUpperCase());
  t.font = Font.semiboldSystemFont(9.5);
  t.textColor = C.doux;
}

/** Une ligne « poche … variation ». */
function ligne(pile, item, champ, taillePoche, tailleValeur) {
  const l = pile.addStack();
  l.centerAlignContent();

  const nom = l.addText(item.poche);
  nom.font = Font.systemFont(taillePoche);
  nom.textColor = C.texte;
  nom.lineLimit = 1;
  nom.minimumScaleFactor = 0.7;

  l.addSpacer();

  const val = l.addText(pourcent(item[champ]));
  val.font = Font.mediumRoundedSystemFont(tailleValeur);
  val.textColor = couleur(item[champ]);
  return l;
}

function separateur(pile, marge) {
  pile.addSpacer(marge);
  const barre = pile.addStack();
  barre.backgroundColor = C.ligne;
  barre.size = new Size(0, 1);
  barre.addSpacer();
  pile.addSpacer(marge);
}

function entete(widget, donnees, titre) {
  const barre = widget.addStack();
  barre.centerAlignContent();

  const t = barre.addText(titre.toUpperCase());
  t.font = Font.semiboldSystemFont(10);
  t.textColor = C.bleu;

  barre.addSpacer();

  const d = barre.addText(dateCourte(donnees.genere));
  d.font = Font.systemFont(10);
  d.textColor = C.doux;
}

/* ---------- Petit widget : le mouvement du jour ---------- */
function petit(widget, donnees) {
  const m = marquant(donnees) || repere(donnees);
  widget.url = SITE + '#macro';

  entete(widget, donnees, 'Aujourd\'hui');
  widget.addSpacer(8);

  if (!m) return;

  const nom = widget.addText(m.poche);
  nom.font = Font.systemFont(11);
  nom.textColor = C.doux;
  nom.lineLimit = 2;
  nom.minimumScaleFactor = 0.8;

  widget.addSpacer(3);

  const jour = widget.addText(pourcent(m.jour));
  jour.font = Font.boldRoundedSystemFont(28);
  jour.textColor = couleur(m.jour);

  widget.addSpacer();

  const r = repere(donnees);
  if (r) {
    const bas = widget.addStack();
    bas.centerAlignContent();
    const l = bas.addText(r.poche.replace('Actions ', ''));
    l.font = Font.systemFont(10);
    l.textColor = C.doux;
    l.lineLimit = 1;
    bas.addSpacer();
    const v = bas.addText(pourcent(r.jour));
    v.font = Font.mediumRoundedSystemFont(10);
    v.textColor = couleur(r.jour);
  }
}

/* ---------- Widget moyen : le jour, puis la note ---------- */
function moyen(widget, donnees) {
  const m = marquant(donnees);
  widget.url = SITE + '#macro';

  entete(widget, donnees, 'Aujourd\'hui');
  widget.addSpacer(7);

  if (m) {
    const haut = widget.addStack();
    haut.centerAlignContent();

    const g = haut.addStack();
    g.layoutVertically();
    const nom = g.addText(m.poche);
    nom.font = Font.mediumSystemFont(13);
    nom.textColor = C.texte;
    nom.lineLimit = 1;
    nom.minimumScaleFactor = 0.7;
    const sem = g.addText('semaine ' + pourcent(m.semaine));
    sem.font = Font.systemFont(10);
    sem.textColor = C.doux;

    haut.addSpacer();

    const val = haut.addText(pourcent(m.jour));
    val.font = Font.boldRoundedSystemFont(22);
    val.textColor = couleur(m.jour);
  }

  separateur(widget, 8);

  if (donnees.note) {
    titreSection(widget, 'Note du matin');
    widget.addSpacer(3);
    const t = widget.addText(donnees.note.titre);
    t.font = Font.semiboldSystemFont(13);
    t.textColor = C.texte;
    t.lineLimit = 3;
    t.minimumScaleFactor = 0.85;
  } else {
    titreSection(widget, 'Repères · semaine');
    widget.addSpacer(4);
    (donnees.reperes || []).slice(0, 3).forEach((r, i) => {
      if (i) widget.addSpacer(4);
      ligne(widget, r, 'semaine', 12, 12);
    });
  }
}

/* ---------- Grand widget : le jour, la note, les extrêmes ----------
   Chaque bloc porte son propre lien : toucher la note ouvre l'onglet
   « Note de marché », toucher les mouvements ouvre « Contexte macro ». */
function grand(widget, donnees) {
  const m = marquant(donnees);
  widget.url = SITE;

  entete(widget, donnees, 'Aujourd\'hui');
  widget.addSpacer(10);

  if (m) {
    const haut = widget.addStack();
    haut.centerAlignContent();
    haut.url = SITE + '#macro';

    const g = haut.addStack();
    g.layoutVertically();
    const nom = g.addText(m.poche);
    nom.font = Font.mediumSystemFont(15);
    nom.textColor = C.texte;
    nom.lineLimit = 1;
    nom.minimumScaleFactor = 0.7;
    const sem = g.addText('semaine ' + pourcent(m.semaine) + ' · année ' + pourcent(m.annee, 1));
    sem.font = Font.systemFont(11);
    sem.textColor = C.doux;

    haut.addSpacer();

    const val = haut.addText(pourcent(m.jour));
    val.font = Font.boldRoundedSystemFont(30);
    val.textColor = couleur(m.jour);

    separateur(widget, 10);
  }

  if (donnees.note) {
    const bloc = widget.addStack();
    bloc.layoutVertically();
    bloc.url = SITE + '#note';

    titreSection(bloc, 'Note du matin');
    bloc.addSpacer(4);

    const t = bloc.addText(donnees.note.titre);
    t.font = Font.semiboldSystemFont(15);
    t.textColor = C.texte;
    t.lineLimit = 2;

    bloc.addSpacer(3);

    const s = bloc.addText(donnees.note.synthese);
    s.font = Font.systemFont(11.5);
    s.textColor = C.doux;
    s.lineLimit = 4;

    separateur(widget, 10);
  }

  const bas = widget.addStack();
  bas.layoutVertically();
  bas.url = SITE + '#macro';

  const section = (titre, items, dernier) => {
    titreSection(bas, titre);
    bas.addSpacer(4);
    items.slice(0, 2).forEach((it, i) => {
      if (i) bas.addSpacer(3);
      ligne(bas, it, 'semaine', 11.5, 11.5);
    });
    if (!dernier) bas.addSpacer(9);
  };

  section('En hausse · semaine', donnees.hausses || []);
  section('En baisse · semaine', donnees.baisses || [], true);

  widget.addSpacer();

  const pied = widget.addStack();
  pied.centerAlignContent();
  pied.url = SITE + '#accueil';
  const p = pied.addText('Ouvrir le dossier');
  p.font = Font.mediumSystemFont(11);
  p.textColor = C.bleu;
  pied.addSpacer();
  const fl = pied.addText('→');
  fl.font = Font.systemFont(11);
  fl.textColor = C.bleu;
}

/* ---------- Assemblage ---------- */
async function construire() {
  const widget = new ListWidget();
  widget.backgroundColor = C.fond;
  widget.url = SITE;
  widget.setPadding(15, 15, 15, 15);

  let donnees;
  try {
    donnees = await charger();
  } catch (e) {
    const t = widget.addText('Données indisponibles');
    t.font = Font.semiboldSystemFont(13);
    t.textColor = C.texte;
    widget.addSpacer(4);
    const d = widget.addText('Vérifiez la connexion, puis rouvrez le widget.');
    d.font = Font.systemFont(11);
    d.textColor = C.doux;
    return widget;
  }

  const taille = config.runsInWidget ? config.widgetFamily : 'large';
  if (taille === 'small') petit(widget, donnees);
  else if (taille === 'medium') moyen(widget, donnees);
  else grand(widget, donnees);

  /* Le relevé tourne le matin : inutile de rafraîchir plus souvent. */
  widget.refreshAfterDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return widget;
}

const widget = await construire();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentLarge();               // aperçu quand on lance le script à la main
}
Script.complete();
