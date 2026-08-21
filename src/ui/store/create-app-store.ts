import { auth, db } from '../../config/firebase';
import { FirebaseAuthGateway } from '../../data/firebase-auth-gateway';
import { FirestoreConviveRepository } from '../../data/firestore-convive-repository';
import { FirestoreMenuRepository } from '../../data/firestore-menu-repository';
import { FirestoreRecipeRepository } from '../../data/firestore-recipe-repository';
import { IdGeneratorCuid2 } from '../../data/id-generator-cuid2';
import { MathRandomPicker } from '../../data/math-random-picker';
import { SystemClock } from '../../data/system-clock';
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
import { createStore } from './store';

export function createAppStore() {
  const recipeRepository = FirestoreRecipeRepository.create(db);
  const conviveRepository = FirestoreConviveRepository.create(db);
  const menuRepository = FirestoreMenuRepository.create(db);
  const clock = SystemClock.create();
  return createStore({
    authGateway: FirebaseAuthGateway.create(auth),
    clock,
    createRecipe: createRecipeUseCase({ recipeRepository }),
    newRecipeId: newRecipeIdUseCase({ idGenerator: IdGeneratorCuid2.create() }),
    updateRecipe: updateRecipeUseCase({ recipeRepository }),
    listRecipes: listRecipesUseCase({ recipeRepository }),
    getRecipe: getRecipeUseCase({ recipeRepository }),
    generateMenu: generateMenuUseCase({
      recipeRepository,
      randomPicker: MathRandomPicker.create(),
    }),
    nextMonday: nextMondayUseCase({ clock }),
    saveMenu: saveMenuUseCase({ menuRepository, clock }),
    listConvives: listConvivesUseCase({ conviveRepository }),
    addConvive: addConviveUseCase({ conviveRepository }),
    newConviveId: newConviveIdUseCase({ idGenerator: IdGeneratorCuid2.create() }),
    renameConvive: renameConviveUseCase({ conviveRepository }),
    removeConvive: removeConviveUseCase({ conviveRepository }),
  });
}
