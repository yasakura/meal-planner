import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

// `unavailable` : le dépôt n'a pas répondu. Surtout pas `notFound`, qui affirmerait
// l'inexistence d'une recette qu'on n'a simplement pas pu lire.
export type RecipeDetailStatus =
  'idle' | 'loading' | 'success' | 'notFound' | 'error' | 'unavailable';

export type RecipeDetailState = {
  status: RecipeDetailStatus;
  recipe: Recipe | null;
  error: string | null;
  /**
   * requestId de la DERNIÈRE consultation lancée. Plomberie de dispatch : aucun écran ne le
   * lit.
   *
   * Un thunk RTK n'est PAS annulé par le démontage de son container. Ouvrir une recette sur
   * un réseau qui rame, revenir au catalogue, puis ouvrir une autre recette laisse la
   * première requête en vol : son rejet tardif affichait « Aucune connexion » par-dessus une
   * recette qui venait de se charger, réseau rétabli. Un succès tardif, lui, affichait
   * l'ANCIENNE recette sous l'URL de la nouvelle — faux sans rien signaler.
   *
   * Discriminer sur le requestId SUFFIT et est strictement plus fin que discriminer sur l'id
   * demandé : chaque dispatch reçoit un requestId unique, y compris deux consultations
   * successives de la même recette. Un test sur l'id seul laisserait passer la réponse
   * tardive du premier r-1 dans l'enchaînement r-1 → r-2 → r-1.
   *
   * Volontairement PAS remis à null au règlement : voir `catalogue-slice`, même raison.
   */
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
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'recipeDetail/loadRecipeDetail',
  async (id, thunkApi) => {
    return await thunkApi.extra.getRecipe(id);
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
// équivalent — toute la logique de transition est couverte par ses propres tests.
const recipeDetailSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'recipeDetail',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadRecipeDetail.pending, (state, action) => {
        // La dernière consultation lancée prend la main : c'est celle que l'utilisateur
        // attend, et celle dont l'URL est affichée.
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
        // Recipe est deeply-readonly (invariant domaine) ; on l'expose tel quel
        // dans le draft Immer via un cast vers le type du champ ciblé.
        state.recipe = action.payload as typeof state.recipe;
        state.error = null;
      })
      .addCase(loadRecipeDetail.rejected, (state, action) => {
        // Un échec périmé ne dit rien de la recette courante : il est jeté avant tout examen.
        if (action.meta.requestId !== state.latestRequestId) return;
        // `action.error` est une copie plate (miniSerializeError) : le garde du domaine est
        // nominal précisément pour rester lisible ici.
        // `error` retombe à null pour qu'aucun écran ne puisse afficher le constat
        // hors-ligne à côté du message d'échec périmé de la consultation précédente.
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
