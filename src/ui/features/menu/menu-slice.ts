import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type Menu } from '../../../domain/entities/menu';
import { type Recipe } from '../../../domain/entities/recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type MenuStatus = 'idle' | 'loading' | 'success' | 'error';

export type MenuState = {
  status: MenuStatus;
  menu: Menu | null;
  recipes: Recipe[] | null;
  error: string | null;
  // Fenêtre demandée par l'utilisateur. C'est une PRÉFÉRENCE, pas un état transitoire : elle
  // vit dans le store — comme le menu généré — pour que les deux ne puissent pas diverger au
  // gré des montages du container (issue #28). Aucune transition ne la remet à zéro.
  selectedDays: number;
};

// Fenêtre par défaut : 2 semaines (14 jours).
const DEFAULT_DAYS = 14;

const initialState: MenuState = {
  status: 'idle',
  menu: null,
  recipes: null,
  error: null,
  selectedDays: DEFAULT_DAYS,
};

// Discriminant d'erreur métier : catalogue vide → pas de menu possible.
export const NO_RECIPES = 'no-recipes';

export const generateMenu = createAsyncThunk<
  { menu: Menu; recipes: Recipe[] },
  number,
  AppThunkApiConfig & { rejectValue: string }
>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'menu/generateMenu',
  async (days, thunkApi) => {
    // On récupère d'abord les recettes : elles servent à résoudre les titres ET à
    // distinguer explicitement le cas « catalogue vide » (message actionnable).
    const recipes = await thunkApi.extra.listRecipes();
    if (recipes.length === 0) {
      return thunkApi.rejectWithValue(NO_RECIPES);
    }
    const menu = await thunkApi.extra.generateMenu({ days });
    return { menu, recipes };
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
// équivalent — toute la logique de transition est couverte par ses propres tests.
const menuSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'menu',
  initialState,
  reducers: {
    menuWindowSelected(state, action: PayloadAction<number>) {
      state.selectedDays = action.payload;
    },
  },
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

export const { menuWindowSelected } = menuSlice.actions;

export const menuReducer = menuSlice.reducer;

export const selectMenu = (state: RootState): MenuState => state.menu;
