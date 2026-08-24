import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type Unsubscribe } from '../../../domain/ports/unsubscribe';
import { type AppDependencies, type AppDispatch, type RootState } from '../../store/store';
import { authStateChanged } from '../auth/auth-slice';

export type CatalogueFailure = 'unreadable' | 'unavailable';

export type CatalogueState = {
  recipes: Recipe[] | null;
  failure: CatalogueFailure | null;
  attempt: number;
};

const initialState: CatalogueState = {
  recipes: null,
  failure: null,
  attempt: 0,
};

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const catalogueSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'catalogue',
  initialState,
  reducers: {
    recipesObserved(state, action: PayloadAction<Recipe[]>) {
      state.recipes = action.payload as typeof state.recipes;
      state.failure = null;
    },
    recipesObservationFailed(state, action: PayloadAction<{ unavailable: boolean }>) {
      state.failure = action.payload.unavailable ? 'unavailable' : 'unreadable';
    },
    catalogueRetried(state) {
      state.failure = null;
      state.attempt += 1;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(authStateChanged, (state, action) => {
      if (action.payload !== null) return;
      state.recipes = null;
      state.failure = null;
      state.attempt = 0;
    });
  },
});

export const catalogueReducer = catalogueSlice.reducer;

export const { catalogueRetried, recipesObservationFailed, recipesObserved } =
  catalogueSlice.actions;

export const observeRecipes =
  () =>
  (dispatch: AppDispatch, _getState: () => RootState, extra: AppDependencies): Unsubscribe =>
    extra.observeRecipes(
      (recipes) => dispatch(recipesObserved(recipes)),
      (error) =>
        dispatch(recipesObservationFailed({ unavailable: isRepositoryUnavailable(error) })),
    );

export const selectCatalogue = (state: RootState): CatalogueState => state.catalogue;

export const selectCatalogueAttempt = (state: RootState): number => state.catalogue.attempt;

export const selectCatalogueLinkLost = (state: RootState): boolean =>
  state.catalogue.recipes !== null && state.catalogue.failure !== null;

export type CatalogueView =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unavailable' }
  | { status: 'empty' }
  | { status: 'loaded'; recipes: Recipe[] };

export function catalogueViewOf(state: CatalogueState): CatalogueView {
  if (state.recipes !== null) {
    return state.recipes.length === 0
      ? { status: 'empty' }
      : { status: 'loaded', recipes: state.recipes };
  }
  if (state.failure === 'unavailable') return { status: 'unavailable' };
  if (state.failure === 'unreadable') return { status: 'error' };
  return { status: 'loading' };
}
