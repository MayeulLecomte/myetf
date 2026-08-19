# Décisions arrêtées

Ce fichier consigne les arbitrages **déjà tranchés**. Ils ne sont pas à
redemander : s'y référer et appliquer.

## Navigation — quatre blocs, plus les données

Quatre blocs de premier niveau, dans cet ordre :

**Aujourd'hui** · **Profil** · **Allocation** · **Suivi**

**Données** est un cinquième ensemble, **visuellement secondaire** : ni la même
taille, ni le même poids, ni la même place que les quatre autres. L'univers ETF
y vit, et reste atteignable depuis « Sélection des supports ».

Répartition :

| Bloc | Vues |
|---|---|
| Aujourd'hui | accueil |
| Profil | client, questionnaire, profil |
| Allocation | note, macro, allocation, portefeuille, arbitrages, backtest |
| Suivi | situation, revenus, journal, rapport |
| Données *(secondaire)* | univers, methode |

## Note de marché et contexte macro — deux sous-vues d'un même bloc

Ils ne fusionnent pas en une seule page : ce sont **deux sous-vues** du bloc
Allocation, l'une **générée**, l'autre **saisie**, et cette différence de nature
doit rester lisible.

- **« Note du jour »** — rédigée par `scripts/note-marche.mjs`, en lecture seule.
- **« Contexte »** — les indicateurs que le conseiller renseigne lui-même.

`#note` **doit continuer de pointer sur la note**. Le widget iOS
(`scriptable/allocation-etf.js`) ouvre l'application dessus : le casser rendrait
le widget muet sans qu'aucun test ne le signale.

## Pas de numéros d'onglet — nulle part

Les numéros globaux 1 à 14 sont supprimés, et **aucune numérotation locale ne les
remplace**. L'avancement se lit sur trois états :

| État | Signification |
|---|---|
| **complété** | l'étape est faite |
| **en cours** | entamée, pas finie |
| **à faire** | rien de saisi |

**Tout message en dur cite le NOM de l'étape et porte un lien direct vers elle,
jamais un numéro.** « Complétez le questionnaire (onglet 2) » est proscrit ;
« Reprendre le questionnaire », avec le bouton qui y mène, est la forme attendue.

Une exception, qui n'en est pas une : **le rapport client garde sa numérotation
de sections** (`1. Situation de départ`, `2. Détermination du profil`…). C'est la
structure d'un document imprimé, pas une adresse dans l'interface — elle est
calculée à l'assemblage et n'a aucun rapport avec les onglets.

## Un contexte non renseigné n'applique aucune déviation

`agregerMacro({})` rend des probabilités de repli qui pèsent **66,7 % sur
l'atterrissage en douceur**. Tant qu'aucun indicateur de contexte n'est choisi —
et qu'aucune probabilité n'est forcée à la main —, ces valeurs **n'entrent dans
aucun calcul** :

- `intensiteEffective()` vaut 0, donc l'allocation cible est **strictement
  l'allocation stratégique du profil** ;
- `macroCourante().dominant` vaut **null** : aucune vue ne nomme de scénario
  dominant, et le journal n'en enregistre pas ;
- le backtest rend la même allocation en mode « tactique » et « stratégique » ;
- les écarts d'arbitrage sont mesurés contre la stratégique.

L'allocation stratégique seule est une réponse complète, pas un pis-aller : la
vue s'affiche normalement et dit simplement qu'aucune vue de marché n'y est
mêlée.

Consigné dans la vue **Méthode & limites**, section 2, et dans l'**annexe
« Méthode »** du rapport client — qui dit explicitement, quand c'est le cas,
qu'aucune déviation n'est appliquée dans le document remis.

## Ce qui ne doit jamais casser

- **Les ancres `#…`** de toutes les vues. Elles servent de routage
  (`location.hash` au démarrage) et sont consommées de l'extérieur.
- **`#note` et `#accueil`** en particulier — le widget iOS les ouvre.
- **Les moteurs** (`js/engine/`) et leurs 192 assertions : `node test/runner.js`.
- **Le rendu**, la persistance, l'import/export : `test/fumee.html`, qui a besoin
  d'un serveur. Il **rejoue son parcours une fois par mode** : un mode qui
  masque des vues et renomme les libellés casse sans bruit.
- **L'équivalence des deux modes** : sans contexte, le même dossier doit rendre
  la même allocation cible en conseiller et en particulier. C'est la garde du
  principe « un seul moteur ». Le jour où ce contrôle échoue, c'est qu'un
  `if (mode)` s'est glissé autour d'un chiffre.

Lancer les deux harnais **avant et après** tout remaniement d'interface, et
comparer — pas seulement constater qu'ils passent à la fin.

- **Aucune vue ne doit déborder horizontalement sur téléphone.** Les deux
  harnais ne le voient pas : ils vérifient qu'une vue se rend, pas qu'elle
  tient dans la largeur. Le contrôle se fait à la main —
  `document.documentElement.scrollWidth` doit valoir `clientWidth`, sur les
  seize vues, dans les deux modes, sur un dossier vide puis complet.

  Deux causes, et une seule est celle qu'on soupçonne. La seconde surtout :
  **un enfant de grille ou de flex vaut `min-width: auto`** et refuse de
  descendre sous la largeur de son contenu. Un `.tableau-defilant` en colonne
  de grille ne défilait donc jamais — c'est la colonne qui grandissait, et la
  page entière avec elle : 901 px de document pour 390 px d'écran sur « Mes
  placements ». Le conteneur de défilement ne sert à rien tant que son parent
  peut grandir à sa place. D'où `.grille > * { min-width: 0 }`.

  L'autre cause est banale : **un `<table>` sans `.tableau-defilant` autour**.
  Quatre en portaient la trace, dans le rapport et le backtest.

- **Une media query n'ajoute aucune spécificité.** `.filtres .champ` déclaré
  après un `@media (max-width: 640px)` qui touche le même sélecteur gagne, et
  la règle mobile est muette sans que rien ne le signale. Placer la surcharge
  APRÈS ce qu'elle surcharge, pas dans le bloc de media query le plus proche
  du haut du fichier.

## Registre visuel — trait bleu

Blanc et bleu, cartes filetées, illustrations au trait noir. Le registre
« verre » d'avant — surfaces dépolies sur halo, dégradés vifs, SF Pro Rounded —
**n'existe plus**.

### Les jetons

Tout vit dans **`css/tokens.css`**, chargé AVANT `css/app.css`. Les composants
n'écrivent plus une couleur en dur.

| | |
|---|---|
| Fond | `#F7F9FC` |
| Cartes | `#FFFFFF` |
| Filets | `#DFE5F0` |
| Texte | `#15161A` · secondaire `#6B6E76` |
| Accent | `#2F6BFF` · clair `#8FB3FF` · pâle `#E6EEFF` · liens `#1E4FCC` |

**Le bleu est la seule couleur.** Pas de vert ni de rouge pour les
performances : `.positif` et `.negatif` sont à l'encre, et c'est le signe qui
dit le sens — douze pour cent d'hommes distinguent mal ces deux teintes-là. Les
noms hérités d'une palette à sept couleurs (`--vert`, `--rouge`, `--orange`,
`--or`, `--indigo`, `--violet`) pointent tous vers l'encre ou le bleu : rien ne
peut ressortir en vert par mégarde.

Une seule entorse, prévue : les **graphiques** ont quatre teintes, dont l'encre
`#15161A` en quatrième.

### Typographie

**Manrope**, titres en 800, texte en 400/600, chiffres en `tabular-nums`.

**Elle est servie depuis `css/polices/`, pas depuis Google Fonts.**
L'application s'ouvre par double-clic : une police appelée sur le réseau aurait
marché en ligne et serait retombée sur la police système à l'ouverture locale,
sans que rien ne le signale. Deux sous-ensembles latins, 40 Ko.

### Pas de mode sombre

La direction donne une palette exacte, et une seule. En inventer une seconde
produirait un hybride que personne n'a validé. `color-scheme: light` le dit au
navigateur. **À rouvrir un jour comme une palette à arrêter, pas comme une
bascule à rétablir.**

### Le trait sous un mot du titre

Le **dernier** mot de chaque titre porte un trait bleu, posé par
`titreSouligne()` — un seul endroit pour quinze titres.

C'est un `text-decoration: underline` avec `skip-ink`, **pas** le dégradé de
fond de la maquette. Deux essais l'ont montré : à 62 % de la hauteur de ligne la
bande mord le bas des lettres, à 78 % elle traverse encore les jambages du p, du
g et du q, et le premier d'entre eux laisse un moignon bleu devant le mot. Seul
`skip-ink` contourne les descendantes.

### Les illustrations

Huit dessins au trait dans `img/`, fond transparent, 320 px de côté.

| Dessin | Où |
|---|---|
| `logo` | en-tête (28 px) · écran d'entrée et accueil particulier |
| `cafe` | bannière d'accueil, mode conseiller |
| `boussole` | note du jour, contexte · bandeau « allocation stratégique seule » (44 px) |
| `balance` | allocation cible |
| `fiches` | sélection des supports, univers ETF |
| `carnet` | journal · état vide du questionnaire |
| `port` | état vide du suivi |
| `longue-vue` | backtest, méthode & limites |

**Deux tailles, et deux seulement**, tenues par `TAILLE_ILLUSTRATION_TITRE`
(38 px) et `TAILLE_ILLUSTRATION_BANNIERE` (180 px) dans `js/ui/socle.js`. Elles
vivaient en cinq littéraux dispersés — 30, 140, 150, 160 — et la règle « même
taille partout » ne se lisait dans aucun fichier. Une troisième existe, à part :
les 44 px du bandeau d'avis, une vignette de marge et non une illustration de
tête. `.banniere .illustration` en CSS répète la seconde et doit rester d'accord
avec elle : le style en ligne posé par `illustration()` la couvre, un 150 oublié
là ne se verrait donc que le jour où ce style disparaîtrait.

**Le dessin d'accueil ne paraît que sur un dossier neuf.** `ouvertureAccueil()`
retombe sur la seule accroche courte dès que `dossierEntame()`, et la branche
« Aujourd'hui » du dossier complet ne l'appelle pas du tout. L'accueil d'un
dossier en cours n'a donc aucun dessin, et c'est voulu — vu tous les jours, il
cesserait d'être vu. Ne pas le relire comme une illustration manquante.

**Le dessin et l'accroche vont ensemble**, dans `.ouverture` : dessin à gauche,
mots à droite, empilés sur téléphone où le dessin retombe à 132 px. Posés l'un
sous l'autre comme ils l'étaient, le dessin restait seul à gauche d'une
demi-page vide, entre une accroche et un titre qu'il n'introduisait ni l'une ni
l'autre.

**Trois règles, à ne pas relâcher :** un seul dessin par carte · jamais dans un
tableau · jamais sur le papier. Les têtes de vue sont posées par
`ILLUSTRATIONS_VUES` dans `js/ui/socle.js` ; une vue absente de cette table n'a
pas de dessin, et c'est mieux qu'un dessin qui ne dit rien.

`alt` vide et `aria-hidden` : ce sont des ornements, et le titre dit déjà ce
qu'ils disent.

### Le rapport imprimé échappe à tout cela

Encre noire sur papier blanc. **Le bleu n'y survit qu'en filet** — pas d'aplat,
pas d'ombre, pas d'illustration, pas de trait sous les titres. Un aplat coûte de
l'encre, se photocopie mal, et un document remis à un client ne gagne rien à
être colorié.

Une exception : en mode particulier, l'avertissement « ne constitue pas un
conseil » est **encadré de noir et plus gros que les mentions** (13,5 px contre
12). C'est la seule chose du document qu'on ne doit pas pouvoir survoler.

## L'empreinte de référence

**`8826d079` · 1 303 829 octets · 68 empreintes**, relevée avec
`test/empreinte.html` après les correctifs de mise en page mobile. Les
+216 octets sur l'empreinte précédente sont les balises ajoutées : quatre
`.tableau-defilant` et les deux colonnes de `.ouverture`.

Repère intermédiaire, utile comme étalon : `3491397b`, **1 303 613 octets** —
l'agrandissement des dessins (30 → 38, 140/150/160 → 180) avait changé
l'empreinte **sans changer d'un octet** le total, puisqu'il ne substituait que
des chiffres. Un total inchangé et une empreinte différente : la signature
d'une substitution pure. Un total qui bouge veut dire que du balisage est
apparu, et il faut alors savoir lequel.

Elle contient des dates du jour : elle **se relève avant, se compare après**, le
même jour et sur le même catalogue. Ce n'est pas un fichier à versionner.

Quand elle doit bouger — un balisage ajouté —, **mesurer l'écart plutôt que
l'accepter** : au chantier 9, le trait des titres valait exactement +30 octets
sur 64 vues et 0 sur les colonnes de navigation ; les illustrations, 52 images
pour 6 662 octets, et les 20 vues sans dessin n'ont pas bougé d'un octet.

## La liste de contrôle avant impression ne bloque rien

Quatre lignes rassemblées en tête du rapport — référencement des supports au
contrat, vue de marché appliquée, part estimée des séries du backtest, nom du
dossier. Chacune existait déjà ailleurs dans l'application ; aucune ne se
présentait au moment où le document cesse d'être un écran de travail pour
devenir une pièce remise et signée.

**Elle n'empêche jamais d'imprimer, et ce n'est pas un oubli.** Un outil qui
refuse d'imprimer se contourne, et le conseiller reste seul juge de ce qu'il
remet. C'est une relecture, pas un garde-fou.

Deux des quatre lignes ne sont pas des défauts mais des points **à confirmer** :
un contexte non renseigné produit une allocation stratégique, qui est une
réponse complète ; et le backtest ne figure pas au rapport — sa part estimée
porte sur ce qui a servi à se convaincre, pas sur ce qui est remis.

**Une case cochée retient l'état exact qu'elle a validé**, pas un simple oui.
Si cet état change — un support de plus, un contexte saisi, un nom corrigé —,
la coche tombe d'elle-même. Une relecture porte sur ce qui a été relu.

## L'ordre du parcours n'a qu'une seule définition

Les treize vues du parcours portent une barre « ← précédent / suivant → » posée
par `poserBarresParcours()`, et l'ordre est déduit de `GROUPES` — la même
constante qui alimente la navigation. Les six barres écrites à la main dans
`index.html` avaient déjà divergé de l'ordre affiché : « Profil de risque »
enchaînait sur le contexte macro en sautant la note du jour, qui le précède
pourtant dans son bloc. **Ne pas réintroduire de bouton de navigation en dur
dans une vue du parcours** : il se désaccordera.

## Deux modes de lecture, le temps de trancher

L'application se lit de deux façons — **conseiller** (un dossier construit pour
un client) et **particulier** (le sien). C'est une **phase de test** : l'un des
deux sera vraisemblablement retiré, et rien ne doit rendre ce retrait coûteux.

**Un seul code, un seul moteur, un seul format de dossier.** Le mode est un
réglage du dossier — `Etat.mode`, exporté avec lui — et **aucun calcul ne lui
est propre**. S'il faut un jour écrire `if (Etat.mode === …)` autour d'un
chiffre, c'est que la frontière a été mal posée.

Ce que le mode change, et rien d'autre : **les vues visibles**, **le
vocabulaire**, et **le rapport**.

Le vocabulaire vit dans `js/data/libelles.js`, en deux tables qui ne sont pas
jumelles :

| Table | Contenu |
|---|---|
| `defaut` | le vocabulaire du conseiller, mot pour mot ce qui était écrit dans les pages |
| `particulier` | **uniquement ce que le mode change** |

`particulier` se lit donc comme la définition du mode. Le jour où l'un des deux
l'emporte : on supprime un littéral, ou l'on replie ses écarts dans les
défauts. `T('cle')` retombe toujours sur le défaut — une clé oubliée rend le
mot du conseiller, jamais un blanc.

Deux régimes d'échappement, à ne pas confondre : les clés `phrase.*` sont des
fragments **HTML**, insérés tels quels ; tout le reste est du texte simple,
**échappé au point d'usage**.

**Un dossier sans champ `mode` s'ouvre en conseiller.** L'écran d'entrée ne
paraît que sur un dossier vierge dont le mode n'est pas choisi — un dossier
existant est forcément entamé, il ne le voit jamais.

**Une ancre résout toujours et ouvre sa vue, même masquée en navigation.**
Masquer porte sur la navigation, pas sur le routage : `#note` doit continuer
d'ouvrir la note en mode particulier, sans quoi le widget iOS deviendrait muet
sans qu'aucun test ne le signale.

**En mode particulier, l'avertissement grossit.** Adéquation et signatures
disparaissent du rapport, mais « ne constitue pas un conseil en
investissement » passe **en tête du document**, pas seulement en annexe : il
n'y a plus de professionnel entre l'outil et celui qui décide. C'est le seul
endroit où le mode particulier est plus exigeant que l'autre.

## Le rapport ne montre pas de scénarios que personne n'a choisis

Section « Lecture du contexte de marché ». Sans contexte saisi,
`macroCourante()` rend les probabilités de repli — 66,7 % sur l'atterrissage
en douceur — et le rapport les imprimait sous le titre « Distribution de
scénarios retenue ». C'était la dernière fuite des probabilités par défaut, et
la plus grave : les autres se lisaient à l'écran, celle-ci partait dans le
document remis et signé.

**Sans contexte, il n'y a pas de tableau : il y a une phrase qui dit qu'il n'y
en a pas.** Le tableau revient dès qu'un indicateur est renseigné.

## Où vit quoi

`js/app.js` portait 4 894 lignes et 151 déclarations. Il est réparti en neuf
fichiers, **chargés dans cet ordre** :

| Fichier | Ce qu'il porte |
|---|---|
| `js/ui/socle.js` | l'état, la persistance, les formats, les petits dessins |
| `js/ui/dossier.js` | ce que le dossier **vaut** — profil, allocation, sélection, suivi. Aucun HTML |
| `js/ui/navigation.js` | blocs, colonne, ruban, barre basse, parcours, aiguillage, feuille |
| `js/ui/vues-profil.js` | accueil et bloc Profil |
| `js/ui/vues-allocation.js` | note, contexte, allocation, sélection, arbitrages, backtest |
| `js/ui/vues-suivi.js` | situation, revenus, journal |
| `js/ui/catalogue.js` | catalogue, rapprochement, entonnoir, fiche d'un support |
| `js/ui/rapport.js` | rapport, méthode, annexe, contrôles avant impression |
| `js/ui/entrees.js` | gestionnaires, import/export, version |
| `js/app.js` | **l'amorçage, et rien d'autre** — chargé en dernier |

**L'ordre compte.** Les `const` de premier niveau ne sont pas hissés : tout ce
que l'amorçage appelle doit être déclaré avant lui. `app.js` reste donc le
dernier fichier chargé, et n'importe quel fichier neuf se glisse **avant** lui.

**Les modules ES sont exclus**, et pas par préférence : l'application s'ouvre
par double-clic (`OUVRIR-L-APPLICATION.txt`), et `<script type="module">` est
bloqué par CORS en `file://`. Le cloisonnement, s'il vient un jour, prendra la
forme d'une IIFE par fichier exposant un objet — le patron des moteurs.

## Un seul espace de noms, et il est plein

L'application n'a pas de modules : tout ce que déclarent `js/app.js` et
`js/data/*.js` vit dans la même portée, et **la dernière déclaration d'un nom
écrase silencieusement les précédentes**. Trois collisions en une seule séance :

| Nom | Ce qu'il désignait déjà | Ce qui a cassé |
|---|---|---|
| `.aide` | les textes d'aide du questionnaire et de la macro | six phrases pliées dans un carré de 14 px |
| `statut` | la provenance du cours d'une ligne de situation | évité de justesse, d'où `possession` |
| `ligneCatalogue` | le rendu d'une ligne de la liste de recherche | une fiche qui lisait du HTML comme un tableau |

Aucune n'a levé d'erreur. **`node test/runner.js` les arrête maintenant** : il
lit le SOURCE des **dix-sept** fichiers globaux et refuse un nom déclaré deux
fois — à l'exécution il n'en resterait qu'un, seul le texte le montre.

Avant de nommer une fonction ou une classe CSS, **chercher le nom dans le
dépôt**. Il y est peut-être déjà.

## Après un rebase avec conflit, relire le diff ENTIER

Un relevé de cours automatique tourne du mardi au samedi et touche
`index.html` pour y porter le marqueur de version. Tout travail en cours
entre donc en conflit avec lui, sur ces lignes-là.

**`git checkout --ours <fichier>` pendant un rebase reprend le fichier de la
branche d'accueil EN ENTIER** — pas seulement la zone marquée. Résoudre ainsi
un conflit portant sur trois lignes de version a silencieusement rendu au
fichier un bouton supprimé quinze minutes plus tôt. Rien ne l'a signalé : ni
git, ni les harnais, qui ne savent pas qu'un bouton devait disparaître.

**Après tout rebase avec conflit : relire `git diff` du commit entier, fichier
par fichier**, et vérifier que chaque changement voulu y est encore. Les zones
en conflit ne sont pas les seules à bouger.

## La valorisation de repli n'invente pas de cours

Le catalogue porte une dernière clôture pour 4 525 supports. Elle ne sert de
valorisation que sous **deux conditions, tenues dans le moteur** et non dans
la vue :

- **en euros**. 1 106 clôtures du catalogue sont dans une autre devise, dont
  166 en **pence** — un support y cote 29 527 GBX, soit 87 fois sa valeur en
  euros. Convertir demanderait un taux de change que l'application n'a pas.
- **de moins de 45 jours**. Le catalogue est relevé à la main : celui du
  19 août 2026 porte des clôtures de décembre 2022.

Un refus n'est pas une erreur : il est **rendu** (`deviseAutre`, `tropAncien`)
pour que la vue dise pourquoi la ligne n'est pas valorisée. La ligne garde son
montant saisi et la situation cesse d'être annoncée fiable.

`cotation()` applique **la même règle, par le même code** : deux garde-fous
finiraient par diverger.

## Les témoins visuels, filet du style

Une feuille de style n'a pas de compilateur, et rien n'y signale qu'une règle
en écrase une autre. Un audit du **texte** de la feuille ne sert à rien ici :
les classes sont assemblées à l'exécution, et une lecture statique rend une
trentaine de faux positifs.

Ce qui se vérifie, c'est le **résultat**. `test/fumee.html` mesure dix éléments
témoins dans le navigateur — entrée du ruban, carte, bouton, anneau de poche,
badge, tableau, nom de support cliquable, indicateur, texte d'aide, ligne de
contrôle — plus la barre basse. Chacun porte une propriété qui doit tenir quoi
qu'on fasse au style : **un anneau reste rond, un bouton reste cliquable, un
badge reste une pastille.**

Ce sont des **planchers, pas des maquettes** : un remaniement de style doit
pouvoir tout redessiner sans les faire tomber. Si un témoin gêne une intention
de dessin légitime, c'est le témoin qu'on rediscute — mais on le rediscute,
on ne le supprime pas en passant.

**Le cadre du harnais fait 430 px : les témoins sont mesurés en mise en page
TÉLÉPHONE.** La colonne latérale y est en `display:none` — la mesurer n'a pas
de sens, c'est le ruban qui navigue.

## Pistes — reportées, pas abandonnées

État au terme du chantier 9. Rien de tout cela n'est engagé ; l'ordre viendra
de la revue en cours avec un CGP.

| Piste | Ce qui reste à faire |
|---|---|
| **Temps 2 du rangement — cloisonnement** | le déménagement d'`app.js` en neuf fichiers est fait ; reste à passer chacun en IIFE exposant un objet, comme les moteurs. **Les modules ES sont exclus** : l'application s'ouvre par double-clic. Le gain est réel mais le diff touche chaque appel entre fichiers — à ne lancer qu'avec l'empreinte et l'inventaire en main |
| **Taux de change** | **1 106 clôtures du catalogue** sont hors zone euro, dont 166 en pence. La valorisation de repli les refuse, faute de taux. Y remédier veut dire une source de change de plus, quotidienne, et son garde-fou |
| **Univers ETF dégrossi** | 3 482 mots et 42 lignes de tableau sur une vue, trois cartes empilées. Un premier visiteur n'y comprend pas ce qu'on attend de lui. La ligne d'entonnoir a réglé la question « sur quoi choisit-il ? », pas celle du volume |
| **Note du jour en vitrine** | le seul écran immédiatement lisible sans dossier, rangé derrière deux niveaux de navigation. En mode particulier elle est carrément masquée |
| **Position des actions (A/B/C/D)** | **à trancher après la revue.** Les quatre options ne sont pas encore écrites : les consigner ici dès qu'elles le seront, avec ce qui les départage |
| **Favicon et icônes d'écran d'accueil** | l'en-tête porte la pousse depuis le chantier 9, mais `icone-180/192/512.png` et le favicon portent **encore les trois barres** de l'ancien signe. Deux dessins pour une même application. `scripts/icones.py` les régénère depuis une géométrie SVG qui n'existe plus |
| **Indicateurs macro prioritaires** | onze indicateurs présentés à plat ; il manque « les trois qui pèsent le plus », faute de quoi aucun n'est rempli — donc aucune déviation. Ne concerne que le mode conseiller |
| **Mode sombre** | retiré au chantier 9, faute d'une seconde palette arrêtée. À rouvrir comme une palette à définir, pas comme une bascule à rétablir |
