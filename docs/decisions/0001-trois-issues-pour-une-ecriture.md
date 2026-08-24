# ADR 0001 — Une écriture a trois issues : faite, refusée, non acquittée

- **Statut** : en vigueur, amendée le 2026-08-24 par [ADR 0038](0038-une-ecriture-acceptee-localement-est-reussie.md) — l’écriture n’a plus que DEUX issues, `unconfirmed` a disparu ; la symétrie en lecture et l’absence de verrou restent en vigueur
- **Date** : 2026-08-12 (`bbc9f0f`, étendu au catalogue le 2026-08-13 `8e79f41`, au menu et aux
  recettes le 2026-08-20 `aa305fb` / `0f954f4`)
- **Portée** : `src/ui/features/**`, `src/domain/errors/`, `src/domain/ports/convive-repository.ts`,
  `src/domain/ports/recipe-repository.ts`, `src/domain/ports/menu-repository.ts`,
  `src/domain/ports/auth-gateway.ts`

## Contexte

Une application de foyer se consulte dans une cuisine, un métro, une cave. Le réseau y manque
souvent, et le SDK Firestore ne le dit pas de lui-même : une écriture partie hors ligne n'est ni
enregistrée ni perdue, elle attend dans une file locale et atterrira au retour du réseau
(voir [ADR 0002](0002-borne-d-acquittement-des-ecritures.md)).

Un écran qui ne connaît que « réussi » et « échoué » doit donc mentir dans un cas sur trois. Le
mensonge a un coût mesuré : annoncer « impossible d'enregistrer » sur une écriture en route fait
retaper à l'utilisateur ce qui va arriver, et produit le doublon au retour du réseau.

## Décision

Tout cycle de vie d'écriture porte **trois issues distinctes**, avec le **même vocabulaire** dans
tous les slices :

| Statut        | Ce qui s'est passé            | Ce qu'on demande à l'utilisateur |
| ------------- | ----------------------------- | -------------------------------- |
| `error`       | le dépôt a répondu **non**    | une action : corriger, réessayer |
| `unconfirmed` | le dépôt n'a **rien** répondu | rien du tout                     |
| succès        | le dépôt a acquitté           | rien                             |

Symétriquement en lecture, `unavailable` (« pas de réponse ») est distinct de `error` (« a répondu
non ») et d'un résultat **vide** (« a répondu, il n'y a rien ») : trois constats, trois écrans.

Deux corollaires d'écran, pris avec la décision :

- l'écran `unavailable` n'offre **aucun bouton** — ni « Réessayer », ni « Régénérer » : rien ne
  peut aboutir sans réseau, et un bouton qui rejoue le même échec est une fausse porte. L'écran
  revient de lui-même dès qu'une lecture aboutit ;
- une écriture non acquittée ne **verrouille rien**. Elle est partie sous un identifiant fixé
  ([ADR 0005](0005-identifiant-pose-a-l-ouverture-du-formulaire.md)), donc un second envoi est le
  même upsert et ne peut rien dupliquer. Verrouiller ferait de l'écran une impasse.

## La mesure

- Vécu FR-3, 2026-08-12 : hors ligne, la liste des convives s'affichait **vide**, l'utilisateur
  ressaisissait son foyer, et le retour du réseau produisait les doublons.
- Vécu catalogue, 2026-08-13 : le même défaut affichait « Aucune recette » à quelqu'un qui en a
  des dizaines, et « Recette introuvable » sur une fiche qui existe.
- 2026-08-20, `16026a8` : le verrou posé après un échec d'écriture a été **retiré** — il ne
  protégeait d'aucun doublon et fermait le seul geste de sortie.

## Conséquences

- Trois tons de constat côté rendu, traduits en rôle ARIA : `alert` (assertif) pour l'écriture
  refusée ; `status` (poli) pour un succès ou une absence de réponse. `alert` n'est pas réservé
  pour autant à ce qui attend une action — les écrans d'état le portent aussi pour une ressource
  absente ([ADR 0025](0025-un-lien-quand-on-change-de-route.md)).
- Le vocabulaire est partagé par tous les cycles (ajout, renommage, retrait, création et
  modification de recette, enregistrement du menu), mais **les états restent séparés** : un statut
  par opération, sinon une modification réussie renaviguerait un formulaire de création
  fraîchement rouvert (issue #27).
- **Angle mort accepté** : le constat d'ajout de convive vit dans le formulaire, qui n'est pas
  rendu dans l'état `unavailable`. Si un rechargement échoue pendant qu'un ajout est en vol,
  l'issue de cet ajout devient invisible jusqu'au prochain chargement réussi. L'écran est alors
  **incomplet, pas faux** — et le prochain chargement resynchronise depuis le serveur.

## Limite connue — la déconnexion

`signOut` fait exception et **avale son échec**. Fait mesuré côté Firebase : quand `signOut`
échoue (réseau, cas rare), **`onAuthStateChanged` n'est pas déclenché** et le statut reste
`authenticated` — l'écran ne ment donc pas. Le rejet est avalé pour éviter une _unhandled
rejection_, et le retour d'erreur a été laissé **hors périmètre**, sciemment. C'est le seul geste
d'écriture du produit qui ne porte pas les trois issues.
