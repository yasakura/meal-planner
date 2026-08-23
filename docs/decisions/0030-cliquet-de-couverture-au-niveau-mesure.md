# ADR 0030 — Un cliquet de couverture, posé au niveau mesuré

- **Statut** : en vigueur
- **Date** : 2026-08-22 (branche `iter-39-seuils-couverture`)
- **Amendée le** : 2026-08-23 (branche `iter-53-observation`) — l'exclusion de `firebase.ts` levée
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
   d'un garde-fou. — _Levé par l'[amendement du 2026-08-22](#amendement-du-2026-08-22--le-seuil-de-srcconfig-et-la-sortie-de-linfra-de-test)._

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
aucune. La tolérance nulle sur `functions` est donc mesurée, pas déduite. — _Relevé du 2026-08-22,
non reproductible tel quel depuis : `create-app-store.ts` a un test et n'est plus exclu
([amendement iter-48](#amendement-du-2026-08-23-branche-iter-48--la-racine-de-composition-a-un-test-son-exclusion-tombe)), et la tolérance sur `functions` est passée de 0 à 1 dès l'amendement
du 2026-08-22. Le test retiré aujourd'hui, la réintégration ne fait plus rougir que **deux**
métriques, `lines` et `statements`._

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
à 99.17 en statements, et cesse de dériver à chaque feature. — _Exclusion levée le 2026-08-23
([amendement iter-48](#amendement-du-2026-08-23-branche-iter-48--la-racine-de-composition-a-un-test-son-exclusion-tombe)). Le raisonnement ci-dessus reste juste **pour une racine de
composition sans test** — c'est cette hypothèse-là qui est tombée, pas le critère._

**`src/config/firebase.ts` — non exclu.** Il avait été rangé dans la même famille que les deux
autres, à tort. Il porte `requireEnv` (lignes 5 à 10), un garde qui **lève une erreur nommée** quand
une variable Firebase est absente ou vide : 4 branches, 0 couverte. Ce n'est pas un fichier sans
logique qui dilue le chiffre, c'est **de la logique non testée**. Le voisin `src/config/env.ts`
prouve d'ailleurs que le projet sait tester ce genre de module — `env.test.ts` stubbe
`import.meta.env` et réimporte, quatre tests, 100 %.

L'exclure aurait été le maquillage exact que l'exclusion des deux autres pourrait laisser croire.
`firebase.ts` reste donc visible à 0 %, sans plancher sur `src/config/**` faute d'un plancher
falsifiable, et le chantier part en issue : extraire `requireEnv` en module pur, le tester, puis
poser le seuil. — _Chantier fait, voir l'amendement en fin de page._

### Ce que l'exclusion ne masque pas

Les deux entrées sont des **chemins exacts**, pas des globs : rien ne peut s'y glisser. — _Les
exclusions de l'[amendement du 2026-08-23](#amendement-du-2026-08-23--linfra-de-test-sort-du-dénominateur-et-cesse-dêtre-importable)
sont, elles, des globs de répertoire ; ce qui tient leur contenu est un garde statique, pas la forme du chemin.
Et il n'en reste qu'une des deux : celle de `create-app-store.ts` est levée le 2026-08-23
([amendement iter-48](#amendement-du-2026-08-23-branche-iter-48--la-racine-de-composition-a-un-test-son-exclusion-tombe))._ Recomptage
après exclusion : `src/ui/**` passe de **52 à 50** fichiers ; `domain/`, `data/` et `config/` sont
inchangés, au fichier près. Les deux seuls fichiers retirés de la mesure sont ceux-là.

Et l'exclusion ne règle rien de [#68](https://github.com/yasakura/meal-planner/issues/68), qui trace
la racine de composition non testée. Ce qui change, c'est ce que le **pourcentage** mesure — pas ce
que les tests couvrent. — _#68 fermé le 2026-08-23 : la racine a désormais un test, et c'est lui qui
rend l'exclusion caduque ([amendement iter-48](#amendement-du-2026-08-23-branche-iter-48--la-racine-de-composition-a-un-test-son-exclusion-tombe))._

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
  raison qui n'est pas de la discipline de test. Constat ouvert, non pris ici. — _Fermé par l'amendement
  ci-dessous._

## Amendement du 2026-08-22 — le seuil de `src/config/**`, et la sortie de l'infra de test

Branche `iter-43-couverture-config`, issues
[#113](https://github.com/yasakura/meal-planner/issues/113) et
[#114](https://github.com/yasakura/meal-planner/issues/114). Les deux chantiers laissés ouverts
ci-dessus sont fermés ; **la doctrine, elle, ne bouge pas** — c'est elle qui dicte les deux gestes.

### `requireEnv` extrait, `firebase.ts` exclu, `src/config/**` planché à 100

`requireEnv` vit désormais dans `src/config/require-env.ts`, module pur sans import, couvert par
trois tests qui exercent les quatre branches : valeur renseignée, variable absente, variable
présente mais vide.

Ce qui reste dans `src/config/firebase.ts` est **exclu**, et c'est le même critère qui l'ordonne
qu'il l'interdisait avant l'extraction : _son pourcentage porte-t-il une information sur la
discipline de test ?_ Avant, oui — le fichier portait un garde à 4 branches. Après, non : il ne
reste qu'un objet de configuration et trois appels de câblage, **0 branche et 0 fonction**, et
vitest le confirme quand on le réintègre. — _Le relevé était juste ce jour-là, et il a vieilli le
2026-08-23 : `src/config/firebase.ts#db` est devenu un ternaire. Exclusion levée
([amendement iter-53](#amendement-du-2026-08-23-branche-iter-53--firebasets-a-gagné-une-branche-son-exclusion-tombe))._

```
 config            |      50 |      100 |     100 |      50 |
  firebase.ts      |       0 |      100 |     100 |       0 | 7-18
```

Le couvrir demanderait d'importer le module, donc d'exécuter `initializeApp` sur de vraies poignées
Firebase : c'est mot pour mot la raison dynamique qui a fait exclure `create-app-store.ts`. Et le
fichier **grossit d'une ligne par variable Firebase ajoutée**, donc il ferait dériver le plancher
vers le bas sur du bon travail — le mode de défaillance de
l'[ADR 0028](0028-cliquet-de-complexite-au-maximum-atteint.md). — _L'analogie a perdu son point
d'appui le 2026-08-23 : `create-app-store.ts` se couvre sans exécuter Firebase, via un mock de
`config/firebase`. L'exclusion de `firebase.ts`, elle, ne bouge pas — elle tient sur son critère
premier, **0 branche et 0 fonction**, et le mock qui couvre la racine de composition est justement ce
qui laisse `firebase.ts` hors de toute exécution ([amendement iter-48](#amendement-du-2026-08-23-branche-iter-48--la-racine-de-composition-a-un-test-son-exclusion-tombe))._ —
_Elle bouge le jour même, sur l'autre moitié du critère : le fichier a gagné une branche, et un test
qui l'exerce derrière le même mock ([amendement iter-53](#amendement-du-2026-08-23-branche-iter-53--firebasets-a-gagné-une-branche-son-exclusion-tombe))._

Le laisser dedans coûterait par ailleurs un plancher décoratif : `src/config/**` serait à **50 %**
de statements, soit exactement le « 80 sur une couche mesurée à 99 » que cette ADR refuse.
Exclu, le glob mesure `env.ts` et `require-env.ts`, **100 % sur les quatre métriques**, et le
plancher est posé là.

### `create-test-store.ts` déplacé, pas excepté

Des deux voies ouvertes par [#114](https://github.com/yasakura/meal-planner/issues/114) — exclure
ou déplacer — c'est le **déplacement** qui est retenu : `src/ui/store/create-test-store.ts` devient
`src/test/create-test-store.ts`, son test le suit, et ses vingt importateurs sont tous des fichiers
de test.

Le motif n'est pas l'esthétique. Une exclusion aurait rendu le fichier invisible à la couverture
**en le laissant utilisable depuis du code de production** ; le déplacement, lui, ajoute un
garde-fou qui n'existait pas. `eslint-plugin-boundaries` classe `src/test/**` en élément `test`, et
aucune policy n'autorise `ui` → `test`. Confronté en ajoutant l'import dans `src/ui/store/store.ts`
(fichier de production, donc hors du `boundaries/ignore` sur `**/*.test.{ts,tsx}`) :

```
  89:33  error  There is no policy allowing dependencies from elements of type "ui" to elements of type "test"  boundaries/dependencies
```

Tant que le fichier vivait dans `src/ui/store/`, cet import-là était **légal**.

### Ce que la mesure devient

| glob            | avant (fichiers / stmts / branch / funcs / lines) | après                              |
| --------------- | ------------------------------------------------- | ---------------------------------- |
| `src/ui/**`     | 50 / 99.17 / 97.39 / 98.16 / 99.29                | 49 / 99.26 / 97.39 / 98.46 / 99.38 |
| `src/config/**` | 2 / 12.50 / 50.00 / 0.00 / 12.50                  | 2 / 100 / 100 / 100 / 100          |

Valeurs confirmées verbatim par vitest lui-même dans les messages de confrontation ci-dessous.
`domain/` et `data/` sont inchangés, au fichier près.

**Le cliquet de `src/ui/**` reste à 99 / 98 / 97 / 99, et ce n'est pas un oubli** : les quatre
valeurs mesurées montent, mais aucune ne franchit l'entier suivant. La doctrine « niveau mesuré,
arrondi vers le bas à l'entier » rend donc les mêmes chiffres. Ce qui change réellement, c'est la
tolérance absolue, et il faut le dire :

| métrique   |             tolérance avant | tolérance après |
| ---------- | --------------------------: | --------------: |
| statements |                           1 |               2 |
| lines      |                           2 |               3 |
| branches   |                           1 |               1 |
| functions  | 0 — la première fait rougir |               1 |

C'est le prix d'un plancher entier, et le seul moyen de le supprimer serait un plancher décimal
(`99.26`, `98.46`…). Le sujet n'est pas tranché ici : il change la doctrine de l'ADR, pas
l'application qu'on en fait.

### Chaque glob touché, vu échouer par `npm run test`

`src/config/**` est un **nouveau** glob : sans cette confrontation il serait indiscernable d'un glob
mort. Il est à 100 %, donc confronté à `100.01`, comme `domain/` et `data/`.

```
> vitest run --coverage
 Test Files  93 passed (93)
      Tests  1129 passed (1129)
ERROR: Coverage for lines (100%) does not meet "src/config/**" threshold (100.01%)
ERROR: Coverage for functions (100%) does not meet "src/config/**" threshold (100.01%)
ERROR: Coverage for statements (100%) does not meet "src/config/**" threshold (100.01%)
ERROR: Coverage for branches (100%) does not meet "src/config/**" threshold (100.01%)
EXIT=1
```

`src/ui/**` a changé de dénominateur ; son cliquet est reconfronté d'un cran au-dessus du réel.

```
ERROR: Coverage for lines (99.38%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for functions (98.46%) does not meet "src/ui/**" threshold (99%)
ERROR: Coverage for statements (99.26%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for branches (97.39%) does not meet "src/ui/**" threshold (98%)
EXIT=1
```

Contre-épreuve de l'exclusion, qui vaut confrontation de l'exclusion elle-même : `firebase.ts`
réintégré, seuil `src/config/**` laissé à 100.

```
ERROR: Coverage for lines (50%) does not meet "src/config/**" threshold (100%)
ERROR: Coverage for statements (50%) does not meet "src/config/**" threshold (100%)
EXIT=1
```

Deux métriques seulement, et c'est le fait à retenir : `branches` et `functions` **restent vertes**,
parce qu'après extraction `firebase.ts` n'en porte plus aucune. Une exclusion n'est jamais neutre
sur les quatre métriques à la fois. — _La même contre-épreuve en donne **trois** le 2026-08-23, et la
nouvelle est `branches` ([amendement iter-53](#amendement-du-2026-08-23-branche-iter-53--firebasets-a-gagné-une-branche-son-exclusion-tombe))._

Aux valeurs retenues : `npm run test` **exit 0**, **0 ligne `ERROR`**, 93 fichiers, 1129 tests.

## Amendement du 2026-08-23 — l'infra de test sort du dénominateur, et cesse d'être importable

Branche `iter-44-infra-de-test`, issue [#120](https://github.com/yasakura/meal-planner/issues/120).
L'issue ne nommait que `src/ui/test-utils/deferred.ts`. Le balayage en a trouvé **quatorze**, et
c'est ce dénombrement qui change la nature du sujet.

| répertoire                  | fichiers | couverture |
| --------------------------- | -------: | ---------- |
| `src/ui/test-utils/`        |        1 | 100 %      |
| `src/domain/test-builders/` |        5 | 100 %      |
| `src/domain/test-doubles/`  |        8 | 100 %      |

### Ce que le cliquet de `src/domain/**` mesurait vraiment

Les quatorze sont à 100 % sur les quatre métriques : ils **gonflent** le numérateur, exactement le
mode de dilution que [#120](https://github.com/yasakura/meal-planner/issues/120) décrit comme plus
sournois que celui de [#114](https://github.com/yasakura/meal-planner/issues/114), où le chiffre
criait en tirant vers le bas.

L'ampleur n'avait été mesurée par aucune des deux issues. Sur `src/domain/**` :

| métrique   | dénominateur total | dont infra de test | part de l'infra |
| ---------- | -----------------: | -----------------: | --------------: |
| statements |                340 |                160 |        **47 %** |
| functions  |                157 |                 93 |        **59 %** |
| lines      |                328 |                158 |        **48 %** |
| branches   |                101 |                 20 |            20 % |

Le plancher à 100 % de `domain/` reposait donc pour **moitié de ses statements et près de trois
cinquièmes de ses fonctions** sur des builders et des doubles qui se couvrent tout seuls : un test
qui en construit un le couvre par construction, sans rien vérifier de lui.

### Ce que la couverture appliquait déjà ailleurs

`stryker.conf.mjs` retire du `mutate` `src/domain/test-doubles/**` et `src/domain/test-builders/**`,
et `CLAUDE.md` le formule : « Exclus du `mutate` : les fichiers de test ET l'infra de test. » La
couverture n'appliquait pas la règle que la mutation applique. Les trois répertoires sont désormais
exclus.

### Le critère du point 4, appliqué à une famille et non à un fichier

Le point 4 dit « pas _quand c'est de l'infra_ : le critère est mesurable fichier par fichier ». Il
tient, et c'est justement pourquoi une exclusion par répertoire est ici légitime : pour un builder ou
un double, le critère rend la même réponse pour **tous** les membres, par construction. Le
pourcentage d'un `RecipeBuilder` bascule selon qu'un test l'instancie, jamais selon que quelque chose
est vérifié — c'est le raisonnement de `global-style.ts`, transposé à une famille dont chaque membre
le satisfait par définition.

Le risque d'un glob est qu'un fichier de production s'y glisse et échappe à la mesure. Il est fermé
par le garde ci-dessous : un module posé dans un répertoire d'infra n'est plus importable depuis la
production, donc il y est de l'infra ou du code mort.

### Exclure ou déplacer — l'arbitrage de #114 ne se transpose pas

[#114](https://github.com/yasakura/meal-planner/issues/114) avait retenu le **déplacement** pour un
motif précis : l'exclusion rendait `create-test-store.ts` invisible à la couverture **tout en le
laissant importable depuis la production**, alors que le déplacement dans `src/test/` rendait cet
import illégal pour `eslint-plugin-boundaries`.

Le motif vaut ici, la solution non : déplacer treize fichiers de `src/domain/` toucherait des
dizaines d'importateurs pour un chantier de mesure. La vraie question a donc été posée à l'envers, et
**mesurée au lieu d'être déduite de la configuration** : un fichier de production peut-il aujourd'hui
importer l'infra de test sans qu'aucun garde ne bronche ?

`src/domain/use-cases/get-recipe.ts` — fichier de production — a reçu un
`import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository'`, utilisé
dans le corps du use case.

```
LINT EXIT=0
TSC EXIT=0
 Test Files  93 passed (93)
      Tests  1129 passed (1129)
TEST EXIT=0
```

**Rien ne bronche.** `boundaries/dependencies` autorise `domain` → `domain`, et
`src/domain/test-doubles/` est du `domain`. Idem côté `ui` pour `deferred.ts`, `ui` → `ui` étant
autorisé. Le trou est réel, et une exclusion de couverture ne l'aurait pas fermé — elle l'aurait
rendu moins visible.

### Le garde statique, plutôt que treize déplacements

`src/test/architecture.test.ts` sait déjà lire les imports par l'AST
([ADR 0031](0031-lecture-des-imports-par-l-ast.md)). Il porte désormais un quatrième garde : **aucun
fichier de production n'importe d'infra de test**, l'infra étant tout fichier dont un segment de
chemin est `test`, `test-builders`, `test-doubles` ou `test-utils`.

Il ferme les quatorze d'un coup, sans déplacer une ligne, et il couvre aussi les répertoires qui
n'existent pas encore. Ce que le déplacement de #114 a obtenu par le rangement, celui-ci l'obtient
par la lecture — et il l'obtient pour `src/domain/`, où `boundaries` ne peut structurellement rien
dire, puisque `domain` → `domain` doit rester autorisé.

Confronté par les deux violations qu'il annonce, une par couche :

```
AssertionError: Infra de test importée depuis la production :
domain/use-cases/get-recipe.ts importe ../test-doubles/in-memory-recipe-repository
```

```
AssertionError: Infra de test importée depuis la production :
ui/store/store.ts importe ../test-utils/deferred
```

Son gage permanent, sur le modèle des trois autres : le même détecteur, lâché sur l'infra
elle-même, **nomme** `domain/test-builders/recipe.builder.ts importe ./ingredient.builder` — un
import que le garde, lui, laisse passer. L'assertion d'absence du garde est ainsi adossée au même
localisateur vu trouver quelque chose.

### Ce que la mesure devient

| glob            | avant (fichiers / stmts / branch / funcs / lines) | après                              |
| --------------- | ------------------------------------------------- | ---------------------------------- |
| `src/domain/**` | 46 / 100 / 100 / 100 / 100                        | 33 / 100 / 100 / 100 / 100         |
| `src/ui/**`     | 49 / 99.26 / 97.39 / 98.46 / 99.38                | 48 / 99.25 / 97.39 / 98.45 / 99.38 |

`data/` et `config/` sont inchangés, au fichier près. Le recomptage confirme que les seuls fichiers
retirés sont les quatorze. — _`src/ui/**` est repassé à 49 fichiers le 2026-08-23, la racine de
composition réintégrée ([amendement iter-48](#amendement-du-2026-08-23-branche-iter-48--la-racine-de-composition-a-un-test-son-exclusion-tombe))._

**Les deux cliquets ne bougent pas, et cette fois il faut le dire fort, car les deux sens du piège
étaient ouverts.** Retirer des fichiers à 100 % fait baisser la valeur réelle ; ici la baisse est de
**0,01 point** sur deux métriques de `src/ui/**` et **nulle** sur `src/domain/**`, où le reste du
glob est lui aussi à 100 %. La doctrine « niveau mesuré, arrondi vers le bas à l'entier » rend donc
les mêmes chiffres : 100 / 100 / 100 / 100 et 99 / 98 / 97 / 99.

Les tolérances absolues ne bougent pas non plus — 2 statements, 3 lignes, 1 branche, 1 fonction sur
`src/ui/**`, 0 partout sur `src/domain/**`.

**Ce qui change n'est pas le chiffre, c'est ce qu'il garde.** Le 100 % de `src/domain/**` porte
désormais sur 180 statements et 64 fonctions de code de production, au lieu de 340 et 157 dont
l'infra faisait la moitié. Un cliquet identique, sur un dénominateur deux fois plus exigeant.

### Chaque glob touché, vu échouer par `npm run test`

Les deux globs dont le dénominateur change sont reconfrontés d'un cran au-dessus du réel, puis
restaurés. `data/` et `config/` ne sont pas touchés, donc pas reconfrontés.

```
> vitest run --coverage
 Test Files  93 passed (93)
      Tests  1131 passed (1131)
ERROR: Coverage for lines (100%) does not meet "src/domain/**" threshold (100.01%)
ERROR: Coverage for functions (100%) does not meet "src/domain/**" threshold (100.01%)
ERROR: Coverage for statements (100%) does not meet "src/domain/**" threshold (100.01%)
ERROR: Coverage for branches (100%) does not meet "src/domain/**" threshold (100.01%)
EXIT=1
```

```
ERROR: Coverage for lines (99.38%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for functions (98.45%) does not meet "src/ui/**" threshold (99%)
ERROR: Coverage for statements (99.25%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for branches (97.39%) does not meet "src/ui/**" threshold (98%)
EXIT=1
```

Contre-épreuve de l'exclusion, les quatorze réintégrés :

```
ERROR: Coverage for lines (99.38%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for functions (98.46%) does not meet "src/ui/**" threshold (99%)
ERROR: Coverage for statements (99.26%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for branches (97.39%) does not meet "src/ui/**" threshold (98%)
```

C'est vitest lui-même qui prononce les deux colonnes du tableau ci-dessus, à 99.26/98.46 avec l'infra
et 99.25/98.45 sans.

**Honnêteté du relevé** : les quatorze réintégrés, cliquets aux valeurs retenues, `npm run test` sort
**exit 0, 0 ligne `ERROR`**. L'exclusion n'est donc arithmétiquement nécessaire à aucun seuil ; c'est
une application du critère, comme celle de `global-style.ts`. Ce qu'elle change est ce que le
pourcentage **signifie**, pas ce qu'il autorise aujourd'hui.

Aux valeurs retenues, exclusions en place : `npm run test` **exit 0**, **0 ligne `ERROR`**, 93
fichiers, 1131 tests.

## Amendement du 2026-08-23, branche iter-48 — la racine de composition a un test, son exclusion tombe

Issue [#68](https://github.com/yasakura/meal-planner/issues/68), finding 2. `src/ui/store/create-app-store.ts`
sort de l'`exclude` et rentre dans le dénominateur de `src/ui/**`. **Le critère du point 4 ne bouge
pas ; c'est sa réponse qui change**, parce que le fichier a acquis un test.

### Ce que l'argument d'origine supposait, et qui n'est plus vrai

Le raisonnement de 2026-08-22 tenait sur deux jambes, et **les deux supposaient un fichier sans
test** :

**« Le couvrir demande d'appeler `createAppStore()`, qui construit les vraies poignées Firebase. »**
Faux depuis qu'un mock existe. `src/ui/store/create-app-store.test.ts` mocke `../../config/firebase`
en `{ auth: {}, db: {} }` : `initializeApp` n'est jamais appelé, aucune poignée n'est construite. Ce
que l'[ADR 0016](0016-mode-e2e-embarque.md) documente — `config/firebase` lève **au chargement du
module** quand la configuration manque — est précisément la raison pour laquelle le mock est
nécessaire, et il suffit.

**« Le fichier grossit d'une ligne par use case injecté, donc il ferait dériver le cliquet à chaque
feature. »** La dérive n'existe que tant que la ligne ajoutée est **non couverte**. Un test appelant
`createAppStore()`, chaque use case injecté ajoute une ligne **couverte** : numérateur et
dénominateur montent ensemble et le pourcentage ne descend pas. Mesuré, le fichier réintégré et
testé : `src/ui/**` passe de 99.25 à **99.26** en statements — il monte, là où la réintégration du
même fichier non testé faisait tomber trois métriques sur quatre.

Le mode de défaillance de l'[ADR 0028](0028-cliquet-de-complexite-au-maximum-atteint.md) — « un
garde-fou qui accuse du bon code se fait désactiver » — n'est donc pas rouvert : le fichier n'est
plus accusé, il est couvert.

**Ce que le raisonnement d'origine garde de juste** : pour une racine de composition **sans test**,
il reste exact mot pour mot, et le relevé de 2026-08-22 le prouve toujours. C'est l'hypothèse « sans
test » qui est tombée, pas le critère qui la portait. La leçon générale vaut d'être écrite : _le
critère du point 4 est une propriété du couple **fichier + tests**, pas du fichier._ Une exclusion
justifiée un jour ne l'est pas pour toujours ; elle se relit le jour où le fichier gagne un test.

### Le gage acquis, et pourquoi il n'est pas un achat de pourcentage

Le test n'importe pas le module pour faire monter un chiffre, il asserte un comportement de la racine
de composition, celui que [#68](https://github.com/yasakura/meal-planner/issues/68) nommait : **une
seule horloge**. `SystemClock` est mocké par une fabrique qui rend une date différente **par
instance** — pas par appel — et le test exige que le plancher de saisie et la date de début proposée
décrivent la même semaine.

Confronté par sabotage, `nextMondayUseCase({ clock })` remplacé par
`nextMondayUseCase({ clock: SystemClock.create() })` :

```
AssertionError: expected '2026-08-31' to be '2026-08-24'
```

Trois horloges au lieu d'une sont désormais un rouge, ce qu'aucun test ne disait avant.

### Ce que la mesure devient

| glob        | avant (fichiers / stmts / branch / funcs / lines) | après                              |
| ----------- | ------------------------------------------------- | ---------------------------------- |
| `src/ui/**` | 48 / 99.25 / 97.39 / 98.45 / 99.38                | 49 / 99.26 / 97.39 / 98.45 / 99.38 |

`domain/`, `data/` et `config/` sont inchangés, au fichier près. Le seul fichier ajouté au
dénominateur est celui-là : 1083 statements contre 1080, 324 fonctions contre 323.

**Le cliquet reste à 99 / 98 / 97 / 99, et les tolérances absolues ne bougent pas** — 2 statements,
3 lignes, 1 branche, 1 fonction. Un fichier réintégré à 100 % ne déplace aucun entier.

### Le glob touché, vu échouer par `npm run test`

`src/ui/**` est le seul glob dont le dénominateur change ; il est donc le seul reconfronté, d'un cran
au-dessus du réel, puis restauré.

```
> vitest run --coverage
 Test Files  94 passed (94)
      Tests  1146 passed (1146)
ERROR: Coverage for lines (99.38%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for functions (98.45%) does not meet "src/ui/**" threshold (99%)
ERROR: Coverage for statements (99.26%) does not meet "src/ui/**" threshold (100%)
ERROR: Coverage for branches (97.39%) does not meet "src/ui/**" threshold (98%)
```

**Contre-épreuve, et c'est elle qui fait de la réintégration une forme permanente** : le fichier
réintégré, cliquets aux valeurs retenues, le test de la racine de composition retiré, `npm run test`
sort en erreur.

```
 Test Files  93 passed (93)
      Tests  1145 passed (1145)
ERROR: Coverage for lines (98.87%) does not meet "src/ui/**" threshold (99%)
ERROR: Coverage for statements (98.79%) does not meet "src/ui/**" threshold (99%)
```

Contrairement aux exclusions de `global-style.ts` et des quatorze fichiers d'infra, celle-ci n'était
donc pas arithmétiquement neutre : sa levée **arme** un plancher. La racine de composition ne peut
plus redevenir silencieusement non testée.

**Deux métriques au rouge, pas trois** : le relevé de 2026-08-22 en annonçait trois, `functions`
comprise. L'écart ne vient pas du fichier mais de la tolérance sur `functions`, passée de 0 à 1 avec
l'[amendement du 2026-08-22](#amendement-du-2026-08-22--le-seuil-de-srcconfig-et-la-sortie-de-linfra-de-test).
C'est le prix du plancher entier, déjà nommé là-bas, vu à l'œuvre ici.

Aux valeurs retenues, exclusion levée : `npm run test` **exit 0**, **0 ligne `ERROR`**, 94 fichiers,
1146 tests.

## Amendement du 2026-08-23, branche iter-53 — `firebase.ts` a gagné une branche, son exclusion tombe

Branche `iter-53-observation`. `src/config/firebase.ts` sort de l'`exclude` et rentre dans le
dénominateur de `src/config/**`. **Le critère du point 4 ne bouge pas ; c'est sa réponse qui
change** — pour la seconde fois en deux jours, sur cette page.

### Le motif d'origine était un relevé, et un relevé se périme

L'exclusion du 2026-08-22 tenait sur une phrase mesurable : il ne reste dans le fichier « qu'un objet
de configuration et trois appels de câblage, **0 branche et 0 fonction** ». Elle était vraie ce
jour-là, et vitest la confirmait.

[ADR 0037](0037-sonder-indexeddb-avant-d-y-adosser-le-cache.md) l'a défaite. `src/config/firebase.ts#db`
n'est plus un appel de câblage : c'est un ternaire sur
`src/config/persistence-probe.ts#persistenceIsAvailable`, donc une **décision** — cache persistant
d'un côté, repli mémoire de l'autre. Deux branches, que `src/config/firebase.test.ts` exerce en cinq
tests, dont deux qui exigent qu'aucune des deux initialisations ne déborde sur l'autre.

De la phrase d'origine, une moitié tient toujours : le fichier porte encore **0 fonction**. C'est
l'autre moitié qui décide, et une moitié suffit.

La troisième jambe du raisonnement de 2026-08-22 tombe pour la raison déjà écrite à
l'[amendement iter-48](#amendement-du-2026-08-23-branche-iter-48--la-racine-de-composition-a-un-test-son-exclusion-tombe)
— « le couvrir demanderait d'exécuter `initializeApp` sur de vraies poignées Firebase ». Le test
mocke `firebase/app`, `firebase/auth`, `firebase/firestore` et la sonde : rien de Firebase n'est
exécuté, et le module réintégré est couvert par des assertions, pas par un import.

### Ce qui ne l'a pas signalé, et ce que ça apprend

**Une exclusion est la seule pièce d'un instrument de mesure qui ne peut pas être confrontée après
coup.** Un seuil se monte d'un cran au-dessus du réel et on le voit mordre ; une exclusion, elle,
retire le fichier du dénominateur, donc aucun seuil ne peut plus parler de lui. Ce qui la tient
n'est pas un rouge, c'est une phrase — et une phrase ne tombe jamais en panne.

C'est le motif que l'[amendement de l'ADR 0035](0035-une-adr-designe-un-symbole-pas-une-ligne.md#amendement-du-2026-08-23--lexemple-canonique-sest-vérifié-puis-sest-défait)
vient de nommer sur un autre instrument, à un cran de plus : là-bas le garde avait parlé puis s'était
tu ; ici il n'avait jamais rien à dire.

La piste esquissée là-bas — **un déclencheur au fichier, via la ligne `Portée`** — n'aurait pas
attrapé ce cas non plus, et c'est le fait le plus réutilisable de cet amendement. Le lot a modifié
`src/config/firebase.ts`, qui figure dans la `Portée` de
[ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md) et de
[ADR 0037](0037-sonder-indexeddb-avant-d-y-adosser-le-cache.md) — pas dans celle de cette page-ci,
qui nomme `vitest.config.ts` et `package.json`. **La prose qui meurt n'est pas toujours dans l'ADR
dont la `Portée` nomme le fichier modifié** : celle-ci citait un relevé sur un fichier qu'elle
n'avait aucune raison de déclarer. Un déclencheur au fichier devrait suivre le **sujet de
l'affirmation**, pas le périmètre de la page.

Aucun garde n'est ajouté pour autant, et pour la raison de `0035` : on n'a pas de remède mesuré.
Ce qui a rouvert la page est une relecture, et la leçon de l'amendement iter-48 s'élargit d'un mot —
_le critère du point 4 est une propriété du couple **fichier + tests**, à une **date**_. Une
exclusion se relit le jour où le fichier gagne un test, et aussi le jour où il gagne une branche.

### Ce que la mesure devient

| glob            | avant (fichiers / stmts / branch / funcs / lines) | après                     |
| --------------- | ------------------------------------------------- | ------------------------- |
| `src/config/**` | 3 / 100 / 100 / 100 / 100                         | 4 / 100 / 100 / 100 / 100 |

`domain/`, `data/` et `ui/` sont inchangés, au fichier près. Le dénominateur de `src/config/**`
passe de 12 à 16 statements, de 8 à 10 branches, de 12 à 16 lignes ; **`functions` ne bouge pas**,
le fichier n'en porte toujours aucune.

**Le cliquet reste à 100 sur les quatre métriques, et la tolérance absolue reste nulle.** Un fichier
réintégré à 100 % ne déplace aucun plancher — c'est le même constat qu'à l'amendement iter-48, sur
un glob où il n'y avait de toute façon aucun entier à franchir.

### Le glob touché, vu échouer par `npm run test`

`src/config/**` est le seul glob dont le dénominateur change ; il est donc le seul reconfronté, d'un
cran au-dessus du réel, puis restauré.

```
> vitest run --coverage
 Test Files  103 passed (103)
      Tests  1254 passed (1254)
ERROR: Coverage for lines (100%) does not meet "src/config/**" threshold (100.01%)
ERROR: Coverage for functions (100%) does not meet "src/config/**" threshold (100.01%)
ERROR: Coverage for statements (100%) does not meet "src/config/**" threshold (100.01%)
ERROR: Coverage for branches (100%) does not meet "src/config/**" threshold (100.01%)
```

**Contre-épreuve, et c'est elle qui fait de la réintégration une forme permanente** : fichier
réintégré, cliquet aux valeurs retenues, `src/config/firebase.test.ts` retiré, `npm run test` sort
en erreur.

```
 Test Files  102 passed (102)
      Tests  1249 passed (1249)
ERROR: Coverage for lines (75%) does not meet "src/config/**" threshold (100%)
ERROR: Coverage for statements (75%) does not meet "src/config/**" threshold (100%)
ERROR: Coverage for branches (80%) does not meet "src/config/**" threshold (100%)
```

**Trois métriques, là où la contre-épreuve du 2026-08-22 en donnait deux** — et la troisième est
`branches`, exactement celle que la sonde a créée. Le motif disparu a une signature arithmétique, et
elle est lisible dans le rouge. `functions` reste verte, pour la moitié du motif qui tient encore.

Aux valeurs retenues, exclusion levée : `npm run test` **exit 0**, **0 ligne `ERROR`**, 103 fichiers,
1254 tests.
