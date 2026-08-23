import {
  combineReducers,
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';

import { type AuthGateway } from '../../domain/ports/auth-gateway';
import { type Clock } from '../../domain/ports/clock';
import { type AddConvive } from '../../domain/use-cases/add-convive';
import { type BrowseMenus } from '../../domain/use-cases/browse-menus';
import { type CreateRecipe } from '../../domain/use-cases/create-recipe';
import { type GenerateMenu } from '../../domain/use-cases/generate-menu';
import { type ListConvives } from '../../domain/use-cases/list-convives';
import { type ListRecipes } from '../../domain/use-cases/list-recipes';
import { type NewConviveId } from '../../domain/use-cases/new-convive-id';
import { type ObserveRecipes } from '../../domain/use-cases/observe-recipes';
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
import { savedMenusReducer } from '../features/menu/saved-menus-slice';
import { recipeEditReducer } from '../features/recipe/recipe-edit-slice';
import { recipeInitialState, recipeReducer } from '../features/recipe/recipe-slice';

export type AppDependencies = {
  authGateway: AuthGateway;
  clock: Clock;
  createRecipe: CreateRecipe;
  newRecipeId: NewRecipeId;
  updateRecipe: UpdateRecipe;
  listRecipes: ListRecipes;
  observeRecipes: ObserveRecipes;
  generateMenu: GenerateMenu;
  browseMenus: BrowseMenus;
  nextMonday: NextMonday;
  saveMenu: SaveMenu;
  listConvives: ListConvives;
  addConvive: AddConvive;
  newConviveId: NewConviveId;
  renameConvive: RenameConvive;
  removeConvive: RemoveConvive;
};

const rootReducer = combineReducers({
  auth: authReducer,
  recipe: recipeReducer,
  recipeEdit: recipeEditReducer,
  catalogue: catalogueReducer,
  menu: menuReducer,
  savedMenus: savedMenusReducer,
  convives: convivesReducer,
});

export function createStore(dependencies: AppDependencies) {
  return configureStore({
    reducer: rootReducer,
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

export type AppThunk = ThunkAction<void, RootState, AppDependencies, UnknownAction>;

export type AppThunkAsync = ThunkAction<Promise<void>, RootState, AppDependencies, UnknownAction>;

export type AppThunkApiConfig = {
  state: RootState;
  dispatch: AppDispatch;
  extra: AppDependencies;
};
