# ADR 0002 — Borner l'acquittement des écritures Firestore

- **Statut** : remplacée par [ADR 0038](0038-une-ecriture-acceptee-localement-est-reussie.md)
- **Date** : 2026-08-20 (`3ca6e1c`, `fix(data): borner l'acquittement des écritures Firestore`)
- **Portée** : `src/data/` — tous les adapters Firestore

## Contexte

Le SDK Firestore ne se comporte pas hors ligne comme une bibliothèque HTTP. **`setDoc` et
`deleteDoc` ne rejettent pas** : ils mettent l'écriture dans une file locale et n'acquittent leur
promesse **qu'au serveur**. Sans réseau, la promesse ne se règle donc **jamais** — ni résolue, ni
rejetée. `runTransaction` a le même défaut, avec une nuance : ses cinq tentatives internes peuvent
s'étirer longtemps sur un réseau qui rampe.

Un écran qui attend cette promesse reste figé sur « enregistrement en cours », bouton verrouillé,
sans porte de sortie et sans jamais rien dire. Rien dans le code appelant ne laisse deviner ce
comportement : `await setDoc(...)` a exactement l'air d'un appel réseau ordinaire.

## Décision

Toute **écriture** passe par `withServerDeadline(promesse, ackTimeoutMs)`
(`src/data/firestore-server-deadline.ts`) : au-delà de la borne, la promesse est rejetée avec un
`RepositoryUnavailableError`, que l'UI traduit en « non acquittée »
([ADR 0001](0001-trois-issues-pour-une-ecriture.md)).

- **Borne par défaut : 5 000 ms**, volontairement tolérante — un réseau qui rampe (signal faible
  mais présent) ne doit pas produire un faux constat hors-ligne. Elle est injectable par adapter.
- Le module vit **au-dessus des adapters**, pas dans l'un d'eux : le défaut est celui du **SDK**,
  pas celui d'une collection. Avec un point de passage par adapter, un écran finirait par avouer
  son ignorance là où un autre se tairait indéfiniment.
- Les **lectures** passent par le même module, avec une borne propre — 10 000 ms contre 5 000 ms
  pour les écritures : une lecture qui rampe doit avoir plus de patience qu'une écriture en file
  locale ([ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md)).

## La mesure

Comportement du SDK constaté en navigateur hors ligne sur les écritures de convives, puis retrouvé
à l'identique sur les recettes et les menus — c'est ce qui a motivé l'extraction du module hors de
`firestore-convive-repository` le 2026-08-20. **Aucune borne chiffrée n'a été mesurée** : les
5 000 ms sont un choix d'outillage, pas un résultat d'expérience. C'est une valeur à ajuster si un
faux constat hors-ligne apparaît sur un réseau lent réel.

## Conséquences

- Une écriture bornée **n'est pas annulée** : elle part quand même au retour du réseau. « Non
  acquittée » ne veut donc pas dire « perdue », et l'écran ne doit jamais l'affirmer.
- Le vocabulaire de l'UI ne peut pas se réduire à deux issues — c'est la borne qui crée la
  troisième.
- Le **round-trip réel n'est pas testé** ([ADR 0014](0014-pas-d-emulateur-firestore.md)) : ce
  comportement du SDK n'est retenu par aucun test automatique, seulement par cette ADR et par la
  vérification navigateur.
