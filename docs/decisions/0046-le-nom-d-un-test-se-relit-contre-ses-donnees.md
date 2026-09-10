# ADR 0046 — Le nom d'un test se relit contre ses données

- **Statut** : en vigueur
- **Date** : 2026-08-27 (branche `iter-63-prorata`)
- **Portée** : `CLAUDE.md`, section « TDD Uncle Bob »
- **Voisines** : [ADR 0039](0039-un-seul-plafond-celui-du-compte-juste.md), qui porte le défaut que
  ce test prétendait garder

## Contexte

Un test porte deux choses qui peuvent diverger en silence : son **nom**, qui annonce le chemin
gardé, et ses **données**, qui décident du chemin réellement emprunté. Rien ne les tient ensemble —
ni le compilateur, ni la couverture, ni la mutation.

## La mesure

Un test nommé :

> « un effectif si grand que les quantités déborderaient ne casse pas la fiche »

employait la valeur `1e308`. Or `Number.isSafeInteger` la rejetait **avant tout calcul de quantité**.
Le test n'atteignait jamais la branche que son nom annonçait.

Conséquences, toutes mesurées sur le même code :

- le test est resté **vert** ;
- son fichier est resté à **100 % de mutation** ;
- pendant ce temps, le débordement que le nom désignait **vidait l'écran** en production.

**C'est une revue qui l'a vu.** Ni la couverture ni la mutation ne pouvaient : la ligne était bien
exécutée, et tous les mutants du garde de sûreté mouraient correctement.

## Décision

**Un test dont le nom désigne un chemin que ses données n'empruntent pas est un garde-fou absent,
pas un garde-fou faible** — et il est **pire qu'absent**, parce qu'il rassure.

Le nom se relit contre le jeu de données, en une question : _la valeur choisie franchit-elle
vraiment la branche que le nom annonce, ou est-elle arrêtée plus tôt par un autre garde ?_

## Conséquences

- **La mutation ne protège pas de ce défaut, par construction.** Elle mesure si les tests sont
  serrés, jamais s'ils testent la bonne chose. Un mutant tué par un test faux est un mutant tué.
  C'est l'une des raisons du point de contrôle « rouge » sur les use-cases, où l'**intention** est
  validée avant l'implémentation.
- **La couverture non plus** : la ligne du garde était exécutée, donc couverte.
- Le défaut est le plus dangereux du corpus, parce qu'il **consomme du budget de confiance** — un
  test nommé pour un cas fait renoncer à en écrire un autre pour le même cas.
- La règle se généralise à l'assertion d'absence : un `queryBy… === null` qui passerait aussi bien
  sur une page vide ne garde rien. D'où l'exigence d'un localisateur asserté présent plus tôt, ou
  d'un scénario témoin voisin.
