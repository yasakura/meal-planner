import { E2eAuthGateway } from '../../data/e2e/e2e-auth-gateway';
import { E2eConviveRepository } from '../../data/e2e/e2e-convive-repository';
import { type E2eControls, E2eFailureSwitch } from '../../data/e2e/e2e-failure-switch';
import { E2E_ACCOUNT } from '../../data/e2e/e2e-fixtures';
import { E2eRecipeRepository } from '../../data/e2e/e2e-recipe-repository';
import { readE2eSeed } from '../../data/e2e/e2e-seed';
import { SequentialIdGenerator } from '../../data/e2e/sequential-id-generator';
import { MathRandomPicker } from '../../data/math-random-picker';
import { addConviveUseCase } from '../../domain/use-cases/add-convive';
import { createRecipeUseCase } from '../../domain/use-cases/create-recipe';
import { generateMenuUseCase } from '../../domain/use-cases/generate-menu';
import { getRecipeUseCase } from '../../domain/use-cases/get-recipe';
import { listConvivesUseCase } from '../../domain/use-cases/list-convives';
import { listRecipesUseCase } from '../../domain/use-cases/list-recipes';
import { removeConviveUseCase } from '../../domain/use-cases/remove-convive';
import { renameConviveUseCase } from '../../domain/use-cases/rename-convive';
import { type AppStore, createStore } from './store';

/**
 * Ce dont le mode e2e a besoin de la fenêtre : lire l'état de départ demandé, et recevoir le
 * hook de pilotage. Type structurel, et non `Window` : les scénarios de test fournissent un
 * objet nu, et surtout `__e2e` n'entre JAMAIS dans le type global — du code de production qui
 * le lirait ne compilerait pas.
 */
export type E2eHost = { location: { search: string } };

export function createE2eStore(host: E2eHost): AppStore {
  const seed = readE2eSeed(host.location.search);
  const failures = E2eFailureSwitch.create();
  const recipeRepository = E2eRecipeRepository.seededWith(seed.recipes, failures);
  const conviveRepository = E2eConviveRepository.seededWith(seed.convives, failures);

  (host as E2eHost & { __e2e?: E2eControls }).__e2e = failures;

  return createStore({
    authGateway: E2eAuthGateway.signedInAs(E2E_ACCOUNT),
    createRecipe: createRecipeUseCase({
      idGenerator: SequentialIdGenerator.withPrefix('e2e-recipe'),
      recipeRepository,
    }),
    listRecipes: listRecipesUseCase({ recipeRepository }),
    getRecipe: getRecipeUseCase({ recipeRepository }),
    generateMenu: generateMenuUseCase({
      recipeRepository,
      randomPicker: MathRandomPicker.create(() => 0),
    }),
    listConvives: listConvivesUseCase({ conviveRepository }),
    addConvive: addConviveUseCase({
      idGenerator: SequentialIdGenerator.withPrefix('e2e-convive'),
      conviveRepository,
    }),
    renameConvive: renameConviveUseCase({ conviveRepository }),
    removeConvive: removeConviveUseCase({ conviveRepository }),
  });
}
