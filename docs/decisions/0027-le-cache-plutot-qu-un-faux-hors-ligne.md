# ADR 0027 — `getDocsFromServer` n'attend pas, il abandonne

- **Statut** : en vigueur — remplace [ADR 0003](0003-lectures-serveur-plutot-que-cache.md)
- **Date** : 2026-08-21
- **Portée** : `src/data/firestore-recipe-repository.ts`, `src/data/firestore-menu-repository.ts`,
  `src/data/firestore-convive-repository.ts`, `src/config/firebase.ts`

## Contexte

Depuis [ADR 0003](0003-lectures-serveur-plutot-que-cache.md), les trois adapters lisaient avec
`getDocsFromServer` et `getDocFromServer`, pour qu'une lecture impossible soit **avouée** au lieu
d'être servie comme un faux vide. Quatre tests nommés « ne se rabat jamais sur le cache Firestore »
gardaient ce choix.

Sur la preview, contre un vrai Firebase, un parcours ordinaire le mettait en défaut : l'utilisateur
ouvre l'application, va sur **Recettes** (OK), va sur **Menu** (OK), **revient sur Recettes → « Aucune
connexion »**. Il avait du réseau, et l'écran lui disait le contraire.

## Décision

Les lectures repassent à **`getDocs` et `getDoc`** : le repli sur le cache du SDK est accepté, et
plus jamais exigé le serveur.

Ce que [ADR 0003](0003-lectures-serveur-plutot-que-cache.md) voulait éviter — affirmer une absence
qu'on n'a pas lue — reste vrai, mais le remède s'est révélé pire que le mal : il transformait une
liaison SDK momentanément non établie en **panne réseau annoncée**, alors que la réponse était en
mémoire.

## La mesure

Sonde exécutée depuis Node contre le Firestore de **dev**, authentifiée avec le compte de seed.

D'abord écarter la base et le réseau comme causes — tout répond, vite, séquentiellement puis en
parallèle :

| Lecture             | Issue | Latence       | Résultat      |
| ------------------- | ----- | ------------- | ------------- |
| `recipes`           | OK    | 325 ms        | 24 doc(s)     |
| `menus`             | OK    | 73 ms         | 2 doc(s)      |
| `recipes`           | OK    | 94 ms         | 24 doc(s)     |
| `recipes`           | OK    | 47 ms         | 24 doc(s)     |
| `menus` ∥ `recipes` | OK    | 42 ms · 42 ms | 2 · 24 doc(s) |

Puis l'expérience décisive : **réseau de la machine intact**, seule la liaison du SDK coupée par
`disableNetwork(db)`.

| Appel                                 | Issue                   | Latence | Source            |
| ------------------------------------- | ----------------------- | ------- | ----------------- |
| `getDocsFromServer`                   | **ÉCHEC** `unavailable` | 2 ms    | —                 |
| `getDocs`                             | OK, 24 doc(s)           | 3 ms    | `fromCache=true`  |
| `getDocsFromServer` après reconnexion | OK                      | 186 ms  | `fromCache=false` |

Trois faits en sortent :

1. **`getDocsFromServer` n'attend pas, il abandonne.** Deux millisecondes. Ce n'est pas une lenteur
   qu'un délai plus généreux rattraperait : c'est un **refus immédiat** dès que la liaison du SDK
   n'est pas établie — situation courante sur mobile après une mise en arrière-plan, une bascule
   WiFi/4G ou une période d'inactivité.
2. **`unavailable` ne veut pas dire « l'utilisateur n'a pas internet »**, seulement « le backend
   était injoignable à cet instant ». `asDomainFailure` le traduit en `RepositoryUnavailableError`
   ([ADR 0004](0004-reconnaissance-nominale-des-erreurs.md)), et l'écran en fait la sentence
   « Aucune connexion ». Le mensonge naît de cette chaîne de traduction autant que du choix d'API.
3. **Le cache contenait la réponse**, rendue en 3 ms, pendant que l'écran annonçait la panne.

## Pourquoi aucun test ne pouvait l'attraper

C'est structurel, pas un oubli. Les tests de `src/data/` suivent le pattern humble object et
**mockent le SDK** ([ADR 0014](0014-pas-d-emulateur-firestore.md)) : ils vérifient **quelle fonction
on appelle**, jamais **ce que cette fonction fait**. Le mock, lui, répond toujours. `CLAUDE.md`
l'assume — « le round-trip réel n'est pas testé automatiquement » — et ce défaut est exactement la
classe que cette limite laisse passer. Il a fallu interroger le vrai Firestore.

Les quatre tests qui gardaient l'ancienne décision sont **révoqués** :

- `findAll interroge le serveur et ne se rabat jamais sur le cache Firestore`, dans
  `firestore-menu-repository.test.ts`, `firestore-recipe-repository.test.ts` et
  `firestore-convive-repository.test.ts` ;
- `findById interroge le serveur et ne se rabat jamais sur le cache Firestore`, dans
  `firestore-recipe-repository.test.ts`.

Ils sont remplacés par leurs symétriques `… accepte le repli sur le cache Firestore, et n'exige
jamais le serveur`, confrontés par **sabotage** : le test ne peut pas naître rouge, puisqu'il décrit
un comportement qu'on vient d'écrire.

## Conséquences

- **Le repli vaut au sein d'une session, pas au démarrage.** `src/config/firebase.ts:23` initialise
  par `getFirestore(app)`, donc un cache **mémoire**, sans persistance IndexedDB. Après un
  rechargement de page ou à froid, le cache est vide et `getDocs` doit joindre le serveur. Le
  symptôme rapporté (Recettes → Menu → Recettes) est couvert ; le **démarrage hors ligne ne l'est
  pas**.
- Couvrir aussi le démarrage à froid demanderait
  `initializeFirestore(app, { localCache: persistentLocalCache() })`. C'est une **alternative
  écartée pour l'instant**, pas un travail en cours : personne ne l'a mesurée, et elle rouvre la
  question d'interface qu'[ADR 0003](0003-lectures-serveur-plutot-que-cache.md) refusait déjà de
  trancher — distinguer à l'écran une donnée fraîche d'une donnée de cache.
- **Hors ligne avec un cache rempli, l'application montre désormais les données de la session** au
  lieu du message « Aucune connexion ». C'est un changement de comportement assumé, décidé par
  l'utilisateur.
- Le **bornage des lectures à 10 000 ms** (`DEFAULT_READ_TIMEOUT_MS`, contre 5 000 ms pour les
  écritures, [ADR 0002](0002-borne-d-acquittement-des-ecritures.md)) **reste en place** et n'est pas
  concerné : il traite une lecture qui rampe, pas un abandon en 2 ms. Il n'a été ni remplacé, ni
  déplacé par cette décision.
