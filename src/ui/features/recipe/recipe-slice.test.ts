import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { type NewRecipeId } from '../../../domain/use-cases/new-recipe-id';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { deferred } from '../../test-utils/deferred';
import {
  createRecipe,
  recipeCreateNoticeOf,
  recipeFormScreenOpened,
  selectIsCreationLocked,
  selectRecipeCreation,
  type RecipeDraft,
} from './recipe-slice';

function anInput(): RecipeDraft {
  return {
    title: 'Poulet rôti',
    ingredients: [IngredientBuilder.anIngredient().build()],
    convivesReference: 4,
  };
}

const ID_DU_STORE = 'generated-id-1';

function identifiantsSuccessifs(): NewRecipeId {
  let rang = 0;
  return () => `id-${++rang}`;
}

function unSucces(): CreateRecipe {
  return async () => RecipeBuilder.aRecipe().build();
}

describe('recipe slice', () => {
  it('un store neuf est idle, et porte déjà un identifiant de brouillon', () => {
    const store = createTestStore();

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'idle',
      draftId: ID_DU_STORE,
      latestCreateRequestId: null,
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
    const enregistrement = await store.dispatch(createRecipe(input));

    expect(captured).toEqual({ id: ID_DU_STORE, ...input });
    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'success',
      draftId: ID_DU_STORE,
      latestCreateRequestId: enregistrement.meta.requestId,
    });
  });

  it('pendant un createRecipe en vol, le status passe à saving', () => {
    const pending: CreateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ createRecipe: pending });

    const enVol = store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'saving',
      draftId: ID_DU_STORE,
      latestCreateRequestId: enVol.requestId,
    });
  });

  it('l’ouverture d’un formulaire remet à idle un enregistrement déjà réussi', async () => {
    const store = createTestStore({ createRecipe: unSucces() });
    await store.dispatch(createRecipe(anInput()));

    store.dispatch(recipeFormScreenOpened());

    expect(selectRecipeCreation(store.getState()).status).toBe('idle');
  });

  it('chaque ouverture de formulaire pose un identifiant NEUF', () => {
    const store = createTestStore({ newRecipeId: identifiantsSuccessifs() });

    store.dispatch(recipeFormScreenOpened());
    expect(selectRecipeCreation(store.getState()).draftId).toBe('id-2');

    store.dispatch(recipeFormScreenOpened());
    expect(selectRecipeCreation(store.getState()).draftId).toBe('id-3');
  });

  it('deux formulaires successifs écrivent sous deux identifiants distincts', async () => {
    const ids: string[] = [];
    const spy: CreateRecipe = async (input) => {
      ids.push(input.id);
      return RecipeBuilder.aRecipe().build();
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });

    store.dispatch(recipeFormScreenOpened());
    await store.dispatch(createRecipe(anInput()));
    store.dispatch(recipeFormScreenOpened());
    await store.dispatch(createRecipe(anInput()));

    expect(ids).toEqual(['id-2', 'id-4']);
  });

  it('l’ouverture d’un formulaire ne touche pas à un enregistrement encore en vol', () => {
    const pending: CreateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ createRecipe: pending, newRecipeId: identifiantsSuccessifs() });
    store.dispatch(recipeFormScreenOpened());
    const enVol = store.dispatch(createRecipe(anInput()));

    store.dispatch(recipeFormScreenOpened());

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'saving',
      draftId: 'id-2',
      latestCreateRequestId: enVol.requestId,
    });
  });

  it('après une ouverture refusée en vol, l’envoi suivant écrit sous un identifiant NEUF', async () => {
    const ids: string[] = [];
    const enVol = deferred<Recipe>();
    let appels = 0;
    const spy: CreateRecipe = (input) => {
      ids.push(input.id);
      appels += 1;
      return appels === 1 ? enVol.promise : Promise.resolve(RecipeBuilder.aRecipe().build());
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });
    store.dispatch(recipeFormScreenOpened());

    const premier = store.dispatch(createRecipe(anInput()));
    store.dispatch(recipeFormScreenOpened());
    enVol.resolve(RecipeBuilder.aRecipe().build());
    await premier;

    await store.dispatch(createRecipe(anInput()));

    expect(ids).toEqual(['id-2', 'id-4']);
  });

  it('un succès tardif d’un envoi dépassé ne renouvelle pas l’identifiant du formulaire courant', async () => {
    const lent = deferred<Recipe>();
    let appels = 0;
    const spy: CreateRecipe = () => {
      appels += 1;
      return appels === 1 ? lent.promise : Promise.resolve(RecipeBuilder.aRecipe().build());
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });

    const abandonne = store.dispatch(createRecipe(anInput()));
    const courant = store.dispatch(createRecipe(anInput()));
    await courant;
    lent.resolve(RecipeBuilder.aRecipe().build());
    await abandonne;

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'success',
      draftId: 'id-2',
      latestCreateRequestId: courant.requestId,
    });
  });
  const SUCCES = { tone: 'success', message: 'Recette enregistrée.' };

  function constat(store: ReturnType<typeof createTestStore>) {
    return recipeCreateNoticeOf(selectRecipeCreation(store.getState()));
  }

  it('pendant l’enregistrement, l’envoi est verrouillé et l’écran ne constate rien encore ; au règlement, le verrou se lève et le constat paraît', async () => {
    const enVol = deferred<Recipe>();
    const store = createTestStore({ createRecipe: () => enVol.promise });

    const enregistrement = store.dispatch(createRecipe(anInput()));

    expect(selectIsCreationLocked(store.getState())).toBe(true);
    expect(constat(store)).toBeNull();

    enVol.resolve(RecipeBuilder.aRecipe().build());
    await enregistrement;
    expect(selectIsCreationLocked(store.getState())).toBe(false);
    expect(constat(store)).toEqual(SUCCES);
  });
});
