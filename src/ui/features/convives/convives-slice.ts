import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { compareConvivesByName, type Convive } from '../../../domain/entities/convive';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type Unsubscribe } from '../../../domain/ports/unsubscribe';
import { type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type RemoveConviveInput } from '../../../domain/use-cases/remove-convive';
import { type RenameConviveInput } from '../../../domain/use-cases/rename-convive';
import {
  type AppDependencies,
  type AppDispatch,
  type AppThunk,
  type AppThunkApiConfig,
  type RootState,
} from '../../store/store';
import { authStateChanged } from '../auth/auth-slice';

export type ConvivesFailure = 'unreadable' | 'unavailable';

export type ConviveAddStatus = 'idle' | 'adding' | 'error';

export type ConviveRenameStatus = 'idle' | 'renaming' | 'error';
export type ConviveRemoveStatus = 'idle' | 'removing' | 'error';

export type RowNotice = { tone: 'error'; message: string };

export type ConviveRow = {
  id: string;
  name: string;
  mode: 'idle' | 'editing' | 'confirming-removal';
  notice: RowNotice | null;
  actionsDisabled: boolean;
  saveDisabled: boolean;
  editInputDisabled: boolean;
  confirmDisabled: boolean;
};

export type ConvivesState = {
  convives: Convive[];
  received: boolean;
  failure: ConvivesFailure | null;
  attempt: number;
  addStatus: ConviveAddStatus;
  addError: string | null;
  draftConviveId: string | null;
  latestAddRequestId: string | null;
  renameStatus: ConviveRenameStatus;
  renameDraft: string;
  editingConviveId: string | null;
  latestRenameRequestId: string | null;
  removeStatus: ConviveRemoveStatus;
  pendingRemovalId: string | null;
  latestRemoveRequestId: string | null;
};

const initialState: ConvivesState = {
  convives: [],
  received: false,
  failure: null,
  attempt: 0,
  addStatus: 'idle',
  addError: null,
  draftConviveId: null,
  latestAddRequestId: null,
  renameStatus: 'idle',
  renameDraft: '',
  editingConviveId: null,
  latestRenameRequestId: null,
  removeStatus: 'idle',
  pendingRemovalId: null,
  latestRemoveRequestId: null,
};

export function convivesInitialState(draftConviveId: string): ConvivesState {
  return { ...initialState, draftConviveId };
}

function draftIdOf(state: ConvivesState): string {
  return state.draftConviveId as string;
}

export type ConviveDraft = Omit<AddConviveInput, 'id'>;

export type ConviveAdded = { nextDraftId: string };

export const addConvive = createAsyncThunk<ConviveAdded, ConviveDraft, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'convives/addConvive',
  async (draft, thunkApi) => {
    await thunkApi.extra.addConvive({
      id: draftIdOf(thunkApi.getState().convives),
      ...draft,
    });
    return { nextDraftId: thunkApi.extra.newConviveId() };
  },
);

export const renameConvive = createAsyncThunk<Convive, RenameConviveInput, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'convives/renameConvive',
  async (input, thunkApi) => {
    return await thunkApi.extra.renameConvive(input);
  },
);

export const removeConvive = createAsyncThunk<void, RemoveConviveInput, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'convives/removeConvive',
  async (input, thunkApi) => {
    await thunkApi.extra.removeConvive(input);
  },
);

function restAddLifecycle(state: ConvivesState): void {
  state.addStatus = 'idle';
  state.addError = null;
}

function restRenameLifecycle(state: ConvivesState): void {
  state.renameStatus = 'idle';
  state.renameDraft = '';
  state.editingConviveId = null;
}

function restRemoveLifecycle(state: ConvivesState): void {
  state.removeStatus = 'idle';
  state.pendingRemovalId = null;
}

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const convivesSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'convives',
  initialState,
  reducers: {
    convivesObserved(state, action: PayloadAction<Convive[]>) {
      state.convives = action.payload;
      state.received = true;
      state.failure = null;
    },
    convivesObservationFailed(state, action: PayloadAction<{ unavailable: boolean }>) {
      state.failure = action.payload.unavailable ? 'unavailable' : 'unreadable';
    },
    convivesRetried(state) {
      state.failure = null;
      state.attempt += 1;
    },
    conviveFormOpened(state, action: PayloadAction<string>) {
      if (state.addStatus !== 'adding') {
        state.draftConviveId = action.payload;
        restAddLifecycle(state);
      }
      if (state.renameStatus !== 'renaming') restRenameLifecycle(state);
      if (state.removeStatus !== 'removing') restRemoveLifecycle(state);
    },
    conviveEditRequested(state, action: PayloadAction<string>) {
      if (state.renameStatus === 'renaming') return;
      state.renameStatus = 'idle';
      state.editingConviveId = action.payload;
      state.renameDraft =
        state.convives.find((convive) => convive.id === action.payload)?.name ?? '';
    },
    conviveEditCancelled(state) {
      if (state.renameStatus === 'renaming') return;
      restRenameLifecycle(state);
    },
    renameDraftEdited(state, action: PayloadAction<string>) {
      state.renameDraft = action.payload;
    },
    conviveRemovalRequested(state, action: PayloadAction<string>) {
      if (state.removeStatus === 'removing') return;
      state.removeStatus = 'idle';
      state.pendingRemovalId = action.payload;
    },
    conviveRemovalCancelled(state) {
      if (state.removeStatus === 'removing') return;
      restRemoveLifecycle(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(authStateChanged, (state, action) => {
        if (action.payload !== null) return;
        state.convives = [];
        state.received = false;
        state.failure = null;
        state.attempt = 0;
      })
      .addCase(addConvive.pending, (state, action) => {
        state.latestAddRequestId = action.meta.requestId;
        state.addStatus = 'adding';
      })
      .addCase(addConvive.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestAddRequestId) return;
        state.draftConviveId = action.payload.nextDraftId;
        restAddLifecycle(state);
      })
      .addCase(addConvive.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestAddRequestId) return;
        state.addStatus = 'error';
        state.addError = action.error.message ?? null;
      })
      .addCase(renameConvive.pending, (state, action) => {
        state.latestRenameRequestId = action.meta.requestId;
        state.renameStatus = 'renaming';
      })
      .addCase(renameConvive.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRenameRequestId) return;
        state.convives = state.convives.map((convive) =>
          convive.id === action.payload.id ? action.payload : convive,
        );
        state.convives.sort(compareConvivesByName);
        restRenameLifecycle(state);
      })
      .addCase(renameConvive.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRenameRequestId) return;
        state.renameStatus = 'error';
      })
      .addCase(removeConvive.pending, (state, action) => {
        state.latestRemoveRequestId = action.meta.requestId;
        state.removeStatus = 'removing';
      })
      .addCase(removeConvive.fulfilled, (state, action) => {
        state.convives = state.convives.filter((convive) => convive.id !== action.meta.arg.id);
        if (action.meta.requestId !== state.latestRemoveRequestId) return;
        restRemoveLifecycle(state);
      })
      .addCase(removeConvive.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRemoveRequestId) return;
        state.removeStatus = 'error';
      });
  },
});

const { conviveFormOpened } = convivesSlice.actions;

export const { convivesObservationFailed, convivesObserved, convivesRetried } =
  convivesSlice.actions;

export const observeConvives =
  () =>
  (dispatch: AppDispatch, _getState: () => RootState, extra: AppDependencies): Unsubscribe =>
    extra.observeConvives(
      (convives) => dispatch(convivesObserved(convives)),
      (error) =>
        dispatch(convivesObservationFailed({ unavailable: isRepositoryUnavailable(error) })),
    );

export function conviveFormScreenOpened(): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(conviveFormOpened(extra.newConviveId()));
  };
}

export const {
  conviveEditRequested,
  conviveEditCancelled,
  renameDraftEdited,
  conviveRemovalRequested,
  conviveRemovalCancelled,
} = convivesSlice.actions;

export const convivesReducer = convivesSlice.reducer;

export const selectConvives = (state: RootState): ConvivesState => state.convives;

export const selectConvivesAttempt = (state: RootState): number => state.convives.attempt;

export const selectConvivesLinkLost = (state: RootState): boolean =>
  state.convives.received && state.convives.failure !== null;

export type ConvivesView =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unavailable' }
  | { status: 'empty' }
  | { status: 'loaded'; convives: ConviveRow[] };

export function convivesViewOf(state: ConvivesState): ConvivesView {
  if (state.received) {
    return state.convives.length === 0
      ? { status: 'empty' }
      : { status: 'loaded', convives: conviveRowsOf(state) };
  }
  if (state.failure === 'unavailable') return { status: 'unavailable' };
  if (state.failure === 'unreadable') return { status: 'error' };
  return { status: 'loading' };
}

export const selectIsAddInFlight = (state: RootState): boolean =>
  state.convives.addStatus === 'adding';

function rowNotice(state: ConvivesState, convive: Convive): RowNotice | null {
  if (state.editingConviveId === convive.id && state.renameStatus === 'error') {
    return { tone: 'error', message: 'Impossible de renommer le convive.' };
  }
  if (state.pendingRemovalId === convive.id && state.removeStatus === 'error') {
    return { tone: 'error', message: 'Impossible de retirer le convive.' };
  }
  return null;
}

export function conviveRowsOf(convives: ConvivesState): ConviveRow[] {
  const writeInFlight =
    convives.renameStatus === 'renaming' || convives.removeStatus === 'removing';
  return convives.convives.map((convive) => {
    const editing = convives.editingConviveId === convive.id;
    const confirmingRemoval = convives.pendingRemovalId === convive.id;
    const draft = convives.renameDraft.trim();
    return {
      id: convive.id,
      name: convive.name,
      mode: editing ? 'editing' : confirmingRemoval ? 'confirming-removal' : 'idle',
      notice: rowNotice(convives, convive),
      actionsDisabled: !editing && !confirmingRemoval && writeInFlight,
      saveDisabled:
        !editing || draft === '' || draft === convive.name || convives.renameStatus === 'renaming',
      editInputDisabled: editing && convives.renameStatus === 'renaming',
      confirmDisabled: confirmingRemoval && convives.removeStatus === 'removing',
    };
  });
}
