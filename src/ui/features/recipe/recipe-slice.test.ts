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

const refuse: CreateRecipe = () => Promise.reject(new Error('Firestore refuse'));

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

  it('createRecipe en échec passe le store en error', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });

    const enregistrement = await store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'error',
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

  it('l’ouverture d’un formulaire remet à idle un enregistrement en échec', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });
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
  it('un rejet tardif d’un envoi dépassé n’efface pas le succès de l’envoi courant', async () => {
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
    lent.reject(new Error('Firestore refuse'));
    await abandonne;

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'success',
      draftId: 'id-2',
      latestCreateRequestId: courant.requestId,
    });
  });

  it('un rejet tardif d’un envoi dépassé ne déverrouille pas l’envoi encore en vol', async () => {
    const lent = deferred<Recipe>();
    let appels = 0;
    const spy: CreateRecipe = () => {
      appels += 1;
      return appels === 1 ? lent.promise : new Promise<Recipe>(() => {});
    };
    const store = createTestStore({ createRecipe: spy });

    const abandonne = store.dispatch(createRecipe(anInput()));
    const courant = store.dispatch(createRecipe(anInput()));
    lent.reject(new Error('Firestore refuse'));
    await abandonne;

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'saving',
      draftId: ID_DU_STORE,
      latestCreateRequestId: courant.requestId,
    });
    expect(selectIsCreationLocked(store.getState())).toBe(true);
  });

  const SUCCES = { tone: 'success', message: 'Recette enregistrée.' };
  const ECHEC = { tone: 'error', message: 'Impossible d’enregistrer la recette.' };

  function constat(store: ReturnType<typeof createTestStore>) {
    return recipeCreateNoticeOf(selectRecipeCreation(store.getState()));
  }

  it('un enregistrement refusé se constate, et l’envoi se réarme', async () => {
    const store = createTestStore({ createRecipe: refuse });

    await store.dispatch(createRecipe(anInput()));

    expect(constat(store)).toEqual(ECHEC);
    expect(selectIsCreationLocked(store.getState())).toBe(false);
  });

  it('un second envoi après un constat de refus réécrit le MÊME document', async () => {
    const ids: string[] = [];
    const spy: CreateRecipe = (input) => {
      ids.push(input.id);
      return Promise.reject(new Error('Firestore refuse'));
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });
    store.dispatch(recipeFormScreenOpened());

    await store.dispatch(createRecipe(anInput()));
    await store.dispatch(createRecipe(anInput()));

    expect(ids).toEqual(['id-2', 'id-2']);
  });

  it('un échec franc du dépôt : l’écran dit l’échec, et l’envoi se réarme', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });

    await store.dispatch(createRecipe(anInput()));

    expect(constat(store)).toEqual(ECHEC);
    expect(selectIsCreationLocked(store.getState())).toBe(false);
  });

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

  it('un envoi qui aboutit chasse le constat de refus du précédent', async () => {
    let enPanne = true;
    const spy: CreateRecipe = async () => {
      if (enPanne) throw new Error('Firestore refuse');
      return RecipeBuilder.aRecipe().build();
    };
    const store = createTestStore({ createRecipe: spy });
    await store.dispatch(createRecipe(anInput()));
    expect(constat(store)).toEqual(ECHEC);

    enPanne = false;
    await store.dispatch(createRecipe(anInput()));

    expect(constat(store)).toEqual(SUCCES);
  });
});
