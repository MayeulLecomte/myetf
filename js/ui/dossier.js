/* =============================================================
   LE DOSSIER
   -------------------------------------------------------------
   Ce que le dossier VAUT, par opposition à ce qu'il montre. Profil, allocation
   courante, sélection, contexte, cotation, portefeuille suivi, situations
   figées, et les préalables qui disent ce qui manque avant de pouvoir répondre.

   Aucune de ces fonctions ne produit de HTML.

   Déplacé depuis js/app.js sans une virgule de changement.
   ============================================================= */

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
/* Le cours du jour, s'il existe. Les cours relevés sur Euronext viennent en
   premier — ils sont quotidiens et gratuits, mais ne couvrent que 34 ISIN.
   À défaut, la dernière clôture du catalogue, sous LA MÊME règle que la
   valorisation : en euros, et de moins de 45 jours. Une seule règle, tenue
   au même endroit — deux garde-fous divergeraient. */
function cotation(isin) {
  if (!isin) return null;
  if (typeof DERNIERS_COURS !== 'undefined' && DERNIERS_COURS[isin]) return DERNIERS_COURS[isin];
  const r = MoteurSituation.coursDeRepli(isin, aujourdhuiISO(), repliCatalogue());
  return r && r.cours != null ? { cours: r.cours, date: r.date } : null;
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

  /* PAS DE DESSIN ICI. L'état vide en portait un — un carnet quand le
     questionnaire manquait, un port quand c'était le portefeuille. Depuis
     que chaque vue s'ouvre sur le sien, cet état arrive juste dessous : on
     voyait la balance de l'allocation, puis un carnet, sur le même écran.
     Deux dessins pour une vue, et le second ne disait rien que le titre
     « Une étape manque » ne dise déjà. */
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

function libelleEnveloppe() {
  const e = Etat.identite.enveloppe || 'AV';
  if (e !== 'AV') return e === 'PEA' ? 'PEA' : 'Compte-titres';
  const c = (IDENTITE.find(f => f.id === 'contratAV').options.find(o => o.valeur === (Etat.identite.contratAV || 'av-large')) || {}).label;
  return 'Assurance-vie — ' + (c || '');
}

/* ------------------------------------------------------------
   LE PORTEFEUILLE SUIVI
   ------------------------------------------------------------
   Une ligne du suivi est soit DÉTENUE, soit À INVESTIR — proposée
   par la sélection, pas encore achetée. Une ligne d'un dossier
   antérieur ne porte pas la mention : elle a été saisie à la main,
   elle décrit une position réelle, elle est donc détenue.
   ------------------------------------------------------------ */
function possessionDe(ligne) {
  return ligne && ligne.possession === 'a-investir' ? 'a-investir' : 'detenu';
}

function lignesDetenues()   { return Etat.detention.filter(l => possessionDe(l) === 'detenu'); }

function lignesAInvestir()  { return Etat.detention.filter(l => possessionDe(l) === 'a-investir'); }

/* ------------------------------------------------------------
   LA SYNCHRONISATION DU SUIVI SUR LA CIBLE
   ------------------------------------------------------------
   Dès qu'une sélection existe, le portefeuille recommandé se pose
   dans le suivi — sans bouton, sans passer par les arbitrages.

   Quatre cas, et le quatrième est le seul dangereux :

     détenu, toujours dans la cible ...... reste, inchangé
     nouveau dans la cible ............... arrive « à investir »
     à investir, sorti de la cible ....... disparaît, rien n'a été acheté
     DÉTENU, SORTI DE LA CIBLE ........... RESTE, et l'arbitrage
                                           proposera de le céder

   Faire disparaître du suivi une ligne réellement détenue parce que
   le moteur ne la retient plus effacerait une position réelle de
   l'écran. Elle reste.

   L'amorçage n'a lieu que sur un suivi VIDE. Un dossier où des
   positions ont été saisies à la main ne reçoit jamais de lignes :
   pour lui, la cible est un objet de comparaison, pas un contenu.
   Il peut la demander explicitement, depuis le suivi.
   ------------------------------------------------------------ */
function synchroniserSuivi() {
  const sel = selectionCourante();
  if (!sel || !sel.lignes.length) return false;
  if (!Etat.suiviAmorce && Etat.detention.length) return false;
  if (!Etat.suiviAmorce && !Etat.detention.length) Etat.suiviAmorce = true;

  const avant = JSON.stringify(Etat.detention);
  const cible = {};
  sel.lignes.forEach(l => { cible[l.etf.isin] = l; });

  const gardees = Etat.detention.filter(l =>
    possessionDe(l) === 'detenu' || cible[l.isin]);

  /* Une ligne pas encore achetée suit la cible : son montant est une
     recommandation, pas un fait. Une ligne détenue, elle, ne bouge pas. */
  gardees.forEach(l => {
    if (possessionDe(l) !== 'a-investir' || !cible[l.isin]) return;
    const c = cible[l.isin];
    const cot = cotation(l.isin);
    l.libelle = c.etf.nom;
    l.montant = c.montant;
    l.quantite = cot ? Math.round(c.montant / cot.cours) : undefined;
  });

  const presents = {};
  gardees.forEach(l => { presents[l.isin] = true; });
  sel.lignes.forEach(c => {
    if (presents[c.etf.isin]) return;
    const cot = cotation(c.etf.isin);
    gardees.push({
      isin: c.etf.isin, libelle: c.etf.nom, montant: c.montant, pvLatente: 0,
      quantite: cot ? Math.round(c.montant / cot.cours) : undefined,
      possession: 'a-investir'
    });
  });

  Etat.detention = gardees;
  return JSON.stringify(Etat.detention) !== avant;
}

/* Le catalogue porte une clôture par support. On la met en forme une fois
   par chargement : quatre mille cinq cents lignes à reparcourir pour chaque
   rendu de situation seraient du gaspillage. */
let _repli = null;

function repliCatalogue() {
  if (typeof CATALOGUE_ETF === 'undefined' || !CATALOGUE_ETF) return null;
  if (_repli && _repli.genere === CATALOGUE_ETF.genere) return _repli;
  const C = CATALOGUE_ETF;
  const iPrix = C.colonnes.indexOf('prix');
  const iDate = C.colonnes.indexOf('prixDate');
  const iDev = C.colonnes.indexOf('prixDevise');
  if (iPrix < 0) return null;
  const prix = {};
  C.lignes.forEach(l => {
    if (l[iPrix] == null) return;
    prix[l[0]] = {
      cours: l[iPrix],
      date: l[iDate] == null ? null : (C.datesPrix || [])[l[iDate]],
      devise: l[iDev] == null ? null : (C.devisesPrix || [])[l[iDev]]
    };
  });
  _repli = { genere: C.genere, prix };
  return _repli;
}

function situationCourante(dateISO) {
  return MoteurSituation.valoriser(Etat.detention, dateISO,
    { univers: Etat.univers, repli: repliCatalogue() });
}

/** Enregistre le relevé du jour demandé. */
function figerSituation(dateISO, origine) {
  /* Un relevé daté enregistre ce qui est DÉTENU. Y figer une ligne encore
     à investir lui prêterait une existence qu'elle n'a pas, et ce relevé
     est ensuite lu comme un fait. */
  const s = MoteurSituation.valoriser(lignesDetenues(), dateISO,
    { univers: Etat.univers, repli: repliCatalogue() });
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
