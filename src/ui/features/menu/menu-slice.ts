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
  /**
   * requestId de la DERNIÈRE lecture de recettes lancée. Plomberie de dispatch : aucun écran ne
   * le lit.
   *
   * Le `condition` de `refreshMenuRecipes` filtre le DÉPART d'une relecture, pas son ARRIVÉE :
   * un thunk RTK n'est pas annulé par le démontage de son container, donc deux lectures
   * peuvent être en vol et se régler dans le désordre. Sans cette mémoire, la réponse tardive
   * de la première écrase un catalogue à jour et fait revenir un titre périmé à l'écran —
   * exactement le défaut que la relecture venait de fermer.
   *
   * Une SEULE mémoire pour les DEUX producteurs de `recipes`, parce qu'ils écrivent le même
   * champ : une régénération doit invalider une relecture en vol, sinon le catalogue périmé
   * revient par-dessus celui que la régénération vient de poser, et les créneaux des recettes
   * créées entre-temps retombent sur « Recette inconnue » sur un menu qui vient de réussir.
   *
   * Volontairement PAS remis à null au règlement : le champ signifie « dernière lecture
   * lancée », pas « lecture en vol ». Le remettre à null rouvrirait le trou — une réponse
   * tardive arrivant après le règlement de la lecture courante ne correspondrait plus à rien
   * et serait acceptée.
   */
  latestRecipesRequestId: string | null;
};

// Fenêtre par défaut : 2 semaines (14 jours).
const DEFAULT_DAYS = 14;

const initialState: MenuState = {
  status: 'idle',
  menu: null,
  recipes: null,
  error: null,
  selectedDays: DEFAULT_DAYS,
  latestRecipesRequestId: null,
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

/**
 * Relecture du catalogue pour un menu DÉJÀ affiché. Le menu résout ses titres depuis les recettes
 * stockées à la génération : sans cette relecture, un titre modifié ailleurs y reste périmé
 * jusqu'à la prochaine génération.
 *
 * Le menu lui-même n'est pas retouché — mêmes repas, mêmes jours, seuls les noms changent.
 */
export const refreshMenuRecipes = createAsyncThunk<Recipe[], void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'menu/refreshMenuRecipes',
  async (_arg, thunkApi) => thunkApi.extra.listRecipes(),
  {
    // Pas de menu affiché : il n'y a rien à rafraîchir, et aucune lecture ne part.
    condition: (_arg, { getState }) => getState().menu.menu !== null,
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
      .addCase(generateMenu.pending, (state, action) => {
        // La génération lit le catalogue elle aussi : elle prend la main sur toute relecture
        // en vol, dont la réponse tardive ne dira plus rien du catalogue courant.
        state.latestRecipesRequestId = action.meta.requestId;
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
      })
      // `pending` ne porte QUE la mémoire de fraîcheur : surtout pas de passage en `loading`,
      // l'écran ne doit pas clignoter en chargement pour une relecture que l'utilisateur n'a
      // pas demandée. Rien du tout pour `rejected` : la relecture échouée conserve le menu
      // affiché avec ses anciens titres, sans message d'erreur — il n'a rien demandé, on ne
      // lui montre pas de panne.
      .addCase(refreshMenuRecipes.pending, (state, action) => {
        state.latestRecipesRequestId = action.meta.requestId;
      })
      .addCase(refreshMenuRecipes.fulfilled, (state, action) => {
        // Une relecture périmée ne dit rien du catalogue courant : jetée avant tout examen.
        if (action.meta.requestId !== state.latestRecipesRequestId) return;
        state.recipes = action.payload as typeof state.recipes;
      });
  },
});

export const { menuWindowSelected } = menuSlice.actions;

export const menuReducer = menuSlice.reducer;

export const selectMenu = (state: RootState): MenuState => state.menu;
