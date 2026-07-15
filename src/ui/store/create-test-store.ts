import { createRecipeUseCase } from '../../domain/use-cases/create-recipe';
import { listRecipesUseCase } from '../../domain/use-cases/list-recipes';
import { InMemoryRecipeRepository } from '../../domain/test-doubles/in-memory-recipe-repository';
import { StubAuthGateway } from '../../domain/test-doubles/stub-auth-gateway';
import { StubIdGenerator } from '../../domain/test-doubles/stub-id-generator';
import { type AppDependencies, createStore } from './store';

// Helper de test (pas une classe constructible) : fournit des défauts stub pour
// TOUTES les deps du store, écrasables au cas par cas via `overrides`.
export function createTestStore(overrides?: Partial<AppDependencies>) {
  const defaults: AppDependencies = {
    authGateway: StubAuthGateway.withoutSession(),
    createRecipe: createRecipeUseCase({
      idGenerator: StubIdGenerator.create(),
      recipeRepository: InMemoryRecipeRepository.create(),
    }),
    listRecipes: listRecipesUseCase({
      recipeRepository: InMemoryRecipeRepository.create(),
    }),
  };

  return createStore({ ...defaults, ...overrides });
}
