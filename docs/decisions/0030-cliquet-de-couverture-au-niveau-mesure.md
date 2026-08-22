# ADR 0030 — Un cliquet de couverture, posé au niveau mesuré

- **Statut** : en vigueur
- **Date** : 2026-08-22 (branche `iter-39-seuils-couverture`)
- **Portée** : `vitest.config.ts`, `package.json`

## Contexte

Issue [#89](https://github.com/yasakura/meal-planner/issues/89) : les seuils de couverture ne
portaient que sur `src/domain/**`, à 80 sur les quatre métriques. `src/data/**` et `src/ui/**`
n'avaient aucun plancher.

L'instruction de l'issue s'est révélée incomplète sur deux points, tous deux mesurés en la traitant.

**Le seuil existant n'était pas seulement partiel, il était surtout inerte.** `npm run test` valait
`vitest run`, **sans** `--coverage`. La CI (`.github/workflows/ci.yml`, job `Lint + Test + Build`,
ligne 32) lance `npm run test` ; le hook de pré-commit (`.husky/pre-commit`, ligne 2) lance
`npm test`. Aucun des deux ne calculait la couverture, donc aucun des deux n'évaluait le seuil. Le
`src/domain/**: 80` n'était vérifié que par quelqu'un tapant `npm run test:coverage` à la main. La
ligne de `CLAUDE.md` « `npm run test` OK (seuils coverage tenus) » décrivait un état qui n'existait
pas.

**Et 80 était décoratif de toute façon** : `src/domain/**` était mesuré à 100 % sur les quatre
métriques. Le plancher autorisait une chute de vingt points sans broncher.

## Décision

```ts
// vitest.config.ts
coverage: {
  exclude: [
    'src/**/*.test.{ts,tsx}',
    'src/test/**',
    'src/**/*.d.ts',
    'src/main.tsx',
    'src/ui/store/create-app-store.ts',
    'src/ui/theme/global-style.ts',
  ],
  thresholds: {
    'src/domain/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
    'src/data/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
    'src/ui/**': { lines: 99, functions: 98, branches: 97, statements: 99 },
  },
}
```

```json
// package.json
"test": "vitest run --coverage"
```

1. **Le plancher est posé au niveau mesuré, arrondi vers le bas à l'entier — jamais un chiffre
   rond.** C'est le geste de l'[ADR 0028](0028-cliquet-de-complexite-au-maximum-atteint.md) appliqué
   à une autre métrique : le seuil ne signale rien le jour où il est posé, sa valeur est d'empêcher
   la dérive. Un 80 sur une couche mesurée à 99 n'est pas un plancher, c'est une décoration qui
   autorise une chute de dix-neuf points.
2. **`domain/` et `data/` à 100, parce qu'ils y sont déjà.** Ce n'est pas du zèle : c'est la règle de
   `CLAUDE.md` — « toute ligne d'implémentation naît d'un test rouge observé » — rendue mécanique.
   Une ligne de `domain/` que rien ne couvre est, par définition de la règle, une violation.
3. **Le plancher vaut par le chemin qui l'exécute.** `--coverage` va dans le **script `test` de
   `package.json`**, pas en `coverage.enabled: true` dans la config. Les deux atteignent la CI et le
   pré-commit ; seul `enabled: true` atteindrait aussi `test:watch`, qui recalculerait la couverture
   et réécrirait `coverage/` à chaque itération. Le watch est l'outil du cycle rouge-vert, celui
   qu'on lance des dizaines de fois par heure.
4. **Un fichier est exclu quand son pourcentage ne porte aucune information sur la discipline de
   test.** Pas « quand c'est de l'infra » : le critère est mesurable fichier par fichier, et il ne
   range pas les trois fichiers non couverts du dépôt dans la même famille.
5. **Aucun seuil sur `src/config/**`.** Un plancher à `functions: 0` est infalsifiable : il ne peut
   jamais échouer. Un seuil qui ne peut pas mordre est pire que pas de seuil, parce qu'il a l'air
   d'un garde-fou.

## La mesure

Relevés le 2026-08-22, vitest 4.1.10 / `@vitest/coverage-v8` 4.1.10, provider `v8`, sur 92 fichiers
de test et 1117 tests verts.

### Les agrégats par glob, avant toute modification

| glob            | fichiers |        statements |          branches |         functions |             lines |
| --------------- | -------: | ----------------: | ----------------: | ----------------: | ----------------: |
| `src/domain/**` |       46 | **100** (340/340) | **100** (101/101) | **100** (157/157) | **100** (328/328) |
| `src/data/**`   |       21 | **100** (208/208) |   **100** (92/92) |   **100** (97/97) | **100** (194/194) |
| `src/ui/**`     |       52 | 98.63 (1080/1095) |   97.40 (412/423) |   97.87 (321/328) |   98.69 (979/992) |
| `src/config/**` |        2 |       12.50 (1/8) |       50.00 (4/8) |        0.00 (0/1) |       12.50 (1/8) |

Le tableau `text` de vitest rapporte par **dossier**, pas par glob. Ces agrégats sont sommés depuis
`coverage-summary.json` ; les confrontations ci-dessous les font ensuite confirmer verbatim par
vitest lui-même, qui imprime le pourcentage réel dans chaque message d'erreur.

### Le fait le plus réutilisable : un glob mort passe vert, sans un mot

Avant de croire un seuil, l'instrument a été confronté à un cas dont la réponse est connue d'avance —
un glob qui ne matche aucun fichier, exigé à 100 % :

```ts
'src/nulle-part/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
```

```
 Test Files  92 passed (92)
      Tests  1117 passed (1117)
EXIT=0
```

**Vert, exit 0, aucun avertissement.** Un glob qui ne matche rien n'est pas signalé : il est
silencieusement ignoré.

Conséquence directe, et c'est le savoir qui vaut d'être gardé : **l'absence d'erreur ne prouve jamais
qu'un seuil est vivant.** Une faute de frappe dans un glob, un dossier renommé, une couche déplacée —
et le plancher disparaît sans que rien ne le dise. `CLAUDE.md` exige qu'un instrument de mesure soit
confronté à sa configuration ; ici la confrontation n'est pas un rite, c'est la **seule** façon de
distinguer un seuil tenu d'un seuil absent.

### Chaque glob vu échouer, par `npm run test`

Le script est ce que la CI exécute ; la confrontation passe donc par lui et pas par
`npx vitest run --coverage`. Un glob à la fois, seuil monté au-dessus du réel, puis restauré.

```
> vitest run --coverage
ERROR: Coverage for lines (100%) does not meet "src/domain/**" threshold (100.01%)
ERROR: Coverage for functions (100%) does not meet "src/domain/**" threshold (100.01%)
ERROR: Coverage for statements (100%) does not meet "src/domain/**" threshold (100.01%)
ERROR: Coverage for branches (100%) does not meet "src/domain/**" threshold (100.01%)
EXIT=1
```

```
ERROR: Coverage for lines (100%) does not meet "src/data/**" threshold (100.01%)
ERROR: Coverage for functions (100%) does not meet "src/data/**" threshold (100.01%)
ERROR: Coverage for statements (100%) does not meet "src/data/**" threshold (100.01%)
ERROR: Coverage for branches (100%) does not meet "src/data/**" threshold (100.01%)
EXIT=1
```

```
ERROR: Coverage for lines (99.29%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for functions (98.16%) does not meet "src/ui/**" threshold (99%)
ERROR: Coverage for statements (99.17%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for branches (97.39%) does not meet "src/ui/**" threshold (98%)
EXIT=1
```

Une couche à 100 % ne peut être confrontée qu'au-dessus de 100 : `100.01` est accepté comme
pourcentage et rend le seuil inatteignable. C'est un artifice de confrontation, pas une valeur à
conserver.

Côté vert, aux valeurs retenues : `npm run test` **exit 0**, aucune ligne `ERROR`. Une borne se
confronte des deux côtés — même exigence que l'ADR 0028.

Détail qui compte pour poser un plancher : **vitest tronque, il n'arrondit pas**. 98.165 s'imprime
`98.16`, 97.399 s'imprime `97.39`. Un plancher entier reste donc sous la valeur tronquée.

### Ce que le cliquet tolère avant de mordre

Arithmétique sur les dénominateurs que vitest a confirmés ci-dessus, une unité non couverte ajoutée à
la fois :

| métrique   | mesuré | seuil | tolérance                       |
| ---------- | -----: | ----: | ------------------------------- |
| statements |  99.17 |    99 | **1** statement non couvert     |
| lines      |  99.29 |    99 | **2** lignes                    |
| branches   |  97.40 |    97 | **1** branche                   |
| functions  |  98.17 |    98 | **0** — la première fait rougir |

C'est ce tableau qui distingue un plancher d'une décoration. Un 80 sur `src/ui/**` aurait toléré
**261** statements non couverts de plus.

Le modèle n'est pas resté sur le papier : réintégrer `create-app-store.ts` dans le dénominateur —
+5 statements, +5 lignes, +1 fonction, tous non couverts — donne exactement ce qu'il prédit.

```
ERROR: Coverage for lines (98.78%) does not meet "src/ui/**" threshold (99%)
ERROR: Coverage for functions (97.86%) does not meet "src/ui/**" threshold (98%)
ERROR: Coverage for statements (98.72%) does not meet "src/ui/**" threshold (99%)
```

Trois métriques sur quatre passent au rouge, **branches reste vert** parce que le fichier n'en porte
aucune. La tolérance nulle sur `functions` est donc mesurée, pas déduite.

### Le critère d'exclusion, éprouvé sur les trois fichiers à 0 %

La question n'est pas « ce fichier est-il de l'infra ». C'est : **son pourcentage porte-t-il une
information sur la discipline de test ?**

`src/main.tsx` était déjà exclu avant cette branche, pour cette raison sans qu'elle soit écrite.

**`src/ui/theme/global-style.ts` — exclu.** Un littéral `createGlobalStyle` : 1 statement, 0 branche,
0 fonction. Le couvrir ne demande que d'**importer** le module. Son bit de couverture bascule selon
qu'un test importe ou non le fichier, jamais selon que quelque chose est vérifié. C'est du bruit.
Honnêteté du relevé : réintégré seul, il ne fait tomber aucun seuil (`npm run test` exit 0, 0
`ERROR`). Son exclusion est une application du critère, pas une nécessité arithmétique.

**`src/ui/store/create-app-store.ts` — exclu, et pour une raison dynamique qui pèse plus que la
première.** Le couvrir demande d'appeler `createAppStore()`, qui construit les vraies poignées
Firebase : la couverture s'y achèterait en exécutant de l'infra, pas en assertant un comportement.
Surtout, le fichier **grossit d'une ligne par use case injecté** — 14 aujourd'hui, lignes 33 à 49.
Chaque feature pousserait donc `src/ui/**` vers le bas sans qu'un seul test disparaisse, et la mesure
ci-dessus montre que la marge est d'une fonction : la première feature qui ajoute un use case ferait
rougir la CI sur du bon travail.

C'est le mode de défaillance nommé par l'[ADR 0028](0028-cliquet-de-complexite-au-maximum-atteint.md)
— « un garde-fou qui accuse du bon code se fait désactiver ». Le geste qui suit un faux rouge n'est
jamais d'écrire un test pour une racine de composition ; c'est de baisser le seuil, et le cliquet est
mort. L'exclure rend le plancher **à la fois plus haut et plus stable** : `src/ui/**` passe de 98.63
à 99.17 en statements, et cesse de dériver à chaque feature.

**`src/config/firebase.ts` — non exclu.** Il avait été rangé dans la même famille que les deux
autres, à tort. Il porte `requireEnv` (lignes 5 à 10), un garde qui **lève une erreur nommée** quand
une variable Firebase est absente ou vide : 4 branches, 0 couverte. Ce n'est pas un fichier sans
logique qui dilue le chiffre, c'est **de la logique non testée**. Le voisin `src/config/env.ts`
prouve d'ailleurs que le projet sait tester ce genre de module — `env.test.ts` stubbe
`import.meta.env` et réimporte, quatre tests, 100 %.

L'exclure aurait été le maquillage exact que l'exclusion des deux autres pourrait laisser croire.
`firebase.ts` reste donc visible à 0 %, sans plancher sur `src/config/**` faute d'un plancher
falsifiable, et le chantier part en issue : extraire `requireEnv` en module pur, le tester, puis
poser le seuil.

### Ce que l'exclusion ne masque pas

Les deux entrées sont des **chemins exacts**, pas des globs : rien ne peut s'y glisser. Recomptage
après exclusion : `src/ui/**` passe de **52 à 50** fichiers ; `domain/`, `data/` et `config/` sont
inchangés, au fichier près. Les deux seuls fichiers retirés de la mesure sont ceux-là.

Et l'exclusion ne règle rien de [#68](https://github.com/yasakura/meal-planner/issues/68), qui trace
la racine de composition non testée. Ce qui change, c'est ce que le **pourcentage** mesure — pas ce
que les tests couvrent.

### Le coût, et ce qui n'est pas touché

| commande                    |   durée |
| --------------------------- | ------: |
| `npx vitest run`            | 14,61 s |
| `npx vitest run --coverage` | 17,06 s |

**+2,45 s, soit +17 %** sur la CI et sur chaque pré-commit. Le watch, lui, ne paie rien : c'est
l'objet du choix `--coverage` dans le script plutôt que `enabled: true` dans la config.

**Stryker n'est pas affecté**, bien qu'il réutilise `vitest.config.ts` (`stryker.conf.mjs`,
`vitest.configFile`). Le runner force la couverture à l'arrêt :
`node_modules/@stryker-mutator/vitest-runner/dist/src/vitest-test-runner.js`, ligne 39,
`coverage: { enabled: false }`. Vérifié aussi en exécution — run isolé du 2026-08-22 sur
`src/domain/use-cases/get-recipe.ts` : **2 mutants, 100 %, 0 timeout, 0 survivant**.

## Conséquences

- **Quand un fichier de `data/` butera sur le 100, on le rend testable — on ne baisse pas le seuil.**
  La réponse est le pattern humble object de l'[ADR 0014](0014-pas-d-emulateur-firestore.md) :
  mapping pur d'un côté, wrapper I/O mince de l'autre. Baisser le plancher de `data/` pour laisser
  passer un adaptateur rendrait au même moment légale la non-couverture de tout `domain/`, qui obéit
  au même chiffre.
- **La marge de `src/ui/**` est d'une fonction.** C'est voulu, et c'est le prix d'un plancher au
  niveau mesuré. Un `.tsx` ajouté avec un callback qu'aucun test n'exerce fait rougir la CI — ce qui
  est précisément le signal recherché, `mutate` ne couvrant pas les `.tsx`
  ([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)).
- **Le cliquet ne remonte pas tout seul.** Rien ne relève `src/ui/**` quand la couverture s'améliore ;
  la remontée est un geste explicite, à faire dans le cycle qui l'a produite.
- **Un nouveau glob se confronte, sinon il n'existe pas.** Toute couche ajoutée à `thresholds` doit
  être vue échouer une fois, seuil monté au-dessus du réel, avant d'être crue : un glob mort est
  indiscernable d'un glob tenu.
- **Une exclusion se justifie par le critère, jamais par la gêne.** « Ce fichier fait baisser le
  chiffre » n'est pas un motif ; « le pourcentage de ce fichier ne dit rien de la discipline de
  test » en est un, et il se démontre fichier par fichier.
- **`src/config/**` reste sans plancher**, et c'est un manque assumé tant que `requireEnv` n'est pas
  extrait et testé. Un seuil y serait aujourd'hui infalsifiable.
- Le dénominateur de `src/ui/**` contient encore de l'infra de test — `src/ui/store/create-test-store.ts`,
  85,71 % de statements, 50 % de fonctions, ligne 40 non couverte. Elle tire le plancher vers le bas pour une
  raison qui n'est pas de la discipline de test. Constat ouvert, non pris ici.
