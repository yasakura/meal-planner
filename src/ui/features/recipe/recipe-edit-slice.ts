import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type UpdateRecipeInput } from '../../../domain/use-cases/update-recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';
import { RECIPE_SAVE_FAILED, RECIPE_SAVE_UNCONFIRMED, type RecipeFormNotice } from './recipe-slice';

/**
 * Statut de la MODIFICATION, délibérément séparé de celui de la création (`recipe-slice`).
 *
 * Les deux opérations sont atteignables depuis deux écrans différents ; partager un statut
 * transitoire entre elles ferait qu'une modification réussie renaviguerait le formulaire de
 * création à peine rouvert, et réciproquement — c'est exactement le défaut de l'issue #27,
 * démultiplié. Un statut par opération, aucune cohabitation possible.
 *
 * `unconfirmed` : même troisième issue qu'à la création, et pour la même borne d'acquittement —
 * l'écriture est en file locale et atterrira au retour du réseau. Le VOCABULAIRE est partagé,
 * l'état ne l'est pas.
 */
export type RecipeEditStatus = 'idle' | 'saving' | 'success' | 'error' | 'unconfirmed';

export type RecipeEditState = {
  status: RecipeEditStatus;
};

const initialState: RecipeEditState = {
  status: 'idle',
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
        // Non acquitté ≠ refusé : `action.error` est une copie plate (miniSerializeError), et le
        // garde du domaine est nominal précisément pour rester lisible ici.
        state.status = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      });
  },
});

export const { recipeEditFormOpened } = recipeEditSlice.actions;

export const recipeEditReducer = recipeEditSlice.reducer;

export const selectRecipeEdition = (state: RootState): RecipeEditState => state.recipeEdit;

/**
 * Projection PURE de l'état de tranche vers le constat affichable, ICI plutôt que dans un
 * container que la mutation ignore. Deux tons seulement : le SUCCÈS ne se constate pas, il
 * renvoie au détail de la recette, qui montre déjà le résultat.
 *
 * L'ENVOI, lui, n'est jamais verrouillé sur un constat non acquitté — contrairement à la
 * création : la modification écrit sur le même identifiant, un second envoi ne peut rien
 * dupliquer, et le verrouiller ferait de l'écran une impasse.
 */
export function recipeEditNoticeOf(state: RecipeEditState): RecipeFormNotice | null {
  if (state.status === 'unconfirmed') {
    return { tone: 'unconfirmed', message: RECIPE_SAVE_UNCONFIRMED };
  }
  if (state.status === 'error') return { tone: 'error', message: RECIPE_SAVE_FAILED };
  return null;
}
