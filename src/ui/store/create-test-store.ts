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
import { createCalendarDate } from '../../domain/entities/calendar-date';
import { DriftingClock } from '../../domain/test-doubles/drifting-clock';
import { InMemoryConviveRepository } from '../../domain/test-doubles/in-memory-convive-repository';
import { InMemoryMenuRepository } from '../../domain/test-doubles/in-memory-menu-repository';
import { InMemoryRecipeRepository } from '../../domain/test-doubles/in-memory-recipe-repository';
import { StubAuthGateway } from '../../domain/test-doubles/stub-auth-gateway';
import { StubIdGenerator } from '../../domain/test-doubles/stub-id-generator';
import { type AppDependencies, createStore } from './store';

export function createTestStore(overrides?: Partial<AppDependencies>) {
  const conviveRepository = InMemoryConviveRepository.create();
  const recipeRepository = InMemoryRecipeRepository.create();
  const menuRepository = InMemoryMenuRepository.create();
  const clock = DriftingClock.startingOn(createCalendarDate({ year: 2026, month: 8, day: 23 }));
  const defaults: AppDependencies = {
    authGateway: StubAuthGateway.withoutSession(),
    clock,
    createRecipe: createRecipeUseCase({ recipeRepository }),
    newRecipeId: newRecipeIdUseCase({ idGenerator: StubIdGenerator.create() }),
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
    newConviveId: newConviveIdUseCase({ idGenerator: StubIdGenerator.create() }),
    renameConvive: renameConviveUseCase({ conviveRepository }),
    removeConvive: removeConviveUseCase({ conviveRepository }),
  };

  return createStore({ ...defaults, ...overrides });
}
