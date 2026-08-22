# ADR 0032 — Les features ne s'importent pas en cycle, et le garde ne voit que les arêtes directes

- **Statut** : en vigueur
- **Date** : 2026-08-22 (issue
  [#78](https://github.com/yasakura/meal-planner/issues/78), findings 3 et 4)
- **Portée** : `src/ui/features/**`, `src/test/architecture.test.ts`

## Contexte

`iter-25` a cassé un cycle de dossiers `recipe ↔ recipe-detail` et posé un garde statique pour
qu'il ne se reforme pas. La convention — **les dossiers de `src/ui/features/` ne s'importent pas
en cycle** — ne vivait que dans le nom d'un test. Un contributeur, humain ou agent, ne la
découvrait qu'au rouge, après avoir écrit l'import.

## Décision

La convention est celle-ci, et elle est **plus étroite que son nom ne le laissait croire** :

> Aucun dossier de `src/ui/features/` ne doit atteindre un autre dossier de `src/ui/features/` par
> une chaîne d'imports **directs entre features**.

Le graphe du garde a pour **nœuds les dossiers de premier niveau** de `src/ui/features/`, et pour
**arêtes les imports relatifs d'un fichier de feature vers un fichier d'une autre feature** — les
fichiers de test compris, et les imports de type compris : `import { type RecipeDetailStatus }` est
une arête, parce que c'est exactement la nature de celle qu'`iter-25` a supprimée.

Le garde détecte les cycles de **toute longueur** entre ces nœuds (`a → b → c → a`). Ce qu'il ne
voit pas, c'est un chemin qui **sort** des features.

## La limite, et pourquoi elle est acceptée

Ce chemin existe aujourd'hui, et le garde est vert :

```
ui/features/recipe-detail/recipe-detail-slice.ts  →  ../../store/store
ui/store/store.ts                                 →  ../features/recipe/recipe-edit-slice
```

Soit `recipe-detail → store → recipe`. `ui/store` n'est pas un dossier de feature : il n'est ni un
nœud ni une arête du graphe.

La détection transitive à travers ce hub n'est **pas** souhaitée : `ui/store/store.ts` assemble
**tous** les reducers, donc il relie toutes les features à toutes les autres. Un garde qui
traverserait le store crierait sur chaque couple de features et ne dirait plus rien.

La limite n'est pas écrite en prose : elle est tenue par un **gage permanent** qui l'exécute — il
constate les deux arcs réels par le même instrument, puis constate que le graphe ne relie pas
`recipe-detail` à `recipe`. Le nom du test porte la limite, et le test tombe si elle change.

## Pourquoi pas un plugin ESLint

**`eslint-plugin-boundaries` ne sait pas exprimer « pas de cycle ».** Vérifié le 2026-08-22 sur la
version installée : ses règles sont `entry-point`, `element-types`, `dependencies`, `external`,
`no-ignored-dependencies`, `no-ignored`, `no-private`, `no-unknown-dependencies`, `no-unknown`,
`no-unknown-files`. Aucune n'est une détection de cycle. Ce n'est donc pas une alternative écartée,
c'est une alternative **inexistante** — et le rappeler évite de rouvrir le sujet.

Ce que le plugin sait faire, c'est une **liste blanche** : déclarer chaque feature comme un type
d'élément et énumérer qui a le droit d'importer qui. Écarté pour deux raisons :

1. une liste blanche **s'élargit d'un geste qui ressemble à du travail normal** — ajouter une ligne
   d'autorisation ne se distingue pas, en revue, d'un ajout légitime. Un invariant « aucun cycle »
   ne s'élargit pas : il se viole ou il tient ;
2. le plugin dépend d'un **résolveur de modules**, et le dépôt sait ce que cela coûte. Les
   frontières de couches y ont été déclarées et **inertes pendant des mois**
   ([ADR 0015](0015-frontieres-de-couches-inertes.md)) parce que le résolveur ne connaissait pas
   `.ts`. Le garde statique ne résout aucun module — il ne peut pas être victime du même défaut.

`import/no-cycle` d'`eslint-plugin-import` détecterait des cycles, mais entre **modules**, pas
entre **dossiers** : il laisserait passer un cycle de features dont aucun fichier ne boucle sur
lui-même, et il dépend du même résolveur. Le plugin n'est pas installé, et cette ADR est la raison
de ne pas l'installer pour ce besoin.

## Conséquences

- La convention est une **règle de projet** : sa place est `CLAUDE.md`, section « Architecture ».
  Cette ADR garde le **pourquoi** et la **limite**, pas la règle.
- Le garde ne dit rien des cycles **entre couches** ni des cycles **entre fichiers** d'une même
  feature. Les premiers sont tenus par `boundaries/dependencies`, les seconds ne le sont par
  personne.
