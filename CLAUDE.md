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
| Données *(secondaire)* | univers |

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

## Ce qui ne doit jamais casser

- **Les ancres `#…`** de toutes les vues. Elles servent de routage
  (`location.hash` au démarrage) et sont consommées de l'extérieur.
- **`#note` et `#accueil`** en particulier — le widget iOS les ouvre.
- **Les moteurs** (`js/engine/`) et leurs 192 assertions : `node test/runner.js`.
- **Le rendu**, la persistance, l'import/export : `test/fumee.html`, qui a besoin
  d'un serveur.

Lancer les deux harnais **avant et après** tout remaniement d'interface, et
comparer — pas seulement constater qu'ils passent à la fin.

## Registre visuel

Verre dépoli sur halo, titres et chiffres en SF Pro Rounded (`ui-rounded`),
texte courant en SF Pro Text. Aucune police chargée depuis le réseau.

Le flou (`backdrop-filter`) va sur les **conteneurs**, jamais sur les éléments
répétés d'une liste.

**Le rapport client échappe à tout cela** : à l'impression, ni halo, ni verre, ni
fonte arrondie. Un document remis à un client ne gagne rien à être ludique.
