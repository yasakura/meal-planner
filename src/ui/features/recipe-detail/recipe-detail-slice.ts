import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type RecipeDetailStatus =
  'idle' | 'loading' | 'success' | 'notFound' | 'error' | 'unavailable';

export type RecipeDetailState = {
  status: RecipeDetailStatus;
  recipe: Recipe | null;
  error: string | null;
  latestRequestId: string | null;
};

const initialState: RecipeDetailState = {
  status: 'idle',
  recipe: null,
  error: null,
  latestRequestId: null,
};

export const loadRecipeDetail = createAsyncThunk<Recipe | undefined, string, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'recipeDetail/loadRecipeDetail',
  async (id, thunkApi) => {
    return await thunkApi.extra.getRecipe(id);
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const recipeDetailSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'recipeDetail',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadRecipeDetail.pending, (state, action) => {
        state.latestRequestId = action.meta.requestId;
        state.status = 'loading';
        state.recipe = null;
        state.error = null;
      })
      .addCase(loadRecipeDetail.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return;
        if (action.payload === undefined) {
          state.status = 'notFound';
          state.recipe = null;
          state.error = null;
          return;
        }
        state.status = 'success';
        state.recipe = action.payload as typeof state.recipe;
        state.error = null;
      })
      .addCase(loadRecipeDetail.rejected, (state, action) => {
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

export const recipeDetailReducer = recipeDetailSlice.reducer;

export const selectRecipeDetail = (state: RootState): RecipeDetailState => state.recipeDetail;
