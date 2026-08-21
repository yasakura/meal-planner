import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type UpdateRecipeInput } from '../../../domain/use-cases/update-recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';
import { RECIPE_SAVE_FAILED, RECIPE_SAVE_UNCONFIRMED, type RecipeFormNotice } from './recipe-slice';

export type RecipeEditStatus = 'idle' | 'saving' | 'success' | 'error' | 'unconfirmed';

export type RecipeEditState = {
  status: RecipeEditStatus;
};

const initialState: RecipeEditState = {
  status: 'idle',
};

export const updateRecipe = createAsyncThunk<Recipe, UpdateRecipeInput, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'recipeEdit/updateRecipe',
  async (input, thunkApi) => {
    return await thunkApi.extra.updateRecipe(input);
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const recipeEditSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'recipeEdit',
  initialState,
  reducers: {
    recipeEditFormOpened(state) {
      if (state.status === 'saving') return;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateRecipe.pending, (state) => {
        state.status = 'saving';
      })
      .addCase(updateRecipe.fulfilled, (state) => {
        state.status = 'success';
      })
      .addCase(updateRecipe.rejected, (state, action) => {
        state.status = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      });
  },
});

export const { recipeEditFormOpened } = recipeEditSlice.actions;

export const recipeEditReducer = recipeEditSlice.reducer;

export const selectRecipeEdition = (state: RootState): RecipeEditState => state.recipeEdit;

export function recipeEditNoticeOf(state: RecipeEditState): RecipeFormNotice | null {
  if (state.status === 'unconfirmed') {
    return { tone: 'unconfirmed', message: RECIPE_SAVE_UNCONFIRMED };
  }
  if (state.status === 'error') return { tone: 'error', message: RECIPE_SAVE_FAILED };
  return null;
}
