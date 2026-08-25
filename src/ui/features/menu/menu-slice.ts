import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
  type UnknownAction,
} from '@reduxjs/toolkit';

import {
  isBefore,
  parseIsoDate,
  toIsoDate,
  type CalendarDate,
} from '../../../domain/entities/calendar-date';
import { type Convive } from '../../../domain/entities/convive';
import {
  replaceRepasPresence,
  replaceSlotRecipe,
  type Menu,
  type Presence,
  type SlotAddress,
} from '../../../domain/entities/menu';
import { type Repas } from '../../../domain/entities/repas';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type Recipe } from '../../../domain/entities/recipe';
import {
  type AppThunk,
  type AppThunkApiConfig,
  type AppThunkAsync,
  type RootState,
} from '../../store/store';
import { recipesObserved } from '../catalogue/catalogue-slice';
import { FROM_MENU_DRAFT } from '../catalogue/recipe-detail-origin';
import { menuDays, type MenuDay } from './menu-days';
import { presenceAvecConviveBascule, presenceAvecInvites, withPresence } from './repas-presence';
import { MENU_SAVED_MESSAGE, MENU_UNAVAILABLE_NOTICE, type MenuSaveNotice } from './menu-notice';
import { withSlotChoice } from './slot-choice';

export type MenuStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export type MenuSaveStatus = 'idle' | 'saving' | 'saved';

export type MenuState = {
  status: MenuStatus;
  menu: Menu | null;
  recipes: Recipe[] | null;
  error: string | null;
  selectedDays: number;
  startDate: CalendarDate | null;
  startDateFloor: CalendarDate | null;
  startDateRefused: boolean;
  saveStatus: MenuSaveStatus;
  latestSaveRequestId: string | null;
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
  saveStatus: 'idle',
  latestSaveRequestId: null,
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

export const saveMenu = createAsyncThunk<Menu | null, void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'menu/saveMenu',
  async (_arg, thunkApi) => {
    const menu = displayedMenuOf(thunkApi.getState().menu);
    await thunkApi.extra.saveMenu({ menu });
    if (thunkApi.getState().menu.latestSaveRequestId !== thunkApi.requestId) return null;
    return menu;
  },
  {
    condition: (_arg, { getState }) => getState().menu.menu !== null,
  },
);

export function menuSaveHonored(issue: UnknownAction): boolean {
  return saveMenu.fulfilled.match(issue) && issue.payload !== null;
}

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
    slotRecipeReplaced(state, action: PayloadAction<Menu>) {
      state.menu = action.payload as typeof state.menu;
    },
    repasPresenceReplaced(state, action: PayloadAction<Menu>) {
      state.menu = action.payload as typeof state.menu;
    },
    menuOpened(state, action: PayloadAction<CalendarDate>) {
      state.startDateFloor = action.payload;
      state.startDateRefused = false;
      if (state.status === 'unavailable') state.status = 'idle';
      forgetSettledSave(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateMenu.pending, (state) => {
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
      .addCase(recipesObserved, (state, action) => {
        if (state.menu === null) return;
        state.recipes = action.payload as typeof state.recipes;
      })
      .addCase(saveMenu.pending, (state, action) => {
        state.saveStatus = 'saving';
        state.latestSaveRequestId = action.meta.requestId;
      })
      .addCase(saveMenu.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestSaveRequestId) return;
        state.saveStatus = 'saved';
        state.menu = null;
        state.recipes = null;
      });
  },
});

export const { menuWindowSelected } = menuSlice.actions;

const { menuOpened, repasPresenceReplaced, slotRecipeReplaced, startDateChosen } =
  menuSlice.actions;

type SlotChoice = { address: SlotAddress; recipeId: string };

export function slotRecipeChosen(choice: SlotChoice): AppThunk {
  return (dispatch, getState) => {
    const brouillon = displayedMenuOf(getState().menu);
    dispatch(slotRecipeReplaced(replaceSlotRecipe(brouillon, choice.address, choice.recipeId)));
  };
}

function repasPresenceChanged(
  repasIndex: number,
  presenceOf: (repas: Repas, foyer: Convive[]) => Presence,
): AppThunk {
  return (dispatch, getState) => {
    const state = getState();
    const brouillon = displayedMenuOf(state.menu);
    const repas = brouillon.repas[repasIndex] as Repas;
    dispatch(
      repasPresenceReplaced(
        replaceRepasPresence(brouillon, repasIndex, presenceOf(repas, state.convives.convives)),
      ),
    );
  };
}

type PresenceToggle = { repasIndex: number; conviveId: string };

export function repasPresenceToggled(toggle: PresenceToggle): AppThunk {
  return repasPresenceChanged(toggle.repasIndex, (repas, foyer) =>
    presenceAvecConviveBascule(repas, foyer, toggle.conviveId),
  );
}

export function inviteAdded(repasIndex: number): AppThunk {
  return repasPresenceChanged(repasIndex, (repas) => presenceAvecInvites(repas, repas.invites + 1));
}

export function inviteRemoved(repasIndex: number): AppThunk {
  return repasPresenceChanged(repasIndex, (repas) => presenceAvecInvites(repas, repas.invites - 1));
}

export function menuStartDateSelected(iso: string): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(startDateChosen({ iso, today: extra.clock.today() }));
  };
}

export function menuCreateScreenOpened(): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(menuOpened(extra.clock.today()));
  };
}

export function menuRetried(): AppThunkAsync {
  return async (dispatch, getState) => {
    await dispatch(generateMenu(getState().menu.selectedDays));
  };
}

export const menuReducer = menuSlice.reducer;

export const selectMenu = (state: RootState): MenuState => state.menu;

export const selectStartDateIso = (state: RootState): string => toIsoDate(startDateOf(state.menu));

export const selectStartDateFloorIso = (state: RootState): string =>
  toIsoDate(startDateFloorOf(state.menu));

export function menuSaveNoticeOf(state: MenuState): MenuSaveNotice | null {
  if (state.saveStatus === 'saved') return { tone: 'success', message: MENU_SAVED_MESSAGE };
  return null;
}

export function isSaveInFlight(state: MenuState): boolean {
  return state.saveStatus === 'saving';
}

export function menuErrorMessage(state: MenuState): string {
  if (state.error === NO_RECIPES) return "Ajoute d'abord des recettes pour générer un menu.";
  return 'Impossible de générer le menu.';
}

export type MenuCreationView =
  | { status: 'form'; saveNotice: MenuSaveNotice | null }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'draft'; days: MenuDay[]; saveNotice: MenuSaveNotice | null; saveDisabled: boolean };

export function menuCreationViewOf(state: MenuState): MenuCreationView {
  if (state.menu !== null) {
    return {
      status: 'draft',
      days: withSlotChoice(menuDays(state.menu, recipesOf(state), FROM_MENU_DRAFT)),
      saveNotice: menuSaveNoticeOf(state),
      saveDisabled: isSaveInFlight(state),
    };
  }
  if (state.status === 'loading') return { status: 'loading' };
  if (state.status === 'unavailable') {
    return { status: 'unavailable', message: MENU_UNAVAILABLE_NOTICE };
  }
  if (state.status === 'error') return { status: 'error', message: menuErrorMessage(state) };
  return { status: 'form', saveNotice: menuSaveNoticeOf(state) };
}

export function menuCreationViewWithPresence(state: MenuState, foyer: Convive[]): MenuCreationView {
  const view = menuCreationViewOf(state);
  if (view.status !== 'draft') return view;
  return { ...view, days: withPresence(view.days, displayedMenuOf(state), foyer) };
}
