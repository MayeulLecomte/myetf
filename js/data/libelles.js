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
    'champ.prenom':             'Prénom du client (facultatif)',
    'champ.prenom.exemple':     'Marie',
    'champ.nomFamille':         'Nom du client (facultatif)',
    'champ.nomFamille.exemple': 'Dupont',
    'champ.telephone':          'Téléphone (facultatif)',
    'champ.telephone.exemple':  '06 12 34 56 78',
    'champ.email':              'E-mail (facultatif)',
    'champ.email.exemple':      'marie.dupont@exemple.fr',
    'champ.adresse':            'Adresse (facultatif)',
    'champ.adresse.exemple':    '12 rue des Lilas, 75011 Paris',
    'phrase.identite.coordonnees':
      'Coordonnées facultatives. Elles ne servent qu\'à l\'en-tête du document remis, ne quittent pas ' +
      'ce navigateur, et n\'entrent dans aucun calcul.',
    'champ.montant':            'Montant à investir',
    'champ.versement':          'Versement programmé mensuel',
    'champ.enveloppe':          'Enveloppe support',
    'champ.contratAV':          'Gamme du contrat (assurance-vie)',

    /* ---------- Le rapport ---------- */
    'rapport.ligne.client':     'Client',
    'rapport.ligne.identite':   'Client (nom)',

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
    /* L'accueil salue quand il sait qui il salue. Dans les deux modes : un
       conseiller ouvre le dossier de quelqu'un, et le prénom qu'il a saisi est
       celui de ce quelqu'un. */
    /* ---------- L'envoi de la proposition ----------
       Ces clés-ci vivent dans la table PAR DÉFAUT : les deux modes envoient,
       et le corps du message est le même à la signature près. */
    'arbitrages.mail.bouton': 'Préparer l\'e-mail',
    'arbitrages.mail.copier': 'Copier le texte',
    'arbitrages.mail.copie': 'Proposition copiée — collez-la dans votre message.',
    'arbitrages.mail.objet': 'Proposition d\'arbitrages — {dossier} — {date}',
    'arbitrages.mail.entete': 'Proposition d\'arbitrages du {date}',
    'arbitrages.mail.total': 'Total : {ventes} de ventes, {achats} d\'achats.',
    'arbitrages.mail.reserve':
      'Cette proposition est établie à partir de l\'allocation cible du dossier. Rien n\'est ' +
      'exécuté : les ordres sont à passer par vos soins.',
    'arbitrages.mail.tronque':
      '(Liste tronquée pour tenir dans un e-mail — le texte complet est disponible par ' +
      '« Copier le texte ».)',

    'phrase.bonjour': 'Bonjour {prenom}',

    /* « Ce que le profil commande » se lit comme un ordre venu d'ailleurs, et
       « ce qui l'en écarte » ne dit pas qui écarte quoi. La version conseiller
       nomme les deux temps du calcul — la stratégique, puis la déviation. */
    'sousTitre.allocation':
      'La répartition que porte le profil, poche par poche, et la déviation tactique qui s\'y ajoute.',

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
    'champ.prenom':             'Votre prénom (facultatif)',
    'champ.prenom.exemple':     'Marie',
    'champ.nomFamille':         'Votre nom (facultatif)',
    'champ.nomFamille.exemple': 'Dupont',
    'champ.telephone':          'Votre téléphone (facultatif)',
    'champ.email':              'Votre e-mail (facultatif)',
    'phrase.identite.coordonnees':
      'Ces informations restent dans ce navigateur et ne sont utilisées que pour votre synthèse.',
    'champ.versement':          'Ce que vous ajoutez chaque mois',
    'champ.enveloppe':          'Où placez-vous cet argent ?',
    'champ.montant':            'Combien voulez-vous placer ?',
    'champ.contratAV':          'Quel type de contrat d\'assurance-vie ?',
    'champ.contratAV.suffixe':  'Si vous ne savez pas, laissez le choix par défaut.',

    /* Les options des deux listes déroulantes n'étaient traduites dans aucun
       mode : elles vivaient dans `questionnaire.js`, comme celles du
       questionnaire, et se surchargent donc de la même façon — par leur rang. */
    'option.enveloppe.0': 'Une assurance-vie',
    'option.enveloppe.1': 'Un PEA',
    'option.enveloppe.2': 'Un compte-titres',
    'option.contratAV.0': 'Contrat en ligne, large choix de supports',
    'option.contratAV.1': 'Contrat classique, choix moyen',
    'option.contratAV.2': 'Contrat de banque, choix limité',

    'option.arbitrages.conseillee': 'Oui, sur proposition de cet outil',

    /* ---------- Questions du profilage ----------
       Les mêmes questions, dites autrement. Le score, les clés techniques et
       l'ordre des options ne changent PAS : seul le vocabulaire change, et
       il ne change que pour qui répond sur son propre argent.

       Une clé `question.<id>` remplace le texte de la question ; une clé
       `question.<id>.aide` ajoute une ligne d'aide SOUS elle. Les deux sont
       absentes du mode conseiller — le professionnel garde son vocabulaire,
       qui est celui de la réglementation, et n'a pas besoin qu'on lui
       explique un taux d'endettement. */

    'question.q_capaciteEpargne': 'Combien pouvez-vous mettre de côté chaque mois ?',
    'question.q_capaciteEpargne.aide':
      'Ce qu\'il reste une fois payées les dépenses courantes — même si vous ne l\'investissez ' +
      'pas. Sert à mesurer le risque que vous pouvez prendre.',

    'question.q_endettement':
      'Quelle part de vos revenus part chaque mois dans des remboursements de crédits ?',
    'question.q_endettement.aide':
      'Additionnez toutes vos mensualités de crédit (immobilier, voiture, conso…) et comparez à ' +
      'vos revenus. 600 € de crédits pour 2 000 € de revenus = 30 %. Aucun crédit = 0 %.',

    'question.q_couple':
      'Qu\'est-ce qui vous correspond le mieux : gagner plus en acceptant des baisses plus ' +
      'fortes en chemin, ou gagner moins mais plus tranquillement ?',
    'question.q_couple.aide':
      'Rendement et risque vont toujours ensemble : viser plus haut, c\'est accepter des baisses ' +
      'temporaires plus fortes. Sur 10 ans, une baisse en route n\'est pas une perte — sauf si ' +
      'vous devez vendre à ce moment-là.',

    'question.q_arbitrage':
      'Acceptez-vous que l\'outil vous propose quelques ajustements par an (vendre un peu d\'un ' +
      'support, renforcer un autre) ?',
    'question.q_arbitrage.aide':
      '2 à 4 propositions par an au maximum. Vous restez libre de les suivre ou non. Si vous ' +
      'préférez ne rien toucher entre deux rééquilibrages, c\'est une réponse tout aussi valable.',

    /* ---------- La passe complète : onze questions de plus ----------
       Même règle que les cinq premières — le texte change, le score jamais.
       Les options se surchargent par leur RANG (`option.<id>.<n>`) : c'est
       ce qui permet de les reformuler sans toucher à `questionnaire.js`, donc
       sans risquer de déplacer un score ou une métadonnée. Le rang est la
       clé ; réordonner les options d'une question casserait la traduction
       AVANT de casser le score, et c'est tant mieux — cela se voit. */

    'question.q_horizon': 'Dans combien de temps risquez-vous d\'avoir besoin de cet argent ?',
    'question.q_horizon.aide':
      'C\'est la question la plus importante du questionnaire. Plus l\'échéance est proche, moins ' +
      'on peut prendre de risque — quelles que soient vos réponses aux autres questions.',

    'option.q_objectif.0': 'Garder mon argent disponible sans risque',
    'option.q_objectif.1': 'Me verser un complément de revenus régulier',
    'option.q_objectif.2': 'Faire grossir mon épargne à moyen terme',
    'option.q_objectif.3': 'Préparer ma retraite',
    'option.q_objectif.4': 'Chercher le rendement le plus élevé possible',
    'option.q_objectif.5': 'Le transmettre un jour',

    'question.q_retrait':
      'Risquez-vous d\'avoir à retirer une grosse partie de cet argent plus tôt que prévu ?',
    'question.q_retrait.aide':
      'Une grosse partie = plus d\'un tiers. Un projet, un imprévu, un achat.',
    'option.q_retrait.0': 'Oui, c\'est sûr, dans les 2 ans',
    'option.q_retrait.1': 'C\'est possible, sans que ce soit prévu',
    'option.q_retrait.2': 'Peu probable',
    'option.q_retrait.3': 'Non, cet argent est mis de côté pour ça',

    'question.q_precaution': 'Combien avez-vous de côté, ailleurs, pour les imprévus ?',
    'question.q_precaution.aide':
      'L\'argent immédiatement disponible sur un livret, hors ce placement. Sans ce matelas, une ' +
      'baisse de marché peut vous forcer à vendre au pire moment.',
    'option.q_precaution.0': 'Rien',
    'option.q_precaution.1': 'Moins de 3 mois de dépenses',
    'option.q_precaution.2': 'De 3 à 6 mois de dépenses',
    'option.q_precaution.3': 'Plus de 6 mois de dépenses',

    'question.q_partpatrimoine': 'Cet argent, c\'est quelle part de toutes vos économies ?',
    'question.q_partpatrimoine.aide':
      'Comptez vos placements et votre épargne — pas votre logement.',

    'question.q_stabilite': 'Vos revenus des 5 prochaines années vous semblent-ils sûrs ?',
    'option.q_stabilite.0': 'Incertains',
    'option.q_stabilite.1': 'Variables (indépendant, commissions, primes)',
    'option.q_stabilite.2': 'Stables',
    'option.q_stabilite.3': 'Stables et revalorisés chaque année (fonction publique, retraite)',

    'question.q_connaissance': 'Vous y connaissez-vous en placements ?',
    'option.q_connaissance.0': 'Pas du tout',
    'option.q_connaissance.1': 'Un peu, j\'en entends parler',
    'option.q_connaissance.2': 'Bien, je suis les marchés régulièrement',
    'option.q_connaissance.3': 'J\'en fais mon métier (finance, gestion)',

    /* Celle-ci pèse 1,5 sur l'axe connaissance, et son jargon fausse le score :
       qui ne reconnaît aucun mot coche « Livrets » par défaut, et se retrouve
       tiré vers un profil prudent qui n'est pas le sien. */
    'question.q_produits': 'Qu\'avez-vous déjà eu comme placements ?',
    'question.q_produits.aide':
      'Cochez le plus risqué que vous ayez détenu, même il y a longtemps.',
    'option.q_produits.0': 'Seulement des livrets et de l\'assurance-vie en fonds euros',
    'option.q_produits.1': 'De l\'immobilier via des parts (SCPI)',
    'option.q_produits.2': 'Des fonds ou des ETF',
    'option.q_produits.3': 'Des actions achetées en direct',
    'option.q_produits.4': 'Des produits à effet de levier ou complexes',

    'question.q_vecu.aide':
      'Ce qu\'on a réellement fait pendant une baisse en dit plus long que ce qu\'on croit qu\'on ' +
      'ferait. Répondez sans vous juger.',

    'question.q_perteMax': 'Quelle baisse pourriez-vous encaisser en un an sans tout arrêter ?',
    'question.q_perteMax.aide':
      'Sur 100 000 €, −20 % veut dire voir 80 000 € sur votre relevé, et attendre.',

    'question.q_volatilite': 'Voir la valeur monter et descendre d\'une semaine à l\'autre, ça vous…',

    /* ---------- La vue « Mon profil » ----------
       Elle disait juste, et le disait au conseiller : SRI, décomposition du
       score, chocs historiques. Rien n'y change de valeur — ni un chiffre,
       ni un calcul, ni un plafond. Seuls les mots changent, et seulement
       ici. */

    /* Le SRI quitte l'en-tête. Il n'est pas retiré de l'application : le
       rapport le porte toujours, et c'est là qu'il est réglementairement
       utile. En tête d'écran, un chiffre de 1 à 7 que rien n'explique ne
       dit rien à personne. */
    'profil.entete': 'Profil {nom} — pensez à garder cet argent placé au moins {ans} ans',

    'profil.axes.titre': 'Ce que vos réponses disent de vous',
    'profil.axe.capacite': 'Ce que vos finances permettent',
    'profil.axe.tolerance': 'Ce que vous êtes prêt à supporter',
    'profil.axe.connaissance': 'Votre expérience des placements',
    'phrase.profil.axes':
      'Votre profil retient le plus prudent des deux premiers : on ne vous expose ni au-delà de ce ' +
      'que vous pouvez perdre, ni au-delà de ce que vous acceptez.',

    'profil.stress.titre': 'Et si une crise arrivait demain ?',
    'stress.0': 'Crise financière (comme en 2008)',
    'stress.1': 'Pandémie (comme en mars 2020)',
    'stress.2': 'Remontée des taux (comme en 2022)',
    'stress.3': 'Tensions géopolitiques',
    'profil.stress.colonne': 'Scénario',

    /* La carte des caractéristiques devient une carte de conséquences. Les
       montants sont calculés dans la vue à partir du montant du dossier ;
       les phrases n'en portent que les trous. */
    'profil.carte.titre': 'Ce que ça implique pour vos {montant}',
    'profil.ligne.amplitude': 'Amplitude normale d\'une année',
    'profil.ligne.amplitude.valeur': 'entre {bas} et {haut}',
    'profil.ligne.amplitude.aide':
      'Environ deux années sur trois restent dans cette fourchette. Une sur trois en sort, dans un ' +
      'sens comme dans l\'autre.',
    'profil.ligne.gain': 'Gain espéré en moyenne',
    'profil.ligne.gain.valeur': '~{montant}/an',
    'profil.ligne.gain.aide': 'Hypothèse de long terme, non garantie.',
    'profil.ligne.mauvaise': 'Une mauvaise année sur vingt',
    'profil.ligne.mauvaise.valeur': '~{montant} ou plus',
    'profil.ligne.krach': 'Dans un krach',
    'profil.ligne.krach.valeur': 'vers {montant}, avant de se reconstruire',
    'profil.ligne.horizon': 'À ne pas toucher avant',
    'profil.ligne.esg': 'Placements responsables',
    'profil.ligne.gestion': 'Ajustements en cours de route',
    'profil.esg.aucune': 'non',
    'profil.esg.souhaitee': 'oui',
    'profil.esg.prioritaire': 'oui, en priorité',
    'profil.gestion.passive': 'non',
    'profil.gestion.conseillee': 'acceptés',
    'profil.gestion.active': 'acceptés, y compris importants',

    /* ---------- La vue « Mon allocation » ----------
       Trois taux deviennent trois montants, et le SRI quitte encore une
       carte. Les calculs sont les mêmes : c'est la vue qui multiplie par le
       montant du dossier, comme dans « Mon profil ». */
    'alloc.kpi.gain': 'Gain espéré en moyenne',
    'alloc.kpi.gain.detail': '~{gain}/an sur {montant} (long terme, non garanti)',
    'alloc.kpi.amplitude': 'Amplitude d\'une année ordinaire',
    'alloc.kpi.amplitude.detail': 'vos {montant} peuvent osciller d\'environ ±{ecart}',
    'alloc.barres.titre': 'Votre répartition, et la cible',
    'alloc.barres.cible': '(cible {pct})',
    'alloc.barres.note':
      'Le repère vertical marque votre répartition de base. Les ajustements de contexte sont ' +
      'limités à ±{points} points sur les actions.',
    'alloc.colonne.strategique': 'Base',
    'alloc.colonne.tactique': 'Ajustée',

    /* ---------- La vue « Mes supports » ----------
       Le bandeau des supports non validés a TROIS versions, parce que la
       chose à vérifier n'est pas la même selon l'enveloppe. En assurance-vie,
       le contrat de l'assureur décide de ce qui est accessible : la liste se
       colle et se rapproche. En PEA et en compte-titres, il n'y a pas de
       contrat de ce genre — c'est le courtier qui référence, et la question
       est de savoir si l'ETF est négociable. Aucune de ces deux dernières ne
       doit parler de « remise au client » : il n'y a pas de client. */
    'supports.contrat.AV.titre': '{n} supports à vérifier dans votre contrat.',
    'supports.contrat.AV':
      'Leurs caractéristiques ont été relevées sur une source publique, mais il reste à vérifier ' +
      'qu\'ils y sont bien proposés : collez la liste des supports de votre contrat pour vérifier ' +
      'qu\'ils y sont référencés.',
    'supports.contrat.PEA.titre': '{n} supports à vérifier chez votre courtier :',
    'supports.contrat.PEA':
      'assurez-vous qu\'ils sont bien négociables sur votre PEA avant de passer les ordres.',
    'supports.contrat.CTO.titre': '{n} supports à vérifier chez votre courtier :',
    'supports.contrat.CTO':
      'assurez-vous qu\'ils sont bien négociables sur votre compte-titres avant de passer les ordres.',
    'supports.contrat.bouton': 'Ouvrir la liste des supports',

    'phrase.supports.derive': 'Ce qu\'on peut construire s\'écarte de la cible.',
    'phrase.supports.derive.fin': 'Vérifiez que ça vous convient toujours.',

    'phrase.supports.residuel':
      '{montant} ne sont pas placés : la liste d\'ETF actuelle ne couvre pas ces catégories. ' +
      'Élargissez l\'univers de sélection (dans « {enveloppe} ») ou ajoutez des ETF.',

    /* Quand la part non investie n'est pas un trou de la liste d'ETF mais une
       IMPOSSIBILITÉ de l'enveloppe, la phrase change de nature : il n'y a
       rien à élargir, et suggérer un réglage envoie chercher une solution qui
       n'existe pas. */
    'phrase.supports.residuel.pea':
      '{montant} ne sont pas placés. Un PEA ne peut pas détenir d\'obligations, d\'or ni de ' +
      'matières premières — ces {pct} demandent une autre enveloppe (assurance-vie, compte-titres) ' +
      'ou restent en épargne sécurisée à côté.',

        'supports.catalogue.bouton': 'Chercher dans le catalogue complet',
    'supports.catalogue.confirmation':
      'Le catalogue est plus large mais non vérifié ligne à ligne, contrairement à l\'univers de ' +
      'travail. Les supports retenus porteront « à vérifier ».\n\nBasculer sur le catalogue complet ?',
    'supports.catalogue.inutile':
      'Le catalogue complet ne changerait presque rien ici : sur ses 4 530 supports, 35 sont ' +
      'éligibles au PEA, et aucun n\'est obligataire, sur l\'or ou sur les matières premières.',

        'supports.adaptations.titre': 'Ce que l\'outil a dû adapter.',
    'supports.adaptations.ligne': '« {poche} » : pas d\'ETF dans la liste actuelle — {montant} restent à placer vous-même.',

    'supports.kpi.frais': 'Frais moyens de vos ETF',
    'supports.kpi.frais.detail': 'soit ~{montant}/an',

    /* ---------- La vue « Mes arbitrages » ---------- */
    'arbitrages.detenu': 'Ce que vous détenez aujourd\'hui',
    'arbitrages.coller': 'Coller un relevé',
    'arbitrages.kpi.rotation': 'Part du portefeuille déplacée',
    'arbitrages.kpi.rotation.detail': 'des mouvements proposés',
    'arbitrages.kpi.impot': 'Impôt sur ces mouvements',
    'arbitrages.kpi.impot.detail':
      'dans un {enveloppe}, vendre et acheter ne déclenche pas d\'impôt tant que vous ne retirez pas',
    'arbitrages.kpi.encours': 'Portefeuille après mouvements',
    'arbitrages.hors.titre': '{n} lignes s\'éloignent trop de la cible',
    'arbitrages.hors.seuil': '(seuil : {montant}, soit {pct} du portefeuille)',
    'arbitrages.classes.titre': 'Où vous êtes, où est la cible',
    'arbitrages.ordres.titre': 'Mouvements proposés',
    'arbitrages.motif.sur': 'au-dessus de la cible',
    'arbitrages.motif.sous': 'en dessous de la cible',
    'arbitrages.bouton.journal': 'Enregistrer cette revue dans mon suivi',
    'arbitrages.intro.titre': 'Voici les arbitrages proposés',
    'arbitrages.intro.texte':
      'Rien n\'est passé automatiquement : ces mouvements sont une proposition, à vous de les valider.',
    'arbitrages.bouton.confirmer': 'Confirmer ces arbitrages',
    'arbitrages.bouton.appliquer': 'Simuler sans confirmer',
    'arbitrages.confirmation':
      'Confirmer {n} mouvements ? Votre portefeuille sera mis à jour et la revue enregistrée.',
    'arbitrages.confirme':
      'Arbitrages du {date} confirmés — {n} mouvements appliqués.',
    'arbitrages.annuler': 'Annuler cette confirmation',
    'arbitrages.annule': 'Confirmation annulée — votre portefeuille est revenu à son état précédent.',

    /* ---------- La vue « Backtest » ---------- */
    'backtest.kpi.cumul': 'Gain total sur la période',
    'backtest.kpi.paran': 'En moyenne par an',
    /* Le détail disait « annualisée », qui répète le libellé sans rien
       ajouter. Vide, la tuile ne dit plus qu'une chose — et c'est assez. */
    'backtest.kpi.paran.detail': '',
    'backtest.kpi.volatilite': 'Amplitude des variations',
    'backtest.kpi.volatilite.detail': 'd\'une année à l\'autre',
    'backtest.kpi.baisse': 'Pire passage',
    'backtest.kpi.baisse.detail':
      'mesuré de fin d\'année à fin d\'année — en cours d\'année, ça a baissé davantage',
    'backtest.comparaison.intro': 'Votre profil, comparé aux autres et à des repères simples.',
    'phrase.backtest.estime':
      'Plus de la moitié de ces performances sont des estimations, pas des mesures. Ce test montre ' +
      'comment le modèle se comporte ; ce n\'est ni une performance réelle ni une promesse.',
    'backtest.series.repli': 'Voir ou modifier les données du test',

        'phrase.supports.choix':
      'Comment ils ont été choisis : note Morningstar, frais, taille, réplication, label ISR — parmi ' +
      'les ETF à {etoiles} étoiles et plus, {encours} M€ d\'encours minimum, {frais} de frais maximum.',

        'profil.plafond.titre': 'Profil plafonné.',
    'phrase.profil.plafond':
      'Vos réponses pointaient vers un profil plus offensif ({theorique}), mais vous avez posé une ' +
      'limite — le profil {retenu} la respecte :',

    'question.q_esg':
      'Souhaitez-vous privilégier des placements responsables (environnement, social) ?',
    'question.q_esg.aide':
      'Si oui, l\'outil privilégiera des ETF qui excluent ou limitent certains secteurs ' +
      '(énergies fossiles, armement…) selon des critères dits ESG. Cela peut restreindre le ' +
      'choix et légèrement modifier la performance, dans un sens comme dans l\'autre.',

    'rapport.ligne.client':     'Dossier',
    'rapport.ligne.identite':   'Nom',

    'phrase.accroche.longue':
      '<strong>myetf construit et suit votre allocation d\'ETF</strong> — du questionnaire de ' +
      'profilage aux ordres à passer, en assurance-vie, PEA ou compte-titres. Il ne délivre aucun ' +
      'conseil : les décisions sont les vôtres.',
    'phrase.accroche.courte':
      '<strong>Votre allocation d\'ETF</strong> — vos décisions, votre suivi.',
    'sousTitre.allocation':
      'Votre répartition, poche par poche — et les ajustements appliqués.',

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
