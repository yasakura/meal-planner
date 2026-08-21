# ADR 0014 — Pas d'émulateur Firestore : humble object et garde statique

- **Statut** : en vigueur
- **Date** : 2026-07-14 (décision citée dans `firestore.rules`) ; garde compensatoire ajouté le
  2026-08-13 (`8b317e2`)
- **Portée** : `src/data/`, `firestore.rules`, `src/test/firestore-rules-coverage.test.ts`

## Contexte

Tester `src/data/` contre un vrai Firestore demande l'émulateur officiel, qui exige une **JVM**.
C'est une dépendance lourde à installer, à faire tourner en CI et à maintenir, pour une application
de foyer dont la couche `data/` est mince.

Le prix de s'en passer n'est pas nul : **Firestore refuse par défaut toute collection qui n'a pas de
bloc `match`** dans les Security Rules. Un adapter neuf dont la collection n'est pas déclarée donne
une feature **verte en test unitaire et morte dans le navigateur**.

## Décision

Pas d'émulateur. À la place, un **humble object** :

- le **mapping** entité ↔ document Firestore vit dans un module **pur** (`*-mapper.ts`), testé à
  100 % en Vitest, sans aucune infra ;
- les adapters Firestore sont des **wrappers minces** (I/O seulement), au plus un test léger avec
  SDK mocké.

Le **round-trip réel** et les **Security Rules** ne sont donc **pas** testés automatiquement. C'est
assumé, et compensé par un garde statique **obligatoire** : `src/test/firestore-rules-coverage.test.ts`
croise les collections réellement référencées dans `src/data/**` avec les blocs `match` de
`firestore.rules`. Purement statique, aucun émulateur requis.

## La mesure

Vécu FR-3, collection `convives` : **355 tests verts et écran cassé** — la collection n'avait pas
son bloc `match`. C'est ce défaut qui a fait écrire le garde.

Le garde est lui-même confronté : un **second test** ampute les règles de leur bloc `convives` et
vérifie que le croisement le détecte. Sans lui, une expression rationnelle cassée rendrait le
premier test vert pour toujours, et silencieusement inutile.

## Conséquences

- **`firestore.rules` n'est la source de vérité qu'une fois déployé, et rien dans le dépôt ne le
  pousse** — le CLI Firebase n'est même pas une dépendance du projet. Après toute modification :
  déploiement explicite, puis vérification. `npm run check:rules` est le seul contrôle qui interroge
  le déploiement réel.
- Le garde ne voit que les **littéraux** passés à `collection(db, 'x')` et `doc(db, 'x', id)`. Un
  nom de collection construit dynamiquement lui échapperait : c'est la limite assumée d'une analyse
  statique, et une raison de garder ces littéraux en clair.
- La politique d'accès actuelle est « tout utilisateur authentifié », **sans scoping par
  propriétaire** — décision de la roadmap iter 1, application de foyer, à resserrer en
  `request.auth.uid == resource.data.ownerId` quand le multi-compte l'exigera.
- Le comportement hors ligne du SDK ([ADR 0002](0002-borne-d-acquittement-des-ecritures.md) et
  [ADR 0003](0003-lectures-serveur-plutot-que-cache.md)) n'est retenu par **aucun** test
  automatique : seulement par ces ADR et par la vérification navigateur.
