import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type RecipeCreationStatus = 'idle' | 'saving' | 'success' | 'error';

export type RecipeState = {
  status: RecipeCreationStatus;
  error: string | null;
};

const initialState: RecipeState = {
  status: 'idle',
  error: null,
};

export const createRecipe = createAsyncThunk<Recipe, CreateRecipeInput, AppThunkApiConfig>(
  'recipe/createRecipe',
  async (input, thunkApi) => {
    return await thunkApi.extra.createRecipe(input);
  },
);

const recipeSlice = createSlice({
  name: 'recipe',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createRecipe.pending, (state) => {
        state.status = 'saving';
        state.error = null;
      })
      .addCase(createRecipe.fulfilled, (state) => {
        state.status = 'success';
        state.error = null;
      })
      .addCase(createRecipe.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? null;
      });
  },
});

export const recipeReducer = recipeSlice.reducer;

export const selectRecipeCreation = (state: RootState): RecipeState => state.recipe;
