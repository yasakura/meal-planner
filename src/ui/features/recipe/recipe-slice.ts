import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { type AppThunk, type AppThunkApiConfig, type RootState } from '../../store/store';

export type RecipeCreationStatus = 'idle' | 'saving' | 'success';

export type RecipeState = {
  status: RecipeCreationStatus;
  draftId: string | null;
  latestCreateRequestId: string | null;
};

export type RecipeFormNotice = { tone: 'success' | 'error'; message: string };

export type RecipeDraft = Omit<CreateRecipeInput, 'id'>;

export type RecipeCreated = { recipe: Recipe; nextDraftId: string };

const initialState: RecipeState = {
  status: 'idle',
  draftId: null,
  latestCreateRequestId: null,
};

export function recipeInitialState(draftId: string): RecipeState {
  return { ...initialState, draftId };
}

function draftIdOf(state: RecipeState): string {
  return state.draftId as string;
}

export const createRecipe = createAsyncThunk<RecipeCreated, RecipeDraft, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'recipe/createRecipe',
  async (draft, thunkApi) => {
    const recipe = await thunkApi.extra.createRecipe({
      id: draftIdOf(thunkApi.getState().recipe),
      ...draft,
    });
    return { recipe, nextDraftId: thunkApi.extra.newRecipeId() };
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
const recipeSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'recipe',
  initialState,
  reducers: {
    recipeFormOpened(state, action: PayloadAction<string>) {
      if (state.status === 'saving') return;
      state.status = 'idle';
      state.draftId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRecipe.pending, (state, action) => {
        state.latestCreateRequestId = action.meta.requestId;
        state.status = 'saving';
      })
      .addCase(createRecipe.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestCreateRequestId) return;
        state.status = 'success';
        state.draftId = action.payload.nextDraftId;
      });
  },
});

const { recipeFormOpened } = recipeSlice.actions;

export function recipeFormScreenOpened(): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(recipeFormOpened(extra.newRecipeId()));
  };
}

export const recipeReducer = recipeSlice.reducer;

export const selectRecipeCreation = (state: RootState): RecipeState => state.recipe;

export function recipeCreateNoticeOf(state: RecipeState): RecipeFormNotice | null {
  if (state.status === 'success') return { tone: 'success', message: 'Recette enregistrée.' };
  return null;
}

export const selectIsCreationLocked = (state: RootState): boolean =>
  state.recipe.status === 'saving';
