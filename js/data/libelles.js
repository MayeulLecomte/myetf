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
      'Signature du client : _______________________'
  },

  /* Rempli au chantier 7 (c). Vide, le mode particulier parle donc
     exactement comme le conseiller — ce qui est la preuve attendue de
     l'étape (b) : le branchement ne change rien. */
  particulier: {}
};

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
