import { createSlice } from '@reduxjs/toolkit';

import { type RootState } from '../../store/store';
import { authStateChanged } from '../auth/auth-slice';

export const WRITE_REJECTED_NOTICE = 'Une modification n’a pas pu être enregistrée.';

export type WriteRejectionsState = {
  rejected: boolean;
};

const initialState: WriteRejectionsState = {
  rejected: false,
};

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const writeRejectionsSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'writeRejections',
  initialState,
  reducers: {
    writeRejected(state) {
      state.rejected = true;
    },
    writeRejectionDismissed(state) {
      state.rejected = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(authStateChanged, (state, action) => {
      if (action.payload !== null) return;
      state.rejected = false;
    });
  },
});

export const { writeRejected, writeRejectionDismissed } = writeRejectionsSlice.actions;

export const writeRejectionsReducer = writeRejectionsSlice.reducer;

export const selectWriteRejected = (state: RootState): boolean => state.writeRejections.rejected;
