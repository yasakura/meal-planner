# ADR 0017 — La surface de pilotage des scénarios, et ce qu'elle refuse d'offrir

- **Statut** : en vigueur
- **Date** : 2026-08-17 (`10a4f4e`)
- **Portée** : `src/data/e2e/e2e-failure-switch.ts`, `src/data/e2e/e2e-seed.ts`

## Contexte

Les états hors ligne sont devenus le cœur du vocabulaire de l'application
([ADR 0001](0001-trois-issues-pour-une-ecriture.md)). Un scénario doit pouvoir les atteindre sans
couper réellement quoi que ce soit. Il doit aussi pouvoir partir d'un état connu : liste vide, une
seule ligne, foyer complet.

Le risque, lui, est connu d'avance : **une API de test qui grossit devient une seconde application
à maintenir**, et ses propres défauts font échouer des scénarios sans qu'aucun bug produit
n'existe.

## Décision

**Trois opérations, et rien d'autre**, exposées sur `window.__e2e` : `failReads()`, `failWrites()`,
`restore()`.

Ce qui est **délibérément absent**, et pourquoi :

- **la granularité par port** (convives vs recettes) : un écran n'exerce qu'un dépôt à la fois, et
  l'UI ne distingue de toute façon que « a répondu » de « n'a pas répondu » ;
- **la panne d'authentification** : les scénarios démarrent sur une session ouverte, une panne
  d'auth ne ferait que les empêcher de commencer ;
- **l'injection de données en cours de route** : l'état de départ vient de l'URL, la suite vient de
  l'application elle-même. Un scénario qui écrit dans le dépôt derrière l'écran ne teste plus
  l'écran.

Deux propriétés de forme, chacune payée par un défaut évité :

1. **La panne est un ÉTAT, pas un coup unique** : elle dure jusqu'à `restore()`. Un « échouer la
   prochaine lecture » serait ininterprétable — **StrictMode rejoue les effets de montage**, donc la
   panne tomberait sur la première des deux lectures et le scénario verrait l'écran nominal.
2. **L'état de départ est un COMPTEUR, pas une liste d'identifiants** (`?convives=2&recipes=0`). Ce
   qu'un scénario a besoin de choisir est un **cardinal** ; nommer les fixtures dans l'URL rendrait
   chaque scénario dépendant du **contenu** du jeu de départ, pas seulement de sa taille. Corollaire
   : l'**ordre de déclaration** des fixtures fait partie du contrat, puisqu'un compteur en prélève un
   préfixe.

Une valeur d'URL qui n'est pas un entier positif est **ignorée** et retombe sur le défaut, jamais
convertie : `Number('abc')` vaut `NaN`, `slice(0, NaN)` rend un tableau **vide**, et le scénario
verrait un état vide fabriqué par sa propre faute de frappe — le faux signal exact que ce projet
refuse partout ailleurs. Paramètre absent → tout le jeu, pour qu'une visite nue montre une
application peuplée.

## La mesure

Aucune mesure chiffrée : décision de conception d'outillage, prise contre l'alternative « API de
pilotage riche ». Constaté, non mesuré. Le coût évité est celui de la maintenance d'une seconde
application.

## Conséquences

- `E2eHost` est un type **structurel** (`{ location: { search: string } }`) et non `Window` : les
  tests fournissent un objet nu, et surtout **`__e2e` n'entre jamais dans le type global** — du code
  de production qui le lirait ne compilerait pas.
- Les adapters e2e traduisent leurs pannes dans le **vocabulaire du domaine**
  (`RepositoryUnavailableError`), exactement comme `asDomainFailure` le fait pour Firestore
  ([ADR 0004](0004-reconnaissance-nominale-des-erreurs.md)) : sinon un scénario verrait « impossible
  de charger » là où le vrai adapter dit « aucune connexion ».
- Un seul commutateur est **partagé** par tous les dépôts : `failReads()` couvre tout ce que l'écran
  courant peut lire.
