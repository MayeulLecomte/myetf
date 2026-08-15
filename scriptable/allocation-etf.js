// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: chart-line;

/* =============================================================
   ALLOCATION ETF — widget iOS (Scriptable)
   -------------------------------------------------------------
   Affiche les mouvements de marché relevés le matin même et,
   quand elle est activée, le titre de la note de marché.

   INSTALLATION
   1. Installez « Scriptable » depuis l'App Store.
   2. Ouvrez Scriptable, touchez « + », collez ce fichier,
      nommez-le « Allocation ETF ».
   3. Écran d'accueil : appui long → « + » → Scriptable →
      choisissez la taille, puis « Ajouter le widget ».
   4. Appui long sur le widget → « Modifier le widget » →
      Script : « Allocation ETF ».

   Aucune donnée personnelle ne transite : le widget ne lit que
   des variations de marché publiques. Le portefeuille reste
   dans le navigateur, il n'est jamais envoyé nulle part.
   ============================================================= */

const SITE = 'https://mayeullecomte.github.io/myetf/';
const SOURCE = SITE + 'data/widget.json';

/* Palette reprise de l'application */
const BLEU   = new Color('#1c3557');
const OR     = new Color('#b8944d');
const VERT   = new Color('#3f7d50');
const ROUGE  = new Color('#b3423d');
const DOUX   = new Color('#8d97a3');
const CLAIR  = new Color('#ffffff');

async function charger() {
  const requete = new Request(SOURCE);
  requete.timeoutInterval = 15;
  return await requete.loadJSON();
}

function pourcent(x) {
  if (x === null || x === undefined) return '—';
  return (x > 0 ? '+' : '') + x.toFixed(2).replace('.', ',') + ' %';
}

function couleur(x) {
  if (x === null || x === undefined) return DOUX;
  return x > 0 ? VERT : x < 0 ? ROUGE : DOUX;
}

function dateCourte(iso) {
  const [a, m, j] = iso.split('-');
  return `${j}/${m}`;
}

/** Une ligne « poche … variation ». */
function ligne(pile, item, champ, taillePoche, tailleValeur) {
  const l = pile.addStack();
  l.centerAlignContent();

  const nom = l.addText(item.poche);
  nom.font = Font.systemFont(taillePoche);
  nom.textColor = CLAIR;
  nom.lineLimit = 1;
  nom.minimumScaleFactor = 0.7;

  l.addSpacer();

  const val = l.addText(pourcent(item[champ]));
  val.font = Font.mediumRoundedSystemFont(tailleValeur);
  val.textColor = couleur(item[champ]);
}

function entete(widget, donnees, titre) {
  const barre = widget.addStack();
  barre.centerAlignContent();

  const t = barre.addText(titre);
  t.font = Font.semiboldSystemFont(12);
  t.textColor = OR;

  barre.addSpacer();

  const d = barre.addText(dateCourte(donnees.genere));
  d.font = Font.systemFont(11);
  d.textColor = DOUX;
}

/* ---------- Petit widget : un seul repère ---------- */
function petit(widget, donnees) {
  const monde = donnees.reperes.find(r => /Monde/.test(r.poche)) || donnees.reperes[0];

  entete(widget, donnees, 'MARCHÉ');
  widget.addSpacer(6);

  const nom = widget.addText(monde.poche);
  nom.font = Font.systemFont(11);
  nom.textColor = DOUX;
  nom.lineLimit = 2;

  widget.addSpacer(2);

  const jour = widget.addText(pourcent(monde.jour));
  jour.font = Font.boldRoundedSystemFont(26);
  jour.textColor = couleur(monde.jour);

  widget.addSpacer(4);

  const sem = widget.addText('Semaine ' + pourcent(monde.semaine));
  sem.font = Font.systemFont(11);
  sem.textColor = DOUX;

  const an = widget.addText('Année ' + pourcent(monde.annee));
  an.font = Font.systemFont(11);
  an.textColor = DOUX;
}

/* ---------- Widget moyen : les repères de l'allocation ---------- */
function moyen(widget, donnees) {
  entete(widget, donnees, donnees.note ? 'NOTE DU JOUR' : 'REPÈRES · SEMAINE');
  widget.addSpacer(6);

  if (donnees.note) {
    const t = widget.addText(donnees.note.titre);
    t.font = Font.semiboldSystemFont(14);
    t.textColor = CLAIR;
    t.lineLimit = 2;
    widget.addSpacer(6);
  }

  donnees.reperes.slice(0, 4).forEach((r, i) => {
    if (i) widget.addSpacer(4);
    ligne(widget, r, 'semaine', 12, 12);
  });
}

/* ---------- Grand widget : note, hausses et baisses ---------- */
function grand(widget, donnees) {
  entete(widget, donnees, 'ALLOCATION ETF');
  widget.addSpacer(8);

  if (donnees.note) {
    const t = widget.addText(donnees.note.titre);
    t.font = Font.semiboldSystemFont(16);
    t.textColor = CLAIR;
    t.lineLimit = 2;

    widget.addSpacer(4);

    const s = widget.addText(donnees.note.synthese);
    s.font = Font.systemFont(12);
    s.textColor = DOUX;
    s.lineLimit = 4;

    widget.addSpacer(10);
  }

  const section = (titre, items) => {
    const h = widget.addText(titre);
    h.font = Font.semiboldSystemFont(10);
    h.textColor = OR;
    widget.addSpacer(4);
    items.forEach((it, i) => {
      if (i) widget.addSpacer(3);
      ligne(widget, it, 'semaine', 12, 12);
    });
    widget.addSpacer(8);
  };

  section('EN HAUSSE SUR LA SEMAINE', donnees.hausses);
  section('EN BAISSE SUR LA SEMAINE', donnees.baisses);
}

/* ---------- Assemblage ---------- */
async function construire() {
  const widget = new ListWidget();
  widget.backgroundColor = BLEU;
  widget.url = SITE;                    // toucher le widget ouvre l'application
  widget.setPadding(14, 14, 14, 14);

  let donnees;
  try {
    donnees = await charger();
  } catch (e) {
    const t = widget.addText('Données indisponibles');
    t.font = Font.semiboldSystemFont(13);
    t.textColor = CLAIR;
    widget.addSpacer(4);
    const d = widget.addText('Vérifiez la connexion, puis rouvrez le widget.');
    d.font = Font.systemFont(11);
    d.textColor = DOUX;
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
