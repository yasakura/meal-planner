import {
  combineReducers,
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';

import { type AuthGateway } from '../../domain/ports/auth-gateway';
import { type Clock } from '../../domain/ports/clock';
import { type AddConvive } from '../../domain/use-cases/add-convive';
import { type CreateRecipe } from '../../domain/use-cases/create-recipe';
import { type GenerateMenu } from '../../domain/use-cases/generate-menu';
import { type GetRecipe } from '../../domain/use-cases/get-recipe';
import { type ListConvives } from '../../domain/use-cases/list-convives';
import { type ListRecipes } from '../../domain/use-cases/list-recipes';
import { type NewConviveId } from '../../domain/use-cases/new-convive-id';
import { type NewRecipeId } from '../../domain/use-cases/new-recipe-id';
import { type NextMonday } from '../../domain/use-cases/next-monday';
import { type RemoveConvive } from '../../domain/use-cases/remove-convive';
import { type RenameConvive } from '../../domain/use-cases/rename-convive';
import { type SaveMenu } from '../../domain/use-cases/save-menu';
import { type UpdateRecipe } from '../../domain/use-cases/update-recipe';
import { authReducer } from '../features/auth/auth-slice';
import { catalogueReducer } from '../features/catalogue/catalogue-slice';
import { convivesInitialState, convivesReducer } from '../features/convives/convives-slice';
import { menuInitialState, menuReducer } from '../features/menu/menu-slice';
import { recipeDetailReducer } from '../features/recipe-detail/recipe-detail-slice';
import { recipeEditReducer } from '../features/recipe/recipe-edit-slice';
import { recipeInitialState, recipeReducer } from '../features/recipe/recipe-slice';

export type AppDependencies = {
  authGateway: AuthGateway;
  /**
   * Le jour courant, relu à CHAQUE fois qu'une décision en dépend. Le port lui-même, et non un
   * use-case : il n'y a rien à décider ici, seulement à lire — et le plancher de la date de
   * début se lit après la naissance du store, à un moment où seule une dépendance injectée
   * peut encore répondre.
   */
  clock: Clock;
  createRecipe: CreateRecipe;
  /**
   * L'identifiant du document qu'un formulaire de création écrira, demandé à son OUVERTURE. Le
   * use-case, et non le port `IdGenerator` : les identifiants naissent dans `domain/`, et un
   * slice qui appellerait le port directement le contournerait.
   */
  newRecipeId: NewRecipeId;
  updateRecipe: UpdateRecipe;
  listRecipes: ListRecipes;
  getRecipe: GetRecipe;
  generateMenu: GenerateMenu;
  nextMonday: NextMonday;
  /**
   * Le USE-CASE, pas le dépôt : c'est lui qui porte la règle de rétention (fenêtre glissante de
   * deux mois), et un slice qui appellerait le dépôt directement la contournerait.
   */
  saveMenu: SaveMenu;
  listConvives: ListConvives;
  addConvive: AddConvive;
  /**
   * L'identifiant du document qu'un ajout de convive écrira, demandé à l'OUVERTURE du
   * formulaire. Le use-case, et non le port `IdGenerator` : les identifiants naissent dans
   * `domain/`, et un slice qui appellerait le port directement le contournerait.
   */
  newConviveId: NewConviveId;
  renameConvive: RenameConvive;
  removeConvive: RemoveConvive;
};

const rootReducer = combineReducers({
  auth: authReducer,
  recipe: recipeReducer,
  recipeEdit: recipeEditReducer,
  catalogue: catalogueReducer,
  recipeDetail: recipeDetailReducer,
  menu: menuReducer,
  convives: convivesReducer,
});

export function createStore(dependencies: AppDependencies) {
  return configureStore({
    reducer: rootReducer,
    // Le menu naît avec sa date de début : le prochain lundi, lu UNE fois ici. `initialState`
    // est statique et ne peut appeler aucun port ; c'est le seul endroit où le store dispose
    // à la fois de ses dépendances et de son état de départ. Corollaire recherché : l'horloge
    // n'est jamais relue au montage d'un écran, donc la date par défaut ne dérive pas d'un
    // aller-retour à l'autre (le port `Clock` ne promet rien entre deux lectures).
    // Le plancher initial est lu ICI aussi : sans lui, le champ natif naîtrait sans `min` et
    // proposerait le passé le temps d'un premier rendu.
    // Le menu naît avec sa date de début, la création de recette avec l'identifiant de son
    // premier formulaire : deux valeurs qu'un `initialState` statique ne peut pas produire, et
    // dont la naissance du store est le seul moment où les dépendances sont là pour les rendre.
    preloadedState: {
      menu: menuInitialState(dependencies.nextMonday(), dependencies.clock.today()),
      recipe: recipeInitialState(dependencies.newRecipeId()),
      convives: convivesInitialState(dependencies.newConviveId()),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: dependencies } }),
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];

/**
 * Un thunk qui ne fait que LIRE une dépendance injectée pour la donner à un reducer — la forme
 * des gestes dont la décision est pure mais dont la donnée d'entrée ne l'est pas (le jour
 * courant). Rien à attendre, rien à rejeter : `createAsyncThunk` réglerait son action dans une
 * micro-tâche, alors que le geste de l'utilisateur, lui, est immédiat.
 */
export type AppThunk = ThunkAction<void, RootState, AppDependencies, UnknownAction>;

export type AppThunkApiConfig = {
  state: RootState;
  dispatch: AppDispatch;
  extra: AppDependencies;
};
