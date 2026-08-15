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

## Lancer l'application

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
js/engine/profil.js           scoring, plafonnement, stress tests
js/engine/allocation.js       stratégique, agrégation macro, tactique, métriques
js/engine/selection.js        filtrage de l'univers, notation et choix des supports
js/engine/arbitrage.js        écarts, ordres, fiscalité, journal
js/engine/revenus.js          coussin, cascade de prélèvement, fiscalité, projection
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
