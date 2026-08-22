# ADR 0031 — Les gardes d'architecture lisent les imports par l'AST, pas par une regex

- **Statut** : en vigueur
- **Date** : 2026-08-22 (issue
  [#78](https://github.com/yasakura/meal-planner/issues/78), findings 1 et 2)
- **Portée** : `src/test/architecture.test.ts`

## Contexte

`src/test/architecture.test.ts` porte trois gardes statiques : `domain/` n'importe ni React, ni
Redux, ni Firebase, ni styled-components, ni date-fns ; `data/` n'importe ni React, ni Redux, ni
styled-components ; les dossiers de `src/ui/features/` ne s'importent pas en cycle. Les trois
partagent un seul instrument, `extractImports`, et ne valent donc que ce qu'il vaut.

Cet instrument était une expression régulière :

```ts
const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
```

## La mesure

Deux défauts, mesurés le 2026-08-22 en posant chacun dans le dépôt.

**Elle ne voyait pas l'import dynamique.** Le `\s+` exige une espace après `import` ; `import('…')`
n'en a pas. Un `await import('firebase/firestore')` ajouté dans `src/domain/use-cases/` passait le
garde **sans un mot**, de même qu'un `await import('styled-components')` dans `src/data/`. Le cas
n'est pas théorique : `src/main.tsx:11-12` utilise déjà l'idiome, et le jour où les routes passent
en chargement paresseux pour les Web Vitals, un `await import('../recipe/…')` depuis
`recipe-detail/` reconstituerait le cycle que la branche `iter-25` venait de casser.

Elle ne voyait pas non plus `typeof import('…')`, forme employée dans le dépôt
(`RecipeEditContainer.test.tsx:19`, `RecipeCreateContainer.test.tsx:17`) et qui crée une vraie
dépendance de types.

**Elle criait sur ce qui n'était pas du code.** Les deux lignes suivantes, ajoutées à
`src/domain/use-cases/add-convive.ts`, produisaient **trois** violations imaginaires
(`firebase/firestore` deux fois, `date-fns` une fois) :

```ts
// avant, ce module faisait import { getFirestore } from 'firebase/firestore'
export const NOTE = "on a retiré le import 'firebase/firestore' et le from 'date-fns'";
```

Les mêmes deux lignes dans `recipe-detail-origin.ts`, pointant vers `../recipe/…`, fabriquaient une
arête inexistante et un cycle imaginaire.

Le second défaut est le plus coûteux des deux : **un garde-fou qui crie à tort est désactivé au
premier incident**, et il emporte alors les deux autres gardes avec lui.

## Décision

`extractImports` parcourt l'**AST** produit par `ts.createSourceFile`, et ne connaît plus le texte.
Elle collecte le spécificateur de quatre nœuds :

| Nœud                                                   | Forme source                         |
| ------------------------------------------------------ | ------------------------------------ |
| `ImportDeclaration`                                    | `import … from '…'`, `import type …` |
| `ExportDeclaration`                                    | `export … from '…'`                  |
| `CallExpression` dont l'expression est `ImportKeyword` | `await import('…')`                  |
| `ImportTypeNode`                                       | `typeof import('…')`                 |

`ts.createSourceFile` reçoit le **chemin réel** du fichier, jamais un nom inventé : c'est
l'extension qui lui fait choisir entre `ScriptKind.TS` et `ScriptKind.TSX`, et un `.ts` analysé en
TSX se méprend sur les arrow functions génériques.

## Pourquoi pas une regex élargie

Élargir à `import\s*[('"]` ferme le premier défaut et **aggrave** le second : la regex n'a toujours
aucune notion de commentaire ni de chaîne, et sans frontière de mot elle capture désormais
`reimport('…')`. Distinguer le code du texte est le travail d'un analyseur syntaxique ; une regex
qui s'y essaie en réimplémente un, mal.

Le dépôt a déjà payé cette leçon une fois, sur un autre garde : un scanner écrit avec
`ts.createScanner` se **désynchronisait après du JSX** et manquait des commentaires ; il a été
remplacé par un parcours d'AST. `typescript` est déjà une dépendance de développement — l'AST ne
coûte rien de plus.

## Ce que la bascule n'a pas changé

Vérifié fichier par fichier sur les 92 fichiers de `src/` avant de basculer : l'AST est un
**sur-ensemble strict** de la regex. Aucun spécificateur perdu, deux fichiers en gagnent
(`src/main.tsx`, `src/config/env.test.ts`), tous des imports dynamiques. Le graphe des features est
identique arête pour arête, et les trois gardes restent verts. **Un élargissement qui rendrait un
garde vert par accident serait pire que le trou qu'il ferme** : c'est ce diff qui l'exclut, pas la
seule suite verte.

## Conséquences

- L'instrument est confronté par des **gages permanents** dans le fichier même : il capture les
  cinq formes d'import, et il ignore un chemin cité en commentaire comme un chemin cité en chaîne.
- Ce que `extractImports` ne voit toujours pas, **délibérément** : `vi.mock('…')`, qui est un appel
  de fonction et non un import. Une dépendance de test déclarée par `vi.mock` seul n'apparaît dans
  aucun garde.
- Un fichier au **texte syntaxiquement invalide** ne fait pas échouer l'analyse : le parseur
  TypeScript récupère et rend un AST partiel. Le risque est couvert ailleurs — un tel fichier fait
  échouer `npm run build` et la suite de tests.
