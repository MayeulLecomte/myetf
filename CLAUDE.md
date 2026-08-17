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

## Pistes — reportées, pas abandonnées

Relevées à la relecture « premier dossier », hors chantier à ce stade :

| Piste | Ce qui accroche |
|---|---|
| **Refonte de l'univers ETF** | 3 482 mots et 42 lignes de tableau sur une vue, trois cartes empilées ; un premier visiteur n'y comprend pas ce qu'on attend de lui |
| **Indicateurs macro prioritaires** | onze indicateurs présentés à plat ; il manque « les trois qui pèsent le plus », faute de quoi aucun n'est rempli — donc aucune déviation |
| **Note du jour en vitrine** | c'est le seul écran immédiatement lisible sans dossier, et il est rangé derrière deux niveaux de navigation |
| **Nom du dossier obligatoire** | à traiter **dans le chantier 7**, pas avant : ce qu'on exige dépend du mode — un particulier n'a pas de « référence dossier » |
