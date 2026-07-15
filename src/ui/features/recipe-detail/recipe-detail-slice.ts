import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type RecipeDetailStatus = 'idle' | 'loading' | 'success' | 'notFound' | 'error';

export type RecipeDetailState = {
  status: RecipeDetailStatus;
  recipe: Recipe | null;
  error: string | null;
};

const initialState: RecipeDetailState = {
  status: 'idle',
  recipe: null,
  error: null,
};

export const loadRecipeDetail = createAsyncThunk<Recipe | undefined, string, AppThunkApiConfig>(
  'recipeDetail/loadRecipeDetail',
  async (id, thunkApi) => {
    return await thunkApi.extra.getRecipe(id);
  },
);

const recipeDetailSlice = createSlice({
  name: 'recipeDetail',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadRecipeDetail.pending, (state) => {
        state.status = 'loading';
        state.recipe = null;
        state.error = null;
      })
      .addCase(loadRecipeDetail.fulfilled, (state, action) => {
        if (action.payload === undefined) {
          state.status = 'notFound';
          state.recipe = null;
          state.error = null;
          return;
        }
        state.status = 'success';
        // Recipe est deeply-readonly (invariant domaine) ; on l'expose tel quel
        // dans le draft Immer via un cast vers le type du champ ciblé.
        state.recipe = action.payload as typeof state.recipe;
        state.error = null;
      })
      .addCase(loadRecipeDetail.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? null;
      });
  },
});

export const recipeDetailReducer = recipeDetailSlice.reducer;

export const selectRecipeDetail = (state: RootState): RecipeDetailState => state.recipeDetail;
