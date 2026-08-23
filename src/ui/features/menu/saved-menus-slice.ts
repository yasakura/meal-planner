import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { toIsoDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { type Menu } from '../../../domain/entities/menu';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type Recipe } from '../../../domain/entities/recipe';
import { type AppThunkApiConfig, type AppThunkAsync, type RootState } from '../../store/store';
import { FROM_MENU } from '../catalogue/recipe-detail-origin';
import { menuDays, type MenuDay } from './menu-days';
import { MENU_SAVED_MESSAGE, MENU_UNAVAILABLE_NOTICE, type MenuSaveNotice } from './menu-notice';
import { menuPeriodLabel } from './menu-period-label';
import { saveMenu } from './menu-slice';

export type SavedMenusStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export type SavedMenusState = {
  status: SavedMenusStatus;
  hasLoadedOnce: boolean;
  menus: Menu[];
  index: number | null;
  recipes: Recipe[];
  saved: boolean;
  focusOn: CalendarDate | null;
};

const initialState: SavedMenusState = {
  status: 'idle',
  hasLoadedOnce: false,
  menus: [],
  index: null,
  recipes: [],
  saved: false,
  focusOn: null,
};

const MENU_ABSENT = -1;

const SAVED_MENUS_UNREADABLE_NOTICE = 'Impossible de charger tes menus enregistrés.';

type SavedMenusLoaded = { menus: Menu[]; indexInitial: number | null; recipes: Recipe[] };

export type SavedMenusArrival = { fromSave: boolean };

export const loadSavedMenus = createAsyncThunk<
  SavedMenusLoaded,
  SavedMenusArrival,
  AppThunkApiConfig
>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'savedMenus/loadSavedMenus',
  async (_arg, thunkApi) => {
    const { menus, indexInitial } = await thunkApi.extra.browseMenus();
    if (menus.length === 0) return { menus, indexInitial, recipes: [] };
    const recipes = await thunkApi.extra.listRecipes();
    return { menus, indexInitial, recipes };
  },
);

function positionOf(menus: Menu[], cible: CalendarDate | null): number {
  if (cible === null) return MENU_ABSENT;
  return menus.findIndex((menu) => toIsoDate(menu.dateDebut) === toIsoDate(cible));
}

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const savedMenusSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'savedMenus',
  initialState,
  reducers: {
    previousMenuSelected(state) {
      state.index = (state.index as number) - 1;
      state.saved = false;
      state.focusOn = null;
    },
    nextMenuSelected(state) {
      state.index = (state.index as number) + 1;
      state.saved = false;
      state.focusOn = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSavedMenus.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadSavedMenus.fulfilled, (state, action) => {
        state.status = 'success';
        state.hasLoadedOnce = true;
        state.menus = action.payload.menus as typeof state.menus;
        state.recipes = action.payload.recipes as typeof state.recipes;
        const focus = action.meta.arg.fromSave ? state.focusOn : null;
        state.focusOn = focus;
        const vise = positionOf(state.menus, focus);
        state.saved = vise !== MENU_ABSENT;
        state.index = vise === MENU_ABSENT ? action.payload.indexInitial : vise;
      })
      .addCase(loadSavedMenus.rejected, (state, action) => {
        state.status = isRepositoryUnavailable(action.error) ? 'unavailable' : 'error';
      })
      .addCase(saveMenu.fulfilled, (state, action) => {
        if (action.payload === null) return;
        state.focusOn = action.payload.dateDebut;
      });
  },
});

export const { previousMenuSelected, nextMenuSelected } = savedMenusSlice.actions;

export function savedMenusScreenOpened(): AppThunkAsync {
  return async (dispatch) => {
    await dispatch(loadSavedMenus({ fromSave: false }));
  };
}

export function savedMenusScreenOpenedAfterSave(): AppThunkAsync {
  return async (dispatch) => {
    await dispatch(loadSavedMenus({ fromSave: true }));
  };
}

export const savedMenusReducer = savedMenusSlice.reducer;

export const selectSavedMenus = (state: RootState): SavedMenusState => state.savedMenus;

export type MenuConsultation = {
  days: MenuDay[];
  periodLabel: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  saveNotice: MenuSaveNotice | null;
};

export function menuConsultationOf(state: SavedMenusState): MenuConsultation | null {
  if (!state.hasLoadedOnce || state.menus.length === 0) return null;
  const cursor = state.index as number;
  const consulte = state.menus[cursor] as Menu;
  return {
    days: menuDays(consulte, state.recipes, FROM_MENU),
    periodLabel: menuPeriodLabel(consulte),
    previousDisabled: cursor === 0,
    nextDisabled: cursor === state.menus.length - 1,
    saveNotice: state.saved ? { tone: 'success', message: MENU_SAVED_MESSAGE } : null,
  };
}

export type SavedMenusView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'empty' }
  | ({ status: 'consultation' } & MenuConsultation);

export function savedMenusViewOf(state: SavedMenusState): SavedMenusView {
  const consultation = menuConsultationOf(state);
  if (consultation !== null) return { status: 'consultation', ...consultation };
  if (state.hasLoadedOnce) return { status: 'empty' };
  if (state.status === 'unavailable') {
    return { status: 'unavailable', message: MENU_UNAVAILABLE_NOTICE };
  }
  if (state.status === 'error') return { status: 'error', message: SAVED_MENUS_UNREADABLE_NOTICE };
  return { status: 'loading' };
}
