import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { type AuthGateway } from '../../domain/ports/auth-gateway';
import { type CreateRecipe } from '../../domain/use-cases/create-recipe';
import { authReducer } from '../features/auth/auth-slice';
import { recipeReducer } from '../features/recipe/recipe-slice';

export type AppDependencies = {
  authGateway: AuthGateway;
  createRecipe: CreateRecipe;
};

const rootReducer = combineReducers({
  auth: authReducer,
  recipe: recipeReducer,
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
