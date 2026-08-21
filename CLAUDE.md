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

**La note du jour peut PROPOSER des lectures d'indicateurs, et cela ne
change rien à ce qui précède** : une proposition affichée n'est pas un
indicateur renseigné. Tant que le conseiller n'a pas cliqué, les trois
égalités ci-dessus tiennent. Voir « La note PROPOSE des lectures macro ;
elle n'en applique aucune ».

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

## Registre visuel — pastel bulles

Fond lavande très clair, cartes blanches très arrondies qui se détachent par
leur **ombre** et non par un filet, accent violet, boutons en pilule, et quatre
pastels francs pour les classes d'actifs. Le registre « trait bleu » d'avant —
blanc et bleu, cartes filetées — **n'existe plus**.

### Les jetons

Tout vit dans **`css/tokens.css`**, chargé AVANT `css/app.css`. Les composants
n'écrivent plus une couleur en dur — c'est ce qui a permis de repeindre la
palette entière sans toucher une seule vue.

| | |
|---|---|
| Fond | `#F3F2FE` (lavande) |
| Cartes | `#FFFFFF`, rayon 28 px, sans filet, ombre lavande |
| Filets | `#E9E7FB` · fort `#D6D2F5` |
| Texte | `#1B1B2F` · secondaire `#6E6B8A` |
| Accent | `#6C63FF` · clair `#A9A3FF` · pâle `#EDEBFF` · liens `#4F46E5` |
| Pastels | menthe `#3ED9A4` · corail `#FF7A5C` · jaune `#FFC93C` |

Les ombres sont **teintées de lavande** et non de gris : une ombre grise sur un
fond coloré paraît sale.

### ⚠ LES PERFORMANCES RESTENT À L'ENCRE

C'est la seule règle de l'ancienne palette qui survit, et elle survit pour sa
raison d'origine : **douze pour cent d'hommes distinguent mal le vert du
rouge**, et c'est le SIGNE qui dit le sens. `.positif` et `.negatif` pointent
sur `--texte`.

**Les pastels nomment des CATÉGORIES, jamais une variation.** Le vert
d'« obligations » ne veut pas dire « ça monte », le corail de
« diversifiants » ne veut pas dire « ça baisse ». Repeindre les performances
avec les couleurs du graphique mélangerait les deux lectures sur le même
écran — et casserait la seule règle d'accessibilité de la feuille.

### Les tuiles pastel — avec parcimonie, et jamais sur un résultat

Le fond coloré d'une tuile **désigne**, il ne décore pas. Trois règles, toutes
arrêtées :

**Deux par vue au maximum.** Au-delà, plus rien ne ressort — une rangée
entièrement peinte vaut une rangée entièrement blanche.

**Sur les chiffres d'identité du dossier uniquement** : ce que le conseiller
a saisi ou ce qui décrit le dossier — montant investi, sélection parmi,
nombre de lignes, besoin de revenu. Ce sont des données d'entrée.

**JAMAIS sur un chiffre de résultat** : performances, valorisations, écarts,
fiscalité, rotation, projections. Ceux-là restent sur carte blanche, et leur
nombre reste à l'encre. C'est le prolongement direct de la règle des 12 % —
une couleur sur un résultat se lit comme un jugement sur ce résultat.

**Le pâle, pas le franc.** `--menthe-pale`, `--corail-pale`, `--jaune-pale` :
la teinte franche appartient au graphique, où elle nomme une classe d'actifs.
Une tuile au menthe franc à côté d'un camembert dirait « obligations ».

**Corollaire : une vue qui porte le camembert ne porte aucune tuile
colorée.** Sur « Allocation cible », les quatre pastels ont déjà un sens ;
une cinquième surface colorée y ferait deux lectures sur un même écran.

**Sur écran large, la couleur passe au contour.** Les tuiles d'une
`grille.quatre` sont des bulles au seul contour au-delà de 821 px — ni fond,
ni ombre. Une tuile désignée y prend son pastel **sur le trait**, à la place
du bleu clair. Le fond pastel reste la forme téléphone, où la boîte pleine
existe. La règle du contour ne se troue pas pour la couleur.

**Le papier les ignore**, comme le reste du registre — le bloc
`@media print` remettait déjà `.kpi` au blanc, il n'a pas eu à changer.

### Les cinq tuiles, et pourquoi ce sont celles-là

| Vue | Tuile | Teinte | Pourquoi |
|---|---|---|---|
| Sélection des supports | **Montant investi** | menthe | saisi |
| | **Supports retenus** — « X sur Y éligibles » | corail | décrit le dossier |
| Aujourd'hui | **Dernière revue** | menthe | un repère, pas un calcul |
| Situation | **Lignes détenues** | menthe | un décompte |
| Revenus | **Revenu par échéance** | corail | saisi |

Ce qui reste blanc, et l'est délibérément : encours, dérive, valeur du
portefeuille, plus-value latente, couverture des cours, frais, coût annuel,
rendement, volatilité, scénario dominant, et **les quatre indicateurs
d'Arbitrages comme les quatre de Backtest** — deux vues où tout est produit
par un moteur, donc deux vues sans une seule tuile colorée.

« Aujourd'hui » n'en garde qu'une sur quatre : deux, c'était la moitié de la
rangée, et la parcimonie l'a emporté.

### Ce que la pose a coûté au balisage

**+110 octets**, de `f0eb99d0` · 1 369 400 à `77d6df58` · 1 369 510, relevés
le même jour. Dix insertions d'un nom de classe de onze caractères : cinq
tuiles vues sur un dossier complet dans les deux modes, et rien d'autre. Un
écart qui se compte exactement est un écart qui se relit ; c'est tout ce
qu'on demande à l'empreinte.

### La passe vue par vue — ce qui a été aligné sur la maquette

Seize vues relues. La maquette fait foi, **dans la limite de deux règles qui
ne bougent pas** : les performances restent à l'encre, et la navigation reste
la barre basse et le ruban — **pas de colonne de gauche**, quoi qu'en montre
la maquette.

| | |
|---|---|
| Surligneur | jaune `#FFD166`, pilule, sur le dernier mot du titre |
| Tuiles | étiquette 11 px caps **au-dessus**, chiffre 34 px/800, sous-ligne 12 px |
| Anneau | 208/30, chiffre de la classe dominante au centre, légende à filets |
| Badges | pilule pastel pleine, petites capitales, sans filet |
| Encarts | `.info` crème sans filet · `.alerte` crème **à filet jaune** |
| Boutons | 14/24, ombre teintée du violet du bouton — jamais grise |
| Liens | violets, sans soulignement permanent, partout et pas seulement en tableau |
| Densité | 22 px entre blocs, `gap` 20, cartes 22/24 |

### LE ZIGZAG EST TOMBÉ, ET LA BULLE AU CONTOUR AVEC LUI

Quatre tuiles réparties en quatre lignes alternées à 112/170 px occupaient un
écran entier pour quatre nombres. **C'était l'obstacle réel** entre le site et
la maquette, bien plus que la palette. Serrées en rang, les tuiles se
comparent — ce que le zigzag interdisait précisément.

La bulle au seul contour n'existait que parce que « quatre nombres espacés de
cent pixels flottaient sans se rattacher à rien ». Sans zigzag, plus de
flottement : **les tuiles redeviennent des cartes**, blanches par défaut,
pastel pleines quand elles sont désignées, **à toutes les largeurs**.

Tombe avec elles l'aération à **100 px** entre blocs, `gap: 44px` et cartes à
`30/32` sur écran large. C'était elle, le « site qui flotte ». La feuille la
remplace **avec les mêmes sélecteurs** : ceux d'origine valent (0,3,1), une
règle de classe ne les atteindrait jamais.

### Une différence assumée avec la maquette

Elle place « Montant investi » et « Sélection parmi » sur **Allocation
cible**, à côté du camembert. Elles vivent sur **Sélection des supports**, où
elles ont été arrêtées. « Allocation cible » ne porte donc aucune tuile
colorée — le camembert y possède déjà les quatre pastels.

### Le verre, et seulement à trois endroits

**La barre basse, le ruban d'onglets et la feuille** sont translucides :
`rgba(255,255,255,.86)` sur `blur(14px) saturate(1.4)`. Calé sur le LAVANDE et
non sur le blanc — à .72 sur fond lavande, la barre paraît grise.

**Nulle part ailleurs**, et ce n'est pas une préférence de dessin : un
`backdrop-filter` par ligne d'un tableau de quarante lignes fait recomposer la
page à chaque défilement. Les cartes, tableaux et lignes répétées restent
opaques.

**Le repli sans `backdrop-filter` n'est pas cosmétique** : à .86 d'opacité sans
flou, on lit le texte qui passe dessous. Le `@supports not` repasse ces
surfaces à l'opaque — moins joli, lisible.

### Un style pur ne bouge pas l'empreinte

Relevée avant et après la bascule pastel : **`f0eb99d0`, 1 369 400 octets, à
l'octet près des deux côtés**. C'est la vérification qui dit qu'on n'a pas
débordé sur le balisage. Une empreinte qui bouge pendant un chantier de style
est un signal, pas un détail.

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

### Le SURLIGNEUR sous un mot du titre

Le **dernier** mot de chaque titre est **surligné en jaune** (`--surligneur`
`#FFD166`), en pilule arrondie, posé par `titreSouligne()` — un seul endroit
pour quinze titres. C'est le geste le plus reconnaissable de la maquette.

**Le trait violet qui le précédait n'existe plus.** Un trait sous un mot se
lit comme un lien ; un surligneur se lit comme un coup de marqueur.

`box-decoration-break: clone` n'est pas un raffinement : sans lui, un titre
qui se replie sur deux lignes perd l'arrondi au point de coupure et se
termine au carré au milieu d'un mot.

Le jaune du surligneur **n'est aucune des quatre teintes de classes
d'actifs**. Il ne nomme rien d'autre que « regardez ce mot » ; l'inclure dans
la palette du graphique ferait croire à une cinquième classe.

**Le papier ne le porte pas** : à l'impression il redevient un soulignement.

**Un titre surligné a besoin d'interligne.** `h2` tient à 1,08 — serré, c'est
ce qu'on veut d'un titre. Mais le surligneur est une PILULE et non un trait :
elle déborde du texte de son remboursage vertical, et sur un titre qui se
replie — « Situation des / placements » — elle vient toucher la ligne du
dessus. L'interligne monte à 1,34, mais **seulement sur les titres qui en
portent un** (`:has(.souligne)`) : inutile d'imposer à tous les titres l'air
dont un seul a besoin.

### Le trait sous un mot du titre — remplacé

Le **dernier** mot de chaque titre porte un trait bleu, posé par
`titreSouligne()` — un seul endroit pour quinze titres.

C'est un `text-decoration: underline` avec `skip-ink`, **pas** le dégradé de
fond de la maquette. Deux essais l'ont montré : à 62 % de la hauteur de ligne la
bande mord le bas des lettres, à 78 % elle traverse encore les jambages du p, du
g et du q, et le premier d'entre eux laisse un moignon bleu devant le mot. Seul
`skip-ink` contourne les descendantes.

### Les illustrations

Huit dessins au trait dans `img/`, fond transparent, 320 px de côté.

**UNE VUE, UN DESSIN, ET AUCUN DOUBLON.** Ils étaient huit pour seize vues :
la boussole servait à la note ET au contexte, les fiches aux supports ET à
l'univers, la longue-vue au backtest ET à la méthode. Un dessin qui désigne
deux écrans ne désigne plus rien — on arrive sur le second en croyant
reconnaître le premier. Huit dessins ont été ajoutés pour lever les doublons.

**UNE SEULE EXCEPTION, ET ELLE EST VOULUE.** « Allocation cible » et
« Arbitrages proposés » ouvrent sur le MÊME camembert. Les deux vues parlent
de la même répartition — l'une comme cible, l'autre comme chemin pour
l'atteindre —, et le dessin dit cette continuité. Ne pas la « réparer » en
croyant à un oubli. `balance` reste dans `img/` sans emploi, comme
`arbitrages`.

| Dessin | Vue |
|---|---|
| `logo` | en-tête (28 px) · écran de présentation · écran d'ouverture |
| `cafe` | Aujourd'hui |
| `enveloppe` | Client & enveloppe |
| `carnet` | Questionnaire |
| `profil` | Profil de risque |
| `boussole` | Note du jour |
| `contexte` | Contexte |
| `camembert` | Allocation cible · **Arbitrages proposés** |
| `fiches` | Sélection des supports |
| `port` | Situation |
| `revenus` | Revenus & rachats |
| `journal` | Journal |
| `rapport` | Rapport client |
| `longue-vue` | Backtest |
| `univers` | Univers ETF |
| `methode` | Méthode & limites |

La table qui fait foi est `ILLUSTRATIONS_VUES` dans `js/ui/socle.js`. Le
bandeau « allocation stratégique seule » portait une boussole de 44 px : elle
est retirée, l'allocation cible en montrait deux.

**`repartition.png` s'appelle désormais `camembert.png`** — même rôle, nom
plus clair. Sa part remplie est violette comme l'accent ; ce fut un temps la
seule entorse au « bleu, seule couleur », le dessin ayant pris l'avance sur
la bascule pastel. Toute la feuille l'a rejoint depuis.

**Deux dessins sans emploi** : `balance.png`, qui ouvrait les arbitrages
avant que le camembert ne les prenne, et `arbitrages.png`, libre depuis plus
longtemps encore. Les garder tant qu'aucune vue ne les réclame, ou les
supprimer au prochain rangement.

**HUIT DESSINS SUR SEIZE PORTENT ENCORE LE BLEU `#2F6BFF`** de l'ancien
registre : `enveloppe`, `contexte`, `profil`, `revenus`, `journal`,
`rapport`, `univers`, `methode`. Les neuf autres ont été repeints en violet.
Une vue sur deux ouvre donc sur un signe qui n'est plus celui de
l'application — c'est le même défaut que le favicon, en plus visible.

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

#### L'ouverture d'une vue

Le dessin ne se pose plus à côté du titre : **il tient le premier écran avec
lui**, et le contenu ne paraît qu'au défilement. Ce qui change, c'est ce sur
quoi on arrive — avant, une vue s'ouvrait sur un formulaire, un tableau ou un
chiffre, et l'on était dedans avant d'avoir lu le titre.

Posée par `poserOuvertures()`, à partir de `ILLUSTRATIONS_VUES`. **La phrase
d'introduction devient le sous-titre** : onze vues en avaient déjà une, écrite
de longue date, juste sous le titre — elle est déplacée, pas réécrite. Les
cinq qui n'en avaient pas la reçoivent de `SOUS_TITRES_VUES` ; ce sont les
seules phrases neuves.

`min-height` ne vaut pas `100dvh` mais `calc(100dvh - 152px - var(--marge-barre))` :
l'en-tête et le ruban sont collants, la barre basse flotte par-dessus. Un plein
écran nominal déborde de la somme des trois, et l'invitation à descendre — la
seule chose qui doive se voir sans défiler — tombe juste sous le pli.

### Le contenu paraît au défilement

Lié à la **position dans le défilement** et non à une minuterie : on remonte,
les blocs repartent en arrière. Pas une ligne de JavaScript — `animation-timeline: view()`
fait tout.

**Le garde-fou `@supports not (animation-timeline: view())` n'est pas une
politesse.** L'animation porte `both`, qui garde l'état de départ avant
l'entrée ; sans timeline de défilement, ce départ ne finit jamais et la page
resterait à **zéro d'opacité pour toujours**. Ne jamais retirer ce bloc, ni
son jumeau `prefers-reduced-motion`.

## Ouverture à gauche, contenu à droite — au-delà de 900 px

Arriver sur une vue ne doit pas vouloir dire arriver sur du vide. Sur écran
large, l'ouverture — dessin, titre surligné, phrase — passe dans une colonne
de **gauche (40 %), collante**, et le premier contenu utile est visible
**d'emblée à droite (60 %)**. « Faites défiler » n'a plus d'objet et disparaît.

**Sous 900 px, RIEN NE CHANGE** : empilement pleine largeur, ouverture
centrée, « faites défiler » conservé. Deux colonnes de 180 px ne sont pas une
mise en page.

**Douze vues** y sont : Client & enveloppe, Profil de risque, Note du jour,
Contexte, Allocation cible, Sélection des supports, Arbitrages proposés,
Revenus & rachats, Situation, Journal, Rapport, Méthode.

Les trois dernières arrivées — supports, arbitrages, rapport — figuraient
d'abord au rang des exclues à cause de leur tableau large. **L'exception de
largeur suffit** : le tableau sort de la colonne et devient une section pleine
largeur, le reste de la vue gagne l'ouverture à gauche.

### Un bloc en pleine largeur ne prend JAMAIS la première ligne

Placé sur la première ligne, il reçoit les deux colonnes — dont celle que
l'ouverture occupe — et **passe par-dessus le dessin et le titre**. C'est ce
qui est arrivé à « Arbitrages proposés », dont le premier enfant est la rangée
d'indicateurs.

Le premier bloc tient donc la colonne de droite, quoi qu'il soit. Ce qui
s'étale, s'étale à partir de la deuxième ligne. Une rangée de quatre tuiles
coincée dans 60 % se replie en **2 × 2** : ni coupée, ni écrasée.

### Un tableau large en zigzag est une SECTION

Les blocs du zigzag sont bornés à 72 % et poussés d'un côté puis de l'autre.
Un tableau ne se lit pas ainsi : « Portefeuille proposé », « Ordres à passer »,
le document de synthèse sont ce qu'on vient chercher. Ils reprennent toute la
largeur, avec de l'air au-dessus et au-dessous — le zigzag s'interrompt, et
cette interruption dit « voici la pièce maîtresse ».

La liste est `VUES_DEUX_COLONNES` dans `js/ui/socle.js`. Trois familles en
sont exclues, et pour trois raisons différentes :

| Exclu | Pourquoi |
|---|---|
| **L'écran de présentation** | il EST un plein écran centré ; c'est son propos |
| **Le questionnaire** | garde son empilement et son repère de progression |
| **Univers · Backtest · Sélection des supports · Arbitrages · Rapport** | leur contenu dominant est un TABLEAU LARGE — treize colonnes serrées dans 60 %, ce n'est plus un tableau |

**Le critère de tri est « ce qui domine l'écran d'arrivée »**, et non « la vue
contient-elle un tableau ». Allocation cible en porte un — « Détail par
poche » — mais il arrive après l'anneau ; elle est donc en deux colonnes.
Sélection des supports et Arbitrages posent le leur trop tôt.

### `.actif` est obligatoire sur la règle de grille

`.vue { display: none }` pèse (0,1,0), `.vue.actif { display: block }`
(0,2,0). Une règle `.vue.deux-colonnes` pèse (0,2,0) **elle aussi** et,
placée plus bas dans la feuille, l'emporte sur le `none` : **les quinze vues
masquées se rendent alors toutes en même temps**. Le ruban annonce « Profil
de risque » et l'écran montre le formulaire client. Toujours qualifier par
`.actif`.

### L'ouverture est une enseigne, pas le sujet

**En haut à gauche, et plus petite** : dessin à 132 px, titre à 34 px. C'est
la TAILLE qui pesait trop, pas la position — centrée, elle flottait au milieu
d'une colonne vide et l'oeil devait la chercher ; alignée sur le premier bloc
de droite, les deux colonnes commencent au même trait.

La taille vient de `tailleOuverture()`, en style d'attribut : la surcharger
demande `!important`.

### L'air se prend par `row-gap`, pas par les marges

Dans une grille, la marge basse d'une cellule ne s'ajoute pas à celle de sa
voisine : elle est simplement ignorée entre deux lignes. Les blocs de droite
portaient encore la marge du rythme général, qui doublait l'écart sur les uns
et pas sur les autres selon leur nature. **Un seul mécanisme** : `row-gap`
40 px en deux colonnes, **64 px en zigzag** — des blocs qu'on lit un par un
ont besoin de plus d'air que des blocs qu'on balaie.

### La suite en zigzag — `VUES_ZIGZAG`

« Profil de risque » n'a qu'UNE chose à dire à l'arrivée : le profil retenu
et son score. Empiler les quatre cartes de détail à droite les met au même
rang, et la première s'y noie.

**Un seul bloc à droite ; la suite dessous, en pleine largeur, un bloc par
ligne, alternativement à droite et à gauche.** Bornée à 72 % : sans borne,
deux blocs pleine largeur sont au même endroit et l'alternance ne se voit
pas.

**L'alternance démarre À GAUCHE.** Le premier bloc est à droite, dans la zone
à deux colonnes : envoyer le deuxième à droite lui aussi le fait lire comme
sa suite, et le zigzag ne commence qu'au troisième.

`display: contents` sur le conteneur rendu à l'exécution — `#profil-contenu`
— pour que ses enfants deviennent les cellules de la grille de la VUE. Sans
lui ils restent enfermés dans un `<div>` qui occupe une seule cellule, et
aucune règle de grille ne les atteint. Le conteneur ne quitte pas le DOM, il
cesse seulement de produire une boîte : les sélecteurs qui le traversent
mordent toujours.

En zigzag, l'ouverture prend `grid-row: 1` et non `1 / -1` — la zone à deux
colonnes se limite à la première ligne, le zigzag court dessous.

### Les conteneurs s'effacent, et tout est forcé en colonne 2

Le contenu d'une vue vit dans un `<div>` rendu à l'exécution, souvent dans
une `grille deux` à l'intérieur. Ces conteneurs n'occupent qu'UNE cellule :
tout ce qu'ils portent se tasse dans les 60 %. `display: contents` les efface
en tant que boîtes — leurs enfants deviennent les cellules de la grille de la
vue — sans les retirer du DOM ni casser les sélecteurs qui les traversent.

**Il faut alors forcer explicitement `grid-column: 2`.** Sans cela
l'auto-placement remplit les cellules libres au fur et à mesure : le premier
bloc va à droite, le deuxième retombe à GAUCHE sous l'ouverture. Ce n'est pas
une grille à deux colonnes, c'est un damier.

### Deux choses s'étalent sur toute la largeur

**Les tableaux**, par `:has(.tableau-defilant)` — la règle suit le contenu au
lieu d'une liste de cartes à tenir à jour. Un tableau de treize colonnes
serré dans 60 % n'est plus un tableau.

**Les rangées d'indicateurs** — `grille.quatre` et `grille.trois`. Quatre
tuiles dans 60 % font des colonnes de cent dix pixels, où « Dynamique » est
coupé en deux. C'est une bande de tableau de bord : elle se lit en largeur ou
pas du tout.

### L'ouverture occupe toutes les lignes de sa colonne

`grid-row: 1 / -1`. Sans cela sa zone de grille se limite à la première
ligne, et une position collante n'a de course que dans sa propre zone —
elle décroche au bout d'un écran.

## La navigation est en bas, à toutes les largeurs

Il y avait deux navigations : la colonne à gauche sur écran large, les deux
étages sur téléphone. Deux modèles à tenir, deux endroits à corriger, et un
utilisateur qui change d'appareil devait réapprendre où sont les choses.

Il n'en reste qu'un : **les quatre blocs dans la barre basse, les vues d'un
même bloc dans le ruban du haut.** Le bloc de règles est passé de
`@media (max-width: 820px)` à `@media all` ; les écarts de l'écran large — la
barre ramassée en pastille au centre plutôt qu'étirée d'un bord à l'autre —
vivent dans un `min-width: 821px` qui le suit.

**`#nav` reste dans la page, seulement masquée.** Le ruban et la barre basse y
lisent les libellés et l'avancement des étapes, et les deux harnais comptent
ses entrées. La vider casserait la navigation sans qu'aucun test ne le dise.

**`.corps` est passée en colonne.** C'était une rangée — navigation à gauche,
contenu à droite. La colonne partie, le ruban posé là comme troisième enfant
s'y dressait sur toute la hauteur, en pilules verticales de cinq cents pixels.

**Les blocs secondaires ont besoin d'une porte.** « Données » n'a pas d'entrée
dans la barre basse ; sur téléphone l'en-tête porte un « ••• », sur écran large
la colonne les portait. La colonne partie, un « ••• » est ajouté à la barre
basse — masqué sur téléphone, où l'en-tête fait déjà le travail. Il ouvre la
même feuille : une seule feuille, deux portes, jamais deux contenus à tenir.

## La barre basse OCCUPE plus que sa hauteur, et sur écran large surtout

La barre ne pousse rien : elle flotte par-dessus. Le bas de page doit donc
lui réserver sa place — et **ce qu'il faut réserver n'est pas sa hauteur,
c'est ce qu'elle occupe** : `hauteur + distance au bord`. Sur écran large
elle est détachée de 24 px : **79 px de haut, 103 px occupés**. Sur
téléphone elle touche presque le bord : 72 px de haut, 84 px occupés.

C'est l'écart entre ces deux nombres qui a laissé passer un bug pendant
tout le chantier : `.contenu` réservait 100 px et `.pied` 92 px, valeurs
écrites du temps où la barre allait d'un bord à l'autre. La **dernière
ligne du pied passait 11 px SOUS la pastille, sur les seize vues**, sur
tous les grands écrans. Les valeurs téléphone (136 / 128 px) étaient
justes ; le grand écran n'avait jamais eu les siennes. Il les a
maintenant : **132 px pour `.contenu`, 124 px pour `.pied`**, sous
`min-width: 821px`.

**`.pied` n'est fils d'aucune vue** — il est frère de `.corps`, et c'est
le vrai bas du document. Le contrôle du harnais qui surveillait « le
dernier élément de chaque vue » ne le voyait donc pas, et mesurait de
surcroît la HAUTEUR de la barre et non ce qu'elle occupe : deux angles
morts qui se recouvraient exactement. `test/fumee.html` porte désormais
un second contrôle, sur le pied, **rejoué à 430 px ET à 1 280 px** —
le cadre du harnais fait 430 px, donc ce harnais n'avait jamais mesuré
autre chose qu'un téléphone.

**⚠ `--marge-barre` vaut 76 px et ment sur les deux largeurs.** Il n'a
pas été corrigé avec le reste : il sert aussi à sept `min-height` et au
calage de l'invitation à descendre, qui bougeraient tous ensemble. Le
jour où on y touche, c'est une passe à part, mesurée vue par vue.

## Un seul dessin par écran, et un seul « ••• » par largeur

**Les états vides n'ont plus de dessin.** Ils en portaient un — un carnet
quand le questionnaire manquait, un port quand c'était le portefeuille.
Depuis que chaque vue s'ouvre sur le sien, cet état arrive juste dessous : on
voyait la balance de l'allocation, puis un carnet, sur le même écran. Le
second ne disait rien que le titre « Une étape manque » ne dise déjà.

**Le « ••• » ne paraît qu'une fois.** Sur téléphone c'est celui de l'en-tête,
sur écran large celui de la barre basse. La règle qui masque celui de la barre
vit APRÈS `.tabbar button`, qui pose `display: flex` : placée avant, elle était
muette — une media query n'ajoute aucune spécificité, c'est l'ordre du fichier
qui tranche. Le piège s'est déjà refermé une fois, sur `.filtres .champ`.

**Les quatre actions de dossier ont quitté l'en-tête.** Enregistrer, exporter,
importer, nouveau dossier vivent derrière le « ••• », qui les portait déjà sur
téléphone. Les avoir aux deux endroits laissait croire à deux choses
différentes. Les boutons restent dans la page, masqués : la feuille les relaie
par leur identifiant, et les retirer casserait ce relais.

**Un dessin en largeur pèse moins qu'un dessin carré.** La boîte est carrée,
eux ne le sont pas : le port occupe 70 % de la hauteur de la sienne, le café
28 %, quand la balance ou le journal en occupent 91 %. Posés côte à côte, l'un
paraît deux tiers de l'autre alors que les deux font 240 pixels.

`ECHELLE_DESSIN`, dans `js/ui/socle.js`, rattrape l'écart. **Le facteur porte
sur le DESSIN, jamais sur la vue** : c'est une propriété du fichier, pas une
exception d'écran. Le jour où l'un d'eux est redessiné plus haut, on retire sa
ligne et rien d'autre ne bouge. Une taille par vue aurait rendu la règle « une
seule taille » fausse pour toujours.

Corollaire : **la feuille de style ne pose plus de taille d'ouverture.** Une
règle `width: … !important` sur `.ouverture-vue > .illustration` ramènerait
tous les dessins à la même boîte et annulerait l'ajustement. Elle ne borne que
la largeur, pour qu'un dessin large ne pousse jamais la page ; le téléphone les
recule d'un quart avec `zoom`, ce qui préserve les rapports.

## Les indicateurs sont des bulles au seul contour

Les tuiles ont perdu leur boîte pleine sur écran large — un cadre plein autour
d'un nombre n'ajoutait rien que le nombre ne dise déjà. Mais **sans rien
autour, quatre nombres espacés de cent pixels flottaient** sans se rattacher à
quoi que ce soit.

Un contour, et rien d'autre : ni fond, ni ombre. C'est ce qu'il faut pour dire
« ceci est un objet », pas assez pour peser. **Bleu clair et non bleu vif** —
sur quatre tuiles, l'accent plein crierait, alors qu'il doit rester à ce qu'on
peut cliquer. Le bleu vif ne revient qu'au survol.

Elles gardent leur boîte pleine sur téléphone, où deux colonnes serrées ont
besoin d'une séparation — et c'est là que le harnais mesure ses témoins, ce
qui explique qu'il ne voie pas ce changement.

## L'accueil sur écran large — trois gestes

**Le salut remonte.** Le corps de l'écran d'accueil se CENTRAIT verticalement
dans une hauteur de fenêtre entière : « Bonjour X » se retrouvait au milieu du
vide, à six cents pixels du fil qui le précède. Le corps suit désormais le
fil, et la hauteur réservée tombe avec lui — ce n'est plus un écran de garde,
c'est le haut d'une page qui continue.

**Le fil des poches prend toute la page.** Il est le premier mot de l'écran et
il défile horizontalement : le borner à la colonne de contenu lui coupait ses
dernières poches sans raison. Le débord se fait par **marges négatives**, et
non par `width: 100vw` — `100vw` ignore la barre de défilement, déborde d'une
quinzaine de pixels, et ferait défiler la page entière de côté. Le rembourrage
rend au premier jeton l'alignement qu'il avait sur la colonne.

**Les quatre bulles se dispersent, et sans régularité.** Deux colonnes avec un
décalage constant donnaient un zigzag RÉGULIER : l'oeil attrape la règle au
deuxième jeton et cesse de regarder. La grille passe donc à **douze colonnes**,
et chaque bulle est posée là où elle n'est attendue ni de sa voisine ni de
celle du dessus.

| | colonne | rangée | décalage |
|---|---|---|---|
| Encours | 1 | 1 | 0 |
| Dérive maximale | 8 | 1 | 96 px |
| Supports cibles | 3 | 2 | 34 px |
| Dernière revue | **5 — centrée** | **3** | 68 px |

Les valeurs ne sortent pas d'un chapeau : **aucune n'est répétée**, ni en
abscisse ni en ordonnée.

**« Dernière revue » fait exception à la dispersion, et sur demande.** Elle
était la plus excentrée des quatre — colonne 9, 132 px de retrait, le coin
bas-droit d'un écran vide à cet endroit. Elle est passée au milieu :
colonnes 5 à 8 sur 12, donc quatre colonnes de chaque côté, et son centre
tombe exactement sur celui de la page.

**Elle a changé de RANGÉE en même temps, et ce n'est pas décoratif.**
« Supports cibles » occupe les colonnes 3 à 6 de la rangée 2 ; deux
placements explicites qui se croisent se SUPERPOSENT — la grille ne les
écarte pas, elle les empile. Toute bulle recentrée devra descendre d'une
rangée pour la même raison.

**Son retrait est le plus grand de la grille, et c'est voulu.** Vingt
pixels — la première valeur essayée — la collaient à « Supports cibles » :
la rangée neuve ne se voyait pas, et les deux bulles se lisaient comme un
bloc. Soixante-huit les sépare. La dispersion se lit donc toujours en
descendant, alors même que la dernière bulle est revenue au milieu.

`align-items: start` sur cette grille, sinon une tuile s'étire à la hauteur de
sa RANGÉE : celle de gauche prenait la hauteur de sa voisine décalée et se
retrouvait à moitié vide. En quinconce, chaque tuile garde sa taille propre —
c'est tout l'intérêt du décalage.

## L'accueil, dans l'ordre : ce qui a bougé, ce qu'il y a à faire, le reste

Sur un dossier complet, « Aujourd'hui » se lit de haut en bas dans cet ordre,
et il n'y a plus rien avant :

1. **Les poches aujourd'hui** — le fil, en tête de page. C'est ce qui a bougé
   depuis hier, et c'est la seule chose qui doive se lire sans attendre.
2. **Aujourd'hui** et son verdict — sur ordinateur, ils tiennent le reste de
   l'écran à eux seuls. On arrive sur une phrase, pas sur un tableau de bord.
3. le détail — indicateurs, mouvements, note de marché.
4. **le pied** : l'accroche et les dates de relevé.

**L'accroche a quitté le haut de la page.** Lue une fois le premier jour, elle
repoussait chaque matin le seul chiffre qu'on vient chercher. En pied elle
reste consultable et cesse d'être traversée. Elle ne bouge que sur la branche
« dossier complet » : sur un dossier neuf ou incomplet, l'ouverture — dessin,
accroche longue, bouton de découverte — reste en tête, c'est elle qui accueille.

**Le verdict paraît une demi-seconde après le fil**, par une MINUTERIE et non
par `animation-timeline: view()`. Le bloc est en haut de page, donc déjà
couvert au chargement : la timeline de défilement le rendrait sans transition.
Une animation de durée finie porte `both` sans risque — elle finit toujours,
là où une timeline sans support ne finit jamais. La demi-seconde n'est pas
décorative : le fil se lit d'abord, le verdict ensuite.

**Le plein écran est réservé à l'ordinateur** (`min-width: 821px`) : sur
téléphone le même bloc garde sa hauteur naturelle, et l'écran est déjà plein.

**Sa hauteur utile n'est pas celle de `.ouverture-vue`.** Celle-ci retire
152 px pour l'en-tête ET le ruban ; le bloc « Aujourd'hui » n'a qu'une vue,
donc pas de ruban — 120 px suffisent (en-tête 53, retrait du haut de
`.contenu` 56). Retirer 152 laissait la grille des indicateurs à moitié
visible sous le verdict.

**Les 88 px au-dessus de « Les poches aujourd'hui » sont annulés quand le fil
ouvre l'écran.** Ils le séparaient de l'accroche ; l'accroche partie, ils ne
séparaient plus rien et repoussaient le premier mot de la page sous le pli.

Ces règles vivent en FIN de `css/app.css`, et pas près des autres règles de
l'accueil : elles surchargent l'animation de défilement, et une media query
n'ajoute aucune spécificité — c'est l'ordre du fichier qui tranche.

## Les listes longues respirent, et paraissent une à une

L'air posé au chantier 9 s'arrêtait aux blocs de premier niveau — « une
carte reste dense à l'intérieur ». **Le questionnaire fait mentir la
règle** : dix-huit questions dans cinq cartes, c'est un écran de
formulaire, pas un bloc dense. Le contexte macro et ses onze indicateurs
sont dans le même cas.

Deux choses, et elles vont ensemble :

- **de l'air entre les items** — question, indicateur, groupe — et pas
  seulement entre les cartes ;
- **chaque item paraît quand on y arrive**, au lieu que la carte entière
  se pose d'un coup. Dix-huit questions offertes ensemble, c'est dix-huit
  décisions à la fois.

La révélation reste liée à la **position dans le défilement**, comme
celle des blocs de premier niveau — mais sur une plage plus tardive,
`entry 15% → entry 85%` au lieu de `entry 2% → cover 26%` : l'item est
bien entré dans l'écran quand il achève de paraître. **Bornée à `entry`
aux deux bouts**, et pas seulement au début : une plage qui court sur
`cover` laisserait un item pâle au milieu de l'écran.

Le conteneur `#questions` cesse de paraître d'un bloc — deux opacités
emboîtées se multiplient.

Mêmes garde-fous que la règle générale, et pour la même raison :
`@supports not (animation-timeline: view())` et `prefers-reduced-motion`.
Sans eux, `both` garderait ces items à zéro d'opacité pour toujours.

**Un onglet caché n'anime rien.** Les animations de défilement ont une
timeline INACTIVE tant que `document.visibilityState` vaut `hidden` — et
une timeline inactive n'a aucun effet : tout se mesure à l'opacité pleine,
comme si la règle n'existait pas. Un contrôle mené dans un panneau replié
conclut donc que la révélation ne marche pas, alors qu'elle n'a simplement
jamais tourné. Vérifier ces règles-là **fenêtre ouverte**, ou pas du tout.

## Rien ne se règle sur une hauteur d'en-tête écrite à la main

Le ruban collait sous l'en-tête à `top: 52px`. **L'en-tête ne fait 52 px
nulle part** : 53 sur écran large, 66 sur iPhone, davantage sur un modèle
à encoche — il porte `env(safe-area-inset-top)`. Quatorze pixels de ruban
passaient donc sous l'en-tête dès qu'on descendait, et les pastilles
paraissaient se raccourcir. Aucun harnais ne pouvait le voir : la hauteur
ne se connaît qu'à l'exécution, et elle change quand on tourne l'appareil.

`mesurerEntete()` (js/ui/navigation.js) la mesure et la pose en
`--h-entete`, au démarrage puis à chaque redimensionnement et rotation.
**Tout ce qui doit se ranger sous l'en-tête lit cette variable.** Le repli
`var(--h-entete, 52px)` ne sert qu'au cas où la fonction ne tournerait pas.

## L'invitation à descendre suit le texte, elle ne l'attend pas en bas

« Faites défiler » était posée en absolu au pied de l'ouverture. Le pied
ne bouge pas avec le texte : **un sous-titre de trois lignes sur un
téléphone passait dessous**, et les deux se lisaient l'un au travers de
l'autre. La colonne de l'ouverture est centrée — la flèche redevient son
dernier élément de flux et suit le sous-titre, quelle que soit sa longueur.

L'écran d'entrée garde la sienne en absolu : il ne porte qu'un signe et un
nom, rien qui puisse la heurter.

## Une plage de révélation se compte en pixels, pas en pourcentage

`entry 2% → cover 26%` semblait raisonnable et ne l'était pas : **un
pourcentage de la phase d'entrée est proportionnel à la hauteur du bloc**.
Une grande carte — le tableau du rapport, la grille des indicateurs —
restait à demi effacée pendant tout un écran de défilement ; on la lisait
en gris pâle et l'on croyait à un texte désactivé.

La plage se compte donc en pixels de défilement, la même pour tous :
`entry 0px → entry 170px` pour les blocs, `entry 40px → entry 190px` pour
les items d'une liste, qui doivent être entrés avant de paraître. Le temps
de voir la chose venir, jamais celui de se demander si elle est éteinte.

## L'accueil s'ouvre comme les quinze autres vues

Sur un **dossier neuf**, l'accueil pose son dessin, son titre et sa phrase
en pleine page, comme toutes les autres. C'était la seule vue à faire
autrement — dessin à gauche, texte à droite —, et l'on arrivait dans
l'application par un écran qui ne ressemblait à aucun de ceux qui suivent.

`ouvertureAccueil()` construit à la main ce que `poserOuvertures()` pose
ailleurs : cette dernière travaille sur les `h2[data-titre]` écrits dans
`index.html`, et l'accueil n'en a pas — son contenu est monté à
l'exécution. Sa phrase vit dans `SOUS_TITRES_VUES.accueil`, avec les
autres.

**Sur un dossier entamé, rien de tout cela ne paraît** : l'accueil ouvre
sur le fil des poches, et sur un dossier complet sur le verdict du jour.
La règle n'a pas changé — un dessin vu tous les jours cesse d'être vu.

## L'air se mesure entre les blocs, jamais dans un titre

Un titre appartient à ce qui le SUIT. « Les poches aujourd'hui » est posé
au-dessus du fil des pastilles : c'est au-dessus de LUI qu'il faut l'air, pas
entre lui et les pastilles qu'il annonce. D'où `.fil-entete { margin-top }`
plutôt qu'une marge sous l'accroche.

La même règle vaut pour les `h2` de vue, qui gardent une marge courte quand
tout le reste est à 100 px.

### Deux marges voisines fusionnent, elles ne s'ajoutent pas

« Remplissez le dossier » arrivait à 48 px de la note qui le précède — la
marge du bloc d'avant, et rien d'autre : **aucune règle ne donnait de marge
haute aux titres de vue**. Le titre semblait appartenir au paragraphe
d'au-dessus.

L'air se pose donc au-dessus du titre, et **la valeur écrite est celle
qu'on voit** : les 48 px du bloc précédent disparaissent dans les 88 du
titre, ils ne s'y ajoutent pas. Poser 52 ne gagnait que quatre pixels, et
l'on aurait cherché longtemps pourquoi rien ne bougeait.

Un titre qui ouvre sa vue n'en a pas besoin — d'où `:not(:first-child)`.

**Le téléphone en demande plus que l'écran large** — 144 px contre 124 —
et ce n'est pas une inversion par distraction : sur 390 px de large, un
titre qui suit un paragraphe n'a aucune colonne vide autour de lui pour
dire qu'on change de sujet. Sa seule séparation est verticale.

## La vue courante se lit sur la vue, pas sur la navigation

`vueCourante()` lisait `#nav button.actif`. **Une vue masquée dans le mode
courant n'a pas d'entrée de navigation** : la classe ne se posait nulle part,
la fonction retombait sur « accueil », et la barre basse allumait Aujourd'hui
pendant qu'on lisait la note du jour — le ruban, lui, disparaissait.

Elle lit maintenant `section.vue.actif`. Et la barre basse mène à **la première
vue VISIBLE d'un bloc**, pas à la première tout court : en mode particulier,
« Allocation » menait à la note du jour, que ce mode masque.

Le défaut existait avant que la navigation ne descende ; il ne se voyait que
sur téléphone, où le ruban et la barre étaient seuls à s'y fier. Ils le sont
maintenant partout, et c'est ce qui l'a fait sortir.

## Le rechargement repart du haut, et ce n'est pas gratuit

`afficher()` remonte la page à chaque ouverture de vue. Cela ne suffisait
pas au rechargement : **le navigateur restaure la position d'avant, et il
le fait après l'amorçage** — son geste écrasait le nôtre, et l'application
se rouvrait au milieu d'une tuile. Safari sur iPhone comme les autres.

`history.scrollRestoration = 'manual'`, posé en tête de l'amorçage, lui
retire cette charge ; un `scrollTo(0, 0)` sur `load` couvre le cas où la
restauration est déjà programmée quand cette ligne s'exécute.

Une application qui s'ouvre sur « Aujourd'hui » doit s'ouvrir sur le HAUT
d'Aujourd'hui : la position d'hier n'a aucun sens sur une vue dont le
contenu a changé depuis.

## L'accueil d'un dossier vide — quatre blocs, un seul rythme

Qui arrive sur un dossier vide a **un dossier à commencer**, rien d'autre.
L'ordre suit cela, et rien qu'à moitié l'ancien :

1. l'ouverture — dessin, titre, phrase — comme les quinze autres vues ;
2. **une seule ligne** qui dit ce que fait l'outil (`phrase.accroche.ligne`) ;
3. **« Remplissez le dossier » et sa carte d'étapes**, remontés en premier ;
4. le **secondaire**, sous un filet : dossier exemple, conservation locale,
   dates de relevé.

Le dossier exemple et la fraîcheur des données étaient au-dessus des étapes.
Ils sont utiles — **à personne tout de suite**.

**Un seul espacement entre les quatre blocs**, tenu par `--rythme` sur
`.accueil-vide` : 96 px sur téléphone, 120 sur écran large, et une seule
demi-valeur, entre l'ouverture et la phrase qui la commente. Les marges
générales entre blocs de premier niveau ne portent plus là — les enfants
vivent dans `.accueil-vide` —, ce qui fait qu'il n'y a qu'un endroit à
changer pour resserrer la page.

**`filPoches()` a quitté cette branche**, et ce n'est pas un oubli : sur un
dossier vierge il rendait une chaîne vide, dont la seule trace était un nœud
de texte entre deux blocs. L'air doit venir des espacements choisis, jamais
d'un bloc fantôme.

**L'accueil REMPLI ne change pas** : fil des poches en tête, verdict, puis le
détail. Les deux branches ont désormais des structures franchement
différentes, et c'est voulu — elles ne répondent pas à la même question.

## L'écran d'entrée — le nom d'abord, le propos ensuite

Le premier écran ne porte que le signe et le nom. La phrase qui dit ce que
fait l'outil **commence sous le pli**, et c'est voulu : les deux se
disputaient le même écran, et l'on ne lisait ni l'un ni l'autre.

La hauteur retirée n'est pas 152 px — l'en-tête ET le ruban, comme pour
l'ouverture d'une vue : **l'écran d'entrée n'a pas de ruban**. C'est la
hauteur mesurée de l'en-tête qu'il faut retirer, `--h-entete`, et rien
d'autre. Sur iPhone cela rend quatre-vingts pixels au premier écran.

Les trois blocs du parcours — Profil, Allocation, Suivi — se lisent un à
un : 34 px entre eux, et les dates de relevé se détachent d'eux.

## L'écran d'ouverture — trois secondes

Le signe seul sur le fond de page, puis il s'efface en fondu. **Trois
garde-fous, et chacun répond à une façon de rester coincé derrière :**

- il ne paraît que sur un **dossier vierge dont le mode n'est pas choisi** — un
  conseiller qui ouvre son dossier vingt fois par jour ne traverse pas vingt
  fois un voile ;
- il se retire par une **minuterie**, jamais par la fin d'une animation :
  `animationend` ne se déclenche pas si l'animation est neutralisée, et
  `prefers-reduced-motion` la neutralise ;
- **un clic le retire aussi.**

Il est monté par `poserEcranOuverture()` et non écrit dans `index.html` : écrit
dans la page, il resterait à l'écran si un script échouait à se charger, et
l'application entière serait derrière un voile qu'aucun clic ne lève.

## Le rapport imprimé échappe à tout cela

Encre noire sur papier blanc. **Le bleu n'y survit qu'en filet** — pas d'aplat,
pas d'ombre, pas d'illustration, pas de trait sous les titres. Un aplat coûte de
l'encre, se photocopie mal, et un document remis à un client ne gagne rien à
être colorié.

Une exception : en mode particulier, l'avertissement « ne constitue pas un
conseil » est **encadré de noir et plus gros que les mentions** (13,5 px contre
12). C'est la seule chose du document qu'on ne doit pas pouvoir survoler.

## L'empreinte de référence

**`7a4c5445` · 1 334 849 octets · 68 empreintes**, relevée après le
« Backtest » — la dernière des quatre vues d'Allocation.

Le remaniement lui-même s'est mesuré ainsi, à la journée près — l'empreinte
contient des dates, elle ne se compare qu'entre deux relevés du même jour :

| | Empreinte | Octets |
|---|---|---|
| Avant | `0df8fe8d` | 1 330 233 |
| Après | `ed91c42b` | 1 330 119 |

**114 octets de moins pour un HTML entièrement réordonné** : le bouton de
découverte et les pastilles ont changé de place, pas de contenu. Un écart de
cet ordre est la signature d'un déménagement ; un écart de plusieurs milliers
aurait voulu dire qu'un bloc était apparu ou avait disparu, et il aurait
fallu savoir lequel.

Repère plus ancien : **`00fd6cb3` · 1 318 553 octets**, relevée après
l'aération du chantier 9.

Repère utile comme étalon : `3491397b`, **1 303 613 octets**. L'agrandissement
des dessins avait alors changé l'empreinte **sans changer d'un octet** le
total, puisqu'il ne substituait que des chiffres. Un total inchangé et une
empreinte différente : la signature d'une substitution pure. Un total qui bouge
veut dire que du balisage est apparu ou a disparu, et il faut alors savoir
lequel.

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

## Une étape du dossier est une ligne, et la ligne est le bouton

Chaque étape portait le sien, « Ouvrir », posé sous son texte : trois
boutons identiques l'un sous l'autre, et 245 px de hauteur par étape — on
n'en voyait que deux par écran de téléphone.

La **ligne entière** est la cible, et le chevron dit qu'elle mène quelque
part. **Il ne reste aucun bouton dans la liste.** Un dernier « Ouvrir »
avait été gardé sur la première étape à faire, pour la désigner : sur une
ligne déjà cliquable il n'ajoutait qu'un doute — on se demande alors ce
que fait le reste de la ligne. C'est le chevron de l'étape à faire qui
prend l'accent, avec son titre, et rien d'autre (`.etape.prochaine`).

Une étape faite reste ouvrable, on y retourne pour corriger ; elle ne se
signale simplement plus.

**Le défaut que ce remaniement supprime par construction :** l'écart de la
ligne avait été porté à 16 px alors que la largeur du corps était écrite
`flex-basis: calc(100% - 40px)`, calibrée pour 14. La somme dépassait
100 %, le texte passait à la ligne suivante, et **l'anneau restait seul en
haut d'un grand vide**. Une largeur qui répète l'arithmétique de son
voisin se désaccorde au premier réglage : le corps prend maintenant ce qui
reste, quel que soit l'écart.

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

## La note dit d'où elle vient, note par note

En pied de la note du jour, et **calculée à la rédaction, pas à
l'affichage** :

> Note calculée à partir des cours relevés le [date] **et de N titres de
> presse parus dans les 48 heures précédentes, relevés sur M sources :
> […]. Les titres ne sont pas vérifiés ; les cours, si.**

et, quand aucune actualité n'a servi, la phrase d'origine :

> Note calculée à partir des cours relevés le [date] — sans source
> d'actualité.

**La mention se lit dans `NOTE_MARCHE.actualite`, écrit au moment où la
note est rédigée.** C'est délibéré : une note publiée un matin où les
fils étaient muets doit continuer de dire « sans source d'actualité »
même relue un mois plus tard, quand ils remarchent. Les notes écrites
avant que l'actualité n'existe n'ont pas le champ et retombent sur la
phrase d'origine — qui était vraie pour elles.

**Elle ne mentionne toujours pas le contexte macro, et ce n'est pas un
oubli.** `scripts/note-marche.mjs` reçoit `data/variations.json` et
`data/actualites.json`, jamais les indicateurs saisis par le conseiller.
Écrire « et du contexte renseigné » serait faux même un jour où le
contexte est rempli.

La mention n'existe qu'à l'écran : le rapport client ne l'a jamais
portée, et n'a pas à la porter — il ne reprend pas la note.

L'état vide d'un contexte non renseigné ne change pas : voir
« Un contexte non renseigné n'applique aucune déviation ».

## Ce qui est MESURÉ et ce qui est RAPPORTÉ ne se mélangent pas

La note reçoit désormais deux matières, et **l'invite les sépare par un
titre** — « Ce qui est MESURÉ », « Ce qui est RAPPORTÉ ». Ce n'est pas de
la mise en forme : c'est la seule chose qui empêche une note de dire
qu'un marché a baissé « à cause » d'une nouvelle qu'un journal a titrée
le même jour.

Quatre règles tiennent dans la consigne, et aucune n'est facultative :

| Règle | Ce qu'elle empêche |
|---|---|
| **Un titre se cite avec son journal** — « selon Les Échos » | qu'une manchette devienne un fait dans la bouche de la note |
| **La corrélation n'est pas la cause** — « pourrait tenir à », jamais « en raison de » | qu'une coïncidence de calendrier passe pour une explication |
| **Le hors-sujet s'écarte SANS être mentionné** | qu'une note d'allocation commente un vélo électrique — les fils généralistes en charrient beaucoup |
| **Aucune valeur individuelle, même titrée** | qu'un résultat semestriel entre dans une note qui raisonne par classes d'actifs |

À l'écran, la séparation se voit : les mouvements sont dans « Ce qui a
bougé », l'actualité dans une carte à part, **« Ce que la presse
rapporte »**, qui porte sa propre mise en garde et le nom du journal sous
chaque ligne. La carte disparaît quand la liste est vide — un encart vide
laisserait croire à une panne.

## La note PROPOSE des lectures macro ; elle n'en applique aucune

C'est le seul endroit où l'actualité touche un CALCUL, et il est fermé
par un clic.

La note peut proposer une option pour tel des onze indicateurs du module
macro — `inflation = persistante`, `fiscalite = derapage` — à partir de
ce que la presse du jour rapporte. Elle l'écrit dans son fichier,
`NOTE_MARCHE.note.lecturesMacro`, et **rien d'autre ne se produit** :

- `Etat.macroChoix` reste intact tant que personne n'a cliqué ;
- `intensiteEffective()` vaut donc 0, `macroCourante().dominant` vaut
  `null`, et l'allocation cible reste **strictement la stratégique du
  profil** ;
- le clic passe par le MÊME chemin que la liste déroulante — même
  écriture, même `scenariosManuels` remis à zéro, même sauvegarde. Une
  lecture retenue est indiscernable d'une lecture saisie, et c'est
  voulu : **elle est du conseiller à partir de cet instant.**

Voir « Un contexte non renseigné n'applique aucune déviation », que ce
bloc ne doit jamais contredire.

**Quatre contrôles de `test/fumee.html` le tiennent**, et ils posent de
FAUSSES propositions plutôt que d'attendre celles du jour : la note du
dépôt n'en porte pas tous les matins, et un test qui ne s'exécute qu'un
jour sur trois ne protège rien. Ils vérifient dans cet ordre — un
identifiant inconnu est écarté sans bruit ; le RENDU n'applique aucun
choix ; l'intensité reste nulle et le dominant `null` ; et le clic, lui,
écrit bien. Le dernier compte autant que les autres : sans lui, un
bouton mort passerait les trois premiers.

⚠ `NOTE_MARCHE` est un `const` de premier niveau : il n'est **pas** une
propriété de `window`. Le harnais le lit par `lire('NOTE_MARCHE')`, pas
par `w.NOTE_MARCHE` — qui vaut `undefined` et faisait silencieusement
sauter les quatre contrôles. Les `function` deviennent des propriétés de
`window`, les `const` non ; c'est ce qui rend l'erreur crédible.

**Trois états par lecture, et le troisième est celui qui compte** :
indicateur non renseigné (on propose), déjà à la même valeur (badge
« retenue », aucun bouton), renseigné AUTREMENT (on montre les deux et
on propose de remplacer). Cacher le troisième laisserait croire que la
note n'a rien dit sur un indicateur où elle a dit le contraire du
conseiller.

**Les identifiants rendus sont vérifiés à l'écriture du fichier.** Le
schéma garantit la forme — quatre champs — pas le contenu : rien
n'empêche un `indicateur: 'petrole'`, ou une option prise sur le mauvais
indicateur. `scripts/note-marche.mjs` recoupe chaque lecture contre
`js/data/macro.js` — la MÊME source que l'application, lue par `vm` et
non recopiée —, écarte les invalides et les doublons, et les **journalise
en `stderr`**. Une lecture rejetée signale que la liste envoyée au modèle
et le modèle réel ont divergé.

**La note ne propose rien la plupart des jours, et c'est normal.** La
consigne l'interdit explicitement sur un indicateur que les titres ne
documentent pas : un indicateur muet reste ABSENT de la liste, il ne
prend pas sa valeur de repli. Une liste de onze lectures un jour
ordinaire serait une invention.

## Dix-huit fils de presse, dont aucun n'a le droit de casser la chaîne

`scripts/actualites.mjs` relève les titres du jour et écrit
`data/actualites.json`. Aucune dépendance, aucune clé : ce sont des flux
RSS ou Atom publics, analysés à la main.

**Le script ne fait jamais échouer le relevé des cours.** Chaque source
est relevée pour elle-même, son échec est **consigné dans le fichier de
sortie**, et le script sort en 0 dès qu'UNE source a répondu. Il ne sort
en erreur que si toutes ont échoué — là, c'est le réseau, pas la presse.
Dans le workflow, l'étape porte en plus `continue-on-error: true`.

**Boursorama, Les Échos, Zonebourse et La Tribune n'ont plus de flux
direct** — 404 ou 403 selon le jour. Ils passent par l'index de Google
Actualités, qui les republie titre pour titre : l'horodatage et le titre
sont ceux de l'éditeur, le lien pointe chez lui. Le jour où l'un d'eux
rouvre son fil, il suffit d'échanger l'URL.

**Reuters rend zéro** : Google Actualités ne l'indexe plus. D'où deux
sources définies **par sujet et non par éditeur** — « Séance
américaine », « Taux et obligations » — parce que c'est le sujet qu'on
veut, quel que soit le journal qui le raconte.

**Le WSJ a été essayé et retiré.** Son fil « Markets » répond 200 et sa
dernière dépêche date de janvier 2025. C'est exactement le cas que la
fenêtre de 48 h attrape sans bruit : un fil abandonné qui reste en ligne.
Un `statut: ok` avec `retenus: 0` dans `data/actualites.json` est le
signe à surveiller.

Trois pièges d'analyse, tous rencontrés :

- **Le HTML des descriptions est ÉCHAPPÉ.** Le flux porte `&lt;a href=…&gt;`,
  pas `<a href=…>`. Retirer les balises d'abord ne trouve rien, et décoder
  les entités ensuite rend un `<a>` intact dans le texte — c'est ce qui
  remplissait les résumés d'URL Google. L'ordre est : entités, PUIS
  balises, PUIS entités (les flux doublement échappés existent).
- **Google Actualités suffixe le titre du nom de l'éditeur.** Le suffixe
  fausse le dédoublonnage : la même dépêche reprise par deux journaux
  porte alors deux clés. On coupe le dernier segment court introduit par
  un tiret — sans le comparer au nom de la source, qui s'écrit « Les
  Échos — Marchés » ici et « Les Echos » là-bas.
- **Certains fils horodatent dans le futur.** La fenêtre est donc bornée
  des DEUX côtés : un titre daté de demain remonterait en tête du tri et
  y resterait.

Le relevé est **périmé à 36 h** côté note : une note du vendredi rédigée
sur les titres du lundi serait pire qu'une note sans actualité — elle
aurait l'air informée.

**Le coût de la note a doublé, et c'est assumé.** Trois relevés, tous
du 21 août 2026, et ils disent la pente :

| Invite | Entrée | Sortie | Le passage |
|---|---|---|---|
| Cours seuls | 2 177 | 1 403 | 0,046 $ |
| + actualité | 10 359 | 1 973 | 0,101 $ |
| + les onze indicateurs | **12 562** | **2 303** | **0,120 $** |

À 5 $ et 25 $ le million, cela fait **environ 2,60 $ par mois** sur
vingt-deux séances — au lieu de 1,30. La liste des indicateurs coûte à
elle seule 2 200 jetons par passage : c'est le prix d'options fermées
et d'identifiants exacts, et c'est ce qui rend les lectures
recoupables. Le chiffre affiché dans l'état vide de la vue « Note du
jour » doit suivre s'il rebouge.

L'estimation d'avant mesure — « près de huit mille jetons » — était
basse d'un quart : le compte de caractères divisé par 3,6 sous-estime le
français ponctué de titres de presse. Mesurer, pas estimer.

`node scripts/note-marche.mjs --blanc` imprime l'invite complète sans
appeler l'API ni rien écrire. C'est ce qu'on relit le jour où la note dit
quelque chose d'inattendu.

## Le questionnaire se dit autrement à qui répond sur son propre argent

Cinq questions étaient écrites dans le vocabulaire du conseiller — capacité
d'épargne, taux d'endettement, couple rendement/risque, arbitrages tactiques,
critères extra-financiers. **Elles sont justes**, c'est celui de la
réglementation ; elles ne se comprennent simplement pas quand personne n'est
là pour les traduire.

Le mode particulier les reformule, et **lui seul** :

| Clé | Ce qu'elle fait |
|---|---|
| `question.<id>` | remplace le texte de la question |
| `question.<id>.aide` | ajoute une ligne d'aide SOUS elle |

Les deux sont **absentes du mode conseiller**, qui garde son vocabulaire mot
pour mot et ne reçoit aucune aide : un professionnel n'a pas besoin qu'on lui
explique un taux d'endettement, et une explication de trop se lit comme une
condescendance.

**Aucune question n'a besoin d'être recopiée dans la table.** `T()` rend la
clé quand elle n'existe nulle part, et `libelleQuestion()` s'en sert
d'aiguillage : le repli est la question elle-même, telle qu'elle est écrite
dans `js/data/questionnaire.js`.

**Les options se surchargent par leur RANG** — `option.<id>.<n>` —, et non
par une clé posée dans `questionnaire.js`. C'est ce qui permet d'en
reformuler vingt-sept sans toucher au fichier qui porte les scores et les
métadonnées, le seul endroit où une faute de frappe changerait un profil.

Le rang est la clé, avec ce que cela implique : **réordonner les options
d'une question casse la traduction AVANT de casser le score**, et c'est tant
mieux — cela se voit. Le harnais contrôle que chaque clé vise un rang qui
existe : une clé hors rang ne se verrait nulle part, on croirait l'option
reformulée et l'on lirait le jargon.

`o.cle` reste prioritaire, pour les options qui portaient déjà leur écart de
mode.

**Quatorze questions sur dix-huit sont reformulées.** Les quatre autres sont
déjà claires : `q_objectif` (seules ses options changent), `q_vecu` (seule
son aide), `q_comprehension` et `q_reaction`, qui posent des chiffres et des
situations, pas des concepts.

**Le score, l'ordre des options et les clés techniques ne dépendent d'aucun
mode**, et ne doivent jamais en dépendre — c'est la garde « un seul moteur ».
Le harnais le tient : il refuse une clé de mode qui ne désigne aucune
question réelle, et une ligne d'aide qui se serait glissée côté conseiller.

Une option porte déjà son écart de mode depuis longtemps —
`option.arbitrages.conseillee`, « sur proposition de mon conseiller » contre
« sur proposition de cet outil ». Elle reste d'accord avec la question
reformulée, qui parle elle aussi de ce que « l'outil » propose.

## « Mon profil » se lit sans conseiller à côté

Quatre blocs reformulés en mode particulier — et **aucun chiffre, aucun
calcul, aucun plafond n'a bougé** :

- **l'en-tête** perd le SRI. Il n'est pas retiré de l'application : le
  rapport le porte toujours, et c'est là qu'il est réglementairement utile.
  En tête d'écran, un chiffre de 1 à 7 que rien n'explique ne dit rien ;
- **« Décomposition du score »** devient « Ce que vos réponses disent de
  vous », et ses trois axes des phrases plutôt que des termes ;
- **les chocs historiques** sont nommés par ce qui s'est passé — « Crise
  financière (comme en 2008) » —, pas par leur mécanisme ;
- **le bandeau de plafonnement** dit ce que la limite a fait, au lieu de
  parler d'un « score brut » et d'un « client ».

**Les scénarios sont nommés dans le moteur, et le moteur ne connaît aucun
mode** : la traduction se fait dans la vue, au RANG (`stress.<n>`), comme les
options du questionnaire. Le harnais tient les rangs.

**La carte des caractéristiques devient une carte de conséquences.** Le
conseiller lit des taux — c'est ainsi qu'il compare deux profils et qu'il
documente son conseil. Celui qui répond sur son propre argent lit des
montants : « une mauvaise année sur vingt peut coûter 28 500 € » se comprend
là où « perte annuelle à 95 % de confiance » ne dit rien.

**Aucun calcul n'est propre à un mode** : les deux colonnes sortent des mêmes
`metriques`. Le mode choisit seulement s'il les multiplie par le montant du
dossier ou s'il les affiche en pourcentage. Trois précautions :

- **deux lignes fusionnent** — volatilité cible du profil et volatilité
  estimée du portefeuille deviennent une amplitude unique en euros. La
  première reste au rapport, avec le SRI : elle justifie un classement, elle
  n'aide pas à décider ;
- **l'amplitude est un écart-type**, pas un maximum. Une infobulle le dit :
  environ deux années sur trois restent dedans. Sans elle, « normale » se lit
  comme « pire cas » ;
- **sans montant, pas d'euros.** Un dossier commencé sans montant retombe sur
  les pourcentages : afficher « 0 € » quatre fois de suite serait faux, et
  inquiétant.

Les montants sont arrondis à la centaine — un « environ » au centime se lit
comme une promesse. Et `profil.perteMax` est un TEXTE (« -25 % ») : il se
lit, il ne se calcule pas.

`mot(cle, defaut)` (js/ui/socle.js) est le petit aiguillage commun : `T()`
rend la clé quand elle n'existe nulle part, donc **le mode conseiller garde
ses phrases sans qu'elles aient à être recopiées dans la table**. C'est ce
qui permet de reformuler une vue entière sans dupliquer sa prose.

## « Mon allocation » : trois taux deviennent trois montants

Même principe que la carte de conséquences du profil, et même garde-fou :
**les calculs sont identiques dans les deux modes**, c'est la vue qui
multiplie par le montant du dossier — et seulement s'il existe. Sans montant,
les taux reviennent : « 0 € » serait faux.

`kpiMontant()` porte cette bascule pour les tuiles. Le SRI quitte la tuile
« Profil » comme il a quitté l'en-tête de « Mon profil ».

Le vocabulaire de la carte des barres suit : « Stratégique vs tactique »
devient « Votre répartition, et la cible », et les colonnes « Stratégique /
Tactique » du détail par poche deviennent « Base / Ajustée ». **Le mot
« poche » reste** : c'est l'un des trois termes de métier que l'application
garde et explique, avec « dérive » et « rotation ».

## « Mes supports » : le bandeau à vérifier a TROIS versions

Ce qu'il y a à vérifier n'est pas la même chose selon l'enveloppe, et le
bandeau unique disait faux dans deux cas sur trois :

- **en assurance-vie**, c'est le contrat de l'assureur qui décide de ce qui
  est accessible : la liste se colle, le rapprochement coche « Contrat » ;
- **en PEA et en compte-titres**, il n'existe aucun contrat de ce genre.
  C'est le **courtier** qui référence, et la question est de savoir si l'ETF
  est négociable — avant de passer l'ordre.

**Ni l'un ni l'autre de ces deux derniers ne parle de « remise au client ».**
Il n'y a pas de client. Le mode conseiller garde son bandeau unique, mot pour
mot : la clé absente rend la clé, et c'est le repli.

**Le moteur porte les morceaux, pas seulement la phrase.** L'avertissement
« Aucun support disponible pour X : Y % non investis » est écrit pour le
conseiller ; le particulier le lit en euros. Plutôt que de découper une phrase
déjà écrite à coups d'expressions régulières — ce qui casserait au premier mot
changé —, `MoteurSelection` expose `pochesSansSupport` : la poche, son nom, sa
part. **Aucun calcul n'est ajouté** : ce sont les mêmes valeurs, dites deux
fois.

**Deux tuiles fusionnent** : « frais moyens » en taux et « coût annuel » en
euros disaient le même nombre. En particulier la première porte le montant, la
seconde disparaît, et la grille passe de quatre à trois.

## `data-mot` : la prose d'index.html suit le mode elle aussi

`poserTitres()` traduisait les `h2[data-titre]`. Tout le reste de la prose
écrite dans la page — un titre de carte, le libellé d'un bouton — ne dépendait
d'aucun mode, faute de mécanisme.

`data-mot="cle"` en est un, et il ne coûte rien : **le texte écrit dans la
page reste le repli**. Une clé absente ne rend donc pas la clé mais la phrase
d'origine, et le mode conseiller n'a rien à recopier dans la table.

Le texte d'origine est retenu dans `data-mot-defaut` à la première pose : sans
lui, un second passage traduirait une traduction, et le repli aurait disparu.
`poserMots()` se pose partout où `poserTitres()` se pose — au démarrage et à
chaque changement de mode.

## « Mes arbitrages » : le mot change, le chiffre reste

« Rotation du portefeuille » devient « Part du portefeuille déplacée »,
« Ordres à passer » devient « Mouvements proposés », et les deux boutons
disent ce qu'ils font — « Enregistrer cette revue dans mon suivi »,
« Simuler ces mouvements sur mon portefeuille ».

**Le motif d'un ordre est écrit par le moteur**, qui ne connaît aucun mode :
« Surpondération de 4 pts sur Or ». Le chiffre est juste et le mot est du
métier — seul le mot change, le reste de la phrase dit déjà tout.

**« Enveloppe non imposable » est juste, et ne dit pas pourquoi.** Le détail
particulier explique le mécanisme : ce n'est pas l'arbitrage qui déclenche
l'impôt, c'est le retrait. C'est le genre de phrase qu'un conseiller dit de
vive voix et que personne n'écrit.

## « Backtest » : ce qui se déplace, et ce qui ne se cache pas

« Performance cumulée » devient « Gain total sur la période », « Volatilité
annuelle » devient « Amplitude des variations », et « Plus forte baisse »
devient « Pire passage » — avec la précision qui manquait le plus : **en cours
d'année, ça a baissé davantage**. La mesure est de fin d'année à fin d'année,
et personne ne le savait en lisant le chiffre.

**Le ratio rendement / volatilité tombe en particulier.** 0,68 ne se compare à
rien pour qui n'a pas l'habitude : c'est du bruit, pas une information. Il
reste au conseiller, qui sait ce qu'il vaut.

**L'encart des séries estimées raccourcit, il ne s'adoucit pas.** Les
pourcentages détaillés restent au conseiller — ils lui disent quelles séries
relever en premier. Ce qui compte pour l'autre lecteur tient en deux phrases :
c'est un test du modèle, pas une performance, pas une promesse.

**La carte des séries se replie, elle ne disparaît pas.** Dix-neuf lignes, cinq
colonnes et deux boutons CSV s'adressent à qui source ses séries. Sous un
`<details>`, elles restent modifiables et le lien dit ce qu'on y trouve. C'est
la règle appliquée partout dans cette passe : **on déplace, on ne cache pas** —
le SRI au rapport, les pourcentages au conseiller, les séries sous un pli.

## Les coordonnées sont facultatives, et le restent

Prénom, nom, téléphone, e-mail — plus l'adresse en mode conseiller, qui n'a
de sens que sur un document remis. **Aucun calcul n'en dépend** : un dossier
sans coordonnées se profile, s'alloue et s'imprime exactement comme un autre.

Trois règles qui vont ensemble :

- **le libellé porte « (facultatif) »**, dans les deux modes. Un champ vide
  qui ne le dit pas se lit comme un champ oublié ;
- **une ligne sous le bloc dit où elles vont** : « Ces informations restent
  dans ce navigateur et ne sont utilisées que pour votre synthèse. » C'est le
  seul endroit de l'application où l'on saisit autre chose que des montants,
  et cela mérite d'être redit là ;
- **le document remis ne montre que ce qui est rempli.** Une ligne
  « Téléphone — » sur une proposition signée dit qu'on a oublié de le
  demander ; l'absence de ligne ne dit rien du tout.

**L'accueil salue quand il sait qui il salue** — « Bonjour Marie » à la place
d'« Aujourd'hui », dans les deux modes : un conseiller ouvre le dossier de
quelqu'un. Sans prénom, le titre reste celui de la vue. Un « Bonjour » suivi
d'un blanc serait pire que pas de bonjour.

## Une phrase d'ouverture ne se pose qu'une fois

`poserOuvertures()` ressort par son `return` du haut dès que l'ouverture
existe : au changement de mode, elle ne repasse pas. Le sous-titre créé depuis
`SOUS_TITRES_VUES` porte donc `data-mot`, et c'est `poserMots()` qui le
retraduit. Sans ce relais, la phrase resterait celle du mode d'ouverture de
l'application — un défaut qui ne se voit qu'en basculant de mode, donc jamais
pendant qu'on écrit la phrase.

## Une ligne « à investir » n'est pas détenue — et c'est de l'argent

**Le moteur d'arbitrage ne voit que `lignesDetenues()`, et reçoit le reste en
apport.** Les deux moitiés vont ensemble ; l'une sans l'autre casse la vue.

L'amorce pose le portefeuille recommandé dans le suivi, **marqué « encore à
investir »**. Ces lignes décrivent ce qu'il FAUDRAIT acheter, pas ce qui est
détenu. Passées telles quelles au moteur, elles lui montraient un portefeuille
déjà parfaitement à la cible — zéro écart, zéro mouvement —, sur un dossier où
rien n'avait été acheté.

**Une seule cause, quatre écrans muets** : « aucun arbitrage nécessaire », donc
pas d'ordres, donc pas de boutons de proposition, donc une revue journalisée
vide, donc un suivi qui ne montre rien.

Les retirer de la détention ne suffit pas : le moteur n'a alors plus de
matière et rend `null` — « saisissez au moins une ligne détenue ou un apport »
sur un dossier de cent mille euros. **Une somme fléchée qui dort est un
apport**, et `apportDisponible()` la lui rend. Le total est conservé.

Sur un dossier neuf de 100 000 €, la vue rend désormais **14 achats** — le
plan d'investissement initial, exactement ce qu'annonce son sous-titre.

Trois appelants, tous alignés : l'accueil, « Situation » et « Arbitrages
proposés ». Les faire diverger, c'est afficher deux vérités sur la même
détention.

## La barre d'actions des arbitrages ferme la vue, et « Confirmer » est au bout

Elle était prise dans le zigzag : bornée à 72 % de la grille et poussée
d'un côté ou de l'autre **selon son RANG parmi les blocs de la vue**. Le
rang dépend du dossier — un encart de fiscalité de plus et la parité
bascule —, donc la barre changeait de côté d'un dossier à l'autre. Ses
boutons, tassés à gauche de sa boîte, laissaient « Confirmer ces
arbitrages » au milieu de la page avec cent trente pixels de vide à sa
droite.

Elle **sort du zigzag**, comme `.barre-parcours` avant elle et pour la
même raison : ce n'est pas un bloc qu'on lit, c'est le geste qui clôt la
vue. Pleine largeur, boutons rangés au bord droit — le même bord que les
cartes du dessus. `justify-self: stretch` est nécessaire EN PLUS de
`grid-column: 1 / -1` : sans lui, les règles de parité du zigzag
ramènent la barre à sa largeur de contenu et `flex-end` n'a plus d'effet.

**Ranger la barre à droite ne suffisait pas.** « Confirmer » est le
PREMIER bouton du balisage, donc le plus à gauche de sa rangée : il
s'était éloigné du bord au lieu de s'en rapprocher. Il passe au bout par
**`order: 1`, et non dans le balisage**.

Le déplacer dans le HTML aurait cassé le **téléphone**, où la barre
s'empile et où ce bouton doit rester en tête — c'est le geste évident
qu'on vient chercher, et l'enterrer sous quatre boutons secondaires
annulerait la raison de son existence (voir la section suivante).
`order` ne bouge que le rendu, et seulement au-delà de 901 px, là où la
rangée est horizontale. Vérifié : à 375 px l'ordre calculé retombe à 0
et « Confirmer » reste le premier affiché.

**Le prix est assumé et ne se généralise pas** : sur grand écran, la
tabulation atteint « Confirmer » en premier alors qu'il s'affiche en
dernier. C'est le seul endroit du dépôt où l'ordre visuel et l'ordre de
tabulation divergent. Pour cinq boutons d'une même rangée, l'écart est
tenable ; sur un formulaire, il ne le serait pas.

## Confirmer des arbitrages : deux métiers, deux gestes

**Le conseiller garde ses deux boutons séparés** — journaliser sans appliquer,
parce qu'il attend l'exécution réelle chez l'assureur. Fondre les deux lui
ferait perdre une distinction qu'il utilise tous les jours.

**Mais « Confirmer ces arbitrages » lui a été AJOUTÉ en tête, et ses deux
boutons sont passés au second rang.** La distinction reste ; ce qui manquait,
c'était le geste évident. Sur téléphone, la barre proposait « Valider la revue
et l'inscrire au journal » et rien qui dise « c'est exécuté, mets à jour le
portefeuille » : on lui demandait de composer lui-même l'action qu'il vient
chercher. Trois boutons, une intention chacun.

**Le mode particulier n'a pas bougé** — il avait déjà ce bouton. Le geste du
journal seul n'y apparaît pas et n'y apparaîtra pas : qui gère son propre
argent n'attend l'exécution de personne.

`arbitrages.confirmation` et `arbitrages.confirme` n'existaient qu'en mode
particulier. Elles portent désormais un repli : sans lui, le conseiller
verrait la CLÉ s'afficher dans la boîte de dialogue.

**Celui qui gère son propre argent n'a pas cette attente.** Un seul bouton —
« Confirmer ces arbitrages » — fait les trois gestes : journal, portefeuille,
et redirection vers le suivi. La simulation reste disponible, au second rang,
sous « Simuler sans confirmer ». C'est la boucle que le testeur demandait :
**proposer → confirmer → retrouver.**

**C'est le seul endroit de l'application qui change DEUX choses à la fois** —
la détention et le journal. D'où la question, posée avec le nombre de
mouvements, et d'où le retour en arrière : le journal garde la trace, mais la
détention d'avant serait perdue. Elle est mise de côté, et le bandeau
d'arrivée porte le lien qui la rend.

**Cette mémoire ne survit ni au rechargement, ni à un passage par une autre
vue**, et c'est voulu : une annulation qui traverse les jours n'est plus une
annulation, c'est une seconde vérité qui coexiste avec la première. Le
bandeau se lit là où l'on atterrit, une fois.

`appliquerOrdres()` sert aux deux chemins — simuler et confirmer. Deux copies
du même calcul finiraient par diverger, et c'est le portefeuille détenu
qu'elles décriraient de deux façons.

## L'envoi automatique : l'application n'envoie toujours rien, la tâche planifiée si

Deux chemins, et ils ne se confondent pas. **L'application** ouvre un
brouillon dans le logiciel de messagerie de celui qui clique — rien ne
quitte le navigateur, c'est la section suivante. **La tâche planifiée**,
elle, envoie pour de bon, sans que personne ne soit devant l'écran.

**Un seul texte pour les deux, et c'est la raison du déménagement.**
`texteProposition()` et `signatureProposition()` ont quitté
`js/ui/vues-allocation.js` pour `js/ui/dossier.js`. Ce ne sont pas des
vues : c'est ce que le dossier VAUT, mis en lignes. Surtout,
`dossier.js` ne touche pas au DOM — il s'exécute donc en Node, et
`scripts/proposition.mjs` appelle la MÊME fonction. Mesuré : la même
empreinte SHA-256 du texte des deux côtés, `2b5bff82ebe03f08`.

**Le dossier arrive par un secret, jamais par un fichier.** Le dépôt est
public et `.gitignore` interdit `dossier-*.json` : un dossier commité
publierait nom, patrimoine, revenus et lignes détenues. Il passe donc par
le secret `DOSSIER_CLIENT`, chiffré, invisible dans le site.

**Le dossier est une photo, les cours sont frais.** L'export fige la
composition du portefeuille ; les cours, eux, sont relevés chaque matin.
Les montants et la dérive restent donc justes tant que la composition n'a
pas changé — c'est ce qui rend l'idée tenable. Passé `PEREMPTION_J`
(120 jours), le message le dit lui-même : une photo périmée qui se tait
passerait pour une lecture fraîche.

**Ce qui déclenche un envoi** : la proposition a changé. L'empreinte
porte sur le TEXTE, pas sur la liste des ordres — deux jours où la dérive
bouge sans changer un seul montant arrondi ne valent pas deux e-mails.
L'état est versionné dans `data/proposition-envoyee.json`, donc public :
il ne porte qu'une empreinte, une date et un décompte. Une empreinte ne
se remonte pas.

**L'état n'est committé qu'APRÈS l'envoi.** Le corps et l'état voyagent
en artefact entre les deux travaux ; si la course est annulée pendant le
délai, rien n'est retenu et la proposition repartira demain. L'ordre
inverse ferait taire l'envoi suivant.

### Trois verrous, indépendants

| Verrou | Où | Ce qu'il fait |
|---|---|---|
| **L'interrupteur** | variable de dépôt `PROPOSITION_ENVOI` | tant qu'elle ne vaut pas `actif`, rien ne part. Deux clics, sans déploiement |
| **Le délai** | environnement GitHub `proposition`, règle `wait_timer` (30 min) | la course attend, et reste annulable d'un clic depuis Actions. Remplaçable par des *required reviewers* sans toucher au workflow |
| **L'avis de contrôle** | secret `EMAIL_CONTROLE` | un e-mail part D'ABORD vers vous, avec le texte exact et le lien d'annulation |

Le troisième n'est pas un confort : **sans lui le deuxième ne protège de
rien**, puisque personne ne saurait qu'il y a quelque chose à annuler.

### Le mode essai passe outre l'interrupteur, et c'est voulu

`workflow_dispatch` porte une case **« essai »** : le calcul se fait, le
message s'écrit, il part **vers `EMAIL_CONTROLE` et nulle part ailleurs**
— le travail d'envoi au client ne démarre pas. C'est ce qui permet de
vérifier Brevo, l'expéditeur validé et le dossier sans risquer un envoi.

Il ignore `PROPOSITION_ENVOI` **délibérément**. Exiger d'armer l'envoi
pour vérifier la plomberie reviendrait à charger l'arme pour tester la
sécurité — et c'est précisément au moment où l'on n'est sûr de rien qu'on
veut essayer.

⚠ `inputs.essai` vaut `null` hors déclenchement manuel. La garde du
travail d'envoi s'écrit donc `inputs.essai != true` et non
`!inputs.essai` : la seconde forme serait vraie sur `null` et
**bloquerait tous les envois automatiques**.

### ⚠ Le dépôt est public, donc ses journaux d'exécution le sont

GitHub masque les valeurs de secrets — **mais seulement dans les travaux
qui portent le secret en question**. Le travail d'envoi ne porte pas
`EMAIL_CONTROLE` : l'adresse du client s'y écrivait donc en clair, à
chaque passage, dans un journal lisible par n'importe qui.

Trois gestes, et ils vont ensemble :

- **`envoyer-mail.mjs` réduit l'adresse** avant de l'imprimer :
  `m…e@gmail.com`. Assez pour vérifier d'un coup d'oeil que c'est la
  bonne, pas assez pour la récolter.
- **Le workflow passe par une VARIABLE de shell**, jamais par une
  interpolation `${{ }}`. Le journal imprime la commande telle qu'elle est
  écrite — « $DEST » — et non sa valeur. L'avis de contrôle, lui, part
  dans un fichier : le destinataire y est en clair, et c'est bien le
  moins, puisque c'est ce qu'on demande de relire.
- **Une seule sortie franchit la frontière entre les deux travaux** :
  `envoyer`, qui vaut « oui » ou « non ». Jamais une donnée. Les autres
  seraient soit caviardées, soit publiques.

### ⚠ Une sortie de travail qui contient un secret est CAVIARDÉE

GitHub efface une `job output` dont la valeur est celle d'un secret. Elle
arrive **vide** dans le travail suivant, sans avertissement, sans ligne de
journal, sans échec — le travail démarre et découvre une chaîne vide.

C'est arrivé sur l'envoi réel : l'adresse du destinataire est aussi la
valeur du secret `EMAIL_CONTROLE`, donc `--a=""`. Et le piège est
retors : **à l'intérieur d'un même travail, la sortie d'étape passe très
bien** — l'avis de contrôle affichait l'adresse correctement trois lignes
plus haut. C'est le FRANCHISSEMENT entre deux travaux qui la perd.

L'adresse, l'objet et le décompte voyagent donc dans
`data/proposition-enveloppe.json`, **par l'artefact**, comme le corps du
message. C'est d'ailleurs plus juste : ils appartiennent au message, pas
au protocole entre deux travaux.

Le fichier est **gitignoré** : il porte l'adresse du client. Seul
`data/proposition-envoyee.json` est versionné, et il ne porte qu'une
empreinte.

Ce qui a permis de le voir en un coup d'oeil : `envoyer-mail.mjs` refuse
une adresse vide en décrivant sa forme — « 0 caractère(s), 0 arrobase(s) ».
Sans cette description, Brevo aurait répondu son habituel « email is not
valid in to » sur une valeur masquée.

### ⚠ `socle.js` et `dossier.js` doivent rester exécutables hors navigateur

C'est une propriété fragile et invisible. Ajouter un
`document.querySelector` dans `dossier.js` ne casse rien à l'écran, ne
lève aucune erreur au navigateur, et fait échouer la tâche planifiée le
lendemain matin — en silence, puisque personne ne la regarde.

`node test/runner.js` la tient par trois contrôles : les deux fichiers
s'exécutent dans un `vm`, les sept fonctions dont l'envoi a besoin y sont
atteignables, et le texte se construit réellement, réserve comprise.
Vérifié qu'il échoue : une ligne `document.querySelector` ajoutée à
`dossier.js` donne « document is not defined ».

## L'e-mail de proposition : l'application n'envoie rien

« Préparer l'e-mail » ouvre le logiciel de messagerie avec un brouillon
pré-rempli. **Rien ne quitte le navigateur** : pas de serveur, pas de carnet
d'adresses, pas de trace des envois. C'est écrit dans « Méthode & limites »,
à côté de « il ne passe aucun ordre » — c'est la même promesse.

Le même texte sert au `mailto:` et au presse-papier : deux versions du même
message finiraient par diverger, et c'est celle qu'on envoie qui serait la
mauvaise. La seule différence est la longueur.

**⚠ La limite des `mailto:` porte sur l'URL ENCODÉE, pas sur le texte.** Un
accent devient trois caractères, un retour à la ligne aussi : 1 500 signes de
français en font 2 600 une fois encodés. Budgéter sur le texte brut laissait
passer des liens d'un tiers trop longs, que certains clients de messagerie
tronquent en silence. On resserre donc tant que l'URL dépasse 1 900.

**La réserve ne se coupe jamais.** « Rien n'est exécuté : les ordres sont à
passer par vos soins » survit à toute troncature — sans quoi un message
tronqué deviendrait un ordre. Ce qui se coupe, c'est la liste, et le message
dit qu'elle a été coupée. Le bouton « Copier le texte » donne la version
entière.

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

## Les séries du backtest : une date, un seuil, et une référence relevable

**Une seule date de relevé** — `HISTORIQUE_RELEVE` dans
`js/data/historique.js` — et non une par série : le relevé se fait d'un bloc,
en suivant la procédure du README. Dix-neuf dates à tenir pour un geste unique
finiraient par diverger sans que personne ne s'en aperçoive.

**Seuil de 400 jours, pas 365.** Une série gagne une année CIVILE par an, et
l'on ne la relève qu'une fois la performance de l'année close et publiée — ce
qui prend quelques semaines de plus qu'un anniversaire. La pastille se pose à
côté de la part sourcée, et écrit son âge au-delà : même mécanique que les
trois de l'accueil.

**La référence d'une poche est un ETF, pas un indice.** Neuf poches portaient
un nom d'indice ; les dix autres portaient une DESCRIPTION — « Obligations
souveraines € 1-3 ans », « €STR capitalisé » — qui ne correspond à aucune
fiche consultable. Elles pointent désormais sur l'ETF de l'univers qui couvre
la poche : sa performance est nette de ses propres frais, en euros, et c'est
ce qu'on détient réellement.

**⚠ Une fiche justETF publie QUATRE années civiles closes, pas cinq.** En août
2026 : 2022 à 2025, et rien pour 2021. La fenêtre du backtest en couvre cinq —
2021 n'a donc aucune source publique sur justETF, pour aucun support. Trois
issues, dans l'ordre : attendre janvier 2027, où la fenêtre glisse sur
2022-2026 et le problème disparaît seul ; relever 2021 sur la fiche de
l'émetteur, qui en publie dix ; ou retirer 2021 de `ANNEES_HISTORIQUE`, quatre
années sourcées valant mieux que cinq dont une inventée.

## Chaque relevé a sa cadence, donc son seuil de péremption

Les trois pastilles de fraîcheur portent des dates qui n'ont rien à voir
entre elles, et il faut le savoir avant de les lire :

| Relevé | Cadence réelle | Seuil |
|---|---|---|
| **Cours** · Euronext | chaque séance, du mardi au samedi (`cours.yml`) | 4 jours |
| **Notations** · Morningstar | le 1er de chaque mois (`catalogue.yml`) | 45 jours |
| **Caractéristiques** · justETF | **aucune — c'est un relevé à la main** | 90 jours |
| **Actualité** · 18 fils de presse | juste avant la note, même workflow (`cours.yml`) | **36 h** |

Le seuil de l'actualité est le plus court des quatre, et pour une raison
qui n'est pas la fraîcheur des données : une note du vendredi rédigée sur
les titres du lundi serait **pire** qu'une note sans actualité — elle
aurait l'air informée. Passé 36 h, `scripts/note-marche.mjs` ignore le
fichier et le dit dans sa mention de provenance. Ce seuil-là ne porte
aucune pastille : il n'y a rien à surveiller à l'écran, la note se
contente de dire ce qui a servi à l'écrire.

**Rien n'écrit `donneesLe`.** Ni script, ni tâche planifiée : les frais,
encours, réplication, devise, capi/dist et éligibilité PEA des 42 supports
de l'univers de travail sont saisis à la main, et vieillissent en silence.
Le relevé du 15 août 2026 avait corrigé neuf ISIN qui désignaient un autre
fonds que celui annoncé et quatorze frais faux : ce n'est pas une donnée
d'agrément.

D'où le garde-fou : au-delà du seuil, la pastille prend le filet bleu et
**écrit son âge**. Même mécanique que le badge de la note du jour, et pour
la même raison — le nombre de jours EST l'alerte, la palette n'a pas de
rouge et n'en veut pas.

Le seuil des notations n'est pas décoratif non plus : à quarante-cinq
jours, c'est qu'un passage mensuel a échoué sans que personne ne le voie.

## Le rapprochement ne compare que ce qui a la même définition

Chaque passage mensuel du catalogue rapproche les 42 supports de l'univers
du screener Morningstar et écrit `js/data/ecarts-univers.js`. **Rien n'est
écrasé** : le relevé manuel justETF reste la référence, la liste dit
seulement quelles fiches rouvrir au prochain relevé trimestriel. Le premier
passage l'a montré — sur les trois écarts de frais trouvés, deux ont été
revérifiés le jour même sur justETF, et **c'est le catalogue qui avait tort
les deux fois**.

**Trois colonnes ont l'air comparables et ne le sont pas.** Les inclure
noierait les vrais écarts sous trente lignes de bruit tous les mois, et la
liste serait abandonnée au deuxième passage.

| Colonne | Pourquoi elle est dehors |
|---|---|
| **Encours** | Morningstar donne la taille du FONDS ENTIER, justETF celle de la PART. Les quatre parts de Xtrackers MSCI Japan portent toutes 7 623 M€ au catalogue quand la 4C EUR-Hedged en fait 924 : **+725 % d'écart apparent, zéro information** |
| **Devise** | Le catalogue donne celle de la PART COTÉE (« 2D USD » → USD), notre champ celle du FONDS. Seize « USD vs EUR » qui n'en sont pas |
| **Nom** | Mesuré : les paires VRAIES scorent de 0,60 à 1,00, les paires FAUSSES jusqu'à 0,80. **Les deux nuages se recouvrent, aucun seuil ne sépare.** Bas, il laisse passer un ISIN faux ; haut, il crie sur une abréviation |

La poche a été essayée aussi : trois écarts permanents, qui sont des choix
de classement et non des erreurs — le Nasdaq 100 est en `act-tech` chez nous
et en `act-us` chez Morningstar. Un signal qui ne se corrigera jamais est un
signal qu'on apprend à ignorer.

**Reste ce qui a la même définition des deux côtés : les frais et la
présence.** Les frais tolèrent le centième — 0,20 et 0,2 sont le même
nombre. La disparition d'un ISIN du catalogue dit une fermeture ou une
fusion, et n'a aucun faux positif.

Le nom du catalogue est **affiché** à côté du nôtre sur chaque ligne
signalée : l'œil tranche là où l'algorithme ne peut pas. Il ne déclenche
rien. **Ne pas le rétablir en déclencheur sans refaire la mesure** — elle
est reproductible, et elle échouera de nouveau.

`node test/runner.js` tient ces trois exclusions par des assertions : un
rapprochement qui se remettrait à comparer l'encours fait rougir le harnais.

## Un PEA ne peut pas porter une allocation diversifiée, et il faut le dire

« Élargissez les filtres ou complétez l'univers ETF » suppose qu'une solution
existe. **En PEA, pour les poches obligataires, l'or et les matières
premières, il n'y en a pas.** Mesuré sur le catalogue européen entier —
4 530 supports, dont **35 éligibles au PEA** — il n'existe **aucun** ETF PEA
obligataire, **aucun** sur l'or, **aucun** sur les matières premières. Ce
n'est pas un trou de données : c'est la loi.

| Sur l'allocation Dynamique en PEA | Part couverte |
|---|---|
| Univers de travail, filtre d'encours par défaut (500 M€) | **54,0 %** |
| Le même, filtre abaissé à 100 M€ | **62,0 %** |
| Catalogue européen complet | **60,8 %** |

**Basculer sur le catalogue rapporte moins qu'abaisser le filtre d'encours**,
et les deux laissent 38 à 46 % hors d'atteinte. Envoyer quelqu'un régler un
filtre pour une chose qui n'existe pas lui fait perdre une heure et sa
confiance : le bandeau dit donc l'impossibilité, et ce qu'on fait à la place —
une autre enveloppe, ou de l'épargne sécurisée à côté.

Le mode conseiller garde sa phrase d'origine tant qu'elle n'a pas été
arbitrée. Elle est pourtant trompeuse là-bas aussi.

**Le bouton « Chercher dans le catalogue complet » vient APRÈS l'impossibilité,
et dit lui-même qu'il ne la lèvera pas.** Sans cette réserve on le prendrait
pour la solution — c'est le geste qu'il propose, pas le résultat. Il demande
avant de basculer : le catalogue est plus large, mais aucune de ses lignes
n'a été relue, et les supports retenus porteront « à vérifier ». C'est un
échange, pas une amélioration, et l'échange se dit avant, jamais après.

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
