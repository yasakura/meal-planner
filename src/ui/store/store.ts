import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { type AuthGateway } from '../../domain/ports/auth-gateway';
import { authReducer } from '../features/auth/auth-slice';

export type AppDependencies = {
  authGateway: AuthGateway;
};

const rootReducer = combineReducers({
  auth: authReducer,
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
