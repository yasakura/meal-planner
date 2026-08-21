# ADR 0026 — Trois règles type-aware, et ce qu'elles ignorent du runtime

- **Statut** : en vigueur
- **Date** : 2026-08-21 (branche `iter-30-garde-fous`)
- **Portée** : `eslint.config.js`, `src/ui/AccountSheet.tsx`, `e2e/support/atteignabilite.ts`,
  `src/ui/features/recipe-detail/RecipeDetailContainer.test.tsx`

## Contexte

`CLAUDE.md` demande que **rien ne dépasse la spec** : aucune ligne qu'aucun test n'exige, pas de
garde défensif « au cas où ». Aucun outil du dépôt ne savait tenir cette règle sur une classe précise
d'excès — **la condition qui ne peut jamais être fausse**. Le compilateur ne s'en plaint pas, les
tests passent, et la **mutation en est structurellement incapable** : un garde défensif qu'un test
justifie a tous ses mutants tués, donc le score le récompense au lieu de le dénoncer.

`eslint.config.js` passe donc en mode **type-aware**
(`parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }`) et active trois
règles qui savent lire les types, ce qu'aucun autre garde-fou du dépôt ne fait.

Ces règles raisonnent sur les **déclarations** de types. Pas sur le runtime. Cette limite n'a pas été
déduite : elle a été **découverte par un test qui est passé au rouge** quand la première correction a
été appliquée à la lettre.

## Décision

1. **Les trois règles sont actives en `error`** sur `**/*.{ts,tsx}` :
   `@typescript-eslint/no-unnecessary-condition`, `@typescript-eslint/no-unnecessary-type-assertion`,
   `@typescript-eslint/no-unnecessary-boolean-literal-compare`.
2. **On ne les musèle pas.** Quand une règle contredit le runtime, on rend la possibilité **visible
   au type** — un `typeof`, un garde portant sur une **valeur** — plutôt qu'un
   `// eslint-disable-next-line`. Une condition sur une valeur est **acceptée** par la règle, parce
   qu'elle ne porte pas sur un type déclaré ; la suppression, elle, aurait caché un vrai risque de
   runtime derrière un silence.
3. **Un `eslint-disable` sur l'une de ces trois règles est le signe que le type ment sur le
   runtime.** C'est le type qu'on corrige, pas le rapport.
4. **Périmètre : ces trois règles, et pas `recommendedTypeChecked` en entier.** Le préréglage complet
   apporte 24 signalements d'une **autre** classe (voir la mesure) : chantier séparé, délibérément
   écarté.

## La mesure

### Ce que la mutation ne peut pas voir : le garde de `createMenu`

`src/domain/entities/menu.ts` portait un garde sur un champ **non optionnel** :

```ts
export type MenuProps = {
  dateDebut: CalendarDate;
  repas: Repas[];
};

export function createMenu(props: MenuProps): Menu {
  if (props.dateDebut === undefined) {
    throw new Error('La date de début du menu est obligatoire');
  }
  return Object.freeze({
    dateDebut: props.dateDebut,
    repas: Object.freeze([...props.repas]),
  });
}
```

`reports/stryker-incremental.json`, avant la suppression : **8 mutants sur `menu.ts`, tous
`Killed`** — dont **5 portés par le garde** (deux `ConditionalExpression`, un `EqualityOperator`, un
`BlockStatement`, le `StringLiteral` du message). Ils étaient tués parce qu'un test atteignait le
garde par `createMenu({ …, dateDebut: undefined as unknown as CalendarDate })`. La mutation mesure
les **tests**, jamais la **spec** : un garde impossible à atteindre autrement qu'en mentant au
compilateur lui rend un score parfait.

`no-unnecessary-condition` est le seul outil du dépôt qui sait dire que `props.dateDebut === undefined`
est toujours faux. Le garde et son test ont été supprimés ; run isolé du 2026-08-21 sur
`src/domain/entities/menu.ts` : **3 mutants, 100 %, 0 timeout, 0 survivant**.

### `window.matchMedia` — la règle a raison sur le type et tort sur le runtime

`src/ui/AccountSheet.tsx`, fonction `prefersReducedMotion`. Le code portait :

```ts
window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
```

La règle a signalé le `?.` **et** le `=== true` comme inutiles. Elle a raison sur la déclaration :
`node_modules/typescript/lib/lib.dom.d.ts` (TypeScript 5.9.3), ligne 36705, dans `interface Window` —

```ts
matchMedia(query: string): MediaQueryList;
```

Ni optionnelle, ni `| undefined`, et `MediaQueryList.matches` est un `boolean` franc.

Appliquer la correction à la lettre a fait **rougir un test vert** (sortie rapportée par le cycle qui
a posé les règles, non re-mesurée ici) :

```
FAIL src/ui/AccountSheet.test.tsx > reste montée pendant la fermeture, puis se démonte au transitionEnd
TypeError: window.matchMedia is not a function
  ❯ prefersReducedMotion src/ui/AccountSheet.tsx:90:45
```

Cause vérifiée : **jsdom n'implémente pas `matchMedia`**. Sur la version du dépôt, jsdom 29.1.1,
`typeof window.matchMedia` vaut `undefined` et `'matchMedia' in window` vaut **`false`** — la
propriété est absente, pas seulement non initialisée. `lib.dom` décrit les navigateurs ; les tests
tournent en `environment: 'jsdom'`.

Résolution retenue — rendre l'absence visible au type plutôt que museler la règle :

```ts
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
```

Le `typeof … === 'function'` porte sur une **valeur** : la règle l'accepte. Un
`// eslint-disable-next-line` aurait rendu le lint vert **et** laissé le `TypeError` en place.

### `eslint --fix` ne peut pas défaire ces gardes : `no-unnecessary-condition` n'est pas `fixable`

Le hook de pré-commit passe `eslint --fix` sur tout `*.{ts,tsx}` (`lint-staged`). La question se pose
donc : le garde `typeof window.matchMedia === 'function'` ci-dessus peut-il être retiré
automatiquement, un jour, par un commit ?

Non. Vérifié dans `node_modules/@typescript-eslint/eslint-plugin/dist/rules/no-unnecessary-condition.js`
(typescript-eslint 8.63.0) : son `meta` porte `hasSuggestions: true` et **aucune** clé `fixable` — le
mot n'apparaît pas une fois dans le fichier. Ses corrections sont des **suggestions**, qu'un éditeur
propose une par une et qu'`eslint --fix` n'applique jamais. Les deux autres règles, elles, portent
bien `fixable: 'code'` : `no-unnecessary-type-assertion` et `no-unnecessary-boolean-literal-compare`
se corrigent, elles, toutes seules.

C'est ce qui rend tenable la décision « on ne les musèle pas » : retirer un `?.` ou un `typeof` que
cette règle signale exige un humain, qui peut alors constater le rouge du test — comme ci-dessus.

Réserve : la garantie tombe **en silence** si la règle devient `fixable` en amont. Rien dans le dépôt
ne la vérifie ; c'est une propriété de la version installée, pas une décision du projet.

### `Node.textContent` — la déclaration change d'une version de TypeScript à l'autre

Deux `textContent ?? ''` ont été signalés : `e2e/support/atteignabilite.ts` (sur un `Element`) et
`src/ui/features/recipe-detail/RecipeDetailContainer.test.tsx` (sur `document.body`).

Motif vérifié dans les deux `lib.dom.d.ts` :

- **TypeScript 5.8.3** : une **seule** déclaration, `textContent: string | null`, portée par
  `interface Node`. `Element` en hérite, la lecture peut rendre `null`, le `?? ''` est nécessaire.
- **TypeScript 5.9.3** (la version du dépôt) : la propriété est **scindée en accesseurs** sur
  `Attr`, `CharacterData`, `DocumentFragment` et `Element` (ligne 11102) —

  ```ts
  get textContent(): string;
  set textContent(value: string | null);
  ```

  La **lecture** ne rend donc plus jamais `null` sur un `Element`, et le `?? ''` devient « inutile ».

Nuance qui compte pour la suite : `interface Node` garde `textContent: string | null` (ligne 21742),
et `Document` comme `DocumentType` déclarent `get textContent(): null`. Le signalement dépend donc du
**type statique de la variable**, pas de l'expression : le même `?? ''` reste exigé sur un `Node`.

Contrepartie assumée : ces deux lignes sont **couplées à cette version de `lib.dom`**.

### La règle suit le `tsconfig` propriétaire du fichier, pas le plus strict

Troisième face de la même limite, mesurée en rédigeant cette ADR. `no-unnecessary-type-assertion` a
signalé `lanUrls[0]!` dans `vite.config.ts`, alors que le `tsconfig.json` racine active
`noUncheckedIndexedAccess` — sous lequel `lanUrls[0]` est `string | undefined` et le `!` nécessaire.

Le `projectService` ne se trompe pas : `vite.config.ts` appartient à `tsconfig.node.json`, qui a
`strict: true` mais **pas** `noUncheckedIndexedAccess`. Le projet racine ne recompile pas ce fichier,
il consomme la déclaration émise par le projet composite — `npx tsc -p tsconfig.json --listFiles`
montre `.tsbuild/node/vite.config.d.ts` et **pas** `vite.config.ts`. `npx tsc -b --force` reste vert.

Le verdict d'une règle type-aware sur une ligne dépend donc du **projet qui possède le fichier**.
Deux fichiers voisins peuvent recevoir deux verdicts opposés sur la même expression.

### Le coût, et ce qui est écarté

- **Lint** : 10,3 s mesurés le 2026-08-21 (`time npm run lint`, machine au repos). Avant l'activation,
  ~5 s, soit **×2,2** — chiffre rapporté par le cycle qui a posé les règles, non re-mesurable sans
  toucher `eslint.config.js`.
- **`recommendedTypeChecked` en entier**, mesuré le 2026-08-21 par une configuration jetable hors du
  dépôt (`npx eslint . --config <scratchpad>`, mêmes `ignores`, même `projectService`) : **24
  signalements hors fichiers de test**, tous d'une autre classe que les trois règles retenues —
  10 `require-await` (tous dans `src/data/e2e/`, du bruit d'adapters in-memory), 7
  `no-misused-promises`, 6 `no-floating-promises`, 1 `prefer-promise-reject-errors`. Les fichiers de
  test, eux, en ajoutent **255** (254 `require-await`, 1 `no-misused-promises`) : le préréglage
  complet coûterait **279** signalements à traiter.
- Les trois règles retenues ne viennent pas toutes du même préréglage :
  `no-unnecessary-type-assertion` est dans `recommendedTypeChecked`, les deux autres seulement dans
  `strictTypeChecked` (typescript-eslint 8.63.0). Les activer nommément est ce qui permet de prendre
  cette classe-là sans prendre les 279 autres.

## Conséquences

- **Le lint coûte le double.** C'est le prix du mode type-aware, pas des trois règles : le
  `projectService` construit les programmes TypeScript.
- **Une montée de version de TypeScript peut faire apparaître ou disparaître des signalements sans
  qu'une ligne du dépôt ne change** — `Element.textContent` en est la preuve entre 5.8 et 5.9. Un
  lint rouge au lendemain d'un `npm update` n'est pas une régression du code : c'est un changement de
  `lib.dom`, et il se traite comme tel.
- **Aucun `eslint-disable` sur ces trois règles.** Si l'une contredit le runtime, la réponse est un
  garde sur une valeur, qui reste vrai quelle que soit la déclaration.
- **La règle vaut au-delà de jsdom.** Toute API que `lib.dom` déclare obligatoire peut manquer dans
  un environnement réel : navigateur ancien, WebView, contexte non sécurisé. Le `typeof` posé pour
  faire passer un test protège aussi ces cas-là.
- **Le nouveau garde-fou et la mutation sont complémentaires, pas redondants** : la mutation prouve
  que les tests sont serrés, ces règles prouvent qu'aucune branche n'est inatteignable. Aucun des
  deux ne voit ce que voit l'autre — [ADR 0012](0012-configurations-stryker-ecartees.md) porte la
  contrepartie.
- Le chantier `require-await` / `no-misused-promises` / `no-floating-promises` reste **ouvert et non
  pris** : 24 signalements hors tests, dont 10 sur des adapters de scénario.
