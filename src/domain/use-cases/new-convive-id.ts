import { type IdGenerator } from '../ports/id-generator';

/**
 * Un identifiant NEUF pour un convive à venir, avant même qu'il existe. Le formulaire d'ajout le
 * demande à son ouverture et le garde jusqu'à ce que son écriture aboutisse : un réenvoi réécrit
 * alors le MÊME document, et le doublon devient impossible au lieu d'être empêché par un verrou.
 * Même forme que `newRecipeIdUseCase`, et pour la même raison.
 *
 * L'AJOUT seul en a besoin : il crée un document. Le renommage et le retrait visent un
 * identifiant qui existe déjà — un second envoi y est un upsert ou un effacement idempotent, il
 * ne peut rien dupliquer.
 *
 * Un use-case, et non un appel direct au port depuis un slice : les identifiants naissent dans
 * `domain/`, et l'écran ne connaît que ce que le domaine lui rend.
 */
export function newConviveIdUseCase(deps: { idGenerator: IdGenerator }): () => string {
  return () => deps.idGenerator.generate();
}

export type NewConviveId = ReturnType<typeof newConviveIdUseCase>;
