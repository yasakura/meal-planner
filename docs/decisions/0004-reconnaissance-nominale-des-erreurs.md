# ADR 0004 — Reconnaître l'erreur de dépôt par son nom, jamais par `instanceof`

- **Statut** : en vigueur
- **Date** : 2026-08-12 (`bbc9f0f`)
- **Portée** : `src/domain/errors/`, `src/data/`, tous les slices

## Contexte

L'UI doit distinguer « le dépôt n'a pas répondu » de « le dépôt a répondu non »
([ADR 0001](0001-trois-issues-pour-une-ecriture.md)). Le domaine porte ce signal par une classe,
`RepositoryUnavailableError`, que les adapters `data/` produisent à la place des erreurs de SDK.

Mais **Redux Toolkit ne stocke jamais l'instance rejetée par un thunk**. `createAsyncThunk` la
remplace par une **copie plate** produite par `miniSerializeError` : un objet nu qui a conservé
`name`, `message`, `stack`, `code`, et **perdu son prototype**. Un `instanceof
RepositoryUnavailableError` dans un reducer est donc toujours faux — exactement là où la
distinction doit servir. Le code ne le laisse pas deviner : le champ s'appelle `action.error` et
ressemble à l'erreur d'origine.

## Décision

Deux règles, indissociables :

1. La reconnaissance se fait par **le nom**, via `isRepositoryUnavailable(candidate)` — un
   prédicat exporté par `src/domain/errors/repository-unavailable-error.ts`, qui teste
   `candidate.name === 'RepositoryUnavailableError'`. Aucun `instanceof` sur ce chemin.
2. La traduction des pannes d'infrastructure a **un seul point de passage** par technologie :
   `asDomainFailure` pour Firestore (`src/data/firestore-failure.ts`), `E2eFailureSwitch` pour le
   mode e2e. Lecture comme écriture, tous adapters confondus.

Le point de passage unique n'est pas une commodité : une asymétrie ferait qu'un écran dirait
« aucune connexion » là où un autre dirait « impossible de charger », pour la même panne.

## La mesure

Comportement de `@reduxjs/toolkit` v2 : `miniSerializeError` est appliqué à toute erreur non
gérée d'un thunk avant qu'elle n'atteigne `action.error`. Vérifié dans le SDK au moment de la
décision ; le prédicat nominal est par ailleurs le seul qui reste vrai si l'erreur traverse une
sérialisation (persistance du store, devtools).

Le code de panne réseau du SDK Firestore est `'unavailable'` ; **tout autre code**
(`permission-denied`, `not-found`…) décrit un serveur qui a bel et bien répondu, et remonte tel
quel.

## Conséquences

- `isRepositoryUnavailable` accepte `unknown` et lit `name` défensivement : la valeur qu'il
  examine n'est pas typée, et une valeur sans `name` — voire non-objet — doit répondre « non »,
  jamais faire crasher la traduction.
- Le domaine n'a jamais à connaître Firestore ; l'UI n'a qu'un seul critère à consulter.
- Renommer la classe casse la reconnaissance **en silence** : le nom est la clé, la constante
  `REPOSITORY_UNAVAILABLE_NAME` est donc le seul endroit où il s'écrit.
