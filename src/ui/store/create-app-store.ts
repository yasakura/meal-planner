import { auth, db } from '../../config/firebase';
import { FirebaseAuthGateway } from '../../data/firebase-auth-gateway';
import { FirestoreRecipeRepository } from '../../data/firestore-recipe-repository';
import { IdGeneratorCuid2 } from '../../data/id-generator-cuid2';
import { MathRandomPicker } from '../../data/math-random-picker';
import { createRecipeUseCase } from '../../domain/use-cases/create-recipe';
import { generateMenuUseCase } from '../../domain/use-cases/generate-menu';
import { getRecipeUseCase } from '../../domain/use-cases/get-recipe';
import { listRecipesUseCase } from '../../domain/use-cases/list-recipes';
import { createStore } from './store';

// Composition root : la couche ui/ est la seule autorisée à câbler les adapters
// data/ dans le store (les autres couches restent découplées via les ports).
export function createAppStore() {
  const recipeRepository = FirestoreRecipeRepository.create(db);
  return createStore({
    authGateway: FirebaseAuthGateway.create(auth),
    createRecipe: createRecipeUseCase({
      idGenerator: IdGeneratorCuid2.create(),
      recipeRepository,
    }),
    listRecipes: listRecipesUseCase({ recipeRepository }),
    getRecipe: getRecipeUseCase({ recipeRepository }),
    generateMenu: generateMenuUseCase({
      recipeRepository,
      randomPicker: MathRandomPicker.create(),
    }),
  });
}
