import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { compareConvivesByName, type Convive } from '../../../domain/entities/convive';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type RemoveConviveInput } from '../../../domain/use-cases/remove-convive';
import { type RenameConviveInput } from '../../../domain/use-cases/rename-convive';
import { type AppThunk, type AppThunkApiConfig, type RootState } from '../../store/store';
import { elidedDe } from './french-elision';

export type ConvivesStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export type ConviveAddStatus = 'idle' | 'adding' | 'error' | 'unconfirmed';

export type ConviveRenameStatus = 'idle' | 'renaming' | 'error' | 'unconfirmed';
export type ConviveRemoveStatus = 'idle' | 'removing' | 'error' | 'unconfirmed';

export type RowNotice = { tone: 'error' | 'unconfirmed'; message: string };

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
  status: ConvivesStatus;
  convives: Convive[];
  error: string | null;
  latestLoadRequestId: string | null;
  addStatus: ConviveAddStatus;
  addError: string | null;
  addSubjectName: string | null;
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
  status: 'idle',
  convives: [],
  error: null,
  latestLoadRequestId: null,
  addStatus: 'idle',
  addError: null,
  addSubjectName: null,
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

export const loadConvives = createAsyncThunk<Convive[], void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'convives/loadConvives',
  async (_, thunkApi) => {
    return await thunkApi.extra.listConvives();
  },
);

export type ConviveDraft = Omit<AddConviveInput, 'id'>;

export type ConviveAdded = { convive: Convive; nextDraftId: string };

export const addConvive = createAsyncThunk<ConviveAdded, ConviveDraft, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'convives/addConvive',
  async (draft, thunkApi) => {
    const convive = await thunkApi.extra.addConvive({
      id: draftIdOf(thunkApi.getState().convives),
      ...draft,
    });
    return { convive, nextDraftId: thunkApi.extra.newConviveId() };
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
  state.addSubjectName = null;
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
    conviveFormOpened(state, action: PayloadAction<string>) {
      if (state.addStatus === 'adding') return;
      state.draftConviveId = action.payload;
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
      .addCase(loadConvives.pending, (state, action) => {
        state.latestLoadRequestId = action.meta.requestId;
        state.status = 'loading';
        state.error = null;
        if (state.addStatus !== 'adding') restAddLifecycle(state);
        if (state.renameStatus !== 'renaming') restRenameLifecycle(state);
        if (state.removeStatus !== 'removing') restRemoveLifecycle(state);
      })
      .addCase(loadConvives.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestLoadRequestId) return;
        state.status = 'success';
        state.convives = action.payload;
        state.error = null;
      })
      .addCase(loadConvives.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestLoadRequestId) return;
        if (isRepositoryUnavailable(action.error)) {
          state.status = 'unavailable';
          state.error = null;
          return;
        }
        state.status = 'error';
        state.error = action.error.message ?? null;
      })
      .addCase(addConvive.pending, (state, action) => {
        state.latestAddRequestId = action.meta.requestId;
        state.addStatus = 'adding';
        state.addSubjectName = action.meta.arg.name;
      })
      .addCase(addConvive.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestAddRequestId) return;
        state.convives.push(action.payload.convive);
        state.convives.sort(compareConvivesByName);
        state.draftConviveId = action.payload.nextDraftId;
        restAddLifecycle(state);
      })
      .addCase(addConvive.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestAddRequestId) return;
        if (isRepositoryUnavailable(action.error)) {
          state.addStatus = 'unconfirmed';
          state.addError = null;
          return;
        }
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
        state.renameStatus = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
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
        state.removeStatus = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      });
  },
});

const { conviveFormOpened } = convivesSlice.actions;

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

export const selectIsAddInFlight = (state: RootState): boolean =>
  state.convives.addStatus === 'adding';

function rowNotice(state: ConvivesState, convive: Convive): RowNotice | null {
  if (state.editingConviveId === convive.id) {
    if (state.renameStatus === 'error') {
      return { tone: 'error', message: 'Impossible de renommer le convive.' };
    }
    if (state.renameStatus === 'unconfirmed') {
      return {
        tone: 'unconfirmed',
        message: `Aucune connexion — le renommage ${elidedDe(convive.name)} n’a pas pu être confirmé.`,
      };
    }
  }
  if (state.pendingRemovalId === convive.id) {
    if (state.removeStatus === 'error') {
      return { tone: 'error', message: 'Impossible de retirer le convive.' };
    }
    if (state.removeStatus === 'unconfirmed') {
      return {
        tone: 'unconfirmed',
        message: `Aucune connexion — le retrait ${elidedDe(convive.name)} n’a pas pu être confirmé.`,
      };
    }
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
