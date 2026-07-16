import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { type AuthGateway } from '../../domain/ports/auth-gateway';
import { type CreateRecipe } from '../../domain/use-cases/create-recipe';
import { type GenerateMenu } from '../../domain/use-cases/generate-menu';
import { type GetRecipe } from '../../domain/use-cases/get-recipe';
import { type ListRecipes } from '../../domain/use-cases/list-recipes';
import { authReducer } from '../features/auth/auth-slice';
import { catalogueReducer } from '../features/catalogue/catalogue-slice';
import { menuReducer } from '../features/menu/menu-slice';
import { recipeDetailReducer } from '../features/recipe-detail/recipe-detail-slice';
import { recipeReducer } from '../features/recipe/recipe-slice';

export type AppDependencies = {
  authGateway: AuthGateway;
  createRecipe: CreateRecipe;
  listRecipes: ListRecipes;
  getRecipe: GetRecipe;
  generateMenu: GenerateMenu;
};

const rootReducer = combineReducers({
  auth: authReducer,
  recipe: recipeReducer,
  catalogue: catalogueReducer,
  recipeDetail: recipeDetailReducer,
  menu: menuReducer,
});

export function createStore(dependencies: AppDependencies) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: dependencies } }),
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];

export type AppThunkApiConfig = {
  state: RootState;
  dispatch: AppDispatch;
  extra: AppDependencies;
};
