/* =============================================================
   LIBELLÉS PAR MODE
   -------------------------------------------------------------
   L'application se lit de deux façons : un conseiller qui
   construit un dossier POUR un client, ou un particulier qui
   construit le sien. Un seul code, un seul moteur, un seul
   format de dossier — seul le vocabulaire change.

   Deux tables, et pas deux jumelles :

     `defaut`      le vocabulaire du conseiller, mot pour mot ce
                   qui était écrit dans les pages avant que cette
                   table existe ;
     `particulier` UNIQUEMENT ce que le mode change.

   La table `particulier` se lit donc comme la définition du
   mode : ce qui n'y figure pas est identique dans les deux.
   C'est aussi ce qui rend la suppression simple le jour où l'un
   des deux l'emporte — on retire un littéral, ou on replie ses
   écarts dans les défauts.

   DEUX RÉGIMES D'ÉCHAPPEMENT, à ne pas confondre :

     `phrase.*`    des fragments HTML, insérés tels quels ;
     tout le reste du texte simple, échappé au point d'usage.

   Aucune de ces valeurs ne vient de l'utilisateur : elles sont
   écrites ici, et nulle part ailleurs.
   ============================================================= */

const LIBELLES = {

  defaut: {

    /* ---------- Les vues : entrée de navigation, puis titre ----------
       L'entrée de navigation est plus courte que le titre — la colonne
       fait 236 px. `#nav` reste la seule source de ces libellés : le
       ruban mobile, la barre basse et la barre de parcours l'y lisent
       tous les trois, et ne peuvent donc pas en diverger. */
    'vue.accueil.nav':          'Aujourd\'hui',

    'vue.client.nav':           'Client & enveloppe',
    'vue.client.titre':         'Client & enveloppe',
    'vue.questionnaire.nav':    'Questionnaire',
    'vue.questionnaire.titre':  'Questionnaire de profilage',
    'vue.profil.nav':           'Profil de risque',
    'vue.profil.titre':         'Profil de risque',

    'vue.note.nav':             'Note du jour',
    'vue.note.titre':           'Note du jour',
    'vue.macro.nav':            'Contexte',
    'vue.macro.titre':          'Contexte économique, géopolitique et fiscal',
    'vue.allocation.nav':       'Allocation cible',
    'vue.allocation.titre':     'Allocation cible',
    'vue.portefeuille.nav':     'Sélection des supports',
    'vue.portefeuille.titre':   'Sélection des supports',
    'vue.arbitrages.nav':       'Arbitrages',
    'vue.arbitrages.titre':     'Arbitrages proposés',
    'vue.backtest.nav':         'Backtest',
    'vue.backtest.titre':       'Backtest de l\'allocation',

    'vue.situation.nav':        'Situation',
    'vue.situation.titre':      'Situation des placements',
    'vue.revenus.nav':          'Revenus & rachats',
    'vue.revenus.titre':        'Revenus & rachats programmés',
    'vue.journal.nav':          'Journal',
    'vue.journal.titre':        'Journal des revues',
    'vue.rapport.nav':          'Rapport',
    'vue.rapport.titre':        'Rapport de préconisation',

    'vue.univers.nav':          'Univers ETF',
    'vue.univers.titre':        'Univers ETF référencé',
    'vue.methode.nav':          'Méthode & limites',
    'vue.methode.titre':        'Méthode & limites',

    /* ---------- Les champs du dossier ---------- */
    'champ.nom':                'Nom / référence dossier',
    'champ.nom.exemple':        'M. et Mme Dupont',
    'champ.age':                'Âge du client',
    'champ.montant':            'Montant à investir',
    'champ.versement':          'Versement programmé mensuel',
    'champ.enveloppe':          'Enveloppe support',
    'champ.contratAV':          'Gamme du contrat (assurance-vie)',

    /* ---------- Le rapport ---------- */
    'rapport.ligne.client':     'Client',

    /* ---------- Une option du questionnaire ----------
       Seul son libellé dépend du mode. Son score et son `meta` n'en
       dépendent pas et n'en dépendront jamais : aucun calcul n'est
       spécifique à un mode. */
    'option.arbitrages.conseillee': 'Oui, sur proposition de mon conseiller',

    /* ---------- Prose entière (HTML) ---------- */
    'phrase.accroche.longue':
      '<strong>myetf construit et suit une allocation d\'ETF pour un client</strong> — du ' +
      'questionnaire de profilage aux ordres à passer, en assurance-vie, PEA ou compte-titres. ' +
      'C\'est un outil de travail pour le conseiller, qui valide et signe : ce n\'est pas un ' +
      'service rendu au client final.',
    'phrase.accroche.courte':
      '<strong>Allocation d\'ETF pour un client</strong> — outil de travail du conseiller.',

    /* Une seule ligne, pour l'accueil d'un dossier vide. Qui arrive là n'a
       rien à lire : il a un dossier à commencer. La version longue reste
       pour l'écran d'entrée, où elle est à sa place. */
    'phrase.accroche.ligne':
      '<strong>myetf construit et suit une allocation d\'ETF pour un client</strong> — les ' +
      'décisions sont les vôtres.',

    'phrase.mentions.nature':
      'Ce document est un support d\'aide à la décision produit par un outil interne. Il ne constitue ni un ' +
      'conseil en investissement personnalisé au sens de l\'article D. 321-1 du code monétaire et financier, ni une ' +
      'recommandation d\'achat ou de vente, tant qu\'il n\'a pas été validé, complété et signé par le conseiller dans ' +
      'le cadre du rapport d\'adéquation remis au client.',
    'phrase.mentions.scenarios':
      'Les probabilités de scénarios macroéconomiques reflètent l\'appréciation du conseiller à la date du ' +
      'document. Elles sont susceptibles d\'évoluer et ne constituent pas une prévision.',
    'phrase.mentions.signature':
      'Document établi le {date}. Conseiller : _______________________  ' +
      'Signature du client : _______________________',

    /* Ce que l'outil ne fait pas — annexe « Méthode » du rapport. */
    'phrase.methode.nefaitpas':
      'Il ne délivre aucun conseil en investissement : il produit un support de travail que le ' +
      'conseiller valide, complète et signe. Il ne passe aucun ordre et n\'est connecté à aucun ' +
      'contrat. Il n\'exerce aucune surveillance des marchés : le suivi est déclenché par une revue, ' +
      'jamais par une alerte.',

    /* L'absence de contexte, dite là où elle change le chiffre affiché. Le
       conseiller peut y remédier — un bouton l'y mène ; le particulier non,
       le contexte n'existe pas dans son mode. */
    'phrase.sansContexte.allocation':
      '<strong>Allocation stratégique seule.</strong> Aucun indicateur de contexte n\'étant ' +
      'renseigné, aucune déviation tactique n\'est appliquée : la répartition ci-dessous découle ' +
      'du seul profil de risque. ' +
      '<div class="barre-actions"><button class="bouton secondaire" data-aller="macro">' +
      'Renseigner le contexte</button></div>',
    'phrase.sansContexte.arbitrages':
      '<strong>Aucun contexte n\'est renseigné.</strong> Les écarts ci-dessous sont mesurés contre ' +
      'l\'allocation stratégique du profil, sans déviation tactique. Renseignez le contexte si une ' +
      'vue de marché doit peser sur les ordres.' +
      '<div class="barre-actions"><button class="bouton secondaire" data-aller="macro">' +
      'Renseigner le contexte</button></div>',
    'phrase.rapport.contexte.absent':
      'Aucune vue de marché n\'a été exprimée pour ce dossier. Aucune distribution de scénarios ' +
      'n\'est donc retenue, et l\'allocation proposée est strictement celle du profil de risque.',

    /* Vides chez le conseiller : ces deux mises en garde n'existent qu'en
       mode particulier, où personne ne les dira à sa place. */
    'phrase.backtest.avertissement': '',
    'phrase.rapport.avertissement': ''
  },

  /* Ce que le mode particulier change, et rien d'autre. Deux voix, et
     c'est voulu : la navigation au possessif — je regarde mes affaires —
     et les champs de saisie au « votre » — l'outil me demande quelque
     chose. */
  particulier: {

    'vue.client.nav':           'Mon enveloppe',
    'vue.client.titre':         'Mon enveloppe',
    'vue.profil.nav':           'Mon profil',
    'vue.profil.titre':         'Mon profil de risque',
    'vue.allocation.nav':       'Mon allocation',
    'vue.allocation.titre':     'Mon allocation',
    'vue.portefeuille.nav':     'Mes supports',
    'vue.portefeuille.titre':   'Mes supports',
    'vue.arbitrages.nav':       'Mes arbitrages',
    'vue.arbitrages.titre':     'Mes arbitrages',
    'vue.situation.nav':        'Mes placements',
    'vue.situation.titre':      'Mes placements',
    'vue.journal.nav':          'Mon suivi',
    'vue.journal.titre':        'Mon suivi',
    'vue.rapport.nav':          'Ma synthèse',
    'vue.rapport.titre':        'Ma synthèse',

    'champ.nom':                'Nom du dossier (facultatif)',
    'champ.nom.exemple':        'Assurance-vie 2026',
    'champ.age':                'Votre âge',
    'champ.versement':          'Votre versement mensuel',
    'champ.enveloppe':          'Votre enveloppe',

    'option.arbitrages.conseillee': 'Oui, sur proposition de cet outil',

    'rapport.ligne.client':     'Dossier',

    'phrase.accroche.longue':
      '<strong>myetf construit et suit votre allocation d\'ETF</strong> — du questionnaire de ' +
      'profilage aux ordres à passer, en assurance-vie, PEA ou compte-titres. Il ne délivre aucun ' +
      'conseil : les décisions sont les vôtres.',
    'phrase.accroche.courte':
      '<strong>Votre allocation d\'ETF</strong> — vos décisions, votre suivi.',
    'phrase.accroche.ligne':
      '<strong>myetf construit et suit votre allocation d\'ETF</strong> — les décisions sont ' +
      'les vôtres.',

    'phrase.mentions.nature':
      'Ce document est un support d\'aide à la décision que vous avez produit vous-même. Il ne ' +
      'constitue pas un conseil en investissement, ni une recommandation d\'achat ou de vente.',
    'phrase.mentions.scenarios':
      'Les probabilités de scénarios macroéconomiques reflètent votre appréciation à la date du ' +
      'document. Elles sont susceptibles d\'évoluer et ne constituent pas une prévision.',
    'phrase.mentions.signature':
      'Document établi le {date}.',

    'phrase.methode.nefaitpas':
      'Il ne délivre aucun conseil en investissement et ne se substitue pas à un professionnel. Il ' +
      'ne passe aucun ordre et n\'est connecté à aucun contrat. Il n\'exerce aucune surveillance des ' +
      'marchés : le suivi est déclenché par une revue que vous ouvrez, jamais par une alerte.',

    /* Sans bouton : le contexte n'existe pas dans ce mode, et proposer d'y
       aller enverrait vers un écran que la navigation ne montre pas. */
    'phrase.sansContexte.allocation':
      '<strong>Allocation issue de votre seul profil.</strong> Aucune vue de marché n\'est appliquée : ' +
      'la répartition ci-dessous découle uniquement de vos réponses au questionnaire.',
    'phrase.sansContexte.arbitrages':
      '<strong>Écarts mesurés contre votre allocation cible.</strong> Aucune vue de marché n\'y est ' +
      'mêlée : les ordres proposés ramènent le portefeuille vers l\'allocation de votre profil.',
    'phrase.rapport.contexte.absent':
      'Aucune vue de marché n\'est appliquée : l\'allocation présentée découle uniquement de vos ' +
      'réponses au questionnaire.',

    'phrase.backtest.avertissement':
      'Une partie des performances passées est estimée, pas mesurée : ce backtest donne un ordre de ' +
      'grandeur, pas une prévision. Consultez ' +
      '<button class="lien" data-aller="methode">Méthode &amp; limites</button>.',
    'phrase.rapport.avertissement':
      '<strong>Ce document ne constitue pas un conseil en investissement.</strong> Vous l\'avez ' +
      'produit vous-même, à partir de vos réponses et d\'hypothèses paramétrables. Les placements en ' +
      'unités de compte présentent un risque de perte en capital, et les performances passées ne ' +
      'préjugent pas des performances futures.'
  }
};

/* ------------------------------------------------------------
   LES VUES QUE LE MODE NE MONTRE PAS
   ------------------------------------------------------------
   Masquer porte sur la NAVIGATION, jamais sur le routage : une
   ancre `#…` continue d'ouvrir sa vue dans les deux modes. C'est
   ce qui garde le widget iOS vivant — il ouvre `#note`, masquée
   en particulier.

   Le contexte macro est masqué parce que le mode n'applique
   aucune déviation tactique, ce qui rejoint la règle déjà
   arrêtée : pas de contexte, allocation strictement stratégique.
   ------------------------------------------------------------ */
const VUES_MASQUEES = {
  conseiller:  [],
  particulier: ['note', 'macro', 'revenus']
};

function vueMasquee(vue) {
  const mode = (typeof Etat !== 'undefined' && Etat.mode) || MODE_DEFAUT;
  return (VUES_MASQUEES[mode] || []).indexOf(vue) >= 0;
}

/* Les deux modes coexistent le temps de trancher. `MODES` porte ce qui
   s'affiche sur l'écran d'entrée ; l'ordre est celui des boutons. */
const MODES = [
  { id: 'conseiller',  bouton: 'Je suis conseiller',
    sous: 'Je construis et suis un dossier pour un client' },
  { id: 'particulier', bouton: 'J\'investis pour moi-même',
    sous: 'Je construis mon allocation seul, sans conseiller' }
];

const MODE_DEFAUT = 'conseiller';

/* Rend le libellé du mode courant, et retombe sur le défaut quand la
   clé n'a pas d'écart — ou n'existe nulle part, auquel cas on rend la
   clé elle-même plutôt qu'un blanc : un libellé manquant doit se voir
   à l'écran, pas disparaître.

   `valeurs` remplace les marques `{nom}` : c'est ce qui permet de
   sortir de la table une phrase qui porte une date ou un nombre. */
function T(cle, valeurs) {
  const mode = (typeof Etat !== 'undefined' && Etat.mode) || MODE_DEFAUT;
  const ecarts = LIBELLES[mode] || {};
  let texte = ecarts[cle] !== undefined ? ecarts[cle]
            : (LIBELLES.defaut[cle] !== undefined ? LIBELLES.defaut[cle] : cle);
  if (valeurs) {
    Object.keys(valeurs).forEach(k => {
      texte = texte.split('{' + k + '}').join(valeurs[k]);
    });
  }
  return texte;
}
