import { describe, it, expect } from 'vitest';

import { type GetRecipe } from '../../../domain/use-cases/get-recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import {
  loadRecipeDetail,
  recipeDetailReducer,
  selectRecipeDetail,
  type RecipeDetailState,
} from './recipe-detail-slice';

describe('recipe-detail slice', () => {
  it('un store neuf est idle, sans recette ni erreur', () => {
    const store = createTestStore();

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'idle',
      recipe: null,
      error: null,
    });
  });

  it('loadRecipeDetail qui trouve une recette passe en success avec la recette renvoyée par le use case injecté', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-42').withTitle('Ratatouille').build();
    const getRecipe: GetRecipe = async () => recipe;
    const store = createTestStore({ getRecipe });

    await store.dispatch(loadRecipeDetail('r-42'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'success',
      recipe,
      error: null,
    });
  });

  it('pendant un loadRecipeDetail en vol, le status passe à loading', () => {
    const pending: GetRecipe = () => new Promise(() => {});
    const store = createTestStore({ getRecipe: pending });

    void store.dispatch(loadRecipeDetail('r-1'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'loading',
      recipe: null,
      error: null,
    });
  });

  // [guard] Dans le flux réel, pending précède toujours fulfilled/rejected, donc les
  // resets de recipe/error du pending ne meurent jamais seuls. On exerce le reducer
  // sur un état SALE (recette + erreur d'une consultation précédente) pour tuer
  // précisément ces mutants. Verrouille : « ouvrir une nouvelle recette repart d'un
  // écran de chargement propre, sans laisser voir l'ancienne recette ni l'erreur ».
  it('un nouveau chargement (pending) efface la recette et l’erreur périmées', () => {
    const stale = RecipeBuilder.aRecipe().withId('stale').withTitle('Ancienne').build();
    const dirty: RecipeDetailState = { status: 'error', recipe: stale, error: 'panne périmée' };

    const next = recipeDetailReducer(dirty, loadRecipeDetail.pending('req-1', 'r-9'));

    expect(next).toEqual({ status: 'loading', recipe: null, error: null });
  });

  it('loadRecipeDetail qui ne trouve pas la recette (undefined) passe en notFound, pas en success ni error', async () => {
    const getRecipe: GetRecipe = async () => undefined;
    const store = createTestStore({ getRecipe });

    await store.dispatch(loadRecipeDetail('inconnu'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'notFound',
      recipe: null,
      error: null,
    });
  });

  it('loadRecipeDetail en échec passe en error avec le message du use case', async () => {
    const getRecipe: GetRecipe = async () => {
      throw new Error('Firestore indisponible');
    };
    const store = createTestStore({ getRecipe });

    await store.dispatch(loadRecipeDetail('r-1'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'error',
      recipe: null,
      error: 'Firestore indisponible',
    });
  });
});
