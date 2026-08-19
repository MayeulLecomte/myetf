/* =============================================================
   AMORÇAGE
   -------------------------------------------------------------
   Le point d'entrée, et rien d'autre. Chargé en dernier, après
   les neuf fichiers de js/ui/ : tout ce qu'il appelle existe
   quand il s'exécute.

   Il vivait auparavant à la fin de js/app.js, qui portait
   l'application entière. Le déménagement l'a d'abord emporté
   avec la dernière déclaration de entrees.js — l'amorçage n'en
   est pas une, et la règle de tranche ne savait pas s'arrêter.
   Il est ici, seul, parce que c'est ici qu'on le cherche.
   ============================================================= */

(function init() {
  /* ------------------------------------------------------------
     LE RECHARGEMENT REPART DU HAUT
     ------------------------------------------------------------
     `afficher()` remonte pourtant la page à chaque ouverture de vue.
     Mais le navigateur REND la position d'avant après le chargement,
     et il le fait APRÈS l'amorçage : son geste écrase le nôtre, et
     l'on rouvrait l'application au milieu d'une tuile.

     `scrollRestoration = 'manual'` lui retire cette charge. Le
     rappel sur `load` couvre le cas où la restauration est déjà
     programmée quand cette ligne s'exécute — Safari sur iPhone la
     pose tôt, et c'est là qu'on la voyait le plus.

     Une application qui s'ouvre sur « Aujourd'hui » doit s'ouvrir sur
     le haut d'Aujourd'hui : la position d'hier n'a aucun sens sur une
     vue dont le contenu a changé depuis. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('load', () => window.scrollTo(0, 0));

  verifierVersion();
  const restaure = charger();
  const remplacees = injecterCoursMarche();
  IDENTITE.forEach(f => {
    if (Etat.identite[f.id] === undefined && f.defaut !== undefined) Etat.identite[f.id] = f.defaut;
  });
  brancher();

  /* Après `brancher()`, qui a besoin de `Etat` chargé : l'écran
     d'ouverture ne paraît que sur un dossier vierge. */
  poserEcranOuverture();

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
