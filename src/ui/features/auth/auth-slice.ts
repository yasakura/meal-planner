import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type Account } from '../../../domain/entities/account';
import { type Unsubscribe } from '../../../domain/ports/auth-gateway';
import {
  type AppDependencies,
  type AppDispatch,
  type AppThunkApiConfig,
  type RootState,
} from '../../store/store';

export type AuthStatus = 'initializing' | 'unauthenticated' | 'loading' | 'authenticated' | 'error';

export type AuthState = {
  account: Account | null;
  status: AuthStatus;
  error: string | null;
};

const initialState: AuthState = {
  account: null,
  status: 'initializing',
  error: null,
};

export const signIn = createAsyncThunk<
  Account,
  { email: string; password: string },
  AppThunkApiConfig
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
>('auth/signIn', async ({ email, password }, thunkApi) => {
  return await thunkApi.extra.authGateway.signIn(email, password);
});

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const authSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'auth',
  initialState,
  reducers: {
    authStateChanged: (state, action: PayloadAction<Account | null>) => {
      if (action.payload === null) {
        state.status = 'unauthenticated';
        state.account = null;
      } else {
        state.status = 'authenticated';
        state.account = action.payload;
      }
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.account = action.payload;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = 'error';
        state.account = null;
        state.error = action.error.message ?? null;
      });
  },
});

export const authReducer = authSlice.reducer;

export const { authStateChanged } = authSlice.actions;

export const observeAuthState =
  () =>
  (dispatch: AppDispatch, _getState: () => RootState, extra: AppDependencies): Unsubscribe =>
    extra.authGateway.observeAuthState((account) => dispatch(authStateChanged(account)));

export const signOut =
  () =>
  async (
    _dispatch: AppDispatch,
    _getState: () => RootState,
    extra: AppDependencies,
  ): Promise<void> => {
    try {
      await extra.authGateway.signOut();
      // eslint-disable-next-line no-empty
    } catch {}
  };

export const selectAuth = (state: RootState): AuthState => state.auth;
