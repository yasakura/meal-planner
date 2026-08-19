import { auth, db } from '../../config/firebase';
import { FirebaseAuthGateway } from '../../data/firebase-auth-gateway';
import { FirestoreConviveRepository } from '../../data/firestore-convive-repository';
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
import { nextMondayUseCase } from '../../domain/use-cases/next-monday';
import { removeConviveUseCase } from '../../domain/use-cases/remove-convive';
import { renameConviveUseCase } from '../../domain/use-cases/rename-convive';
import { updateRecipeUseCase } from '../../domain/use-cases/update-recipe';
import { createStore } from './store';

// Composition root : la couche ui/ est la seule autorisée à câbler les adapters
// data/ dans le store (les autres couches restent découplées via les ports).
export function createAppStore() {
  const recipeRepository = FirestoreRecipeRepository.create(db);
  const conviveRepository = FirestoreConviveRepository.create(db);
  return createStore({
    authGateway: FirebaseAuthGateway.create(auth),
    createRecipe: createRecipeUseCase({
      idGenerator: IdGeneratorCuid2.create(),
      recipeRepository,
    }),
    updateRecipe: updateRecipeUseCase({ recipeRepository }),
    listRecipes: listRecipesUseCase({ recipeRepository }),
    getRecipe: getRecipeUseCase({ recipeRepository }),
    generateMenu: generateMenuUseCase({
      recipeRepository,
      randomPicker: MathRandomPicker.create(),
    }),
    nextMonday: nextMondayUseCase({ clock: SystemClock.create() }),
    listConvives: listConvivesUseCase({ conviveRepository }),
    addConvive: addConviveUseCase({
      idGenerator: IdGeneratorCuid2.create(),
      conviveRepository,
    }),
    renameConvive: renameConviveUseCase({ conviveRepository }),
    removeConvive: removeConviveUseCase({ conviveRepository }),
  });
}
