import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import {
  createRecipe,
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
  it('un store neuf est idle, sans erreur', () => {
    const store = createTestStore();

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'idle',
      error: null,
    });
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
    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'success',
      error: null,
    });
  });

  it('createRecipe en échec passe le store en error avec le message du use case', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });

    await store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'error',
      error: 'Firestore indisponible',
    });
  });

  it('pendant un createRecipe en vol, le status passe à saving', () => {
    const pending: CreateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ createRecipe: pending });

    void store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'saving',
      error: null,
    });
  });

  // [guard] green-on-arrival assumé : le code fait déjà `state.error = null` en fulfilled.
  // Aucun test de flux ne part d'un état error → ce reset est un mutant survivant.
  // NB : impossible à isoler via le store (dans le flux réel, `pending` tourne toujours
  // avant `fulfilled` et efface déjà l'erreur → les deux resets sont redondants et aucun
  // ne meurt seul). On exerce donc le reducer directement sur un état SALE (status error,
  // error non-null) avec l'action fulfilled, pour tuer précisément le mutant
  // `state.error = null` de la transition FULFILLED. Verrouille l'intention
  // « un createRecipe réussi efface l'erreur périmée d'une tentative précédente ».
  it('createRecipe réussi depuis un état en erreur efface l’erreur périmée', () => {
    const errored: RecipeState = { status: 'error', error: 'Firestore indisponible' };
    const savedRecipe: Recipe = RecipeBuilder.aRecipe().build();

    const next = recipeReducer(errored, createRecipe.fulfilled(savedRecipe, 'req-1', anInput()));

    expect(next).toEqual({ status: 'success', error: null });
  });
});
