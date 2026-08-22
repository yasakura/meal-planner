import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import {
  isBefore,
  parseIsoDate,
  toIsoDate,
  type CalendarDate,
} from '../../../domain/entities/calendar-date';
import { type Menu } from '../../../domain/entities/menu';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type Recipe } from '../../../domain/entities/recipe';
import { type MenuNavigation } from '../../../domain/use-cases/browse-menus';
import {
  type AppThunk,
  type AppThunkApiConfig,
  type AppThunkAsync,
  type RootState,
} from '../../store/store';
import { menuDays } from './menu-days';
import { menuPeriodLabel } from './menu-period-label';
import { type MenuDay } from './MenuScreen';

export type MenuStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export type MenuSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unconfirmed';

export type MenuMode = 'consultation' | 'generation';

export type MenuState = {
  status: MenuStatus;
  menu: Menu | null;
  recipes: Recipe[] | null;
  error: string | null;
  selectedDays: number;
  startDate: CalendarDate | null;
  startDateFloor: CalendarDate | null;
  startDateRefused: boolean;
  latestRecipesRequestId: string | null;
  saveStatus: MenuSaveStatus;
  latestSaveRequestId: string | null;
  mode: MenuMode;
  menus: Menu[];
  index: number | null;
};

const DEFAULT_DAYS = 14;

const initialState: MenuState = {
  status: 'idle',
  menu: null,
  recipes: null,
  error: null,
  selectedDays: DEFAULT_DAYS,
  startDate: null,
  startDateFloor: null,
  startDateRefused: false,
  latestRecipesRequestId: null,
  saveStatus: 'idle',
  latestSaveRequestId: null,
  mode: 'consultation',
  menus: [],
  index: null,
};

export function menuInitialState(startDate: CalendarDate, today: CalendarDate): MenuState {
  return { ...initialState, startDate, startDateFloor: today };
}

function startDateOf(state: MenuState): CalendarDate {
  return state.startDate as CalendarDate;
}

function displayedMenuOf(state: MenuState): Menu {
  return state.menu as Menu;
}

function recipesOf(state: MenuState): Recipe[] {
  return state.recipes as Recipe[];
}

function cursorOf(state: MenuState): number {
  return state.index as number;
}

function consultedMenuOf(state: MenuState): Menu {
  return state.menus[cursorOf(state)] as Menu;
}

function isConsulting(state: MenuState): boolean {
  return state.mode === 'consultation' && state.index !== null && state.recipes !== null;
}

function hasMenuToShow(state: MenuState): boolean {
  return state.menu !== null || state.menus.length > 0;
}

function startDateFloorOf(state: MenuState): CalendarDate {
  return state.startDateFloor as CalendarDate;
}

function choisiOuRien(iso: string): CalendarDate | null {
  try {
    return parseIsoDate(iso);
  } catch {
    return null;
  }
}

export const NO_RECIPES = 'no-recipes';

export const SAVED_MENUS_UNREADABLE = 'saved-menus-unreadable';

const MENU_ABSENT = -1;

export const loadSavedMenus = createAsyncThunk<MenuNavigation, void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'menu/loadSavedMenus',
  async (_arg, thunkApi) => thunkApi.extra.browseMenus(),
);

export const generateMenu = createAsyncThunk<
  { menu: Menu; recipes: Recipe[] },
  number,
  AppThunkApiConfig & { rejectValue: string }
>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'menu/generateMenu',
  async (days, thunkApi) => {
    const recipes = await thunkApi.extra.listRecipes();
    if (recipes.length === 0) {
      return thunkApi.rejectWithValue(NO_RECIPES);
    }
    const dateDebut = startDateOf(thunkApi.getState().menu);
    const menu = await thunkApi.extra.generateMenu({ days, dateDebut });
    return { menu, recipes };
  },
);

export const refreshMenuRecipes = createAsyncThunk<Recipe[], void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'menu/refreshMenuRecipes',
  async (_arg, thunkApi) => thunkApi.extra.listRecipes(),
  {
    condition: (_arg, { getState }) => hasMenuToShow(getState().menu),
  },
);

export const saveMenu = createAsyncThunk<void, void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'menu/saveMenu',
  async (_arg, thunkApi) => {
    await thunkApi.extra.saveMenu({ menu: displayedMenuOf(thunkApi.getState().menu) });
    await thunkApi.dispatch(loadSavedMenus());
  },
  {
    condition: (_arg, { getState }) => getState().menu.menu !== null,
  },
);

function restSaveLifecycle(state: MenuState): void {
  state.saveStatus = 'idle';
  state.latestSaveRequestId = null;
}

function forgetSettledSave(state: MenuState): void {
  if (state.saveStatus === 'saving') return;
  restSaveLifecycle(state);
}

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const menuSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'menu',
  initialState,
  reducers: {
    menuWindowSelected(state, action: PayloadAction<number>) {
      state.selectedDays = action.payload;
    },
    startDateChosen(state, action: PayloadAction<{ iso: string; today: CalendarDate }>) {
      const choisi = choisiOuRien(action.payload.iso);
      if (choisi === null) return;
      if (isBefore(choisi, action.payload.today)) {
        state.startDateRefused = true;
        return;
      }
      state.startDate = choisi;
      state.startDateRefused = false;
    },
    previousMenuSelected(state) {
      state.index = cursorOf(state) - 1;
      forgetSettledSave(state);
    },
    nextMenuSelected(state) {
      state.index = cursorOf(state) + 1;
      forgetSettledSave(state);
    },
    newMenuRequested(state) {
      state.mode = 'generation';
      state.status = 'idle';
      state.menu = null;
      state.error = null;
      restSaveLifecycle(state);
    },
    menuOpened(state, action: PayloadAction<CalendarDate>) {
      state.startDateFloor = action.payload;
      state.startDateRefused = false;
      if (state.status === 'unavailable' && state.menu === null) state.status = 'idle';
      forgetSettledSave(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateMenu.pending, (state, action) => {
        state.latestRecipesRequestId = action.meta.requestId;
        state.status = 'loading';
        state.menu = null;
        state.recipes = null;
        state.error = null;
        state.startDateRefused = false;
        restSaveLifecycle(state);
      })
      .addCase(generateMenu.fulfilled, (state, action) => {
        state.status = 'success';
        state.menu = action.payload.menu as typeof state.menu;
        state.recipes = action.payload.recipes as typeof state.recipes;
        state.error = null;
      })
      .addCase(generateMenu.rejected, (state, action) => {
        if (isRepositoryUnavailable(action.error)) {
          state.status = 'unavailable';
          return;
        }
        state.status = 'error';
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(refreshMenuRecipes.pending, (state, action) => {
        state.latestRecipesRequestId = action.meta.requestId;
      })
      .addCase(refreshMenuRecipes.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRecipesRequestId) return;
        state.status = 'success';
        state.recipes = action.payload as typeof state.recipes;
      })
      .addCase(refreshMenuRecipes.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRecipesRequestId) return;
        state.status = isRepositoryUnavailable(action.error) ? 'unavailable' : 'error';
      })
      .addCase(saveMenu.pending, (state, action) => {
        state.saveStatus = 'saving';
        state.latestSaveRequestId = action.meta.requestId;
      })
      .addCase(saveMenu.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestSaveRequestId) return;
        state.saveStatus = 'saved';
        const position = state.menus.findIndex(
          (menu) => toIsoDate(menu.dateDebut) === toIsoDate(displayedMenuOf(state).dateDebut),
        );
        if (position === MENU_ABSENT) return;
        state.mode = 'consultation';
        state.index = position;
      })
      .addCase(saveMenu.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestSaveRequestId) return;
        state.saveStatus = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      })
      .addCase(loadSavedMenus.pending, (state) => {
        if (state.status !== 'idle') return;
        state.status = 'loading';
      })
      .addCase(loadSavedMenus.fulfilled, (state, action) => {
        state.menus = action.payload.menus as typeof state.menus;
        state.index = action.payload.indexInitial;
        if (state.status === 'loading' && !hasMenuToShow(state)) state.status = 'idle';
      })
      .addCase(loadSavedMenus.rejected, (state, action) => {
        if (isRepositoryUnavailable(action.error)) {
          state.status = 'unavailable';
          return;
        }
        state.status = 'error';
        state.error = SAVED_MENUS_UNREADABLE;
      });
  },
});

export const { menuWindowSelected, previousMenuSelected, nextMenuSelected, newMenuRequested } =
  menuSlice.actions;

const { menuOpened, startDateChosen } = menuSlice.actions;

export function menuStartDateSelected(iso: string): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(startDateChosen({ iso, today: extra.clock.today() }));
  };
}

function consultationLoaded(): AppThunkAsync {
  return async (dispatch) => {
    await dispatch(loadSavedMenus());
    await dispatch(refreshMenuRecipes());
  };
}

export function menuScreenOpened(): AppThunkAsync {
  return async (dispatch, _getState, extra) => {
    dispatch(menuOpened(extra.clock.today()));
    await dispatch(consultationLoaded());
  };
}

export function menuRetried(): AppThunkAsync {
  return async (dispatch, getState) => {
    if (getState().menu.error === SAVED_MENUS_UNREADABLE) {
      await dispatch(consultationLoaded());
      return;
    }
    await dispatch(generateMenu(getState().menu.selectedDays));
  };
}

export const menuReducer = menuSlice.reducer;

export const selectMenu = (state: RootState): MenuState => state.menu;

export const selectStartDateIso = (state: RootState): string => toIsoDate(startDateOf(state.menu));

export const selectStartDateFloorIso = (state: RootState): string =>
  toIsoDate(startDateFloorOf(state.menu));

export type MenuSaveNotice = { tone: 'success' | 'error' | 'unconfirmed'; message: string };

export function menuSaveNoticeOf(state: MenuState): MenuSaveNotice | null {
  if (state.saveStatus === 'saved') return { tone: 'success', message: 'Menu enregistré' };
  if (state.saveStatus === 'unconfirmed') {
    return {
      tone: 'unconfirmed',
      message: 'Aucune connexion — l’enregistrement du menu n’a pas pu être confirmé.',
    };
  }
  if (state.saveStatus === 'error') {
    return { tone: 'error', message: 'Impossible d’enregistrer le menu.' };
  }
  return null;
}

export const selectIsSaveInFlight = (state: RootState): boolean =>
  state.menu.saveStatus === 'saving';

export type MenuConsultation = {
  days: MenuDay[];
  periodLabel: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  saveNotice: MenuSaveNotice | null;
};

export function menuConsultationOf(state: MenuState): MenuConsultation | null {
  if (!isConsulting(state)) return null;
  const consulte = consultedMenuOf(state);
  return {
    days: menuDays(consulte, recipesOf(state)),
    periodLabel: menuPeriodLabel(consulte),
    previousDisabled: cursorOf(state) === 0,
    nextDisabled: cursorOf(state) === state.menus.length - 1,
    saveNotice: menuSaveNoticeOf(state),
  };
}

export function menuErrorMessage(state: MenuState): string {
  if (state.error === NO_RECIPES) return "Ajoute d'abord des recettes pour générer un menu.";
  if (state.error === SAVED_MENUS_UNREADABLE) return 'Impossible de charger tes menus enregistrés.';
  return 'Impossible de générer le menu.';
}
