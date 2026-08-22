# ADR 0028 — Un cliquet de complexité, posé au maximum déjà atteint

- **Statut** : en vigueur
- **Date** : 2026-08-22 (branche `iter-32-cliquet-complexite`)
- **Portée** : `eslint.config.js`

## Contexte

Aucun outil du dépôt ne surveillait la **forme** du code. Le lint tient les frontières de couches
([ADR 0015](0015-frontieres-de-couches-inertes.md)) et l'absence de branche inatteignable
([ADR 0026](0026-regles-type-aware-et-runtime.md)) ; la mutation tient la **serrure des tests**, et
seulement sur `src/domain/**`, `src/data/**` et `src/ui/features/**/*.ts`. Ni l'un ni l'autre ne sait
dire qu'une fonction est devenue tordue : une fonction à quinze branches dont tous les mutants sont
tués rend un score parfait.

## Décision

```js
{
  files: ['src/**/*.{ts,tsx}'],
  rules: { complexity: ['error', 10] },
}
```

1. **Le seuil est posé au maximum déjà atteint.** Au moment où la règle est activée, elle ne signale
   **rien** — et c'est délibéré. Ce n'est pas un nettoyage, c'est un **cliquet** : il n'améliore rien
   aujourd'hui, il empêche l'apparition de code plus tordu que le pire code existant.
2. **Bloc distinct, pas ajout au bloc précédent.** Le bloc voisin couvre `src/**` **et** `e2e/**`
   (règle `meal-planner/no-comments`). Y greffer `complexity` aurait étendu le périmètre en silence,
   aux scénarios Playwright qui n'ont pas été mesurés pour ça.
3. **Le périmètre inclut les fichiers de test**, et c'est un choix, pas un effet de bord du glob. Un
   test à onze branches est un test qui **décide** au lieu d'asserter — donc un test qui peut être
   vert pour une raison que personne n'a lue. Le coût d'inclusion est nul aujourd'hui : le test le
   plus branchu du dépôt est à 9.
4. **Quand une fonction butera, on extrait. On ne relève pas le seuil.** Relever le seuil désarme le
   cliquet pour tout le dépôt afin de laisser passer une fonction ; c'est le geste qui transforme un
   garde-fou en décoration.

## La mesure

Relevé le 2026-08-22 sur `b8254a9` + le diff de la branche, en abaissant temporairement le seuil pour
faire rapporter **toutes** les fonctions avec leur score :

```
npx eslint 'src/**/*.{ts,tsx}' --rule '{"complexity":["error",1]}' -f json
```

**312 fonctions de complexité ≥ 2** sous `src/` :

```
2:185   3:61   4:32   5:16   6:8   7:5   8:1   9:2   10:2
```

| catégorie                         |   n | max | fonction au max                                          |
| --------------------------------- | --: | --: | -------------------------------------------------------- |
| production `.ts`                  | 108 |  10 | `createRecipe`, et l'arrow de `convives-slice.ts:300`    |
| production `.tsx`                 |  44 |   8 | `MenuContainer`                                          |
| `*.test.*`                        | 153 |   9 | `featureEdges`, `src/test/architecture.test.ts:76`       |
| infra de test (doubles, builders) |   7 |   3 | cinq fonctions à 3, dont trois de `stub-auth-gateway.ts` |

`e2e/` est hors périmètre et le reste : 5 fonctions, max 5 (`e2e/support/atteignabilite.ts:11`).

La queue est courte et connue. Quatre fonctions seulement dépassent 8 : `createRecipe`
(`src/domain/entities/recipe.ts:19`, 10), la projection de ligne de `conviveRowsOf`
(`src/ui/features/convives/convives-slice.ts:300`, 10), `documentToRecipe`
(`src/data/recipe-mapper.ts:24`, 9) et `featureEdges` (`src/test/architecture.test.ts:76`, 9).

### Pourquoi 10 et pas 8

À `['error', 8]`, la règle signale ces quatre fonctions-là — vérifié en relançant la même commande
avec `8` puis `9` en argument. L'emblématique est `createRecipe` : une chaîne de **cinq gardes de
validation** consécutifs, un `??` de valeur par défaut, un `?.`, un ternaire et un `&&`. Neuf
points de décision, aucune imbrication, aucun qui ait de rapport avec le suivant. Ce code est sain.

**La métrique ne distingue pas une chaîne de validations d'un enchevêtrement** : elle compte des
branches, pas leur intrication. Un seuil qui accuse `createRecipe` accuse du bon code, et un
garde-fou qui accuse du bon code se fait désactiver. À 8, il accuserait quatre fonctions dont au
moins une est irréprochable ; on apprendrait à ne plus le lire.

### La confrontation, et son second volet

`CLAUDE.md` exige qu'un garde-fou soit vu échouer, **et** qu'un instrument de mesure soit confronté à
un cas dont on connaît la réponse. Les deux runs, sur un fichier jetable écrit sous `src/` puis
retiré :

```
src/cliquet-probe.ts
  1:8  error  Function 'f' has a complexity of 11. Maximum allowed is 10  complexity
```

La même fonction ramenée à **10** : `npm run lint` **vert**.

Le second run n'est pas du zèle. Sans lui, un décalage d'un cran dans la configuration — un seuil qui
signalerait en réalité à partir de 10, ou à partir de 12 — serait passé inaperçu : le premier run
seul prouve que la règle parle, pas qu'elle parle au bon endroit. Un seuil est une **borne**, et une
borne se confronte des deux côtés.

### `src/test/architecture.test.ts` est celui qui butera par croissance

Deux des quatre fonctions de tête n'ont **plus aucune marge** : `createRecipe` et la projection de
`conviveRowsOf` sont à 10 pile. Une branche de plus et le lint est rouge. C'est le fonctionnement
attendu du cliquet, et ce sont des fonctions qu'on modifie rarement.

`src/test/architecture.test.ts` est le cas différent, celui qui vaut d'être nommé : il porte les deux
complexités les plus hautes de tous les fichiers de test — `featureEdges` à 9 et l'arrow `visit` de
`findCycle` à 7 (ligne 97) — quand le fichier de test suivant plafonne à 6. C'est du code
d'introspection de graphe, et ce code **grossit par ajout de cas**.

Quand il butera, la bonne réponse sera d'**extraire**, pas de relever le seuil. Ce n'est pas une
préférence de style : relever le seuil pour laisser passer un test de graphe rendrait au même moment
onze branches légales à `createRecipe`, à `documentToRecipe` et à n'importe quel reducer.

### Les `.tsx` sont inclus, et c'est là que la règle vaut le plus cher

`mutate` ne couvre que `src/ui/features/**/*.ts` : **containers et composants n'ont aucun filet de
mutation** ([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)). Le cliquet est le seul
instrument automatique qui y surveille l'explosion de branches. `MenuContainer` est à 8, et les deux
composants `Body` qui aiguillent sur l'état — `MenuScreen.tsx:367` et
`RecipeDetailScreen.tsx:155` — à 7.

Quand un `.tsx` franchira le seuil, la réponse est déjà écrite dans `CLAUDE.md` et dans l'ADR 0011 :
pousser la décision dans le slice, qui est muté. Le franchissement est le signal qu'un container a
recommencé à décider.

### L'alternative écartée : un détecteur de duplication textuelle

`npx jscpd@4`, `--min-tokens 50`, fichiers de test et infra de test exclus, mesuré le 2026-08-22 :
**118 fichiers, 6 723 lignes, 9 clones, 2,08 % de duplication**. Les clones sont sans intérêt : 4 sur
9 opposent les trois racines de composition entre elles (`create-app-store.ts`, `create-e2e-store.ts`,
`create-test-store.ts`), qui se ressemblent par nature ; les 4 clones `.tsx` sont des blocs de mise en
page entre écrans.

Le résultat décisif est ailleurs. **jscpd n'a pas trouvé la vraie violation de DRY du dépôt**
([#103](https://github.com/yasakura/meal-planner/issues/103)), parce que ses deux exemplaires n'ont
aucune ressemblance textuelle — l'un lève, l'autre rend un booléen :

```ts
// src/domain/entities/ingredient.ts:19-27
if (name === '') throw new Error("Le nom de l'ingrédient est obligatoire");
if (!Number.isFinite(props.quantity)) throw new Error('La quantité doit être un nombre fini');
if (props.quantity <= 0) throw new Error('La quantité doit être strictement positive');

// src/ui/features/recipe/ingredient-rows.ts:15
return row.name.trim() !== '' && Number.isFinite(quantity) && quantity > 0;
```

Trois règles, chacune écrite deux fois. Un détecteur de copier-coller cherche des **tokens
identiques** ; il ne voit pas qu'une règle a été **réécrite**. Or c'est la réécriture qui dérive, pas
la copie : la copie se retrouve par recherche textuelle le jour où la règle change, la réécriture
non. L'outil est écarté — pas parce qu'il rend un mauvais chiffre, parce qu'il rend un bon chiffre
sur un dépôt qui a le problème qu'il prétend chercher.

### Ni l'une ni l'autre n'attrape le vrai foyer

Le foyer identifié ([#102](https://github.com/yasakura/meal-planner/issues/102)) tient à **quatre
machines à états concurrentes pour une liste qu'on remplit une fois**. Il plafonne à 10 sur une seule
fonction — le seuil ne le signale donc pas — et à 0 % de duplication. Son problème est un **compte
d'états**, pas un compte de branches ni un compte de tokens.

Les deux métriques instrumentées ici sont donc à leur place et rien de plus : elles empêchent une
dégradation, elles ne diagnostiquent pas la dette existante. La métrique qui attraperait #102 reste
à écrire.

## Conséquences

- **Une fonction qui bute est une fonction à découper**, jamais un seuil à relever. Toute proposition
  de passer à 11 ou 12 doit expliquer pourquoi l'extraction est impossible — et le fait qu'elle soit
  fastidieuse n'est pas une réponse.
- **Le cliquet ne descendra pas tout seul.** Rien ne rabaisse le seuil quand le pire code s'améliore ;
  si `createRecipe` et `conviveRowsOf` redescendent un jour, le passage de 10 à leur nouveau maximum
  est un geste explicite, à faire dans le cycle qui les a améliorées.
- **Le seuil est un plafond, pas un objectif.** Il ne dit rien de bon sur une fonction à 9 : 278
  des 312 fonctions mesurées sont à 4 ou moins, c'est là qu'est la norme du dépôt.
- **Aucun `eslint-disable complexity`.** Une exemption locale est la même capitulation qu'un seuil
  relevé, en moins visible.
- Le lint ne coûte pas plus cher : `complexity` est une règle du cœur d'ESLint, sans information de
  types, contrairement aux trois règles de l'[ADR 0026](0026-regles-type-aware-et-runtime.md).
- Chantier de la complexité, ouvert et non pris :
  [#98](https://github.com/yasakura/meal-planner/issues/98),
  [#102](https://github.com/yasakura/meal-planner/issues/102),
  [#103](https://github.com/yasakura/meal-planner/issues/103),
  [#104](https://github.com/yasakura/meal-planner/issues/104).
