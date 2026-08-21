# ADR 0005 — L'identifiant du document est posé à l'ouverture du formulaire

- **Statut** : en vigueur
- **Date** : 2026-08-20 (`16026a8`, `feat(ui): plus de verrou après un échec d'écriture`)
- **Portée** : `src/domain/use-cases/new-*-id.ts`, `recipe-slice`, `convives-slice`

## Contexte

Une écriture non acquittée ne dit pas si elle aboutira ([ADR 0002](0002-borne-d-acquittement-des-ecritures.md)).
L'utilisateur qui n'a rien vu se passer réappuie — c'est le geste normal. Si l'identifiant du
document était tiré **au moment de l'écriture**, ce second envoi créerait un **second document** :
deux recettes pour une seule, deux convives pour une seule personne, au retour du réseau.

La parade évidente — verrouiller le bouton après un échec — a été essayée et **retirée** : elle
transforme l'écran en impasse (plus aucun geste possible) sans rien empêcher, puisqu'un
rechargement de page rouvre le formulaire.

## Décision

L'identifiant du document est **demandé à l'ouverture du formulaire** et conservé jusqu'à ce
qu'une écriture aboutisse. Tous les envois d'une même saisie visent donc **le même document**, et
`save` étant un `setDoc` avec identifiant explicite — un upsert — un réenvoi **réécrit** au lieu
de dupliquer. Le doublon devient **impossible** au lieu d'être _empêché_.

Deux points de renouvellement, et deux seulement :

- **l'ouverture du formulaire** (`recipeFormOpened`, `conviveFormOpened`), qui **se retire** si une
  écriture est en vol — sinon un réenvoi redeviendrait le doublon qu'on vient d'exclure ;
- **le succès** de l'écriture, qui transporte le `nextDraftId` dans son payload pour que le
  _reducer_ (muté) décide seul de le poser, et seulement si ce succès est encore d'actualité.

Le second point n'est pas redondant : quand l'écriture était en vol à l'ouverture, `…FormOpened`
s'est retiré et **rien ne rattrapait** le renouvellement — la saisie suivante repartait sous
l'identifiant de la précédente et l'écrasait.

L'identifiant naît dans `domain/`, par un **use-case** (`newRecipeIdUseCase`,
`newConviveIdUseCase`) et jamais par un appel direct au port `IdGenerator` depuis un slice.

## La mesure

Vécu, 2026-08-20 : c'est le retrait du verrou post-échec qui a rendu le second envoi atteignable,
et c'est ce qui a exigé l'identifiant stable. Le scénario du doublon (envoi hors ligne, réenvoi,
retour du réseau) est reproductible en mode e2e avec `window.__e2e.failWrites()`.

## Conséquences

- **Aucun verrou après un verdict** : ni sur un échec, ni sur un non-acquittement. Seule l'écriture
  _en vol_ verrouille, pour ne pas empiler deux envois dont on n'a aucun verdict.
- L'**ajout seul** a besoin de cette mécanique : il crée un document. Le renommage et le retrait
  visent un identifiant qui existe déjà — un second envoi y est un upsert ou un effacement
  idempotent.
- Le champ `draftId` / `draftConviveId` vit dans le **store**, pas dans un `useState` : le
  container se démonte, le store est un singleton de session.
- `initialState` étant statique et incapable d'appeler un port, la valeur de départ est posée à la
  **naissance du store** (`recipeInitialState`, `convivesInitialState`). Le `| null` du type n'est
  donc pas un état de l'application : seul un appel nu au reducer peut l'observer.
