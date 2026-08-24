# ADR 0038 — Une écriture acceptée localement est une écriture réussie

- **Statut** : en vigueur — remplace [ADR 0002](0002-borne-d-acquittement-des-ecritures.md) et
  [ADR 0033](0033-le-depot-e2e-sait-se-taire.md), amende
  [ADR 0001](0001-trois-issues-pour-une-ecriture.md)
- **Date** : 2026-08-24
- **Portée** : `src/data/firestore-local-acceptance.ts`,
  `src/data/firestore-recipe-repository.ts`, `src/data/firestore-menu-repository.ts`,
  `src/data/firestore-convive-repository.ts`, `src/domain/ports/write-rejection-reporter.ts`,
  `src/domain/ports/convive-repository.ts`, `src/ui/features/writes/write-rejections-slice.ts`,
  `src/ui/LinkBanner.tsx`, `src/data/e2e/e2e-failure-switch.ts`
- **Issue** : [#137](https://github.com/yasakura/meal-planner/issues/137)

## Contexte

[ADR 0002](0002-borne-d-acquittement-des-ecritures.md) bornait l'attente d'acquittement à 5 000 ms
et traduisait l'expiration en `unconfirmed` ([ADR 0001](0001-trois-issues-pour-une-ecriture.md)).
Cette borne n'a jamais été mesurée : c'était un choix d'outillage, et la troisième issue d'écriture
n'était rien d'autre que **le nom de son expiration**.

Un banc en navigateur, contre le Firestore de dev, cache persistant actif, a mesuré ce que la
borne recouvrait :

| Fait                                              | Mesure                                                        |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `setDoc` hors ligne                               | promesse **pendante** — ni résolue ni rejetée après 4 s       |
| Émission locale                                   | **immédiate**, `hasPendingWrites=true`                        |
| Rechargement de page, toujours hors ligne         | `existe=true, hasPendingWrites=true` — la **file a persisté** |
| Rejet serveur après coup                          | la promesse **rejette** (`permission-denied` à 6 787 ms)      |
| `updateDoc` hors ligne, document présent au cache | promesse **pendante**, cache local mis à jour immédiatement   |
| `updateDoc` hors ligne, document absent           | **ne rejette pas localement** : c'est le serveur qui tranche  |

Une écriture partie hors ligne n'est donc pas en danger : elle est **en route**, et elle survit
même à un rechargement. Annoncer « non confirmé » à l'utilisateur, c'est lui décrire l'expiration
d'un pansement, pas l'état de sa donnée.

## Décision

**Une écriture acceptée localement par Firestore est une écriture réussie**, et l'écran l'annonce
comme telle.

1. Les écritures ne passent plus par `withServerDeadline` mais par `acceptedLocally`
   (`src/data/firestore-local-acceptance.ts`) : la main est rendue dès que le SDK a pris
   l'écriture. `withServerDeadline` reste, pour les **lectures seules**.
2. Le **rejet définitif** du serveur, qui arrive après que la main est rendue, ne peut plus revenir
   par la promesse de l'appelant : il part sur un canal global, le port
   `WriteRejectionReporter`, qui lève un **constat unique** — « Une modification n'a pas pu être
   enregistrée. »
3. Ce constat s'affiche dans le **même bandeau** que « Lien perdu » : un seul bandeau, deux causes,
   **une ligne et un bouton par cause**. « Réessayer » n'appartient qu'au lien perdu — il rouvre les
   abonnements, geste qui a un sens ; le refus d'écriture n'a rien à rejouer et porte « Fermer »,
   qui n'est pas une action mais un accusé de réception.
4. L'état `unconfirmed` disparaît de tous les slices. `error` **reste** : il nomme une écriture qui
   n'est jamais partie parce que le domaine l'a refusée, il arrive **avant** le dépôt, et il
   s'affiche là où l'utilisateur peut agir — dans le formulaire, pas dans un bandeau global.
5. Le renommage passe par **`updateDoc`**, pas par `setDoc` ni par `runTransaction`. C'est la seule
   des trois formes qui soit à la fois **optimiste** et **conditionnée à l'existence** : le contrôle
   ne disparaît pas, il change de gardien — du client vers le serveur. `updateExisting` perd donc sa
   lecture (`Promise<Convive | undefined>` devient `Promise<void>`) : son ancien contrat promettait
   une réponse serveur que personne ne peut tenir hors ligne.

## Ce qui déclasse, et pourquoi pas un amendement

[ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md) a été **amendée** parce que seules ses
conséquences avaient bougé : sa décision — lire avec repli sur le cache — tenait toujours.

Ici c'est la **décision elle-même** qui tombe :

- **[ADR 0002](0002-borne-d-acquittement-des-ecritures.md) — remplacée.** « Toute écriture passe
  par `withServerDeadline` » devient faux, et sa phrase de clôture — « le vocabulaire de l'UI ne
  peut pas se réduire à deux issues, c'est la borne qui crée la troisième » — est exactement ce que
  la présente ADR renverse : on retire la borne **pour** revenir à deux issues. Sa **mesure**, elle,
  survit intégralement, et c'est elle qui fonde le renversement : la promesse pendante hors ligne
  est le fait ; l'attendre était l'erreur.
- **[ADR 0033](0033-le-depot-e2e-sait-se-taire.md) — remplacée.** Elle décrivait `hangWrites`, un
  levier dont l'objet était de faire expirer la borne. Sans borne, un dépôt muet ne bloque plus
  rien : le levier a perdu son sujet et il est retiré. `failWrites` change de sens : « le serveur
  refusera **après coup** », c'est-à-dire écriture appliquée localement, puis annulée, puis constat
  global.
- **[ADR 0001](0001-trois-issues-pour-une-ecriture.md) — amendée.** Ses trois issues deviennent
  deux en écriture, et le ton `unconfirmed` disparaît des constats. Mais tout le reste tient : la
  symétrie en **lecture** (`unavailable` ≠ `error` ≠ vide), l'écran `unavailable` sans bouton, et
  surtout « une écriture non acquittée ne verrouille rien », qui est plus vrai que jamais.

## L'écart assumé avec l'état de l'art

La littérature dit : **bandeau** pour un état qui dure, **toast** pour un événement transitoire — et
pour une écriture rejetée, le motif courant est le toast, parce que le moteur de synchronisation
**rejouera** l'écriture.

Le nôtre ne rejouera pas. Un refus définitif est définitif, et la modification est perdue. Un toast
qui s'efface en quatre secondes **peut être manqué**, et l'utilisateur ne saurait jamais que son
geste a disparu. Un fait irréversible mérite d'être persistant : on s'écarte donc du motif courant,
sciemment, et le bandeau reste jusqu'à ce que l'utilisateur en accuse réception.

## Conséquences

- **Firestore annule lui-même la mutation locale** quand le serveur refuse, et le listener réémet
  l'ancienne valeur : la ligne revient toute seule. L'application ne se bat pas contre ce retour en
  arrière — elle ne rejoue rien, et le bandeau se contente d'expliquer **pourquoi** la ligne est
  revenue. Le mode e2e reproduit ce retour en arrière plutôt que de refuser l'écriture d'emblée,
  sans quoi les scénarios vérifieraient une mécanique que le vrai SDK n'a pas.
- **Deux traces optimistes subsistent, et il faut le savoir.** `convives-slice` écrit le convive
  renommé et retire le convive supprimé dans sa propre liste (`renameConvive.fulfilled`,
  `removeConvive.fulfilled`) : ces copies-là sont **corrigées** par la réémission du canal, qui fait
  autorité. `saved-menus-slice`, lui, pose un `focusOn` sur la période enregistrée
  (`saveMenu.fulfilled`) que **rien ne corrige** si le serveur refuse : le pointeur désigne alors une
  période que le dépôt ne contient pas. Ce n'est pas traité par cette ADR.
- Le verdict serveur du mode e2e est **différé** (`E2E_SERVER_VERDICT_MS`). Sans ce délai, l'état
  optimiste ne dure qu'un tour de boucle et **aucun scénario ne peut l'observer** : le retour en
  arrière serait déjà fait quand Playwright regarde.
- `RepositoryUnavailableError` quitte le chemin d'écriture et ne subsiste que sur les lectures.
- **Deux orphelins emportés par la disparition d'`unconfirmed`** : le champ `addSubjectName` du
  slice des convives et le module `french-elision.ts`. Ils n'existaient que pour **nommer la
  personne** dans un constat non acquitté (« l'ajout d'Aurélie n'a pas pu être confirmé ») ; le
  constat global ne nomme personne, et plus rien ne les lisait.
  [ADR 0023](0023-elision-francaise-compromis-assume.md) passe donc à **caduque**.
- **Non mesuré, et à ne pas présenter comme tel** : le banc était non authentifié, donc le serveur
  refusait sur `permission-denied` **avant** d'atteindre le contrôle d'existence de `updateDoc`. Le
  mécanisme — file locale, décision serveur, rejet de la promesse — est prouvé ; le code d'erreur
  `not-found` d'un `updateDoc` sur document absent vient de la **documentation**, pas d'une mesure.
- La purge de rétention de `saveMenuUseCase` traverse encore une **lecture** bornée à 10 000 ms.
  Hors ligne elle est servie par le cache et n'attend pas ; sur un réseau qui rampe, elle peut
  retenir le bouton « Enregistrer » jusqu'à la borne, alors que l'écriture, elle, est déjà acquise.
