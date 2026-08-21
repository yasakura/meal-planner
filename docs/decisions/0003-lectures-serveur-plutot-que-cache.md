# ADR 0003 — Lire depuis le serveur, ou avouer qu'on n'a pas lu

- **Statut** : en vigueur
- **Date** : 2026-08-12 (`bbc9f0f`, convives) puis 2026-08-13 (`8e79f41`, catalogue et fiche)
- **Portée** : `src/data/firestore-*-repository.ts`

## Contexte

Hors ligne, **`getDocs` ne rejette pas** : il sert le cache local et rend un snapshot **vide** si
ce cache est froid. `getDoc` fait pire encore — il rend un snapshot dont `exists()` est **faux**.

Le code appelant ne peut pas distinguer ce vide-là d'un vide réel. L'application affirmait donc
des choses fausses avec l'aplomb d'une lecture réussie :

- un **foyer vide inventé** — l'utilisateur ressaisissait ses convives, et le retour du réseau
  produisait les doublons ;
- « **Aucune recette** » à quelqu'un qui en a des dizaines ;
- « **Recette introuvable** » sur une fiche qui existe — l'inexistence affirmée d'une recette
  qu'on n'avait simplement pas pu lire.

## Décision

Toute lecture des adapters Firestore impose la **source serveur** : `getDocsFromServer` et
`getDocFromServer`. Hors ligne, ils **rejettent**, et le rejet est traduit en
`RepositoryUnavailableError` ([ADR 0004](0004-reconnaissance-nominale-des-erreurs.md)), ce qui
donne à l'écran le constat « aucune connexion » au lieu d'un faux vide.

La règle est inscrite dans le **contrat du port** `RecipeRepository`, pas seulement dans les
adapters : un double qui serait muet sur cette distinction rendrait vert un chemin que le vrai
adapter n'a jamais eu.

## La mesure

Relevé sur la **vraie base** (repris du commentaire de `firestore-convive-repository.ts` et de
`firestore-recipe-repository.ts`, non re-mesuré à la rédaction de cette ADR) :

| Appel               | Source réelle               | Latence médiane |
| ------------------- | --------------------------- | --------------- |
| `getDocs`           | serveur (`fromCache=false`) | 63 ms           |
| `getDocsFromServer` | serveur                     | 31 ms           |

Autrement dit : en ligne, `getDocs` interrogeait **déjà** le serveur à chaque appel. Il n'y avait
aucun repli cache à perdre, et la lecture serveur explicite s'est révélée plus rapide et plus
régulière. Le choix ne coûte rien.

## Conséquences

- Aucune lecture ne sert de contenu périmé : l'application ne fonctionne pas hors ligne, et le
  dit.
- Le mode hors ligne « lecture seule depuis le cache » est **écarté**, sciemment. Le rétablir
  demanderait de distinguer, à l'écran, une donnée fraîche d'une donnée de cache — décision
  d'interface qui n'a jamais été prise.
- Les écritures, elles, gardent le comportement de file locale du SDK, borné par
  [ADR 0002](0002-borne-d-acquittement-des-ecritures.md).
