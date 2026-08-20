import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import {
  createRecipe,
  recipeCreateNoticeOf,
  recipeFormEdited,
  recipeFormOpened,
  recipeReducer,
  selectIsCreationLocked,
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
  /**
   * Hors ligne, `setDoc` n'acquitte jamais : la borne de `withAckDeadline` rejette au bout de
   * 5 s alors que l'écriture est en FILE LOCALE et atterrira au retour du réseau. Un verdict
   * d'échec ferait ressaisir l'utilisateur, et `createRecipeUseCase` génèrerait un SECOND cuid
   * — deux documents pour une seule recette. Même vocabulaire que les convives et le menu :
   * une troisième issue, qui n'affirme ni que la recette est enregistrée ni qu'elle est perdue.
   */
  it('le dépôt qui n’a pas répondu : l’enregistrement n’est pas confirmé, il n’a pas échoué', async () => {
    const nonAcquitte: CreateRecipe = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ createRecipe: nonAcquitte });

    await store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({ status: 'unconfirmed' });
  });
  const SUCCES = { tone: 'success', message: 'Recette enregistrée.' };
  const PANNE = {
    tone: 'unconfirmed',
    message: 'Aucune connexion — l’enregistrement de la recette n’a pas pu être confirmé.',
  };
  const ECHEC = { tone: 'error', message: 'Impossible d’enregistrer la recette.' };

  const nonAcquitte: CreateRecipe = () => Promise.reject(RepositoryUnavailableError.create());

  function constat(store: ReturnType<typeof createTestStore>) {
    return recipeCreateNoticeOf(selectRecipeCreation(store.getState()));
  }

  /**
   * L'écriture est PARTIE : elle atterrira au retour du réseau. Réarmer l'envoi inviterait un
   * second appui, donc un second cuid, donc deux documents pour une seule recette.
   */
  it('un enregistrement non acquitté se constate poliment et VERROUILLE l’envoi', async () => {
    const store = createTestStore({ createRecipe: nonAcquitte });

    await store.dispatch(createRecipe(anInput()));

    expect(constat(store)).toEqual(PANNE);
    expect(selectIsCreationLocked(store.getState())).toBe(true);
  });

  // Le dépôt a bel et bien répondu, et il a refusé : rien n'est parti, l'envoi se réarme.
  it('un échec franc du dépôt : l’écran dit l’échec, et l’envoi se réarme', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });

    await store.dispatch(createRecipe(anInput()));

    expect(constat(store)).toEqual(ECHEC);
    expect(selectIsCreationLocked(store.getState())).toBe(false);
  });

  it('pendant l’enregistrement, l’envoi est verrouillé et l’écran ne constate rien encore', async () => {
    const enVol = deferred<Recipe>();
    const store = createTestStore({ createRecipe: () => enVol.promise });

    const enregistrement = store.dispatch(createRecipe(anInput()));

    expect(selectIsCreationLocked(store.getState())).toBe(true);
    expect(constat(store)).toBeNull();

    // GAGE des deux assertions ci-dessus : le verrou se lève et le constat paraît au règlement.
    // Sans lui, un verrou armé pour toujours et un écran définitivement muet passeraient aussi.
    enVol.resolve(RecipeBuilder.aRecipe().build());
    await enregistrement;
    expect(selectIsCreationLocked(store.getState())).toBe(false);
    expect(constat(store)).toEqual(SUCCES);
  });

  /**
   * MÉCANISME DE RÉCUPÉRATION, repris des convives : c'est la saisie qui efface le constat et
   * lève le verrou. Sans lui, le formulaire n'aurait pour seule sortie que d'être quitté — en
   * abandonnant tout ce qui y a été tapé.
   */
  it('la saisie efface un constat non acquitté et lève le verrou', () => {
    const nonConfirme: RecipeState = { status: 'unconfirmed' };

    expect(recipeReducer(nonConfirme, recipeFormEdited())).toEqual({ status: 'idle' });
  });

  // Un thunk RTK n'est pas annulé : taper pendant les 5 s de la borne d'acquittement ne doit pas
  // réarmer le bouton d'une écriture encore en vol — ce serait le doublon par un autre chemin.
  it('la saisie ne déverrouille pas un enregistrement encore en vol', () => {
    const saving: RecipeState = { status: 'saving' };

    expect(recipeReducer(saving, recipeFormEdited())).toEqual({ status: 'saving' });
  });

  it('l’ouverture d’un formulaire efface un constat non acquitté', () => {
    const nonConfirme: RecipeState = { status: 'unconfirmed' };

    expect(recipeReducer(nonConfirme, recipeFormOpened())).toEqual({ status: 'idle' });
  });
});
