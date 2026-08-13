import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

// `unavailable` : le dépôt n'a pas répondu. Ni un catalogue vide, ni un échec de chargement —
// les trois appellent trois constats différents à l'écran.
export type CatalogueStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export type CatalogueState = {
  status: CatalogueStatus;
  recipes: Recipe[];
  error: string | null;
  /**
   * requestId du DERNIER chargement lancé. Plomberie de dispatch : aucun écran ne le lit.
   *
   * Un thunk RTK n'est PAS annulé par le démontage de son container. Quitter la route
   * pendant un chargement lent puis y revenir laisse donc la première requête en vol, et sa
   * réponse tardive arrive après celle du chargement courant. Sans cette mémoire, elle
   * écrase un catalogue à jour — et depuis l'ajout de `unavailable`, elle l'écrase par un
   * constat hors-ligne qui ne propose même pas « Réessayer ».
   *
   * Volontairement PAS remis à null au règlement : le champ signifie « dernière requête
   * lancée », pas « requête en vol ». Le remettre à null ouvrirait exactement le trou qu'on
   * ferme — une réponse tardive arrivant après le règlement du chargement courant ne
   * correspondrait alors plus à rien et serait acceptée.
   */
  latestRequestId: string | null;
};

const initialState: CatalogueState = {
  status: 'idle',
  recipes: [],
  error: null,
  latestRequestId: null,
};

export const loadCatalogue = createAsyncThunk<Recipe[], void, AppThunkApiConfig>(
  'catalogue/loadCatalogue',
  async (_, thunkApi) => {
    return await thunkApi.extra.listRecipes();
  },
);

const catalogueSlice = createSlice({
  name: 'catalogue',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCatalogue.pending, (state, action) => {
        // Le dernier chargement lancé prend la main : c'est celui que l'utilisateur attend.
        state.latestRequestId = action.meta.requestId;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCatalogue.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return;
        state.status = 'success';
        // Recipe est deeply-readonly (invariant domaine) ; on l'expose tel quel
        // dans le draft Immer via un cast vers le type du champ ciblé.
        state.recipes = action.payload as typeof state.recipes;
        state.error = null;
      })
      .addCase(loadCatalogue.rejected, (state, action) => {
        // Un échec périmé ne dit rien de l'état courant : il est jeté avant tout examen.
        if (action.meta.requestId !== state.latestRequestId) return;
        // `action.error` est une copie plate (miniSerializeError) : le garde du domaine est
        // nominal précisément pour rester lisible ici.
        // `recipes` n'est pas vidé : l'indisponibilité porte sur le status, pas sur ce qu'on
        // savait déjà. `error` retombe à null pour qu'aucun écran ne puisse afficher le
        // constat hors-ligne à côté d'un message d'échec périmé.
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
