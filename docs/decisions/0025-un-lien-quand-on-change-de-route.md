# ADR 0025 — Un lien quand on change de route, un ton par rôle ARIA

- **Statut** : en vigueur
- **Date** : 2026-08-18 (`cf4711f`), conventions ARIA posées avec les états hors ligne (2026-08-13)
- **Portée** : composants de `src/ui/`

## Contexte

Deux conventions d'écran reviennent partout et n'ont aucune trace dans le code au-delà de leur
application : quand un geste est un **lien** plutôt qu'un **bouton**, et quel **rôle ARIA** porte un
constat.

## Décision

### Un geste qui ne fait que changer de route est un LIEN

« Modifier », « ← Recettes », un titre de recette dans le menu ou le catalogue : tous sont des
`<a>` / `<Link>`, jamais des `<button>` avec un `navigate()`. La sémantique de navigation garde
l'adresse **partageable**, l'ouverture **dans un onglet**, et l'**empilement dans l'historique**.
L'affordance, elle, peut être celle d'un bouton — c'est ce que l'utilisateur voit.

Corollaire de placement : « Modifier » est **haut** dans la fiche, sous le nombre de personnes, ce
qui le met au-dessus du pli **sans aucune barre collante**, quelle que soit la longueur de la
recette.

Corollaire de style : les lignes de menu et de catalogue ne sont **pas soulignées** — souligner
vingt-huit titres saturerait l'écran, et une ligne n'a pas besoin de s'annoncer comme un lien pour
en être un.

### Le TON du constat choisit le rôle ARIA

Deux familles, qui ne décident pas au même endroit.

**Les constats d'écriture** portent leur ton (`{ tone, message }`). Le ton est décidé dans le slice,
**muté** ([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)) ; le composant ne fait
que le traduire :

| Ton           | Rôle ARIA | Pourquoi                                                    |
| ------------- | --------- | ----------------------------------------------------------- |
| `error`       | `alert`   | assertif — l'écriture a échoué                              |
| `success`     | `status`  | poli — rien n'est attendu                                   |
| `unconfirmed` | `status`  | poli — l'écriture est partie, il n'y a rien à faire d'utile |

**Les écrans d'état**, eux, n'ont aucun ton qui voyage depuis un slice : leur rôle est écrit **en
dur** dans le `.tsx`, à côté de l'état qu'ils rendent.

| État          | Rôle ARIA | Pourquoi                                              |
| ------------- | --------- | ----------------------------------------------------- |
| `error`       | `alert`   | assertif — le chargement a échoué                     |
| `notFound`    | `alert`   | assertif — l'écran n'a pas ce qu'on venait y chercher |
| `loading`     | `status`  | poli — une étape, pas un constat                      |
| `unavailable` | `status`  | poli — une absence de réseau est un constat passager  |

`alert` n'est donc **pas** réservé à ce qui attend une action : « Recette introuvable » le porte
alors que rien n'est attendu de l'utilisateur. Ce qui déclenche l'assertif est l'**échec** — l'écran
ne montre pas ce qu'on venait y chercher — et non l'appel à un geste.

Deux messages d'erreur écrits en dur échappent aux deux familles — le refus d'authentification
(`LoginScreen`) et le refus de date de début du menu (`MenuScreen`) : même règle, `alert`, parce que
le geste a été refusé.

L'état `empty` ne porte, lui, **aucun** rôle : c'est ce que font les deux écrans vides du produit
(catalogue, convives), constaté et jamais arbitré. À trancher le jour où un troisième apparaît.

Et une règle de couleur qui va avec : **un état n'est pas un jugement**. Chargement, liste vide,
absence de réseau prennent la teinte secondaire ; le rouge reste réservé au message d'erreur.

### Un seul constat à la fois

Un objet nullable porteur de son ton (`{ tone, message }`), et non plusieurs messages nullables
côte à côte : au plus un constat à la fois, et l'état « deux constats ensemble » devient
**irreprésentable**.

## La mesure

Aucune mesure chiffrée : conventions d'interface arbitrées, appliquées uniformément. Les tableaux
ci-dessus sont le seul endroit où la correspondance ton → rôle est écrite une fois pour toutes ; elle
était jusqu'ici répétée dans **sept** composants — `RecipeDetailScreen`, `RecipeListScreen`,
`RecipeCreateScreen`, `MenuScreen`, `ConvivesSection`, `LoginScreen`, `Splash`. Compté par
`grep -rl 'role="alert"\|role="status"' src/ui --include='*.tsx'`, privé de ses quatre fichiers de
test.

## Conséquences

- Les scénarios Playwright localisent par **rôle** (`getByRole('link', …)` vs
  `getByRole('button', …)`) : changer un lien en bouton casse les scénarios, ce qui est le
  comportement voulu.
- Une écriture **refusée** et une écriture **non acquittée** ne partagent jamais leur rôle :
  `alert` pour le refus, `status` pour l'absence de réponse — c'est la traduction, pour un lecteur
  d'écran, des trois issues posées par [ADR 0001](0001-trois-issues-pour-une-ecriture.md).
