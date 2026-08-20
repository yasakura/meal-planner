import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type UpdateRecipe, type UpdateRecipeInput } from '../../../domain/use-cases/update-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
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

/**
 * Slice DISTINCT de `recipe-slice`. La création et la modification sont deux opérations
 * atteignables depuis deux écrans différents ; partager un statut transitoire entre elles est
 * exactement le défaut que l'issue #27 a coûté — un `success` rémanent qui renavigue le
 * formulaire à peine rouvert. Un statut par opération, aucune cohabitation possible.
 */
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

  // Rémanence : le store est un singleton de session. Resté à 'success', le statut ferait
  // renavigüer vers le détail un formulaire d'édition à peine rouvert. C'est le REDUCER qui
  // décide de la remise à zéro — il est muté par Stryker, le container ne l'est pas.
  it('l’ouverture d’un formulaire remet à idle une modification déjà réussie', () => {
    const succeeded: RecipeEditState = { status: 'success' };

    expect(recipeEditReducer(succeeded, recipeEditFormOpened())).toEqual({ status: 'idle' });
  });

  it('l’ouverture d’un formulaire remet à idle une modification en échec', () => {
    const errored: RecipeEditState = { status: 'error' };

    expect(recipeEditReducer(errored, recipeEditFormOpened())).toEqual({ status: 'idle' });
  });

  // Un thunk RTK n'est pas annulé par un démontage : remettre à zéro pendant une modification
  // en vol déverrouillerait le bouton d'une opération encore en cours.
  it('l’ouverture d’un formulaire ne touche pas à une modification encore en vol', () => {
    const saving: RecipeEditState = { status: 'saving' };

    expect(recipeEditReducer(saving, recipeEditFormOpened())).toEqual({ status: 'saving' });
  });

  // La séparation des slices n'est pas décorative : une modification ne doit RIEN dire du
  // statut de création, sans quoi rouvrir « + » après une modification réussie renaviguerait.
  it('une modification réussie ne touche pas au statut de création', async () => {
    const savedRecipe: Recipe = RecipeBuilder.aRecipe().build();
    const spy: UpdateRecipe = async () => savedRecipe;
    const store = createTestStore({ updateRecipe: spy });

    await store.dispatch(updateRecipe(anInput()));

    expect(store.getState().recipe).toEqual({ status: 'idle' });
  });
  /**
   * Même borne d'acquittement, même troisième issue qu'à la création : l'écriture est partie et
   * atterrira au retour du réseau. Aucun doublon possible ici — la modification écrit sur le
   * même identifiant — mais un écran qui annonce l'échec d'une écriture en file ment tout autant.
   */
  it('le dépôt qui n’a pas répondu : la modification n’est pas confirmée, elle n’a pas échoué', async () => {
    const nonAcquitte: UpdateRecipe = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ updateRecipe: nonAcquitte });

    await store.dispatch(updateRecipe(anInput()));

    expect(selectRecipeEdition(store.getState())).toEqual({ status: 'unconfirmed' });
  });
  const PANNE = {
    tone: 'unconfirmed',
    message: 'Aucune connexion — l’enregistrement de la recette n’a pas pu être confirmé.',
  };
  const ECHEC = { tone: 'error', message: 'Impossible d’enregistrer la recette.' };

  function constat(store: ReturnType<typeof createTestStore>) {
    return recipeEditNoticeOf(selectRecipeEdition(store.getState()));
  }

  it('une modification non acquittée se constate poliment', async () => {
    const nonAcquitte: UpdateRecipe = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ updateRecipe: nonAcquitte });

    await store.dispatch(updateRecipe(anInput()));

    expect(constat(store)).toEqual(PANNE);
  });

  it('un échec franc du dépôt : l’écran dit que l’enregistrement a échoué', async () => {
    const failing: UpdateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ updateRecipe: failing });

    await store.dispatch(updateRecipe(anInput()));

    expect(constat(store)).toEqual(ECHEC);
  });

  // Pendant l'écriture, l'écran n'a rien à dire : le constat parle de l'ISSUE, pas de l'attente.
  it('pendant la modification, l’écran ne constate rien encore', () => {
    const pending: UpdateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ updateRecipe: pending });

    void store.dispatch(updateRecipe(anInput()));

    expect(constat(store)).toBeNull();
  });

  it('l’ouverture d’un formulaire efface un constat non acquitté', () => {
    const nonConfirme: RecipeEditState = { status: 'unconfirmed' };

    expect(recipeEditReducer(nonConfirme, recipeEditFormOpened())).toEqual({ status: 'idle' });
  });
});
