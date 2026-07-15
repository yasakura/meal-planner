import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type CatalogueStatus = 'idle' | 'loading' | 'success' | 'error';

export type CatalogueState = {
  status: CatalogueStatus;
  recipes: Recipe[];
  error: string | null;
};

const initialState: CatalogueState = {
  status: 'idle',
  recipes: [],
  error: null,
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
      .addCase(loadCatalogue.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCatalogue.fulfilled, (state, action) => {
        state.status = 'success';
        // Recipe est deeply-readonly (invariant domaine) ; on l'expose tel quel
        // dans le draft Immer via un cast vers le type du champ ciblé.
        state.recipes = action.payload as typeof state.recipes;
        state.error = null;
      })
      .addCase(loadCatalogue.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? null;
      });
  },
});

export const catalogueReducer = catalogueSlice.reducer;

export const selectCatalogue = (state: RootState): CatalogueState => state.catalogue;
