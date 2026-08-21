import { type IdGenerator } from '../ports/id-generator';

export function newRecipeIdUseCase(deps: { idGenerator: IdGenerator }): () => string {
  return () => deps.idGenerator.generate();
}

export type NewRecipeId = ReturnType<typeof newRecipeIdUseCase>;
