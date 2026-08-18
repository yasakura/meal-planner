import { MathRandomPicker } from '../../data/math-random-picker';
import { addConviveUseCase } from '../../domain/use-cases/add-convive';
import { createRecipeUseCase } from '../../domain/use-cases/create-recipe';
import { generateMenuUseCase } from '../../domain/use-cases/generate-menu';
import { getRecipeUseCase } from '../../domain/use-cases/get-recipe';
import { listConvivesUseCase } from '../../domain/use-cases/list-convives';
import { listRecipesUseCase } from '../../domain/use-cases/list-recipes';
import { removeConviveUseCase } from '../../domain/use-cases/remove-convive';
import { renameConviveUseCase } from '../../domain/use-cases/rename-convive';
import { updateRecipeUseCase } from '../../domain/use-cases/update-recipe';
import { InMemoryConviveRepository } from '../../domain/test-doubles/in-memory-convive-repository';
import { InMemoryRecipeRepository } from '../../domain/test-doubles/in-memory-recipe-repository';
import { StubAuthGateway } from '../../domain/test-doubles/stub-auth-gateway';
import { StubIdGenerator } from '../../domain/test-doubles/stub-id-generator';
import { type AppDependencies, createStore } from './store';

// Helper de test (pas une classe constructible) : fournit des défauts stub pour
// TOUTES les deps du store, écrasables au cas par cas via `overrides`.
export function createTestStore(overrides?: Partial<AppDependencies>) {
  // Comme en prod (create-app-store) et en e2e (create-e2e-store) : UN seul repository par
  // agrégat, partagé par tous ses use-cases. Un dépôt par use-case rend « écrire puis relire »
  // faussement vert côté convives, et faussement ROUGE côté recettes — sans indice sur la cause.
  const conviveRepository = InMemoryConviveRepository.create();
  const recipeRepository = InMemoryRecipeRepository.create();
  const defaults: AppDependencies = {
    authGateway: StubAuthGateway.withoutSession(),
    createRecipe: createRecipeUseCase({
      idGenerator: StubIdGenerator.create(),
      recipeRepository,
    }),
    updateRecipe: updateRecipeUseCase({ recipeRepository }),
    listRecipes: listRecipesUseCase({ recipeRepository }),
    getRecipe: getRecipeUseCase({ recipeRepository }),
    generateMenu: generateMenuUseCase({
      recipeRepository,
      randomPicker: MathRandomPicker.create(() => 0),
    }),
    listConvives: listConvivesUseCase({ conviveRepository }),
    addConvive: addConviveUseCase({
      idGenerator: StubIdGenerator.create(),
      conviveRepository,
    }),
    renameConvive: renameConviveUseCase({ conviveRepository }),
    removeConvive: removeConviveUseCase({ conviveRepository }),
  };

  return createStore({ ...defaults, ...overrides });
}
