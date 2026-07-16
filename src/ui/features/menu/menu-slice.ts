import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Menu } from '../../../domain/entities/menu';
import { type Recipe } from '../../../domain/entities/recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type MenuStatus = 'idle' | 'loading' | 'success' | 'error';

export type MenuState = {
  status: MenuStatus;
  menu: Menu | null;
  recipes: Recipe[] | null;
  error: string | null;
};

const initialState: MenuState = {
  status: 'idle',
  menu: null,
  recipes: null,
  error: null,
};

// Discriminant d'erreur métier : catalogue vide → pas de menu possible.
export const NO_RECIPES = 'no-recipes';

export const generateMenu = createAsyncThunk<
  { menu: Menu; recipes: Recipe[] },
  number,
  AppThunkApiConfig & { rejectValue: string }
>('menu/generateMenu', async (days, thunkApi) => {
  // On récupère d'abord les recettes : elles servent à résoudre les titres ET à
  // distinguer explicitement le cas « catalogue vide » (message actionnable).
  const recipes = await thunkApi.extra.listRecipes();
  if (recipes.length === 0) {
    return thunkApi.rejectWithValue(NO_RECIPES);
  }
  const menu = await thunkApi.extra.generateMenu({ days });
  return { menu, recipes };
});

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(generateMenu.pending, (state) => {
        state.status = 'loading';
        state.menu = null;
        state.recipes = null;
        state.error = null;
      })
      .addCase(generateMenu.fulfilled, (state, action) => {
        state.status = 'success';
        // Menu et Recipe sont deeply-readonly (invariants domaine) ; on les expose
        // tels quels dans le draft Immer via un cast vers le type du champ ciblé.
        state.menu = action.payload.menu as typeof state.menu;
        state.recipes = action.payload.recipes as typeof state.recipes;
        state.error = null;
      })
      .addCase(generateMenu.rejected, (state, action) => {
        state.status = 'error';
        // menu/recipes sont déjà à null (transition pending) : pas de reset redondant.
        // Erreur métier (rejectWithValue) → payload discriminant ; sinon message brut.
        state.error = action.payload ?? action.error.message ?? null;
      });
  },
});

export const menuReducer = menuSlice.reducer;

export const selectMenu = (state: RootState): MenuState => state.menu;
