import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import {
  createRecipe,
  recipeFormOpened,
  recipeReducer,
  selectRecipeCreation,
  type RecipeState,
} from './recipe-slice';

function anInput(): CreateRecipeInput {
  return {
    title: 'Poulet rôti',
    ingredients: [IngredientBuilder.anIngredient().build()],
    convivesReference: 4,
  };
}

describe('recipe slice', () => {
  it('un store neuf est idle', () => {
    const store = createTestStore();

    expect(selectRecipeCreation(store.getState())).toEqual({ status: 'idle' });
  });

  it('createRecipe réussi passe le store en success et forwarde l’input au use case injecté', async () => {
    let captured: CreateRecipeInput | undefined;
    const savedRecipe: Recipe = RecipeBuilder.aRecipe().build();
    const spy: CreateRecipe = async (input) => {
      captured = input;
      return savedRecipe;
    };
    const store = createTestStore({ createRecipe: spy });

    const input = anInput();
    await store.dispatch(createRecipe(input));

    expect(captured).toEqual(input);
    expect(selectRecipeCreation(store.getState())).toEqual({ status: 'success' });
  });

  it('createRecipe en échec passe le store en error', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });

    await store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({ status: 'error' });
  });

  it('pendant un createRecipe en vol, le status passe à saving', () => {
    const pending: CreateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ createRecipe: pending });

    void store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({ status: 'saving' });
  });

  // Le statut d'enregistrement est un état transitoire dans un store qui, lui, est un singleton
  // de session : resté à 'success', il fait renavigüer le formulaire à peine rouvert (issue #27).
  // C'est le REDUCER qui décide d'appliquer la remise à zéro, pas le container : le slice est
  // muté par Stryker, le .tsx ne l'est pas.
  it('l’ouverture d’un formulaire remet à idle un enregistrement déjà réussi', () => {
    const succeeded: RecipeState = { status: 'success' };

    expect(recipeReducer(succeeded, recipeFormOpened())).toEqual({ status: 'idle' });
  });

  it('l’ouverture d’un formulaire remet à idle un enregistrement en échec', () => {
    const errored: RecipeState = { status: 'error' };

    expect(recipeReducer(errored, recipeFormOpened())).toEqual({ status: 'idle' });
  });

  // Un thunk RTK n'est pas annulé par un démontage : remettre à zéro pendant un enregistrement
  // en vol déverrouillerait le bouton d'une opération encore en cours, et le 'fulfilled' à venir
  // ressusciterait un succès sur un formulaire déjà rouvert.
  it('l’ouverture d’un formulaire ne touche pas à un enregistrement encore en vol', () => {
    const saving: RecipeState = { status: 'saving' };

    expect(recipeReducer(saving, recipeFormOpened())).toEqual({ status: 'saving' });
  });
});
