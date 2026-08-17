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
> 15 août 2026** — nom, ISIN, frais, encours, réplication, devise, éligibilité
> PEA — et **les notations Morningstar le 16 août 2026**. Elles vieillissent :
> les notes sont recalculées chaque mois. **Un contrôle reste à faire, dossier
> par dossier** : le référencement effectif de chaque support dans le contrat du
> client. Il se fait en collant la liste des supports de l'assureur dans
> l'onglet « Univers ETF ».
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
Le choix de la date et le figeage restent dans l'onglet « Situation » : le
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

## Accéder à l'application

En ligne : **https://mayeullecomte.github.io/myetf/**

La page est publique. Elle ne comporte aucun serveur : les données saisies
restent dans le navigateur de chaque utilisateur (`localStorage`) et ne sont
transmises à personne. Deux utilisateurs de la même adresse ne partagent donc
pas leurs dossiers — l'échange se fait par « Exporter le dossier » puis
« Importer ».

## Interface

Registre visuel inspiré des interfaces Apple : surfaces arrondies et
superposées, matériaux translucides sur les barres fixes (`backdrop-filter`),
typographie système, boutons en pilule qui s'enfoncent au clic, transitions sur
la courbe de ressort d'iOS. Le **mode sombre suit le réglage de l'appareil** —
rien à activer.

Deux règles s'appliquent au-delà du goût :

- **Le rapport client reste sobre.** La feuille d'impression repasse en
  monochrome, sans ombre ni accent coloré : un document remis à un client n'est
  pas une interface.
- **La palette des graphiques est validée, pas choisie à l'œil.** Bande de
  clarté, plancher de chroma, séparation en vision déficiente et contraste sur
  la surface sont vérifiés par un contrôleur, dans les deux modes. Deux
  combinaisons ont d'ailleurs été écartées à ce titre : violet et bleu étaient
  indiscernables sur fond sombre (ΔE 9,8, sous le plancher de 15). **Ne
  retouchez pas une couleur de série sans relancer ce contrôle.**

Toutes les couleurs sont des jetons CSS (`--serie-*`, `--scenario-*`,
`--profil-*`) ; `js/data/` les référence par `var(--…)` plutôt que par des
valeurs en dur, si bien que le basculement clair/sombre ne demande aucun
JavaScript.

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

### Ce qui reste sobre

Le verdict prend un halo, les cartes entrent en cascade, les chiffres qui
comptent grossissent. **Le rapport client, lui, ne bouge pas** : la règle
d'impression le repasse en monochrome, sans ombre ni arrondi marqué. Un
document remis à un client ne gagne rien à être ludique.

**Ajout à l'écran d'accueil** : ouvrir le site dans Safari, toucher le bouton
Partager, puis « Sur l'écran d'accueil ». L'application s'ouvre alors en plein
écran, sans barre d'adresse, avec sa propre icône. Le manifeste et les
métadonnées `apple-mobile-web-app-*` s'en chargent ; les marges d'encoche et
de barre d'accueil sont gérées par `env(safe-area-inset-*)`.

## Le signe

Trois barres croissantes sur fond bleu, la plus haute en or. Il ouvre l'en-tête
à côté du lettrage **myetf**, et se retrouve à l'identique en favicon, en icône
d'écran d'accueil et au pied de page. Le lettrage reste en encre pleine : le
signe porte déjà l'accent coloré, et deux accents côte à côte se disputeraient
l'attention.

Le signe **ne suit pas le thème** : ses trois couleurs (`--logo-fond`,
`--logo-barre`, `--logo-accent`) ne sont jamais redéfinies en mode sombre. Une
icône d'écran d'accueil ne peut pas s'inverser selon les réglages du téléphone ;
si l'en-tête s'inversait de son côté, le site et l'icône cesseraient d'être le
même dessin. Le bleu foncé reste lisible sur les deux fonds.

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
estimation non vérifiée. Le bandeau de fiabilité résume la proportion.

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

## Univers ETF — à vérifier avant toute utilisation en clientèle

L'univers compte **42 supports**, contrôlés à deux niveaux distincts.

**Niveau 1 — caractéristiques de marché : fait le 15 août 2026, sur justETF.**
Les 42 lignes portent une date et une source (`donneesLe`, `donneesSource`,
colonne « Données »). Ce contrôle a corrigé beaucoup : **neuf ISIN désignaient un
autre fonds que celui annoncé** — deux fonds liquidés, un ETF classé en actions
Europe qui était un émergents, un « Japon couvert en euro » qui ne l'était pas,
un « PEA Nasdaq-100 » qui était un PEA S&P 500 (ISIN faux d'un chiffre), une
obligataire euro qui était une *floating rate* en dollars. S'y ajoutaient
quatorze frais courants erronés, la quasi-totalité des encours, et plusieurs
erreurs de devise, de capitalisation et d'éligibilité PEA. Ces données
vieillissent : refaites le relevé périodiquement.

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
l'onglet *Client & enveloppe* restreint la sélection aux seuls supports validés.
Il reste inactif par défaut, et refuse de s'activer sur un univers dont rien
n'est validé : il viderait la sélection sans dire pourquoi.

## Sélectionner dans tout le catalogue européen

Le champ « Univers de sélection », onglet *Client & enveloppe*, choisit ce sur
quoi porte la sélection :

| | |
|---|---|
| **Univers de travail** | 42 supports relevés un à un, cochables au contrat. Le seul univers opposable. |
| **Catalogue européen** | **2 086 supports** sélectionnables, sur les 4 533 recensés. |

Le catalogue n'est chargé qu'au moment où il devient la source — un
demi-mégaoctet ne se télécharge pas sans qu'on l'ait demandé. L'univers de
travail reste présent : ses lignes y sont mieux renseignées que leur homologue
du catalogue, et les supports détenus doivent rester reconnus.

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
vérifié au contrat, et l'onglet *Sélection ETF* le dit en toutes lettres dès
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
0,118 %**, et le résiduel non investi tombe à zéro : chaque poche trouve enfin
un support.

Avant toute remise au client, versez les supports retenus dans l'univers de
travail depuis l'onglet *Univers ETF*, puis contrôlez leur ligne et leur
référencement au contrat.

**Les notations Morningstar** sont relevées par

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
css/app.css                   feuille de style, y compris règles d'impression
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
package.json                  dépendances des scripts uniquement (SDK Anthropic)
scriptable/allocation-etf.js  widget iOS, lit data/widget.json
manifest.webmanifest          ajout à l'écran d'accueil
icone-180/192/512.png         icônes, générées par encodeur PNG en Python
.github/workflows/cours.yml   relevé automatique du mardi au samedi
data/                         GÉNÉRÉ — archive des cours et rapports de couverture
js/app.js                     état, rendu des onze vues, événements, persistance
test/runner.js                harnais de tests des moteurs (Node, sans dépendance)
test/suite.js                 assertions
```

Pour rejouer les tests des moteurs après une modification :

```bash
node "/Users/Mayeul/APP ETF CGP/test/runner.js"
```

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
