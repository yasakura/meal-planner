# ADR 0011 — Une décision vit dans un `.ts` muté, pas dans un `.tsx`

- **Statut** : en vigueur
- **Date** : 2026-08-19 (`37240ee`, `refactor(ui): remettre deux décisions dans des fichiers que
Stryker mute`)
- **Portée** : `src/ui/features/**`, `stryker.conf.mjs`, `src/domain/ports/random-picker.ts`

## Contexte

Le périmètre de mutation (`mutate` de `stryker.conf.mjs`) couvre `src/domain/**`, `src/data/**` et
`src/ui/features/**/*.ts`, **moins** les fichiers de test, l'infra de test
(`src/domain/test-doubles/**`, `src/domain/test-builders/**`) et les adapters du mode e2e
(`src/data/e2e/**` — [ADR 0012](0012-configurations-stryker-ecartees.md) et
[ADR 0016](0016-mode-e2e-embarque.md)). **Les `.tsx` ne sont pas mutés du tout** : containers et
composants n'ont aucun filet de mutation, et un chiffre de mutation ne dit **rien** sur un
container.

Le risque n'est pas théorique : une règle métier écrite dans un `.tsx` est une règle que personne ne
surveille. Deux expressions jumelles de « quand verrouiller le bouton Enregistrer » vivaient en
clair dans les deux formulaires de recette — dupliquées, et **aucune dérive entre les deux n'aurait
été signalée par quoi que ce soit**.

## Décision

Toute **décision** — quand verrouiller un bouton, quoi afficher, quelle adresse produire, quel
libellé, quelle ligne mène à une fiche — vit dans un module `.ts` de `src/ui/features/`, donc muté.
Le container **orchestre** : il lit, il câble, il rapporte le geste. Il ne décide pas.

Modules nés de cette règle : `ingredient-rows.ts`, `recipe-form-submission.ts`,
`recipe-for-route.ts`, `recipe-detail-states.ts`, `recipe-detail-origin.ts`, `menu-days.ts`,
`menu-notice.ts`, `menu-day-label.ts`, `french-elision.ts`, ainsi que les projections et sélecteurs
des slices (`conviveRowsOf`, `menuSaveNoticeOf`, `recipeCreateNoticeOf`, `selectIs…InFlight`).

**Corollaire de conception** : quand une décision a besoin d'une donnée impure (le jour courant, un
identifiant neuf), c'est un **thunk** qui la lit et une **action** qui la transporte — la décision
d'en tenir compte reste dans le reducer, qui est muté.

### Écrire pour être observable

Trois formes du code de production existent uniquement pour que la mutation puisse voir quelque
chose, et un « nettoyage » les casserait :

- **`SystemClock` construit son `Intl.DateTimeFormat` à chaque appel.** Hissé en constante de
  module, il serait évalué à l'import — donc avant que la mutation n'active quoi que ce soit : les
  mutants du fuseau et des options survivaient **tous**, y compris un `timeZone: ''` qui ne peut que
  lever. Un formateur non observable par la mutation est un formateur non testé.
- **`SystemClock` prend une source d'instants `() => number`, dont le défaut est la référence
  `Date.now`** — et non `() => new Date()`. Une lambda offre à la mutation un corps qu'elle remplace
  par `undefined` ; or `formatToParts(undefined)` formate justement l'instant courant, et le mutant
  survivait, indistinguable. Même forme pour `MathRandomPicker`.
- **La projection d'état prend la tranche, pas `RootState`.** `conviveRowsOf(ConvivesState)`,
  `menuSaveNoticeOf(MenuState)` et `recipeCreateNoticeOf(RecipeState)` construisent un objet neuf à
  chaque appel : ce ne sont **pas** des sélecteurs à passer à `useAppSelector`, qui re-rendrait en
  boucle sur une référence toujours différente. Prendre la tranche est la contrainte ; **mémoïser
  est au choix de l'appelant** — `ConvivesContainer` enveloppe la sienne dans un `useMemo` sur la
  référence stable de la tranche, `MenuContainer` et `RecipeCreateContainer` appellent la projection
  nue dans le corps du rendu.

## La mesure

- Un mutant **`static`** — porté par du code exécuté au chargement du module — est joué contre tous
  les tests de tous les fichiers qui importent ce module. Il coûte plusieurs fois un mutant
  ordinaire et **expire le premier sous charge** ([ADR 0012](0012-configurations-stryker-ecartees.md)).
  Construire des instances au niveau module augmente cette part.
- Certaines règles ne sont **pas observables par la RTL** non plus : `recipe-for-route.ts` en est
  l'exemple — la RTL n'inspecte le DOM qu'une fois les effets purgés, donc après que le chargement
  déclenché au montage a remis la recette à `null`. Laissée dans un container, la règle n'aurait eu
  ni test capable de la voir échouer, ni mutant pour la surveiller.

## Conséquences

- Les deux seuls filets des `.tsx` sont la **RTL** (un composant par test, ports mockés) et la
  **suite Playwright** (application assemblée). Il faut le savoir avant d'invoquer un score.
- Le **boilerplate RTK est désactivé à la source** par des `// Stryker disable next-line` ciblés
  par mutateur (préfixe de type d'action, `name` de slice, objet de config `createSlice`) : ces
  mutants sont équivalents. **Tout survivant restant demande une explication.**
- Les directives `// Stryker disable` et `// eslint-disable` ne sont pas des commentaires : elles
  sont fonctionnelles et restent dans le code.
