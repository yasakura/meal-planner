# ADR 0040 — Le filet de rendu, et pourquoi il se réarme sur la clé de navigation

- **Statut** : en vigueur
- **Date** : 2026-08-27 (branche `iter-63-prorata`)
- **Portée** : `src/ui/Layout.tsx`, `src/ui/App.tsx`
- **Issue** : [#152](https://github.com/yasakura/meal-planner/issues/152)

## Contexte

Deux défauts trouvés le même jour transformaient un invariant du domaine qui **jette pendant un
rendu** en **page entièrement vide** : `document.body.innerText.trim() === ''`, aucune sortie, le
seul geste possible étant de retaper une URL. L'un d'eux est la quatrième ligne du tableau de
[ADR 0039](0039-un-seul-plafond-celui-du-compte-juste.md) — `createIngredient` refusant, au milieu du
rendu de la fiche recette, le résultat que le prorata venait de produire.

Il n'existait **aucun `ErrorBoundary` dans `src/`** : vérifié à la rédaction sur `main`, le mot
n'apparaît nulle part sous `src/`, et `react-error-boundary` n'est pas dans les dépendances.

## Décision

Un `ErrorBoundary` de **`react-error-boundary`** autour de l'`<Outlet/>` dans
`src/ui/Layout.tsx#Layout`, **à l'intérieur** du conteneur de contenu
(`src/ui/Layout.tsx#Content`), avec ses `resetKeys` sur la **clé de navigation** et
`src/ui/Layout.tsx#EcranEnPanne` pour constat.

### Pourquoi la bibliothèque, et pas une classe maison

react.dev la désigne nommément, à deux endroits : « you don't have to write the Error Boundary class
yourself. For example, you can use `react-error-boundary` instead »
([`react.dev/reference/react/Component`](https://react.dev/reference/react/Component)). Elle apporte
surtout `resetKeys`, c'est-à-dire le traitement natif de la **rémanence du constat** : un boundary
enclenché le reste, et c'est précisément le piège qu'une classe maison de vingt lignes reproduirait
mal ([ADR 0020](0020-un-remontage-n-est-jamais-garanti.md)).

### Pourquoi pas l'`errorElement` de React Router

Mesuré dans la source installée (`react-router` 7.18.2, `dist/development/chunk-62JRHF6Z.mjs`) : le
rendu n'enveloppe une route de son `errorElement` **que si un état de data router est présent** —
`dataRouterState && (route.ErrorBoundary || route.errorElement || index === 0)`. C'est ce que la
documentation annonce : « This feature only works if using a data router »
([`errorElement`](https://reactrouter.com/6.30.1/route/error-element)). L'application est en
`<BrowserRouter>` + `<Routes>` (`src/ui/App.tsx#App`) : l'`errorElement` y serait **inerte**, un
garde-fou qu'on n'aurait jamais vu échouer. Migrer vers `createBrowserRouter` dépassait le périmètre.

## Pourquoi la clé, et pas le chemin

C'est le cœur de la décision. `resetKeys={[pathname]}` avait été posé d'abord ; il laisse deux trous,
tous deux atteignables :

- **retaper l'onglet où l'on se trouve déjà** — même `pathname`, écran mort ;
- **deux liens de créneau qui ne diffèrent que par `?pour=`** — même `pathname` là encore, la
  provenance et l'effectif vivant dans la query ([ADR 0022](0022-la-provenance-vit-dans-l-url.md)).

Trois lectures de **source installée** — pas de documentation — ferment le raisonnement :

1. `react-error-boundary` 6.1.3 ne réarme le boundary que si un élément de `resetKeys` a changé **au
   sens de `Object.is`** : la comparaison est un `some((t, o) => !Object.is(t, e[o]))` sur les deux
   tableaux. Une valeur égale à elle-même ne réarme rien.
2. Dans `react-router` 7.18.2, un `Link` vers l'URL courante n'est **pas un no-op** : le gestionnaire
   de clic calcule `replace = replaceProp !== undefined ? replaceProp : createPath(location) === createPath(path)`.
   Cliquer là où l'on est déjà déclenche donc une navigation en **replace**.
3. Toujours dans `react-router`, `createLocation` pose `key: to.key || key || createKey()`, et la
   fonction `replace` de l'historique l'appelle **sans clé** : chaque navigation fabrique une
   **clé neuve**, replace compris.

`resetKeys={[key]}` réarme donc sur **n'importe quel geste de navigation**, sans aucune machinerie —
ni compteur, ni horodatage, ni bouton. Les deux trous sont chacun tenus par un test qui les nomme,
dans `src/ui/Layout.test.tsx` : « retaper l'onglet où l'on se trouve déjà relance l'écran qui a
jeté » et « la sortie d'un écran qui a jeté mène ailleurs ».

## Pourquoi aucun bouton « Réessayer »

Mesuré dans le code : **toutes** les routes de `src/ui/App.tsx#App` sont sous `Layout`, et la tab bar
(`src/ui/Layout.tsx#StickyTabBar`) vit **hors** du boundary, en frère du conteneur de contenu. Elle
reste donc visible quand le contenu a jeté, et elle offre désormais un geste de réarmement **partout,
y compris vers l'onglet courant**.

Un bouton serait un **second chemin vers la même chose**. Il ne sauve pas non plus un écran qui jette
de façon **déterministe** : le même rendu, rejoué sur le même état, jette une seconde fois. La sortie
utile est celle qui change d'écran, et la tab bar la donne déjà.

## Conséquence, et ce qui reste ouvert

Le constat dit « Cet écran n'a pas pu s'afficher. » et **n'annonce pas** la sortie. Elle existe — la
tab bar est là, sous le constat — mais sa **découvrabilité** est un choix de libellé qui **n'a pas
été tranché** : dire « reviens par le menu du bas » relève de la décision produit, pas de
l'architecture.
