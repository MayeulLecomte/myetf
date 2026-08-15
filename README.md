# Allocation ETF — profilage, allocation d'actifs et arbitrages

> ### ⚠️ Avertissement
>
> **Cette application ne constitue pas un conseil en investissement**, ni une
> recommandation d'achat ou de vente, ni une sollicitation d'investir. C'est un
> outil de travail interne destiné à un professionnel, qui doit valider,
> compléter et signer toute préconisation dans le cadre d'un rapport
> d'adéquation.
>
> **Les caractéristiques des ETF livrées avec l'application sont indicatives et
> non vérifiées** (codes ISIN, frais, encours, notations, éligibilité). Elles ne
> doivent pas être utilisées telles quelles.
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
en assurance-vie, PEA ou compte-titres. Il enchaîne cinq étapes :

1. **Questionnaire de profilage** (structure MIF 2 / DDA) → profil de risque
2. **Allocation stratégique** issue du profil (actions / obligations / monétaire / diversifiants)
3. **Lecture du contexte** économique, géopolitique et fiscal → probabilités de scénarios → **déviations tactiques bornées**
4. **Sélection des supports** dans un univers ETF restreint, filtré par enveloppe et par contrat
5. **Arbitrages** : comparaison au portefeuille détenu, ordres à passer, fiscalité, journal de suivi

## Accéder à l'application

En ligne : **https://mayeullecomte.github.io/myetf/**

La page est publique. Elle ne comporte aucun serveur : les données saisies
restent dans le navigateur de chaque utilisateur (`localStorage`) et ne sont
transmises à personne. Deux utilisateurs de la même adresse ne partagent donc
pas leurs dossiers — l'échange se fait par « Exporter le dossier » puis
« Importer ».

## Sur iPhone

L'application est adaptée au téléphone : la barre latérale devient un bandeau
d'onglets défilant, les cartes passent en pleine largeur, les tableaux
défilent horizontalement plutôt que de s'écraser, et toutes les saisies font
au moins 16 px — en dessous, iOS agrandit la page à chaque fois qu'on touche
un champ.

**Ajout à l'écran d'accueil** : ouvrir le site dans Safari, toucher le bouton
Partager, puis « Sur l'écran d'accueil ». L'application s'ouvre alors en plein
écran, sans barre d'adresse, avec sa propre icône. Le manifeste et les
métadonnées `apple-mobile-web-app-*` s'en chargent ; les marges d'encoche et
de barre d'accueil sont gérées par `env(safe-area-inset-*)`.

Les icônes sont générées par un encodeur PNG minimal en Python (bibliothèque
standard seule) — aucune dépendance graphique dans le projet.

## Widget iOS (Scriptable)

`scriptable/allocation-etf.js` affiche les mouvements du jour sur l'écran
d'accueil. Trois tailles :

- **Petit** — la variation du jour des actions monde, semaine et année en dessous
- **Moyen** — le titre de la note du jour et quatre repères d'allocation sur la semaine
- **Grand** — la note, puis les trois plus fortes hausses et baisses de la semaine

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

**Couverture actuelle : 27 supports sur 41.** Les autres sont cotés sur Xetra,
Milan ou Londres, hors périmètre d'Euronext. `data/couverture.json` liste les
absents — c'est aussi un moyen commode de repérer un ISIN erroné : un ETF
français introuvable à Paris a probablement un mauvais code.

Dans l'onglet Backtest, chaque cellule est colorée selon sa provenance :
**vert** relevé sur les cours, **bleu** source documentée, **orange**
estimation non vérifiée. Le bandeau de fiabilité résume la proportion.

## Note de marché interne (facultatif)

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

**Les données livrées sont indicatives.** Quantalys et Morningstar sont des
services sur abonnement sans interface publique : aucune donnée n'est récupérée
automatiquement. Les ISIN, frais courants, encours, notations et référencements
en assurance-vie du fichier `js/data/etf-univers.js` constituent un point de
départ qui **doit être contrôlé** ligne à ligne.

Le rafraîchissement se fait dans l'onglet **Univers ETF** : toutes les cellules
sont modifiables, une case « Vérifié » trace le contrôle, et l'univers complet
s'exporte et se réimporte en JSON. Les supports non vérifiés sont signalés par un
badge orange dans la sélection.

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
js/data/etf-univers.js        univers ETF de départ (à vérifier)
js/data/fiscalite.js          taux, abattements, rendements courants, cascade de retrait
js/data/historique.js         séries de performances annuelles par poche
js/data/cours-marche.js       GÉNÉRÉ — performances et derniers cours par ISIN
js/data/note-marche.js        GÉNÉRÉ — note de marché du jour
js/engine/profil.js           scoring, plafonnement, stress tests
js/engine/allocation.js       stratégique, agrégation macro, tactique, métriques
js/engine/selection.js        filtrage de l'univers, notation et choix des supports
js/engine/arbitrage.js        écarts, ordres, fiscalité, journal
js/engine/revenus.js          coussin, cascade de prélèvement, fiscalité, projection
js/engine/backtest.js         simulation, rééquilibrage, contributions, risque de séquence
scripts/maj-cours.mjs         relevé Euronext, archivage cumulatif, derniers cours
scripts/note-marche.mjs       rédaction de la note interne via l'API Claude
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
aboutit à un portefeuille intégralement investi, et qu'après application des
ordres le portefeuille converge vers sa cible à capital constant.

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
