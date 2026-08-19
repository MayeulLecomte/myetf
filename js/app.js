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
