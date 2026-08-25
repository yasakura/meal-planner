import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { toIsoDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { type Menu } from '../../../domain/entities/menu';
import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type Unsubscribe } from '../../../domain/ports/unsubscribe';
import { type MenuNavigation } from '../../../domain/use-cases/observe-menus';
import { type AppDependencies, type AppDispatch, type RootState } from '../../store/store';
import { authStateChanged } from '../auth/auth-slice';
import { type CatalogueState } from '../catalogue/catalogue-slice';
import { FROM_MENU } from '../catalogue/recipe-detail-origin';
import { menuDays, type MenuDay } from './menu-days';
import { MENU_SAVED_MESSAGE, MENU_UNAVAILABLE_NOTICE, type MenuSaveNotice } from './menu-notice';
import { menuPeriodLabel } from './menu-period-label';
import { saveMenu } from './menu-slice';

export type SavedMenusFailure = 'unreadable' | 'unavailable';

export type SavedMenusCursor = {
  dateDebut: CalendarDate;
  fromSave: boolean;
};

export type SavedMenusState = {
  menus: Menu[] | null;
  indexInitial: number | null;
  failure: SavedMenusFailure | null;
  attempt: number;
  cursor: SavedMenusCursor | null;
};

const initialState: SavedMenusState = {
  menus: null,
  indexInitial: null,
  failure: null,
  attempt: 0,
  cursor: null,
};

const MENU_ABSENT = -1;

const SAVED_MENUS_UNREADABLE_NOTICE = 'Impossible de charger tes menus enregistrés.';

function menusOf(state: SavedMenusState): Menu[] {
  return state.menus as Menu[];
}

function positionDuCurseur(state: SavedMenusState): number {
  if (state.cursor === null) return MENU_ABSENT;
  const cible = toIsoDate(state.cursor.dateDebut);
  return menusOf(state).findIndex((menu) => toIsoDate(menu.dateDebut) === cible);
}

function positionConsultee(state: SavedMenusState): number {
  const vise = positionDuCurseur(state);
  return vise === MENU_ABSENT ? (state.indexInitial as number) : vise;
}

function deplacerLeCurseur(state: SavedMenusState, pas: number): void {
  const voisin = menusOf(state)[positionConsultee(state) + pas] as Menu;
  state.cursor = { dateDebut: voisin.dateDebut, fromSave: false };
}

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const savedMenusSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'savedMenus',
  initialState,
  reducers: {
    menusObserved(state, action: PayloadAction<MenuNavigation>) {
      state.menus = action.payload.menus as typeof state.menus;
      state.indexInitial = action.payload.indexInitial;
      state.failure = null;
    },
    menusObservationFailed(state, action: PayloadAction<{ unavailable: boolean }>) {
      state.failure = action.payload.unavailable ? 'unavailable' : 'unreadable';
    },
    savedMenusRetried(state) {
      state.failure = null;
      state.attempt += 1;
    },
    savedMenusOpened(state, action: PayloadAction<{ fromSave: boolean }>) {
      if (action.payload.fromSave) return;
      state.cursor = null;
    },
    previousMenuSelected(state) {
      deplacerLeCurseur(state, -1);
    },
    nextMenuSelected(state) {
      deplacerLeCurseur(state, 1);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(authStateChanged, (state, action) => {
        if (action.payload !== null) return;
        state.menus = null;
        state.indexInitial = null;
        state.failure = null;
        state.attempt = 0;
        state.cursor = null;
      })
      .addCase(saveMenu.fulfilled, (state, action) => {
        if (action.payload === null) return;
        state.cursor = { dateDebut: action.payload.dateDebut, fromSave: true };
      });
  },
});

export const {
  menusObserved,
  menusObservationFailed,
  savedMenusRetried,
  savedMenusOpened,
  previousMenuSelected,
  nextMenuSelected,
} = savedMenusSlice.actions;

export const observeMenus =
  () =>
  (dispatch: AppDispatch, _getState: () => RootState, extra: AppDependencies): Unsubscribe =>
    extra.observeMenus(
      (navigation) => dispatch(menusObserved(navigation)),
      (error) => dispatch(menusObservationFailed({ unavailable: isRepositoryUnavailable(error) })),
    );

export const savedMenusReducer = savedMenusSlice.reducer;

export const selectSavedMenus = (state: RootState): SavedMenusState => state.savedMenus;

export const selectSavedMenusAttempt = (state: RootState): number => state.savedMenus.attempt;

export const selectSavedMenusLinkLost = (state: RootState): boolean =>
  state.savedMenus.menus !== null && state.savedMenus.failure !== null;

export type MenuConsultation = {
  days: MenuDay[];
  periodLabel: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  saveNotice: MenuSaveNotice | null;
};

export function menuConsultationOf(
  state: SavedMenusState,
  recipes: Recipe[],
): MenuConsultation | null {
  if (state.menus === null || state.menus.length === 0) return null;
  const vise = positionDuCurseur(state);
  const cursor = positionConsultee(state);
  const consulte = menusOf(state)[cursor] as Menu;
  return {
    days: menuDays(consulte, recipes, FROM_MENU),
    periodLabel: menuPeriodLabel(consulte),
    previousDisabled: cursor === 0,
    nextDisabled: cursor === state.menus.length - 1,
    saveNotice:
      state.cursor?.fromSave === true && vise !== MENU_ABSENT
        ? { tone: 'success', message: MENU_SAVED_MESSAGE }
        : null,
  };
}

export type SavedMenusSource = 'menus' | 'titres';

export type SavedMenusView =
  | { status: 'loading' }
  | { status: 'error'; message: string; source: SavedMenusSource }
  | { status: 'unavailable'; message: string; source: SavedMenusSource }
  | { status: 'empty' }
  | ({ status: 'consultation' } & MenuConsultation);

function constatDePanne(
  failure: SavedMenusFailure | null,
  source: SavedMenusSource,
): SavedMenusView {
  if (failure === 'unavailable') {
    return { status: 'unavailable', message: MENU_UNAVAILABLE_NOTICE, source };
  }
  if (failure === 'unreadable') {
    return { status: 'error', message: SAVED_MENUS_UNREADABLE_NOTICE, source };
  }
  return { status: 'loading' };
}

export function savedMenusViewOf(
  state: SavedMenusState,
  catalogue: CatalogueState,
): SavedMenusView {
  if (state.menus === null) return constatDePanne(state.failure, 'menus');
  if (state.menus.length === 0) return { status: 'empty' };
  if (catalogue.recipes === null) return constatDePanne(catalogue.failure, 'titres');
  return {
    status: 'consultation',
    ...(menuConsultationOf(state, catalogue.recipes) as MenuConsultation),
  };
}
