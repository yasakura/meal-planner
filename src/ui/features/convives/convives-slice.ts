import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { compareConvivesByName, type Convive } from '../../../domain/entities/convive';
import { type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type ConvivesStatus = 'idle' | 'loading' | 'success' | 'error';

// Cycle de vie de l'ajout, distinct de `status` qui reste celui du chargement de la
// liste : un ajout en cours ne doit pas faire disparaître les convives déjà affichés.
export type ConviveAddStatus = 'idle' | 'adding' | 'error';

export type ConvivesState = {
  status: ConvivesStatus;
  convives: Convive[];
  error: string | null;
  addStatus: ConviveAddStatus;
  addError: string | null;
};

const initialState: ConvivesState = {
  status: 'idle',
  convives: [],
  error: null,
  addStatus: 'idle',
  addError: null,
};

export const loadConvives = createAsyncThunk<Convive[], void, AppThunkApiConfig>(
  'convives/loadConvives',
  async (_, thunkApi) => {
    return await thunkApi.extra.listConvives();
  },
);

export const addConvive = createAsyncThunk<Convive, AddConviveInput, AppThunkApiConfig>(
  'convives/addConvive',
  async (input, thunkApi) => {
    return await thunkApi.extra.addConvive(input);
  },
);

const convivesSlice = createSlice({
  name: 'convives',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadConvives.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadConvives.fulfilled, (state, action) => {
        state.status = 'success';
        state.convives = action.payload;
        state.error = null;
      })
      .addCase(loadConvives.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? null;
      })
      .addCase(addConvive.pending, (state) => {
        state.addStatus = 'adding';
      })
      .addCase(addConvive.fulfilled, (state, action) => {
        // Le convive rejoint sa place alphabétique tout de suite : sans ce tri il
        // resterait en bas de liste jusqu'au prochain chargement, qui lui l'ordonne.
        // Même comparateur que le use-case — la règle appartient au domaine.
        state.convives.push(action.payload);
        state.convives.sort(compareConvivesByName);
        state.addStatus = 'idle';
        state.addError = null;
      })
      .addCase(addConvive.rejected, (state, action) => {
        state.addStatus = 'error';
        state.addError = action.error.message ?? null;
      });
  },
});

export const convivesReducer = convivesSlice.reducer;

export const selectConvives = (state: RootState): ConvivesState => state.convives;
