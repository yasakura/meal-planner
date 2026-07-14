import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Account } from '../../../domain/entities/account';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

export type AuthState = {
  account: Account | null;
  status: AuthStatus;
  error: string | null;
};

const initialState: AuthState = {
  account: null,
  status: 'idle',
  error: null,
};

export const signIn = createAsyncThunk<
  Account,
  { email: string; password: string },
  AppThunkApiConfig
>('auth/signIn', async ({ email, password }, thunkApi) => {
  return await thunkApi.extra.authGateway.signIn(email, password);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
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

export const selectAuth = (state: RootState): AuthState => state.auth;
