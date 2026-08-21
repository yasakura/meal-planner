import { E2eAuthGateway } from '../../data/e2e/e2e-auth-gateway';
import { E2eConviveRepository } from '../../data/e2e/e2e-convive-repository';
import { type E2eControls, E2eFailureSwitch } from '../../data/e2e/e2e-failure-switch';
import { E2eClock } from '../../data/e2e/e2e-clock';
import { E2E_ACCOUNT, E2E_TODAY } from '../../data/e2e/e2e-fixtures';
import { E2eMenuRepository } from '../../data/e2e/e2e-menu-repository';
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
import { newConviveIdUseCase } from '../../domain/use-cases/new-convive-id';
import { newRecipeIdUseCase } from '../../domain/use-cases/new-recipe-id';
import { nextMondayUseCase } from '../../domain/use-cases/next-monday';
import { removeConviveUseCase } from '../../domain/use-cases/remove-convive';
import { renameConviveUseCase } from '../../domain/use-cases/rename-convive';
import { saveMenuUseCase } from '../../domain/use-cases/save-menu';
import { updateRecipeUseCase } from '../../domain/use-cases/update-recipe';
import { type AppStore, createStore } from './store';

export type E2eHost = { location: { search: string } };

export function createE2eStore(host: E2eHost): AppStore {
  const seed = readE2eSeed(host.location.search);
  const failures = E2eFailureSwitch.create();
  const recipeRepository = E2eRecipeRepository.seededWith(seed.recipes, failures);
  const conviveRepository = E2eConviveRepository.seededWith(seed.convives, failures);
  const menuRepository = E2eMenuRepository.startingEmpty(failures);

  (host as E2eHost & { __e2e?: E2eControls }).__e2e = failures;

  const clock = E2eClock.on(E2E_TODAY);

  return createStore({
    authGateway: E2eAuthGateway.signedInAs(E2E_ACCOUNT),
    clock,
    createRecipe: createRecipeUseCase({ recipeRepository }),
    newRecipeId: newRecipeIdUseCase({
      idGenerator: SequentialIdGenerator.withPrefix('e2e-recipe'),
    }),
    updateRecipe: updateRecipeUseCase({ recipeRepository }),
    listRecipes: listRecipesUseCase({ recipeRepository }),
    getRecipe: getRecipeUseCase({ recipeRepository }),
    generateMenu: generateMenuUseCase({
      recipeRepository,
      randomPicker: MathRandomPicker.create(() => 0),
    }),
    nextMonday: nextMondayUseCase({ clock }),
    saveMenu: saveMenuUseCase({ menuRepository, clock }),
    listConvives: listConvivesUseCase({ conviveRepository }),
    addConvive: addConviveUseCase({ conviveRepository }),
    newConviveId: newConviveIdUseCase({
      idGenerator: SequentialIdGenerator.withPrefix('e2e-convive'),
    }),
    renameConvive: renameConviveUseCase({ conviveRepository }),
    removeConvive: removeConviveUseCase({ conviveRepository }),
  });
}
