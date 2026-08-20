import { type IdGenerator } from '../ports/id-generator';

/**
 * Un identifiant NEUF pour une recette à venir, avant même qu'elle existe. Le formulaire de
 * création le demande à son ouverture et le garde jusqu'à ce que son écriture aboutisse : un
 * réenvoi réécrit alors le MÊME document, et le doublon devient impossible au lieu d'être
 * empêché par un verrou. Même forme que le menu, dont l'identifiant de document — sa date de
 * début — est fourni par l'appelant.
 *
 * Un use-case, et non un appel direct au port depuis un slice : les identifiants naissent dans
 * `domain/`, et l'écran ne connaît que ce que le domaine lui rend.
 */
export function newRecipeIdUseCase(deps: { idGenerator: IdGenerator }): () => string {
  return () => deps.idGenerator.generate();
}

export type NewRecipeId = ReturnType<typeof newRecipeIdUseCase>;
