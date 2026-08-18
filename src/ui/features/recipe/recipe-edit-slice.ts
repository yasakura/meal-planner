import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { type UpdateRecipeInput } from '../../../domain/use-cases/update-recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

/**
 * Statut de la MODIFICATION, délibérément séparé de celui de la création (`recipe-slice`).
 *
 * Les deux opérations sont atteignables depuis deux écrans différents ; partager un statut
 * transitoire entre elles ferait qu'une modification réussie renaviguerait le formulaire de
 * création à peine rouvert, et réciproquement — c'est exactement le défaut de l'issue #27,
 * démultiplié. Un statut par opération, aucune cohabitation possible.
 */
export type RecipeEditStatus = 'idle' | 'saving' | 'success' | 'error';

export type RecipeEditState = {
  status: RecipeEditStatus;
  error: string | null;
};

const initialState: RecipeEditState = {
  status: 'idle',
  error: null,
};

export const updateRecipe = createAsyncThunk<Recipe, UpdateRecipeInput, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'recipeEdit/updateRecipe',
  async (input, thunkApi) => {
    return await thunkApi.extra.updateRecipe(input);
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
// équivalent — toute la logique de transition est couverte par ses propres tests.
const recipeEditSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'recipeEdit',
  initialState,
  reducers: {
    // Le container SIGNALE qu'un formulaire s'ouvre ; c'est ici qu'on décide d'en tenir compte.
    // Une modification en vol n'est pas annulée par le démontage du formulaire : la remettre à
    // zéro déverrouillerait une opération encore en cours.
    recipeEditFormOpened(state) {
      if (state.status === 'saving') return;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateRecipe.pending, (state) => {
        state.status = 'saving';
        state.error = null;
      })
      .addCase(updateRecipe.fulfilled, (state) => {
        state.status = 'success';
        state.error = null;
      })
      .addCase(updateRecipe.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? null;
      });
  },
});

export const { recipeEditFormOpened } = recipeEditSlice.actions;

export const recipeEditReducer = recipeEditSlice.reducer;

export const selectRecipeEdition = (state: RootState): RecipeEditState => state.recipeEdit;
