# ADR 0022 — La provenance d'un parcours vit dans l'URL

- **Statut** : en vigueur
- **Date** : 2026-08-19 (`3638a53`, `feat(menu): le menu mène aux fiches, et le retour ramène au
menu`)
- **Portée** : `src/ui/features/recipe-detail/recipe-detail-origin.ts`,
  `src/ui/features/catalogue/CatalogueContainer.tsx`

## Contexte

Une fiche recette s'ouvre depuis deux endroits : le catalogue et le menu. Le lien « ← » doit ramener
d'où l'on vient, et le parcours compte **quatre** producteurs d'adresse — la ligne du catalogue, la
fiche ouverte depuis le menu, le formulaire ouvert depuis la fiche, la fiche rendue par le
formulaire enregistré.

## Décision

La provenance voyage dans l'**URL** (paramètre de requête), et **pas** dans l'état de navigation de
React Router (`Link state`).

Le `Link state` est perdu par un **rechargement**, un **favori** ou un **lien partagé** : le retour
retomberait alors sur le catalogue au milieu d'un parcours qui vient du menu. Le prix est un
paramètre visible dans l'adresse ; c'est aussi ce qui rend l'écran **descriptible par sa seule
URL** — donc atteignable par un scénario Playwright, et reproductible.

Deux propriétés de forme, qui ferment des erreurs plutôt que de les surveiller :

- **les deux moitiés de la convention vivent dans le même module** : celui qui fabrique les adresses
  et celui qui relit la provenance. Sinon rien n'obligerait le nom du paramètre écrit par l'un à
  être celui que l'autre attend — un désaccord silencieux, invisible à la compilation ;
- **les fabriques d'adresses sont des méthodes DE la provenance**, pas des fonctions libres. Pas un
  seul producteur ne prend d'identifiant sans prendre la provenance avec : un appelant n'a **aucune
  façon** de fabriquer une adresse sans passer par elle, donc aucune façon de l'oublier.

Le défaut retenu quand l'URL ne dit rien est le **catalogue** : c'est le seul qui ne mente pas — on
n'affirme pas venir d'un menu qu'on n'a pas vu.

### « Aucune façon de l'oublier » a été faux pendant que l'ADR l'affirmait

La propriété ne vaut que sur les producteurs qui **passent** par le module, et elle ne dit rien de
ceux qui l'ignorent. La liste du catalogue écrivait son lien à la main — `` `/catalogue/${recipe.id}` ``
dans un composant dumb —, et `FROM_CATALOGUE` était privée : ce site ne _pouvait pas_ utiliser
l'API, même en le voulant. Le résultat coïncidait au caractère près, donc rien ne se voyait ;
aucun test unitaire ne reliait les deux. Un changement de route aurait été suivi par `menu-days.ts`
et par les deux containers de fiche, et **pas** par le catalogue — seul Playwright l'aurait vu, dans
le job non bloquant.

Ce qui a fermé le trou (`iter-45`) n'est pas un test de surveillance de la coïncidence, mais sa
**disparition** : `FROM_CATALOGUE` est exportée, le container du catalogue lui demande l'adresse et
la descend en prop, et le composant dumb n'en fabrique plus aucune. Il n'y a donc plus deux endroits
à garder d'accord. La règle qui en découle : une provenance connue **statiquement** s'importe comme
constante (`FROM_MENU`, `FROM_MENU_DRAFT`, `FROM_CATALOGUE`) ; une provenance **lue dans l'URL**
passe par `originOf(params)`. Le catalogue n'a rien à lire — il _est_ l'origine.

Le gage est un test qui échoue si le lien cesse de venir de la provenance : il remplace
`FROM_CATALOGUE.recipeHref` par une adresse témoin et exige que la ligne la porte. Confronté à
l'envers aussi — changer la route dans `origin()` **seule** rend désormais le catalogue rouge, alors
que le même changement le laissait vert avant.

## La mesure

Aucune mesure chiffrée : décision de conception, prise contre l'alternative `Link state` dont les
trois modes de perte sont connus. Constaté, non mesuré.

## Conséquences

- La décision vit dans un `.ts` **muté**, pas dans les containers
  ([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)) : « quelle adresse, quel
  retour » n'aurait sinon aucun mutant pour la surveiller.
- Le libellé du retour vers une fiche est au **singulier** (« ← Recette ») ; « ← Recettes »
  annoncerait le catalogue. Les deux se distinguent d'une seule lettre, ce qui est précisément le
  piège de sous-chaîne de [ADR 0018](0018-conventions-playwright.md).
- Le suffixe de requête est l'**unique** porteur de la provenance : toutes les méthodes le recopient,
  aucune ne le compose. Une provenance sans suffixe produit donc des URL nues, sans qu'aucun cas
  particulier n'ait à être distingué nulle part.
- L'écran de détail est **dumb** : il reçoit destination et libellé, il ne les décide pas. Le
  formulaire de modification rend cet écran-là pour ses états sans recette, et lui demande son
  retour comme tout le monde.
