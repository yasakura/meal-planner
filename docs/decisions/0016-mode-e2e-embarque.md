# ADR 0016 — Un mode e2e embarqué dans l'application

- **Statut** : en vigueur
- **Date** : 2026-08-17 (`10a4f4e`, `feat(e2e): l'app peut démarrer sur des adapters in-memory`)
- **Portée** : `src/main.tsx`, `src/data/e2e/`, `src/ui/store/create-e2e-store.ts`, `.env.e2e`

## Contexte

Les tests Vitest mockent les ports et remontent **un composant par test**. Tout ce qui n'existe
qu'à l'assemblage leur échappe : vrai routeur, vrai store, vrai CSS, vrais cycles de montage,
séquences de navigation. Il fallait une couche qui exerce l'application **assemblée**.

Le faire contre Firebase aurait signifié : un réseau dans la boucle, une base partagée entre
exécutions, des identifiants cuid2 qu'aucun scénario ne peut viser, et une date qui change chaque
jour. Autrement dit, une suite périssable et non rejouable.

## Décision

L'application sait démarrer sur des **adapters en mémoire**, embarqués dans `src/data/e2e/`, avec
session ouverte d'avance, identifiants **séquentiels** et horloge **figée**. Les scénarios
Playwright tournent sur ce mode (`npm run dev:e2e`), sans réseau ni base partagée.

Quatre points portent le poids de la décision :

- **La bascule est STATIQUE.** `import.meta.env.VITE_E2E === 'true'` est remplacé par un littéral
  au build ; Rollup replie le ternaire et supprime la branche morte. Surtout **pas** un `?e2e=1`
  évalué à l'exécution : une URL capable de basculer la couche de données en production est une
  porte qu'on n'ouvre pas.
- **Les imports sont dynamiques DES DEUX CÔTÉS**, et pas seulement côté e2e : `config/firebase`
  appelle `initializeApp` **au chargement du module** et lève si la configuration manque. Un import
  statique de `create-app-store` ferait donc échouer le démarrage en mode e2e — et une branche non
  prise ne charge jamais son module.
- **`.env.e2e` est VERSIONNÉ**, contrairement à `.env.dev` et `.env.prod` : il ne contient aucun
  secret, et un scénario doit pouvoir être rejoué sur n'importe quelle machine sans configuration
  préalable. Il ne déclare **aucune** variable `VITE_FIREBASE_*`, volontairement : si une régression
  réintroduisait l'import de `config/firebase`, l'application **échouerait au démarrage**. Le garde
  est ce silence.
- **Ce sont des adapters, pas des test-doubles.** Ils vivent dans `data/` avec les autres
  implémentations des ports et portent l'injection de panne des scénarios. La convention des doubles
  s'y applique quand même : ils n'offrent rien de plus que leur port
  ([ADR 0019](0019-doubles-hostiles-a-leur-port.md)).

## La mesure

Absence de code e2e dans le bundle de production **vérifiée sur `dist/`** (build du 2026-08-21) :
ni la chaîne `VITE_E2E`, ni le nom `E2eFailureSwitch`, ni le chunk `create-e2e-store` n'y
apparaissent.

## Conséquences

- Les adapters e2e sont **exclus du périmètre de mutation** : leur contrat de port reste tenu par
  leurs propres tests unitaires ([ADR 0012](0012-configurations-stryker-ecartees.md)).
- Le contournement de l'écran de connexion passe par un **adapter du port `AuthGateway`** qui
  annonce une session déjà ouverte — et **jamais** par une porte dérobée dans `AuthGate`, qui
  existerait alors aussi en production. `AuthGate` est inchangé et fait exactement ce qu'il fait en
  production.
- Le jeu de fixtures est déclaré à un seul endroit (`e2e-fixtures.ts`) et passe par les factories du
  domaine : une fixture ne peut pas violer un invariant d'entité. Ses identifiants sont **disjoints**
  de ceux du générateur séquentiel — un chevauchement ferait qu'ajouter un convive **écraserait**
  silencieusement une fixture, `save` étant un upsert.
- Un préfixe d'identifiant **par consommateur** (`e2e-recipe-1`, `e2e-convive-1`) : créer une
  recette ne décale pas la numérotation des convives, et deux étapes indépendantes le restent.
- Le dépôt de menus démarre **vide et sans fixture** : un menu enregistré est le résultat d'un
  parcours, jamais un état de départ — sinon un scénario ne distinguerait pas ce qu'il vient
  d'écrire de ce qu'on lui a servi.
