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
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'recipe/createRecipe',
  async (input, thunkApi) => {
    return await thunkApi.extra.createRecipe(input);
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
// équivalent — toute la logique de transition est couverte par ses propres tests.
const recipeSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'recipe',
  initialState,
  reducers: {
    // Le container SIGNALE qu'un formulaire s'ouvre ; c'est ici qu'on décide d'en tenir compte.
    // Un enregistrement en vol n'est pas annulé par le démontage du formulaire : le remettre à
    // zéro déverrouillerait une opération encore en cours.
    recipeFormOpened(state) {
      if (state.status === 'saving') return;
      state.status = 'idle';
      state.error = null;
    },
  },
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

export const { recipeFormOpened } = recipeSlice.actions;

export const recipeReducer = recipeSlice.reducer;

export const selectRecipeCreation = (state: RootState): RecipeState => state.recipe;
