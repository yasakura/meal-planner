import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { type UpdateRecipe, type UpdateRecipeInput } from '../../../domain/use-cases/update-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import {
  recipeEditFormOpened,
  recipeEditNoticeOf,
  recipeEditReducer,
  selectRecipeEdition,
  updateRecipe,
  type RecipeEditState,
} from './recipe-edit-slice';

function anInput(): UpdateRecipeInput {
  return {
    id: 'r-1',
    title: 'Poulet basquaise',
    ingredients: [IngredientBuilder.anIngredient().build()],
    convivesReference: 4,
  };
}

describe('recipe edit slice', () => {
  it('un store neuf est idle', () => {
    const store = createTestStore();

    expect(selectRecipeEdition(store.getState())).toEqual({ status: 'idle' });
  });

  it('updateRecipe réussi passe le store en success et forwarde l’input au use case injecté', async () => {
    let captured: UpdateRecipeInput | undefined;
    const savedRecipe: Recipe = RecipeBuilder.aRecipe().build();
    const spy: UpdateRecipe = async (input) => {
      captured = input;
      return savedRecipe;
    };
    const store = createTestStore({ updateRecipe: spy });

    const input = anInput();
    await store.dispatch(updateRecipe(input));

    expect(captured).toEqual(input);
    expect(selectRecipeEdition(store.getState())).toEqual({ status: 'success' });
  });

  it('updateRecipe en échec passe le store en error', async () => {
    const failing: UpdateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ updateRecipe: failing });

    await store.dispatch(updateRecipe(anInput()));

    expect(selectRecipeEdition(store.getState())).toEqual({ status: 'error' });
  });

  it('pendant un updateRecipe en vol, le status passe à saving', () => {
    const pending: UpdateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ updateRecipe: pending });

    void store.dispatch(updateRecipe(anInput()));

    expect(selectRecipeEdition(store.getState())).toEqual({ status: 'saving' });
  });

  it('l’ouverture d’un formulaire remet à idle une modification déjà réussie', () => {
    const succeeded: RecipeEditState = { status: 'success' };

    expect(recipeEditReducer(succeeded, recipeEditFormOpened())).toEqual({ status: 'idle' });
  });

  it('l’ouverture d’un formulaire remet à idle une modification en échec', () => {
    const errored: RecipeEditState = { status: 'error' };

    expect(recipeEditReducer(errored, recipeEditFormOpened())).toEqual({ status: 'idle' });
  });

  it('l’ouverture d’un formulaire ne touche pas à une modification encore en vol', () => {
    const saving: RecipeEditState = { status: 'saving' };

    expect(recipeEditReducer(saving, recipeEditFormOpened())).toEqual({ status: 'saving' });
  });

  it('une modification réussie ne touche pas au statut de création', async () => {
    const savedRecipe: Recipe = RecipeBuilder.aRecipe().build();
    const spy: UpdateRecipe = async () => savedRecipe;
    const store = createTestStore({ updateRecipe: spy });

    await store.dispatch(updateRecipe(anInput()));

    expect(store.getState().recipe).toEqual({
      status: 'idle',
      draftId: 'generated-id-1',
      latestCreateRequestId: null,
    });
  });
  const ECHEC = { tone: 'error', message: 'Impossible d’enregistrer la recette.' };

  function constat(store: ReturnType<typeof createTestStore>) {
    return recipeEditNoticeOf(selectRecipeEdition(store.getState()));
  }

  it('un échec franc du dépôt : l’écran dit que l’enregistrement a échoué', async () => {
    const failing: UpdateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ updateRecipe: failing });

    await store.dispatch(updateRecipe(anInput()));

    expect(constat(store)).toEqual(ECHEC);
  });

  it('pendant la modification, l’écran ne constate rien encore', () => {
    const pending: UpdateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ updateRecipe: pending });

    void store.dispatch(updateRecipe(anInput()));

    expect(constat(store)).toBeNull();
  });

  it('l’ouverture d’un formulaire efface un constat de refus', () => {
    const refuse: RecipeEditState = { status: 'error' };

    expect(recipeEditReducer(refuse, recipeEditFormOpened())).toEqual({ status: 'idle' });
  });
});
