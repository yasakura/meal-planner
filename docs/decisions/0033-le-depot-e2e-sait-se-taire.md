# ADR 0033 — Le dépôt e2e sait se taire, et c'est la borne qui parle

- **Statut** : remplacée par [ADR 0038](0038-une-ecriture-acceptee-localement-est-reussie.md)
- **Date** : 2026-08-23
- **Portée** : `src/data/e2e/e2e-failure-switch.ts`, les trois adapters de `src/data/e2e/`,
  `e2e/support/e2e-controls.ts`
- **Issue** : [#69](https://github.com/yasakura/meal-planner/issues/69)

## Contexte

`failWrites()` fait **rejeter** le dépôt : la promesse d'écriture part en erreur immédiatement. Le
défaut de production est l'inverse — hors ligne, `setDoc` et `deleteDoc` ne rejettent jamais, ils
mettent l'écriture en file locale et n'acquittent qu'au serveur, donc la promesse **ne se règle
jamais** ([ADR 0002](0002-borne-d-acquittement-des-ecritures.md)). C'est toute la raison d'être de
`withServerDeadline`.

Les deux routes mènent au même vocabulaire d'écran, « non acquittée ». Aucun scénario Playwright
n'empruntait la seconde, celle du métro et de l'ascenseur — la plus fréquente sur une PWA mobile.

## Décision

Un **quatrième** geste sur `window.__e2e` : `hangWrites()`. Il n'arme ni un refus ni un retard, il
arme un **silence** : l'acquittement devient une promesse qui ne se règle jamais.

Deux choix que l'issue laissait ouverts.

**1. La borne descend dans l'adapter e2e, et c'est celle de la production.** Le commutateur fait
passer chaque écriture par `withServerDeadline` — le module de `src/data/`, pas une copie. Reproduire
le seul symptôme à l'écran aurait donné un écran figé pour toujours : exactement le défaut
qu'[ADR 0002](0002-borne-d-acquittement-des-ecritures.md) a corrigé, et rien à asserter. Ce qu'un
scénario doit pouvoir exercer, c'est la **chaîne** silence → borne → `RepositoryUnavailableError` →
« n'a pas pu être confirmé ».

**2. La borne du mode e2e est la sienne, courte** : `E2E_ACK_TIMEOUT_MS = 1500`, injectable par
`E2eFailureSwitch.create({ ackTimeoutMs })` comme les factories Firestore acceptent la leur. Les
5 000 ms de production sont un choix d'outillage pour un réseau qui rampe
([ADR 0002](0002-borne-d-acquittement-des-ecritures.md)) ; un scénario n'a aucune raison de les
payer. 1 500 ms laisse à l'assertion « le bouton est verrouillé » une marge d'un ordre de grandeur
sur l'aller-retour Playwright qui la précède (~40 ms au repos, ~240 ms mesuré sous charge).

## Ce que la décision doit à ADR 0017, et là où elle s'en écarte

[ADR 0017](0017-surface-de-pilotage-des-scenarios.md) posait « trois opérations, et rien d'autre ».
Il y en a quatre. L'écart est assumé, et il est étroit :

- ce que 0017 refuse nommément — granularité par port, panne d'auth, injection de données — reste
  refusé. `hangWrites()` n'est pas une commodité de pilotage, c'est un **mode de panne du SDK réel**
  qu'aucun autre geste ne pouvait atteindre ;
- les deux propriétés de forme de 0017 tiennent : la panne reste un **état** qui dure jusqu'à
  `restore()`, et le geste ne prend **aucun paramètre** — la borne est une constante du mode, pas une
  option d'URL ;
- **les lectures n'ont pas leur équivalent.** Hors ligne, `getDocs` répond depuis le cache en
  quelques millisecondes ([ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md)) : le silence
  n'y a jamais été mesuré, et un `hangReads()` serait une panne inventée.

## La mesure

Le scénario `un dépôt muet tient l'ajout en vol, puis la borne le déclare non confirmé, et le réseau
revenu il aboutit` (`e2e/convives.spec.ts`) a été confronté par **sabotage** : la borne retirée du
commutateur e2e, l'écran reste verrouillé sur « ajout en cours », le constat n'arrive jamais et le
scénario tombe sur `toHaveCount(1)` → `0`, après quatorze tentatives. C'est la démonstration que le
scénario exerce la borne, et pas seulement le vocabulaire d'écran que `failWrites()` atteignait
déjà.

## Conséquences

- **Une écriture restée muette n'est pas appliquée** au dépôt en mémoire, alors qu'en production elle
  part quand même au retour du réseau ([ADR 0002](0002-borne-d-acquittement-des-ecritures.md)). Le
  mode e2e reproduit la **route de l'échec**, pas la file locale de Firestore. Aucun scénario ne
  s'appuie sur le contraire aujourd'hui ; un scénario qui voudrait montrer une écriture non acquittée
  **retrouvée après coup** devra d'abord faire ce travail, sans quoi il affirmerait une contre-vérité.
- Toute écriture e2e traverse désormais `withServerDeadline`, y compris au repos : un `setTimeout`
  posé puis annulé par écriture.
- Le type `E2eControls` est redéclaré côté `e2e/` ([ADR 0017](0017-surface-de-pilotage-des-scenarios.md)) :
  la quatrième signature s'ajoute **des deux côtés**, et un oubli ferait échouer immédiatement tous les
  scénarios de panne, jamais silencieusement.
