import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type CatalogueStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export type CatalogueState = {
  status: CatalogueStatus;
  recipes: Recipe[];
  error: string | null;
  latestRequestId: string | null;
};

const initialState: CatalogueState = {
  status: 'idle',
  recipes: [],
  error: null,
  latestRequestId: null,
};

export const loadCatalogue = createAsyncThunk<Recipe[], void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'catalogue/loadCatalogue',
  async (_, thunkApi) => {
    return await thunkApi.extra.listRecipes();
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const catalogueSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'catalogue',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCatalogue.pending, (state, action) => {
        state.latestRequestId = action.meta.requestId;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCatalogue.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return;
        state.status = 'success';
        state.recipes = action.payload as typeof state.recipes;
        state.error = null;
      })
      .addCase(loadCatalogue.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return;
        if (isRepositoryUnavailable(action.error)) {
          state.status = 'unavailable';
          state.error = null;
          return;
        }
        state.status = 'error';
        state.error = action.error.message ?? null;
      });
  },
});

export const catalogueReducer = catalogueSlice.reducer;

export const selectCatalogue = (state: RootState): CatalogueState => state.catalogue;
