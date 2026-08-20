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

// Helper de test (pas une classe constructible) : fournit des défauts stub pour
// TOUTES les deps du store, écrasables au cas par cas via `overrides`.
export function createTestStore(overrides?: Partial<AppDependencies>) {
  // Comme en prod (create-app-store) et en e2e (create-e2e-store) : UN seul repository par
  // agrégat, partagé par tous ses use-cases. Un dépôt par use-case rend « écrire puis relire »
  // faussement vert côté convives, et faussement ROUGE côté recettes — sans indice sur la cause.
  const conviveRepository = InMemoryConviveRepository.create();
  const recipeRepository = InMemoryRecipeRepository.create();
  const menuRepository = InMemoryMenuRepository.create();
  // Horloge partie d'un DIMANCHE (23 août 2026), et qui dérive d'un jour par lecture comme le
  // port l'autorise. Le dimanche interdit de confondre « prochain lundi » avec « aujourd'hui » ;
  // la dérive interdit de mémoriser la première lecture. UNE instance, partagée par le prochain
  // lundi et par le plancher de la date de début : c'est cette dérive commune qui rend visible
  // une horloge qu'on aurait cessé de relire.
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
    // La MÊME horloge dérivante que partout ailleurs : la borne de rétention se relit à chaque
    // enregistrement, et une seconde horloge masquerait une borne qu'on aurait cessé de relire.
    saveMenu: saveMenuUseCase({ menuRepository, clock }),
    listConvives: listConvivesUseCase({ conviveRepository }),
    addConvive: addConviveUseCase({ conviveRepository }),
    newConviveId: newConviveIdUseCase({ idGenerator: StubIdGenerator.create() }),
    renameConvive: renameConviveUseCase({ conviveRepository }),
    removeConvive: removeConviveUseCase({ conviveRepository }),
  };

  return createStore({ ...defaults, ...overrides });
}
