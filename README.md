# Allocation ETF — profilage, allocation d'actifs et arbitrages

> ### ⚠️ Avertissement
>
> **Cette application ne constitue pas un conseil en investissement**, ni une
> recommandation d'achat ou de vente, ni une sollicitation d'investir. C'est un
> outil de travail interne destiné à un professionnel, qui doit valider,
> compléter et signer toute préconisation dans le cadre d'un rapport
> d'adéquation.
>
> **Les caractéristiques de marché des ETF ont été relevées sur justETF le
> 20 août 2026** — nom, ISIN, frais, encours, réplication, devise, éligibilité
> PEA — et **les notations Morningstar le 16 août 2026**. Elles vieillissent :
> les notes sont recalculées chaque mois. **Un contrôle reste à faire, dossier
> par dossier** : le référencement effectif de chaque support dans le contrat du
> client. Il se fait en collant la liste des supports de l'assureur dans
> « Univers ETF ».
>
> Les investissements en unités de compte présentent un **risque de perte en
> capital**. Les performances passées ne préjugent pas des performances futures.
> Les rendements, volatilités et projections affichés sont des estimations
> fondées sur des hypothèses paramétrables, pas des garanties.
>
> Aucune donnée saisie n'est transmise : tout reste dans le navigateur de
> l'utilisateur. Aucun droit d'utilisation ou de reproduction n'est concédé
> (absence de licence = tous droits réservés).

Outil d'aide à la décision pour la construction et le suivi d'un portefeuille d'ETF
en assurance-vie, PEA ou compte-titres. Il enchaîne six étapes :

1. **Questionnaire de profilage** (structure MIF 2 / DDA) → profil de risque
2. **Allocation stratégique** issue du profil (actions / obligations / monétaire / diversifiants)
3. **Lecture du contexte** économique, géopolitique et fiscal → probabilités de scénarios → **déviations tactiques bornées**
4. **Sélection des supports** dans un univers ETF restreint, filtré par enveloppe et par contrat
5. **Arbitrages** : comparaison au portefeuille détenu, ordres à passer, fiscalité, journal de suivi
6. **Situation** : relevé daté du portefeuille, arrêtés semestriels, effet des arbitrages proposés

## L'écran d'ouverture : « Aujourd'hui »

L'application s'ouvre sur un écran qui répond à une seule question : y a-t-il
quelque chose à faire aujourd'hui ?

- **Dossier incomplet** — les étapes manquantes sont listées une à une, avec ce
  qui reste à renseigner et le bouton qui y mène. Il en faut trois : le montant
  et l'enveloppe, le questionnaire, et les lignes détenues.
- **Dossier complet** — le verdict d'arbitrage s'affiche en grand, puis le
  détail des ordres, l'encours, la dérive maximale et la date de la dernière
  revue.

Le verdict passe volontairement avant le détail. La réponse est le plus souvent
« rien à faire », et un écran d'accueil qui présenterait d'emblée une liste
d'ordres pousserait à la rotation — ce que les bandes de tolérance servent
précisément à éviter.

## Situation des placements

Un relevé daté : ce qui est détenu, à quel cours, pour quelle valeur, et quelle
part du portefeuille. La date se choisit librement ; les arrêtés du **30 juin**
et du **31 décembre** sont proposés d'office.

Deux natures de relevé, que l'écran ne mélange jamais :

- **Figée** — quantités et cours enregistrés à la date dite. C'est un relevé.
- **Reconstituée** — quantités d'aujourd'hui revalorisées aux cours d'une date
  passée. Exacte seulement si le portefeuille n'a pas bougé depuis, et toujours
  signalée comme telle. C'est une estimation.

Les arrêtés franchis depuis la dernière ouverture se figent d'office : c'est le
moment où les quantités connues sont encore celles de l'arrêté. **Aucun arrêté
antérieur à la première utilisation n'est figé rétroactivement** — enregistrer
une reconstitution comme un relevé lui prêterait une exactitude qu'elle n'a pas.

Trois réserves sont affichées quand elles s'appliquent : une ligne saisie en
montant et non en quantité ne suit pas les cours ; un support sans historique
(coté hors Euronext) est valorisé au dernier cours connu, postérieur à la date
demandée ; un support sans aucun cours ne reçoit aucune valeur inventée.

La rubrique porte enfin la comparaison **avant / après arbitrage** : le
portefeuille actuel et ce qu'il deviendrait si les ordres proposés étaient
passés, classe par classe, avec les deux relevés détaillés côte à côte.

Le **rapport client s'ouvre sur cette situation** : « 1. Situation de départ »
donne le portefeuille détenu, sa répartition, et le rappel du dernier arrêté
figé avec l'évolution depuis. On dit d'où l'on part avant de dire où l'on va.
Le choix de la date et le figeage restent dans « Situation » : le
rapport ne montre que le jour même. Les sections du rapport sont numérotées à
l'assemblage, « Revenus programmés » n'y figurant que si un besoin est
renseigné.

## Catalogue européen

L'univers de travail compte 42 supports vérifiés. À côté, un **catalogue de
4 533 ETF** cotés à Paris, Amsterdam, Bruxelles, Francfort, Milan et Londres,
recensés par

```bash
node scripts/catalogue.mjs
```

**Rien n'y est vérifié.** Le catalogue sert à deux choses : retrouver le
support que le contrat référence pour l'ajouter d'un clic à l'univers de
travail — il arrive alors avec le drapeau « Contrat » à faux et une note
rappelant ce qui reste à renseigner — et servir de source à la sélection
automatique, sur le mode décrit plus bas.

Chaque ligne porte l'ISIN, le nom, l'émetteur, la catégorie Morningstar, les
frais courants, la note en étoiles, la devise, les places de cotation, la poche
déduite, l'**encours en millions d'euros**, la **date de création** et le
**SRRI de l'ancien DICI**.

> ⚠️ **Le SRRI n'est pas le SRI.** Morningstar publie l'indicateur synthétique
> de l'ancien DICI UCITS, calculé sur la seule volatilité. Le SRI du document
> d'informations clés PRIIPs y ajoute le risque de crédit et suit une échelle
> différente : un ETF actions monde y ressort à **4** quand son SRRI vaut **6**.
> Sur les 41 supports de l'univers qui ont un SRRI au catalogue, il diffère du
> SRI saisi dans **31 cas**, presque toujours d'un à deux crans au-dessus. Le
> champ `sri` reste donc vide pour les supports du catalogue, et le SRI reste à
> relever sur chaque DIC.

Trois partis pris :

- **Chargé à la demande.** Le fichier pèse un demi-mégaoctet ; l'application
  démarre sans lui et ne l'injecte, par un `<script>`, que si l'on ouvre le
  catalogue. Un `fetch` aurait échoué sur un double-clic en `file://`.
- **Levier, inverse et actifs numériques écartés** — 1 892 lignes sur 6 425.
  Ils n'ont pas leur place dans un conseil patrimonial en unités de compte.
- **Une poche déduite, jamais inventée.** 2 603 supports sur 4 533 sont
  rattachés à une poche du modèle par leur catégorie Morningstar. Les autres
  arrivent sans poche, à trancher à la main : un rattachement faux serait pire
  qu'un rattachement absent — il ne se voit pas. Le rattachement respecte la
  devise de la poche et se méfie des libellés qui accrochent un motif sans le
  mériter (« Actions Asie hors Japon »).

**1 351 supports sont cotés sur Euronext** : ce sont les seuls dont
`maj-cours.mjs` sait relever les cours, et donc les seuls qui se revalorisent
et se situent à une date passée sans saisie manuelle.

### Parcourir le catalogue

L'onglet *Univers ETF* affiche le catalogue en **liste à défilement** : une
carte par support — nom, émetteur, ISIN, poche, note, frais, encours, devise,
année de création — plutôt qu'une rangée de tableau, illisible sur un
téléphone une fois réduite à sept colonnes.

La liste s'allonge par tranches de soixante à mesure qu'on descend : quatre
mille cinq cents lignes posées d'un coup dans le document tiennent la page
bloquée une seconde entière sur un téléphone. Un bouton « Afficher soixante de
plus » reste pour ceux qui n'utilisent pas la molette. Trois filtres se
combinent — recherche libre, poche, places — et la saisie est temporisée, sans
quoi filtrer quatre mille cinq cents lignes à chaque lettre rend la frappe
poisseuse.

## Méthode & limites

Une vue dédiée, dans le registre secondaire, en six sections : d'où viennent
les allocations stratégiques, comment sont calculées les déviations tactiques,
**sur quels ETF l'outil choisit**, ce que le backtest mesure et ne mesure pas,
où sont stockées les données, et ce que l'outil ne fait pas. Elle est écrite **pour le conseiller** : elle dit que
les pondérations sont calibrées à la main, que la majorité des séries du
backtest sont estimées — la part exacte est calculée en direct sur le profil
courant, jamais écrite en dur —, et qu'un dossier non exporté est perdu avec
son navigateur.

Le rapport client reçoit une **annexe « Méthode »** d'une demi-page, tirée des
seules sections 1, 2 et 6 : d'où vient l'allocation, ce qu'est une déviation
tactique et quand elle s'applique, ce que l'outil ne fait pas. Ni le détail du
backtest, ni le stockage — ce sont des sujets d'outil, pas de conseil.
L'annexe se décoche avant impression.

**La règle du contexte non renseigné figure dans les deux**, et l'annexe le dit
au client quand c'est le cas : « Aucune déviation n'est appliquée dans le
présent document. »

## Avant d'imprimer

Quatre contrôles rassemblés en tête du rapport, à l'instant où le document
cesse d'être un écran de travail pour devenir une pièce remise et signée :

| Contrôle | Ce qu'il regarde |
|---|---|
| Référencement au contrat | combien des supports proposés ne portent pas la coche « référencé au contrat » |
| Vue de marché appliquée | si le document présente l'allocation stratégique seule ou une allocation déviée |
| Part estimée du backtest | quelle fraction de l'allocation testée repose sur des séries non vérifiées |
| Nom du dossier | s'il est renseigné, faute de quoi le rapport imprime un tiret |

**Aucun ne bloque l'impression.** Un outil qui refuse d'imprimer se contourne,
et le conseiller reste seul juge de ce qu'il remet : c'est une relecture, pas
un garde-fou. Les deux contrôles du milieu ne signalent d'ailleurs pas des
défauts mais des points à confirmer — une allocation stratégique seule est une
réponse complète, et le backtest ne figure pas au rapport.

Chaque ligne se coche une fois relue. **La coche retient l'état exact qu'elle a
validé** : un support de plus, un contexte saisi, un nom corrigé, et elle tombe
d'elle-même. La liste ne s'imprime pas.

## Accéder à l'application

En ligne : **https://mayeullecomte.github.io/myetf/**

La page est publique. Elle ne comporte aucun serveur : les données saisies
restent dans le navigateur de chaque utilisateur (`localStorage`) et ne sont
transmises à personne. Deux utilisateurs de la même adresse ne partagent donc
pas leurs dossiers — l'échange se fait par « Exporter le dossier » puis
« Importer ».

## Deux modes de lecture

L'application se lit de deux façons, et **les deux coexistent le temps de
trancher** : l'une des deux sera vraisemblablement retirée.

### L'écran d'entrée

À la toute première ouverture, l'accueil ne montre pas le dossier mais deux
choix de même poids :

| | |
|---|---|
| **Je suis conseiller** | Je construis et suis un dossier pour un client |
| **J'investis pour moi-même** | Je construis mon allocation seul, sans conseiller |

Il ne paraît **que sur un dossier vierge dont le mode n'est pas choisi**. Un
dossier déjà commencé ne le voit jamais : il s'ouvre en mode conseiller, sans
rien demander. C'est aussi ce qui arrive à un dossier enregistré ou exporté
avant que le champ existe.

« Nouveau dossier », dans l'en-tête, efface tout et fait donc réapparaître
l'écran d'entrée.

### La bascule, ensuite

Elle est dans **« Client & enveloppe »** — « Mon enveloppe » en mode
particulier — sous l'intitulé **Mode de lecture**, au bas des champs du
dossier. Elle prend effet en place : le vocabulaire et la navigation changent
sans rechargement et **sans rien perdre de la saisie**.

Elle n'est pas dans un réglage d'application, et c'est délibéré : le mode est
une propriété **du dossier**, pas du navigateur.

### Le mode est un champ du dossier

`mode` vaut `"conseiller"` ou `"particulier"`, à côté de l'identité, des
réponses et des lignes détenues. Il est **enregistré avec le dossier et voyage
avec lui à l'export** : un dossier transmis à quelqu'un d'autre s'ouvre dans le
mode où il a été construit. Deux dossiers sur le même navigateur peuvent donc
être lus dans deux modes différents.

### Ce que le mode change — et ce qu'il ne change pas

Il ne touche **ni les calculs, ni les moteurs, ni le format du dossier**. Le
harnais de fumée le vérifie explicitement : sans contexte, le même dossier rend
la même allocation cible dans les deux modes.

Trois choses seulement changent :

| | Conseiller | Particulier |
|---|---|---|
| **Vues montrées** | les seize | treize — Note du jour, Contexte et Revenus & rachats quittent la navigation |
| **Vocabulaire** | « Rapport de préconisation », « Âge du client » | « Ma synthèse », « Votre âge » |
| **Rapport** | adéquation, signatures conseiller et client | avertissement en tête, ni adéquation ni signature |

Les vues masquées **restent atteignables par leur ancre** : `#note` ouvre
toujours la note du jour dans les deux modes. Masquer porte sur la navigation,
jamais sur le routage — c'est ce qui garde le widget iOS vivant.

Le vocabulaire vit dans `js/data/libelles.js`, en une table de défauts — celle
du conseiller — et une table d'écarts qui ne porte que ce que le mode
particulier change. Cette seconde table se lit donc comme la définition du
mode, et le jour où l'un des deux l'emporte, il y a un littéral à supprimer ou
des écarts à replier.

## Navigation

Quinze vues réparties en quatre blocs, plus les données en registre secondaire :

| Bloc | Vues |
|---|---|
| **Aujourd'hui** | l'écran d'ouverture |
| **Profil** | Client & enveloppe · Questionnaire · Profil de risque |
| **Allocation** | Note du jour · Contexte · Allocation cible · Sélection des supports · Arbitrages · Backtest |
| **Suivi** | Situation · Revenus & rachats · Journal · Rapport |
| **Données** *(secondaire)* | Univers ETF · Méthode & limites |

**Aucun numéro d'onglet.** Un rang laisserait croire à un ordre obligatoire,
alors qu'on peut très bien saisir un portefeuille avant de remplir le
questionnaire. Ce qui compte n'est pas le rang mais l'état : une pastille
pleine pour ce qui est fait, un anneau doré pour ce qui est entamé, un anneau
pâle pour ce qui reste. Tout message qui renvoie à une étape la nomme et porte
le bouton qui y mène.

**La note du jour et le contexte restent deux vues distinctes**, côte à côte
dans le même bloc. L'une est rédigée par un script, l'autre saisie par le
conseiller : les fondre en une page effacerait cette différence de nature.

**Chaque vue du parcours porte une barre « ← précédent / suivant → »**, posée
par le code à partir des blocs ci-dessus. C'est la seule définition de l'ordre :
les boutons écrits à la main dans `index.html` avaient fini par en dévier, et
« Profil de risque » enchaînait sur le contexte en sautant la note du jour.

**Les quinze ancres `#…` sont inchangées** et le resteront : elles servent de
routage au démarrage, et `#note` comme `#accueil` sont ouvertes par le widget
iOS. `test/fumee.html` vérifie que chacune résout et ouvre bien sa vue.

## Interface — trait bleu

Blanc et bleu, cartes filetées, illustrations au trait noir. Une seule couleur,
une seule police, et des chiffres qui se lisent en colonne.

| | |
|---|---|
| Fond | `#F7F9FC` · cartes `#FFFFFF` · filets `#DFE5F0` |
| Texte | `#15161A` · secondaire `#6B6E76` |
| Accent | `#2F6BFF` · clair `#8FB3FF` · pâle `#E6EEFF` · liens `#1E4FCC` |
| Formes | cartes à 14 px de rayon, boutons à 12 px, badges en pastille |
| Typographie | **Manrope** — titres en 800, texte en 400/600, chiffres en `tabular-nums` |

Tout vit dans **`css/tokens.css`**, chargée avant `css/app.css` : les composants
n'écrivent plus une couleur en dur.

**Manrope est servie depuis `css/polices/`, pas depuis Google Fonts.**
L'application s'ouvre par double-clic, et une requête réseau en `file://` ne
part pas : une police appelée en ligne serait retombée sur la police système à
l'ouverture locale, sans que rien ne le signale. Deux sous-ensembles latins,
40 Ko.

### Le bleu est la seule couleur

**Aucune performance n'est verte ou rouge.** Un signe et une graisse disent le
sens ; douze pour cent d'hommes distinguent mal ces deux teintes-là. Les badges
sont tous en pastille bleu pâle, l'onglet actif aussi.

Une seule entorse, prévue : les **graphiques** ont quatre teintes, dont l'encre
`#15161A` en quatrième.

### Un trait sous un mot du titre

Le **dernier** mot de chaque titre porte un trait bleu — « Allocation *cible* »,
« Mes *placements* ». C'est celui qui distingue le titre de ses voisins, et une
seule fonction le pose pour les quinze vues.

C'est un vrai soulignement avec `text-decoration-skip-ink`, qui **contourne les
descendantes** : une bande de fond traversait le bas du p, du g et du q, et
laissait un moignon bleu devant le mot.

### Les illustrations

Huit dessins au trait noir avec une tache bleue, dans `img/`, fond transparent.

| Dessin | Où |
|---|---|
| `logo` | en-tête · écran d'entrée et accueil particulier |
| `cafe` | bannière d'accueil, mode conseiller |
| `boussole` | note du jour, contexte, bandeau « allocation stratégique seule » |
| `balance` | allocation cible |
| `fiches` | sélection des supports, univers ETF |
| `carnet` | journal, état vide du questionnaire |
| `port` | état vide du suivi |
| `longue-vue` | backtest, méthode & limites |

30 px en tête de vue, 140-160 px dans les bannières et les états vides.
**Un seul dessin par carte, jamais dans un tableau, jamais sur le papier.**

### Pas de mode sombre

La direction donne une palette exacte, et une seule. En inventer une seconde
aurait produit un hybride que personne n'a validé.

### Le rapport client échappe à tout cela

Encre noire sur papier blanc. **Le bleu n'y survit qu'en filet** : ni aplat, ni
ombre, ni illustration, ni trait sous les titres. Un aplat coûte de l'encre, se
photocopie mal, et un document remis à un client ne gagne rien à être colorié.

Une exception assumée : en mode particulier, l'avertissement « ne constitue pas
un conseil » est **encadré de noir et plus gros que les mentions**. Sans
professionnel entre l'outil et celui qui décide, c'est la seule chose du
document qu'on ne doit pas pouvoir survoler.

## Sur iPhone

Quinze onglets tiennent dans une colonne latérale sur un écran large. Sur un
téléphone, ils devenaient un ruban de quinze pilules qu'il fallait faire
glisser pour trouver la sixième : on ne savait jamais où l'on était ni ce qui
restait. L'interface mobile est donc à **deux étages**.

| | |
|---|---|
| **Barre basse** | Cinq destinations à portée de pouce — Aujourd'hui, Marché, Dossier, Suivi, Plus — qui disent en permanence où l'on est. Toucher le groupe où l'on se trouve déjà remonte en haut de la vue. |
| **Ruban segmenté** | Sous l'en-tête, les vues du groupe courant, avec une pastille verte sur celles qui sont renseignées. Il disparaît quand le groupe n'a qu'une vue. |

Deux touchers suffisent pour aller n'importe où. Le **balayage horizontal**
passe d'une vue à l'autre à l'intérieur du groupe, et s'arrête à ses
frontières — sans quoi on quitterait « Dossier » sans l'avoir voulu. Il ignore
les zones qui défilent déjà : tableaux larges, rubans, fil des poches, champs
de saisie.

Les quatre actions de dossier — enregistrer, exporter, importer, nouveau —
occupaient une rangée entière sous la marque, soit le quart de l'écran avant
le premier contenu. Elles passent dans une feuille, derrière un seul bouton.

Le reste suit : cartes en pleine largeur, indicateurs en deux colonnes plutôt
qu'empilés, tableaux qui défilent horizontalement plutôt que de s'écraser, et
toutes les saisies à 16 px au moins — en dessous, iOS agrandit la page à
chaque fois qu'on touche un champ.

**Au-delà de 820 px, rien ne change** : la colonne latérale montre les quinze
vues d'un coup, ce qu'aucune barre basse ne sait faire.

### Le fil des poches

En tête d'accueil, une bande horizontale qu'on fait défiler : une pastille par
poche, l'anneau teinté par la variation du jour, du vert au rouge en passant
par le gris quand la séance n'a rien dit. Les poches sont classées par
amplitude — ce qui a bougé se lit en premier.

La pastille garde la couleur de sa classe d'actifs et s'éclaircit d'un cran à
chaque poche de la famille : dix-neuf teintes franchement distinctes seraient
au-delà de ce qu'un œil sépare, une famille dégradée se lit sans effort. Un
toucher ouvre une feuille avec le jour, la semaine, le mois et l'année, et le
support sur lequel la variation est mesurée.

La bande ne remplace pas la note de marché, elle la précède : la note
explique, la bande montre.

**Elle n'apparaît qu'à partir de la première saisie.** Sur un dossier vierge,
onze pastilles et leurs variations du jour ne disent rien à quelqu'un qui n'a
pas encore de portefeuille, et elles repoussaient les étapes à remplir sous la
ligne de flottaison.

### Le verre — retiré au chantier 9

Les surfaces étaient **dépolies**, et leur couleur venait d'un halo de trois
taches posé derrière la page : deux tuiles voisines ne rendaient pas la même
teinte sans qu'aucune couleur leur ait été assignée. C'était joli et c'était
coûteux — le flou devait rester sur les conteneurs, jamais sur les éléments
répétés d'une liste, sous peine de rendre le défilement impraticable sur un
téléphone.

**Il n'en reste rien.** Les surfaces sont redevenues des surfaces : blanches,
filetées, sans flou ni halo. Les jetons `--verre-*` existent encore et pointent
vers du plein, le temps que les dernières règles qui les emploient disparaissent.

La règle qu'il a laissée, elle, vaut toujours : **rien de coûteux sur un élément
répété**. C'est pourquoi la liste du catalogue européen est faite de lignes et
non de cartes.

### Ce qui reste sobre

**Le rapport client ne bouge pas** : la règle d'impression le repasse en
monochrome — ni aplat, ni ombre, ni illustration, ni trait sous les titres. De
l'encre noire sur du papier blanc. Un document remis à un client ne gagne rien
à être colorié.

**Ajout à l'écran d'accueil** : ouvrir le site dans Safari, toucher le bouton
Partager, puis « Sur l'écran d'accueil ». L'application s'ouvre alors en plein
écran, sans barre d'adresse, avec sa propre icône. Le manifeste et les
métadonnées `apple-mobile-web-app-*` s'en chargent ; les marges d'encoche et
de barre d'accueil sont gérées par `env(safe-area-inset-*)`.

## Le signe

Une **pousse dans une pièce**, au trait noir avec une tache bleue — le même
dessin que `img/logo.png`. Il ouvre l'en-tête à côté du lettrage **myetf**, en
28 px, et se retrouve en grand sur l'écran d'entrée et sur l'accueil du mode
particulier. Le lettrage reste en encre pleine : le signe porte déjà la tache
colorée, et deux accents côte à côte se disputeraient l'attention.

Il a remplacé au chantier 9 les trois barres croissantes sur fond bleu, qui
étaient un SVG tracé dans la page. Le favicon et les icônes d'écran d'accueil
portent **encore l'ancien signe** : ce sont des fichiers PNG générés à part, et
les régénérer depuis le nouveau dessin reste à faire.

```bash
python3 scripts/icones.py
```

regénère `icone-180/192/512.png` depuis la même géométrie que le SVG de
l'en-tête — repère de 64 × 64, tracé en suréchantillonnage ×4. L'encodeur PNG
est écrit sur la bibliothèque standard : aucune dépendance graphique dans le
projet. Le fond est un carré plein, sans coins arrondis : iOS applique son
propre masque, et un coin déjà arrondi laisserait une frange claire sur
l'écran d'accueil.

Après toute retouche du signe, mettre à jour les trois jetons CSS, les deux
SVG d'`index.html`, `scripts/icones.py`, puis relancer le script.

## Widget iOS (Scriptable)

`scriptable/allocation-etf.js` répond sur l'écran d'accueil à la question
« qu'est-ce qui bouge aujourd'hui ? ». Le mouvement du jour le plus marquant,
à la hausse comme à la baisse, occupe le haut du widget — le monétaire en est
écarté, il ne bouge pas par construction. Trois tailles :

- **Petit** — le mouvement du jour le plus marquant, avec les actions monde en repère
- **Moyen** — ce mouvement, puis le titre de la note du matin
- **Grand** — le mouvement, la note, puis les hausses et baisses de la semaine

Le widget suit l'apparence du système et reprend les jetons de couleur de
l'interface, réétagés pour la surface sombre comme dans la feuille de style.

Chaque bloc ouvre la section correspondante de l'application : la note ouvre
l'onglet « Note de marché », les mouvements « Contexte macro », le pied de
widget le dossier. L'ancre (`…/#note`) est lue au chargement puis effacée de
l'URL : hors ce cas, et à chaque rechargement, l'application s'ouvre sur
« Aujourd'hui ».

Installation : installer [Scriptable](https://apps.apple.com/app/scriptable/id1405459188),
y coller le fichier sous le nom « Allocation ETF », puis appui long sur l'écran
d'accueil → « + » → Scriptable → choisir la taille → appui long sur le widget →
« Modifier le widget » → Script : « Allocation ETF ». Toucher le widget ouvre
l'application.

Le widget lit `data/widget.json` (moins d'un kilo-octet), régénéré à chaque
relevé. **Aucune donnée client n'y figure** : uniquement des variations de
marché publiques. Le portefeuille reste dans le navigateur et n'est envoyé
nulle part — ce qui veut dire aussi que le widget ne peut pas afficher la
dérive d'un portefeuille personnel.

## Publier une mise à jour

Les fichiers `.js` et `.css` sont référencés avec un numéro de version
(`?v=…`). **Incrémentez-le à chaque modification**, sinon les navigateurs
peuvent servir pendant une dizaine de minutes un mélange de HTML neuf et de
JavaScript en cache — ce qui casse l'application :

```bash
cd "/Users/Mayeul/APP ETF CGP" && python3 -c "import re,datetime,pathlib;p=pathlib.Path('index.html');v=datetime.datetime.now().strftime('%Y%m%d%H%M');p.write_text(re.sub(r'\?v=\d+',f'?v={v}',p.read_text()));print('version',v)" && git add -A && git commit -m "..." && git push
```

Le site se régénère en une à deux minutes.


### Quand le navigateur reste sur l'ancienne version

Les numéros de version des scripts et de la feuille de style vivent **dans**
`index.html`. Si le navigateur garde `index.html` en cache, il garde aussi les
anciens numéros : le cache-buster ne buste plus rien, et l'application reste
indéfiniment à sa version d'hier. Safari sur iPhone est particulièrement tenace
là-dessus — l'application s'ouvre, fonctionne, mais sans les nouveautés.

`version.json` répond à ça. C'est le seul fichier que l'application demande
**hors cache** ; au démarrage, elle compare son marqueur à celui que porte le
`<script>` de `app.js`, c'est-à-dire à la version réellement chargée. S'ils
divergent, elle recharge une fois sur `?maj=<version>` — une adresse neuve, que
le navigateur est obligé d'aller rechercher.

Le rechargement ne peut pas boucler : l'adresse porte le marqueur visé, et un
second passage sur la même valeur affiche un message au lieu de recharger.

Le fichier se régénère depuis `index.html`, et doit l'être à chaque publication :

```bash
node scripts/version.mjs
```

Le relevé quotidien s'en charge tout seul : il réécrit le marqueur d'`index.html`
puis relance ce script dans la foulée.

## Comment le code est réparti

L'application se charge par dix balises `<script>`, **dans un ordre qui
compte** : les neuf fichiers de `js/ui/`, puis `js/app.js` qui ne contient que
l'amorçage. Les `const` de premier niveau ne sont pas hissés — tout ce que
l'amorçage appelle doit exister avant lui.

**Pas de modules ES**, et ce n'est pas un oubli : l'application s'ouvre par
double-clic, et `<script type="module">` est bloqué par CORS en `file://`.
Les moteurs de `js/engine/` montrent la voie s'il faut cloisonner un jour —
une IIFE par fichier, un seul objet exposé.

`test/inventaire.mjs` relève les déclarations globales des dix-sept fichiers
et compare deux états du dépôt : il dit ce qui a été déplacé, et surtout ce
qui a disparu, apparu ou changé.

## Lancer l'application en local

Aucune installation, aucune dépendance, aucun accès réseau requis.

```bash
open "/Users/Mayeul/APP ETF CGP/index.html"
```

Si le navigateur bloque le chargement des fichiers locaux, servez le dossier :

```bash
cd "/Users/Mayeul/APP ETF CGP" && python3 -m http.server 8778
```

puis ouvrez `http://localhost:8778`.

Les données du dossier en cours (client, réponses, univers ETF, journal) sont
conservées dans le stockage local du navigateur. Les boutons **Exporter le
dossier** / **Importer** permettent de sauvegarder un dossier client en JSON.

## Comment le profil est déterminé

Trois axes sont notés séparément sur 100 :

| Axe | Ce qu'il mesure |
|---|---|
| **Capacité de perte** | horizon, épargne de précaution, part du patrimoine engagée, capacité d'épargne, endettement, stabilité des revenus |
| **Tolérance au risque** | réaction à une baisse, perte maximale acceptée, arbitrage rendement/risque, rapport à la volatilité |
| **Connaissance & expérience** | niveau déclaré, produits déjà détenus, comportement lors d'une baisse vécue |

Le score retenu est le **minimum entre capacité et tolérance** : on n'expose pas
un client au-delà de ce qu'il peut perdre, ni au-delà de ce qu'il accepte de
perdre. Des **plafonds** l'abaissent ensuite le cas échéant (horizon court,
connaissance insuffisante, perte maximale acceptée faible). Tout déclassement
est affiché et motivé, pour être repris dans le rapport d'adéquation.

Six profils : Sécuritaire, Prudent, Équilibré, Dynamique, Offensif, Agressif.

## Comment les arbitrages tactiques sont produits

Le conseiller renseigne onze indicateurs (cycle, inflation, politique monétaire,
courbe des taux, spreads de crédit, valorisations, dollar, risque géopolitique,
environnement tarifaire, contexte budgétaire, momentum). Chacun pousse la
probabilité de quatre scénarios — **atterrissage en douceur, récession,
stagflation, reflation** — et peut appliquer une surcouche directe sur certaines
poches (par exemple : risque géopolitique très élevé → +5 pts sur l'or).

Les probabilités calculées sont modifiables à la main. Chaque scénario porte un
vecteur de déviations ; la déviation retenue est leur moyenne pondérée par les
probabilités, multipliée par l'**intensité de gestion** (curseur, onglet 1) puis
**bornée** : ±10 pts sur les actions et les obligations, ±12 sur le monétaire,
±6 sur les diversifiants, ±8 par poche. Une classe absente du profil (les actions
pour un profil Sécuritaire) le reste quelles que soient les vues de marché.

Si le client a répondu qu'il souhaitait une allocation figée, la gestion tactique
est automatiquement neutralisée.

## Servir un revenu

L'onglet **Revenus & rachats** indique sur quels supports prélever, dans cet
ordre :

1. **Coupons et dividendes déjà encaissés** — aucun titre vendu. Attention :
   *en assurance-vie ce poste est nul*, les coupons des unités de compte sont
   réinvestis dans le contrat ; le revenu passe nécessairement par un rachat
   partiel programmé. En compte-titres et en PEA, les ETF distribuants versent
   au contraire des liquidités — la sélection privilégie donc les parts
   distribuantes dans ces enveloppes, et les parts capitalisantes en
   assurance-vie.
2. **Poche monétaire au-delà du coussin** — valeur insensible aux marchés.
3. **Lignes surpondérées** — le prélèvement rééquilibre le portefeuille.
4. **Solde au prorata** de l'allocation cible.

Dès qu'un revenu est demandé, l'allocation cible est automatiquement modifiée
pour porter la poche monétaire au niveau du **coussin de sécurité** (24 mois de
retraits par défaut). C'est la protection contre le risque de séquence : sans
matelas, une baisse de marché oblige à vendre des actions au plus bas.

Le coût fiscal est chiffré selon l'enveloppe : assiette proportionnelle et
abattement 4 600 / 9 200 € après 8 ans en assurance-vie, exonération d'IR après
5 ans en PEA, PFU 30 % sur plus-values et dividendes en compte-titres. Une
projection déterministe indique l'évolution du capital, en euros courants et en
pouvoir d'achat, et l'année d'épuisement si le taux de retrait est trop élevé.

**Les taux et abattements sont regroupés dans `js/data/fiscalite.js`** — à
contrôler à chaque loi de finances.

## Flux de cours — gratuit et automatique

`scripts/maj-cours.mjs` relève les cours de clôture des ETF de l'univers chez
**Euronext** (Amsterdam, Paris, Bruxelles, Lisbonne). Aucune clé d'API, aucune
dépendance, aucun coût.

```bash
node scripts/maj-cours.mjs --verbeux
```

Une **GitHub Action** l'exécute du mardi au samedi et publie les résultats —
gratuit sur un dépôt public. Elle ne commite que lorsque des cotations nouvelles
sont arrivées : la sortie est triée de façon déterministe pour qu'un relevé sans
nouveauté ne produise aucun diff, et n'invalide donc pas inutilement le cache
des visiteurs.

Trois principes de conception méritent d'être connus avant de modifier ce
script :

- **L'archive est cumulative.** Euronext ne sert que deux années glissantes,
  mais `data/cours.json` conserve tout ce qu'il a déjà vu. L'historique
  s'approfondit donc de lui-même, mois après mois, jusqu'à couvrir les cinq
  années du backtest.
- **Seuls les ETF capitalisants servent de référence.** Le cours d'un ETF
  distribuant décroche à chaque détachement de coupon : l'utiliser
  sous-estimerait la performance de plusieurs points par an. Le cours d'un ETF
  capitalisant intègre au contraire les revenus réinvestis.
- **Le fichier lu par l'application est du JavaScript, pas du JSON.** Une page
  ouverte en `file://` ne peut pas faire de `fetch` ; un `<script>` fonctionne
  dans les deux cas. C'est ce qui permet à la version ZIP de bénéficier elle
  aussi des données.

**Couverture actuelle : 30 supports sur 42**, pour 14 poches sur 19. Les autres
sont cotés sur Xetra, Milan ou Londres, hors périmètre d'Euronext.
`data/couverture.json` liste les absents — c'est aussi un moyen commode de
repérer un ISIN erroné : un ETF français introuvable à Paris a probablement un
mauvais code. C'est ainsi qu'un des deux fonds liquidés s'était signalé.

Seuls les supports **encore présents dans l'univers** servent de référence à une
poche : l'archive des cours est cumulative et conserve les séries des supports
retirés, mais un support écarté ne doit plus alimenter le modèle.

Dans l'onglet Backtest, chaque cellule est colorée selon sa provenance :
**vert** relevé sur les cours, **bleu** source documentée, **orange**
estimation non vérifiée. Le bandeau « Part sourcée du backtest » résume la proportion.

## Note de marché interne (facultatif)

> **La note porte la date des cours qu'elle commente, pas celle de sa
> rédaction.** Le relevé tourne du mardi au samedi à 06 h 10 UTC et lit la
> clôture de la veille : le samedi ramène le vendredi, et il n'y a pas de
> passage le dimanche ni le lundi. Un lundi après-midi affiche donc les
> clôtures du vendredi, et c'est le bon comportement — les clôtures du lundi
> ne sont publiées que le mardi matin. L'étiquette nomme le jour de la semaine
> pour lever l'ambiguïté, et ne passe à l'orange qu'au-delà de quatre jours,
> quand le retard en est vraiment un.


`scripts/note-marche.mjs` fait rédiger par l'API Claude une **note de travail
quotidienne** à partir des variations relevées la veille : ce qui a bougé, ce
que cela peut signifier, ce qu'il faut vérifier dans les dossiers.

**C'est un document interne, pas une publication.** La consigne donnée au modèle
lui interdit explicitement toute recommandation d'achat ou de vente, toute
citation d'ETF nommément, et toute cause inventée — il ne voit que des cours,
pas l'actualité qui les explique. L'onglet affiche ces limites en tête.
Publier des recommandations automatisées sous le nom d'un conseiller relève du
conseil en investissement, activité réglementée : ne transformez pas cette note
en page client sans avis juridique.

**Coût : environ 1,30 $ par mois** (≈ 4 000 tokens en entrée et 900 en sortie
par jour, sur `claude-opus-5` à 5 $ / 25 $ le million). Le rechargement minimum
du compte est de 5 $, soit environ quatre mois d'avance.

Pour l'activer : créez une clé sur [platform.claude.com](https://platform.claude.com),
puis déposez-la dans le dépôt sous *Settings → Secrets and variables → Actions*,
au nom `ANTHROPIC_API_KEY`. La tâche planifiée s'en charge ensuite seule.

**La clé ne doit jamais figurer dans le JavaScript.** Le site est public : une
clé côté navigateur serait lisible par tous et consommée en quelques jours.
C'est pourquoi la note est rédigée dans l'Action, qui commite le résultat — la
page ne fait que lire un fichier statique. Sans clé, le script s'arrête
proprement et l'onglet affiche la marche à suivre.

## Suivi des quantités et revalorisation

Chaque ligne détenue accepte un **nombre de parts**. Quand la quantité est
renseignée et que le support est coté sur Euronext, le montant est recalculé
seul à partir du dernier cours relevé — la case passe en vert et devient non
modifiable. Le bouton **« Revaloriser aux cours du jour »** rafraîchit toutes
les lignes d'un coup, et l'onglet Arbitrages indique à quelle date le
portefeuille est valorisé.

C'est ce qui rend la surveillance quotidienne possible : votre père ouvre la
page, elle se revalorise seule et lui dit s'il est dans ses bandes de tolérance
ou non. Les supports non cotés sur Euronext restent saisis en euros.

## Mise à jour des valorisations

Dans l'onglet Arbitrages, **« Coller les valorisations du contrat »** accepte un
copier-coller du relevé de l'assureur : une ligne par support, au format
`ISIN ; montant` ou `ISIN ; quantité ; valeur liquidative`. Les séparateurs
`;`, `,` et tabulation, les espaces de milliers et la virgule décimale sont
gérés ; les lignes sans ISIN reconnaissable sont ignorées et signalées.

Après mise à jour, un bandeau indique immédiatement si le portefeuille est
**dans ses bandes de tolérance** ou combien de lignes en sont sorties.

## Seuils d'arbitrage

Un mouvement n'est proposé que si l'écart dépasse **2 % de l'encours** (et au
minimum 500 €). Les surpondérations franchissant ce seuil sont ramenées à la
cible ; le produit des ventes et l'apport éventuel sont ensuite répartis au
prorata des déficits. En compte-titres, la plus-value latente saisie par ligne
permet de chiffrer l'impôt (PFU 30 %) — en assurance-vie et en PEA, les
arbitrages internes ne déclenchent aucune imposition.

## Sur quels ETF l'outil choisit

La sélection ne parcourt pas tout le catalogue européen, et c'est la question
qu'un testeur a posée en premier — il croyait l'outil choisir parmi les
quatre mille cinq cents.

| Étape | Supports | Ce qu'elle écarte |
|---|---:|---|
| Catalogue européen | 4 530 | levier, inverses et actifs numériques déjà exclus |
| − sans poche du modèle | 1 929 | catégorie ne correspondant à aucune des 19 poches |
| − sans frais publiés | 445 | conseiller un fonds dont on ignore les frais n'est pas conseiller |
| − sans encours publié | 69 | taille inconnue, donc liquidité inconnue |
| **Exploitables** | **2 087** | ce qui porte poche, frais et encours |
| + univers de travail | 2 094 | les 42 supports relevés à la main s'y ajoutent |
| − les trois filtres | 866 | 3 étoiles, 500 M€, 0,60 % de frais — **modifiables** |
| **Retenus pour un dossier** | **~14** | un support par poche, au meilleur score |

**Ces chiffres ne sont écrits nulle part dans le code.** Ils sont calculés par
`MoteurUnivers.entonnoir()`, que lisent à la fois la ligne en tête de l'onglet
Univers et le tableau de « Méthode & limites » — deux comptes séparés
finiraient par se contredire. Le harnais vérifie que la somme tombe juste.

**Deux ensembles à ne pas confondre.** Le **catalogue** est un annuaire de
recherche : rien n'y est vérifié, et c'est la source de la sélection
automatique. L'**univers de travail** est la liste courte tenue à la main,
seule à porter le référencement au contrat.

## Univers ETF — à vérifier avant toute utilisation en clientèle

L'univers compte **42 supports**, contrôlés à deux niveaux distincts.

**Niveau 1 — caractéristiques de marché : refait le 20 août 2026, sur justETF.**
Les 42 lignes portent une date et une source (`donneesLe`, `donneesSource`,
colonne « Données »). Ce contrôle a corrigé beaucoup : **neuf ISIN désignaient un
autre fonds que celui annoncé** — deux fonds liquidés, un ETF classé en actions
Europe qui était un émergents, un « Japon couvert en euro » qui ne l'était pas,
un « PEA Nasdaq-100 » qui était un PEA S&P 500 (ISIN faux d'un chiffre), une
obligataire euro qui était une *floating rate* en dollars. S'y ajoutaient
quatorze frais courants erronés, la quasi-totalité des encours, et plusieurs
erreurs de devise, de capitalisation et d'éligibilité PEA. Ces données
vieillissent : la procédure de relevé trimestriel est plus bas, et la pastille
de l'accueil réclame au-delà de quatre-vingt-dix jours.

Le relevé du 20 août 2026 a reconduit les 42 lignes : **réplication, devise et
capitalisation intactes sur les 42**, aucun ISIN ne désignant un autre fonds
qu'attendu. Un seul frais avait changé — `FR0011871128`, Amundi PEA S&P 500,
passé de 0,15 % à 0,12 % —, et 39 encours avaient dérivé de 0,1 % à 2,4 %.

**Niveau 2 — référencement au contrat : à votre charge.** Aucune source ne
connaît la liste des supports de *votre* contrat. La case « Contrat » (champ
`verifie`) trace ce contrôle ; seule elle retire le badge orange dans la
sélection. Elle est à `false` sur les 42 lignes livrées, et ne peut pas l'être
autrement : elle dépend du contrat, donc du dossier.

**Le rapprochement fait le travail à votre place.** En haut de l'onglet
« Univers ETF », collez la liste des supports telle qu'elle sort de l'assureur —
relevé PDF, tableur, extranet — et nommez le contrat. Les ISIN sont reconnus où
qu'ils se trouvent dans la ligne ; à défaut d'ISIN, le nom est rapproché
*lorsqu'il ne désigne qu'un seul support*, et la correspondance est signalée
comme telle, à relire. Le rapport rend quatre choses :

| | |
|---|---|
| **Retrouvés** | les supports de l'univers que le contrat référence |
| **Absents** | ceux que l'univers porte et que le contrat ignore : non souscriptibles |
| **Poches vidées** | les poches auxquelles l'allocation donnera un poids sans pouvoir le remplir |
| **Hors univers** | les ISIN du contrat que l'outil ne connaît pas — ajoutables d'un clic depuis le catalogue européen |

Rien n'est modifié avant que vous n'ayez lu le rapport et cliqué sur
**Appliquer**. Chaque validation est alors datée et rattachée au contrat nommé
(`verifieLe`, `verifieSource`), lisible en survolant la case. Une case cochée à
la main est horodatée de la même façon : un référencement sans date ni origine
ne vaut plus rien six mois après.

Un ISIN faux d'un chiffre ne valide rien — c'est exactement l'erreur que le
rapprochement attrape. Deux parts d'un même fonds ne sont pas non plus
confondues : la normalisation des noms ne neutralise ni la devise, ni la
couverture de change.

Le contrôle est aussi possible à la main : filtrez le tableau, puis
**Cocher « Contrat » sur les lignes affichées**. L'action porte exactement sur ce
qui est affiché, jamais davantage.

**Une fois le rapprochement fait**, le filtre « Référencement au contrat » de
*Client & enveloppe* restreint la sélection aux seuls supports validés.
Il reste inactif par défaut, et refuse de s'activer sur un univers dont rien
n'est validé : il viderait la sélection sans dire pourquoi.

## Procédure — relevé justETF trimestriel

**Rien ne rafraîchit ces données.** Les cours tombent chaque séance et les
notations chaque mois, par tâche planifiée ; les caractéristiques justETF, elles,
n'ont **aucun script et aucun workflow** derrière elles. Le champ `donneesLe`
n'est écrit par personne. C'est ce relevé-ci, à la main, et rien d'autre.

Au-delà de **90 jours**, la pastille « Caractéristiques » de l'accueil prend le
filet bleu et écrit son âge. C'est le seul rappel qui existe.

### Par où commencer

**Commencez par la liste d'écarts** — carte « Rapprochement avec le catalogue
Morningstar », en tête de la vue *Univers ETF*. Elle est écrite à chaque passage
mensuel du catalogue et **ne rouvre que les lignes qui divergent** : c'est vingt
minutes au lieu de deux heures.

Elle rapproche **les frais et la présence au catalogue**, et rien d'autre.
L'encours de Morningstar porte sur le fonds entier quand celui de justETF porte
sur la part ; sa devise est celle de la part cotée, non celle du fonds. Les
comparer ferait crier trente lignes par mois sans rien dire.

**Un écart n'est pas une erreur de votre relevé.** Au premier passage, sur les
deux écarts de frais revérifiés le jour même, c'est le catalogue qui avait tort
les deux fois. La liste dit quoi rouvrir, pas quoi corriger.

Une fois par an, ou après un écart douteux, refaites tout de même le tour
complet des 42 : le rapprochement ne voit ni la réplication, ni la devise du
fonds, ni le type de distribution.

**Sinon**, parcourez les 42 supports ci-dessous. Chaque ISIN pointe sur sa page
justETF.

### Ce qu'on relève, et où l'écrire

Tout vit dans **`js/data/etf-univers.js`**, une ligne par support.

| Sur justETF | Champ | Forme attendue |
|---|---|---|
| Frais courants (« TER ») | `ter` | nombre, **deux décimales** — `0.20`, pas `0.2` |
| Taille du fonds | `encours` | entier, **en millions d'euros** — « EUR 6 532 M » → `6532` |
| Méthode de réplication | `replication` | `'Physique'` · `'Synthétique'` · `'Physique (ETC)'` pour l'or |
| Devise du fonds | `devise` | `'EUR'` · `'USD'` |
| Type de distribution | `capitalisation` | `true` si capitalisant, `false` si distribuant |
| — *absent de justETF* — | `pea` | **ne se relève pas ici** : justETF ne porte pas l'éligibilité PEA |

**Le nom ne se recopie pas.** Les libellés du fichier sont des abréviations
voulues — `iShares Core € Govt Bond UCITS ETF (Dist)` pour
`iShares Core Euro Government Bond UCITS ETF (Dist)` — et les tableaux sont
calibrés dessus. En revanche, **si le nom désigne un AUTRE FONDS que celui
attendu, arrêtez tout** : c'est un ISIN faux, et le relevé d'août 2026 en avait
trouvé neuf.

### Terminer

1. Portez la date du jour dans **`donneesLe` des 42 lignes**, y compris celles
   que rien n'a fait bouger : la date dit « vérifié le », pas « changé le ».
2. `node test/runner.js` — les moteurs relisent l'univers.
3. Ouvrez `test/fumee.html` derrière un serveur.
4. Poussez le marqueur de version : changez `?v=…` dans `index.html`, puis
   `node scripts/version.mjs`.

### Les 42 supports

**Actions** — 23 supports

| ISIN | Support | Frais | Encours |
|---|---|---|---|
| [`IE00B4L5Y983`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B4L5Y983) | iShares Core MSCI World UCITS ETF USD (Acc) | 0.20 % | 127 856 M€ |
| [`LU1681043599`](https://www.justetf.com/fr/etf-profile.html?isin=LU1681043599) | Amundi MSCI World Swap UCITS ETF EUR (Acc) | 0.38 % | 6 532 M€ |
| [`FR001400U5Q4`](https://www.justetf.com/fr/etf-profile.html?isin=FR001400U5Q4) | Amundi PEA Monde (MSCI World) UCITS ETF Acc | 0.20 % | 1 366 M€ |
| [`IE00BFY0GT14`](https://www.justetf.com/fr/etf-profile.html?isin=IE00BFY0GT14) | SPDR MSCI World UCITS ETF USD Unhedged (Acc) | 0.12 % | 17 857 M€ |
| [`IE00BYX2JD69`](https://www.justetf.com/fr/etf-profile.html?isin=IE00BYX2JD69) | iShares MSCI World SRI UCITS ETF EUR (Acc) | 0.20 % | 7 045 M€ |
| [`IE00B5BMR087`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B5BMR087) | iShares Core S&P 500 UCITS ETF USD (Acc) | 0.07 % | 134 451 M€ |
| [`FR0011871128`](https://www.justetf.com/fr/etf-profile.html?isin=FR0011871128) | Amundi PEA S&P 500 UCITS ETF Acc | 0.12 % | 1 149 M€ |
| [`LU0490618542`](https://www.justetf.com/fr/etf-profile.html?isin=LU0490618542) | Xtrackers S&P 500 Swap UCITS ETF 1C | 0.15 % | 3 554 M€ |
| [`LU0908500753`](https://www.justetf.com/fr/etf-profile.html?isin=LU0908500753) | Amundi Core Stoxx Europe 600 UCITS ETF Acc | 0.07 % | 21 058 M€ |
| [`IE00B4K48X80`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B4K48X80) | iShares Core MSCI Europe UCITS ETF EUR (Acc) | 0.12 % | 16 044 M€ |
| [`FR0007052782`](https://www.justetf.com/fr/etf-profile.html?isin=FR0007052782) | Amundi CAC 40 UCITS ETF Dist | 0.25 % | 3 386 M€ |
| [`LU1861137484`](https://www.justetf.com/fr/etf-profile.html?isin=LU1861137484) | Amundi MSCI Europe SRI Climate Paris Aligned UCITS ETF Acc | 0.18 % | 964 M€ |
| [`IE00B4L5YX21`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B4L5YX21) | iShares Core MSCI Japan IMI UCITS ETF (Acc) | 0.12 % | 7 258 M€ |
| [`LU0659580079`](https://www.justetf.com/fr/etf-profile.html?isin=LU0659580079) | Xtrackers MSCI Japan UCITS ETF 4C EUR Hedged | 0.40 % | 924 M€ |
| [`IE00BKM4GZ66`](https://www.justetf.com/fr/etf-profile.html?isin=IE00BKM4GZ66) | iShares Core MSCI EM IMI UCITS ETF (Acc) | 0.18 % | 37 927 M€ |
| [`FR0013412020`](https://www.justetf.com/fr/etf-profile.html?isin=FR0013412020) | Amundi PEA Emergent (MSCI Emerging) ESG Transition UCITS ETF Acc | 0.30 % | 857 M€ |
| [`IE00BF4RFH31`](https://www.justetf.com/fr/etf-profile.html?isin=IE00BF4RFH31) | iShares MSCI World Small Cap UCITS ETF (Acc) | 0.35 % | 7 707 M€ |
| [`LU1681038672`](https://www.justetf.com/fr/etf-profile.html?isin=LU1681038672) | Amundi Russell 2000 UCITS ETF EUR (C) | 0.35 % | 789 M€ |
| [`IE00BM67HT60`](https://www.justetf.com/fr/etf-profile.html?isin=IE00BM67HT60) | Xtrackers MSCI World Information Technology UCITS ETF 1C | 0.25 % | 5 538 M€ |
| [`IE00B53SZB19`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B53SZB19) | iShares Nasdaq 100 UCITS ETF (Acc) | 0.30 % | 24 257 M€ |
| [`FR0011871110`](https://www.justetf.com/fr/etf-profile.html?isin=FR0011871110) | Amundi PEA Nasdaq-100 UCITS ETF Acc | 0.30 % | 1 142 M€ |
| [`IE00B8FHGS14`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B8FHGS14) | iShares Edge MSCI World Minimum Volatility UCITS ETF USD (Acc) | 0.30 % | 2 299 M€ |
| [`IE00BP3QZ601`](https://www.justetf.com/fr/etf-profile.html?isin=IE00BP3QZ601) | iShares Edge MSCI World Quality Factor UCITS ETF (Acc) | 0.25 % | 5 321 M€ |

**Obligations** — 10 supports

| ISIN | Support | Frais | Encours |
|---|---|---|---|
| [`IE00B14X4Q57`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B14X4Q57) | iShares € Government Bond 1-3yr UCITS ETF (Dist) | 0.15 % | 1 774 M€ |
| [`LU1650487413`](https://www.justetf.com/fr/etf-profile.html?isin=LU1650487413) | Amundi Euro Government Bond 1-3Y UCITS ETF Acc | 0.15 % | 2 212 M€ |
| [`IE00B4WXJJ64`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B4WXJJ64) | iShares Core € Govt Bond UCITS ETF (Dist) | 0.07 % | 5 389 M€ |
| [`LU0290355717`](https://www.justetf.com/fr/etf-profile.html?isin=LU0290355717) | Xtrackers II Eurozone Government Bond UCITS ETF 1C | 0.07 % | 2 253 M€ |
| [`IE00B3F81R35`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B3F81R35) | iShares Core € Corp Bond UCITS ETF (Dist) | 0.09 % | 8 737 M€ |
| [`LU2089238625`](https://www.justetf.com/fr/etf-profile.html?isin=LU2089238625) | Amundi Core EUR Corporate Bond UCITS ETF Acc | 0.07 % | 868 M€ |
| [`IE00B66F4759`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B66F4759) | iShares € High Yield Corp Bond UCITS ETF EUR (Dist) | 0.50 % | 5 458 M€ |
| [`IE00B0M62X26`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B0M62X26) | iShares € Inflation Linked Govt Bond UCITS ETF | 0.09 % | 1 931 M€ |
| [`IE00B2NPKV68`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B2NPKV68) | iShares J.P. Morgan $ EM Bond UCITS ETF (Dist) | 0.45 % | 3 756 M€ |
| [`IE00BDBRDM35`](https://www.justetf.com/fr/etf-profile.html?isin=IE00BDBRDM35) | iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc) | 0.10 % | 2 511 M€ |

**Monetaire** — 3 supports

| ISIN | Support | Frais | Encours |
|---|---|---|---|
| [`LU0290358497`](https://www.justetf.com/fr/etf-profile.html?isin=LU0290358497) | Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C | 0.10 % | 22 566 M€ |
| [`FR0010510800`](https://www.justetf.com/fr/etf-profile.html?isin=FR0010510800) | Amundi EUR Overnight Return UCITS ETF Acc | 0.10 % | 3 231 M€ |
| [`FR0013346681`](https://www.justetf.com/fr/etf-profile.html?isin=FR0013346681) | Amundi PEA Euro Court Terme UCITS ETF Acc | 0.25 % | 194 M€ |

**Diversifiants** — 6 supports

| ISIN | Support | Frais | Encours |
|---|---|---|---|
| [`IE00B4ND3602`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B4ND3602) | iShares Physical Gold ETC | 0.12 % | 33 424 M€ |
| [`FR0013416716`](https://www.justetf.com/fr/etf-profile.html?isin=FR0013416716) | Amundi Physical Gold ETC (C) | 0.12 % | 10 827 M€ |
| [`IE00B1FZS350`](https://www.justetf.com/fr/etf-profile.html?isin=IE00B1FZS350) | iShares Developed Markets Property Yield UCITS ETF | 0.59 % | 1 036 M€ |
| [`LU1437018838`](https://www.justetf.com/fr/etf-profile.html?isin=LU1437018838) | Amundi FTSE EPRA NAREIT Global UCITS ETF Acc | 0.24 % | 401 M€ |
| [`IE00BDFL4P12`](https://www.justetf.com/fr/etf-profile.html?isin=IE00BDFL4P12) | iShares Diversified Commodity Swap UCITS ETF | 0.19 % | 2 006 M€ |
| [`LU1829218749`](https://www.justetf.com/fr/etf-profile.html?isin=LU1829218749) | Amundi Bloomberg Equal-weight Commodity ex-Agriculture UCITS ETF Acc | 0.30 % | 1 654 M€ |

*Frais et encours au dernier relevé. Les liens ouvrent la fiche justETF du
support.*

## Sélectionner dans tout le catalogue européen

Le champ « Univers de sélection », dans *Client & enveloppe*, choisit ce sur
quoi porte la sélection :

| | |
|---|---|
| **Catalogue européen** *(par défaut)* | **2 086 supports** sélectionnables, sur les 4 533 recensés. |
| **Univers de travail** | 42 supports relevés un à un, cochables au contrat. Le seul univers opposable. |

Le catalogue est la source par défaut : sélectionner dans deux mille supports
plutôt que dans quarante-deux abaisse les frais du portefeuille et remplit
toutes les poches. L'univers de travail reste joint à la sélection — ses lignes
sont mieux renseignées que leur homologue du catalogue, et les supports détenus
doivent rester reconnus.

**Trois exigences pour être sélectionnable** : une poche, des frais courants,
un encours. Elles écartent 2 447 des 4 533 lignes — 1 930 sans poche du modèle
(sectorielles, pays isolés, « Actions Autres »), 447 sans frais courants
exploitables, 70 sans encours. Conseiller un fonds dont on ignore les frais ou
la taille n'est pas conseiller. Les autres restent cherchables au catalogue et
ajoutables à la main.

**Des frais à zéro sont tenus pour absents, pas pour gratuits.** Sur les quatre
supports affichés à 0 % et rattachés à une poche, deux facturent en réalité des
frais connus — et ce zéro leur donnait le score de frais maximal, donc leur
poche.

**Ce que le catalogue sait et ne sait pas.** Frais, encours, note Morningstar et
catégorie sont sourcés. La couverture de change, la part capitalisante ou
distribuante et le label de durabilité sont **déduits du nom**, et marqués comme
tels. La réplication n'est pas publiée. **L'éligibilité PEA non plus** : un
support du catalogue est réputé non éligible faute d'information, pas parce
qu'il ne l'est pas — pour un PEA, restez sur l'univers de travail. Rien n'y est
vérifié au contrat, et *Sélection des supports* le dit en toutes lettres dès
qu'une ligne en vient.

**La devise fait partie de la définition d'une poche.** « Obligations
souveraines € court terme » n'accueille pas un emprunt d'État américain. Les
poches euro exigent donc que la catégorie Morningstar nomme l'euro, comme
devise du gisement ou comme devise de couverture ; une catégorie qui accroche
le motif sans satisfaire cette exigence sort **sans poche** plutôt que de
glisser vers la règle suivante. Sans cette règle, la sélection sur le catalogue
retenait une *floating rate* en dollars comme obligataire euro et un fonds
« Asie hors Japon » comme actions Japon — exactement les erreurs que le relevé
du 15 août avait trouvées dans l'univers d'origine.

**Ce que l'élargissement change vraiment** : pas le nombre de lignes — treize ou
quatorze dans les deux cas, une par poche — mais leur qualité. À filtres
identiques, les frais courants moyens du portefeuille passent de **0,152 % à
0,118 %**, et la part non investie tombe à zéro : chaque poche trouve enfin
un support.

Avant toute remise au client, versez les supports retenus dans l'univers de
travail depuis *Univers ETF*, puis contrôlez leur ligne et leur
référencement au contrat.

**Les scripts de rafraîchissement ne sont plus cités dans l'interface** — leur
place est ici. Les notations Morningstar sont relevées par

```bash
node scripts/notations.mjs           # relevé seul
node scripts/notations.mjs --ecrire  # inscrit les notes dans l'univers
```

auprès du moteur de recherche public de Morningstar, qui les rend par ISIN. Le
script inscrit la note et la date du relevé (`notationLe`), signale les écarts
de frais courants avec le relevé justETF — sans jamais les corriger seul — et
n'écrit rien si un seul relevé a échoué, pour ne pas figer un univers incomplet.
Les notes sont recalculées chaque mois : relancez-le périodiquement.

**Neuf supports sur quarante-deux n'ont pas de note** et restent à `null` : les
monétaires, les ETC sur l'or, les matières premières et les fonds de moins de
trois ans, hors du champ de la notation. Tant qu'elle vaut `null`, la notation
est retirée du barème du score — ramené à 100 sur les seuls critères renseignés
— et le filtre « étoiles minimum » ne s'applique pas à ce support.

**Le filtre à quatre étoiles ampute l'univers de moitié** : 23 supports
éligibles sur 42 en architecture ouverte, contre 40 avec les estimations
livrées à l'origine. Surtout, **aucun des trois supports labellisés ISR
n'atteint quatre étoiles** — un client dont les préférences de durabilité sont
prioritaires déclenche donc la dérogation, sauf à abaisser le filtre à trois
étoiles, où deux supports labellisés redeviennent accessibles.

Toutes les cellules de l'onglet **Univers ETF** sont modifiables, et l'univers
complet s'exporte et se réimporte en JSON.

Trois univers de contrat sont modélisés (`av-restreint`, `av-standard`,
`av-large`) ; un support référencé dans un univers restreint est disponible dans
les univers plus larges. Adaptez ces listes à la liste des supports de vos
contrats.

Une enveloppe peut ne pas pouvoir porter l'allocation du profil : un PEA
n'accepte ni ETF obligataires, ni or, ni immobilier coté. Dans ce cas le poids
concerné est placé en monétaire — ce qui minore le risque au lieu de le majorer —
et un avertissement invite à ouvrir une enveloppe complémentaire.

## Structure des fichiers

```
index.html                    interface, ordre de chargement des scripts
css/tokens.css                palette, typographie, rayons, ombres — chargée en premier
css/app.css                   feuille de style, y compris règles d'impression
css/polices/                  Manrope, deux sous-ensembles latins (40 Ko)
img/                          les huit illustrations au trait, fond transparent
js/data/questionnaire.js      questions, pondérations, plafonds de profil
js/data/allocations.js        6 profils, allocations stratégiques, sous-allocations
js/data/macro.js              indicateurs, scénarios, bornes tactiques, seuils
js/data/etf-univers.js        42 supports ; données de marché relevées, contrat à valider
js/data/fiscalite.js          taux, abattements, rendements courants, cascade de retrait
js/data/historique.js         séries de performances annuelles par poche
js/data/cours-marche.js       GÉNÉRÉ — performances et derniers cours par ISIN
js/data/cours-historique.js   GÉNÉRÉ — cours de clôture quotidiens, calendrier commun
js/data/catalogue-etf.js      GÉNÉRÉ — 4 533 ETF européens, chargé à la demande
js/data/note-marche.js        GÉNÉRÉ — note de marché du jour
js/engine/profil.js           scoring, plafonnement, stress tests
js/engine/allocation.js       stratégique, agrégation macro, tactique, métriques
js/engine/selection.js        filtrage de l'univers, notation et choix des supports
js/engine/arbitrage.js        écarts, ordres, fiscalité, journal
js/engine/revenus.js          coussin, cascade de prélèvement, fiscalité, projection
js/engine/backtest.js         simulation, rééquilibrage, contributions, risque de séquence
js/engine/situation.js        relevé daté, arrêtés semestriels, avant/après arbitrage
js/engine/contrat.js          rapprochement de l'univers et de la liste des supports
js/engine/univers.js          univers de sélection issu du catalogue européen
scripts/maj-cours.mjs         relevé Euronext, archivage cumulatif, derniers cours
scripts/note-marche.mjs       rédaction de la note interne via l'API Claude
scripts/notations.mjs         relève les notes Morningstar et les inscrit dans l'univers
scripts/catalogue.mjs         recense les ETF cotés en Europe → catalogue de recherche
scripts/icones.py             regénère les icônes depuis le signe
scripts/version.mjs           republie version.json, lu hors cache par l'application
version.json                  GÉNÉRÉ — marqueur de la version publiée
package.json                  dépendances des scripts uniquement (SDK Anthropic)
scriptable/allocation-etf.js  widget iOS, lit data/widget.json
manifest.webmanifest          ajout à l'écran d'accueil
icone-180/192/512.png         icônes, générées par encodeur PNG en Python
.github/workflows/cours.yml   relevé automatique du mardi au samedi
data/                         GÉNÉRÉ — archive des cours et rapports de couverture
js/ui/socle.js                état, persistance, formats, petits dessins
js/ui/dossier.js              ce que le dossier vaut — profil, allocation, suivi
js/ui/navigation.js           blocs, colonne, ruban, parcours, aiguillage
js/ui/vues-profil.js          accueil et bloc Profil
js/ui/vues-allocation.js      note, contexte, allocation, sélection, arbitrages, backtest
js/ui/vues-suivi.js           situation, revenus, journal
js/ui/catalogue.js            catalogue, rapprochement, entonnoir, fiche d'un support
js/ui/rapport.js              rapport, méthode, annexe, contrôles avant impression
js/ui/entrees.js              gestionnaires, import/export, version
js/app.js                     l'amorçage, chargé en dernier
test/runner.js                harnais de tests des moteurs (Node, sans dépendance)
test/suite.js                 assertions des moteurs
test/fumee.html               test de fumée de l'interface (navigateur, sans dépendance)
```

Deux harnais, qui ne couvrent pas la même chose.

**Les moteurs** — profil, allocation, sélection, arbitrage, revenus, backtest,
situation, contrat, univers. Node, sans dépendance :

```bash
node "/Users/Mayeul/APP ETF CGP/test/runner.js"
```

**L'interface** — le rendu des quinze vues, la persistance, l'import/export, la
navigation. Les neuf fichiers de `js/ui/` ne sont couverts par aucun test
Node : c'est là que les remaniements d'interface cassent quelque chose sans
qu'une seule assertion ne bronche. `test/fumee.html` charge l'application réelle dans un cadre et la
pilote : elle rend chaque vue sur un dossier vide puis sur un dossier complet,
vérifie qu'aucune ne lève d'erreur ni ne rend une page blanche, contrôle
l'aller-retour d'export et relit ce qui a été écrit dans le navigateur.

**Elle rejoue ce parcours une fois par mode de lecture.** Un mode qui masque
des vues, renomme la moitié des libellés et réécrit le rapport a tout ce qu'il
faut pour casser sans bruit — c'est d'ailleurs là qu'un défaut s'était glissé :
le ruban mobile affichait l'identifiant brut d'une vue masquée. Trois contrôles
y méritent d'échouer seuls : que
`#note` ouvre encore la note du jour alors qu'elle est masquée — le widget iOS
en dépend —, que le vocabulaire du mode soit bien appliqué, et que **le même
dossier sans contexte rende la même allocation cible dans les deux modes**.
Ce dernier est la garde du principe : un seul moteur, aucun calcul propre à un
mode. Le jour où il échoue, c'est qu'un `if (mode)` s'est glissé autour d'un
chiffre.

Elle a besoin d'un serveur — un cadre en `file://` est traité comme une autre
origine et son contenu devient illisible :

```bash
python3 -m http.server 8777 --directory "/Users/Mayeul/APP ETF CGP"
```

puis ouvrir `http://localhost:8777/test/fumee.html`.

Ils vérifient notamment que les allocations somment à 100 % pour les six profils
et les quatre scénarios, que les déviations tactiques restent dans leurs bornes,
qu'un profil Sécuritaire n'est jamais exposé aux actions, que chaque enveloppe
aboutit à un portefeuille intégralement investi, qu'après application des
ordres le portefeuille converge vers sa cible à capital constant, et qu'un ISIN
faux d'un chiffre ne valide aucun support au rapprochement.

Pour ajuster le modèle, tout se règle dans `js/data/` sans toucher aux moteurs :
libellés et pondérations des questions, allocations cibles par profil, effets des
indicateurs macro, bornes de déviation et seuils de déclenchement.

## Limites

- Les rendements et volatilités affichés reposent sur des hypothèses de long
  terme paramétrées dans `js/engine/allocation.js` (`HYPOTHESES`), avec une
  corrélation moyenne unique. Ce n'est pas une optimisation moyenne-variance.
- Les chocs de stress test sont calibrés à la main sur 2008, 2020 et 2022.
- Aucune donnée de marché n'est récupérée en temps réel : ni cours, ni valeurs
  liquidatives, ni notations. La lecture du contexte est saisie par le
  conseiller, et les valorisations sont mises à jour par collage du relevé.
  Il n'y a donc **pas de surveillance quotidienne automatique** : le suivi est
  déclenché par une revue, pas par une alerte de marché.
- La projection de capital en phase de retrait est déterministe. Elle ignore le
  **risque de séquence** — deux portefeuilles de même rendement moyen finissent
  très différemment selon l'ordre des années. Le coussin monétaire est la
  réponse retenue à ce risque.
- Le document produit est un support de travail. Il ne constitue pas un conseil
  en investissement tant qu'il n'a pas été validé, complété et signé dans le
  cadre du rapport d'adéquation remis au client.
