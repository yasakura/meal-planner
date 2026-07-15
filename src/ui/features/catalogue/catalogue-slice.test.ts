import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import {
  catalogueReducer,
  loadCatalogue,
  selectCatalogue,
  type CatalogueState,
} from './catalogue-slice';

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

describe('catalogue slice', () => {
  it('un store neuf est idle, sans recettes ni erreur', () => {
    const store = createTestStore();

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'idle',
      recipes: [],
      error: null,
    });
  });

  it('loadCatalogue réussi passe en success avec les recettes renvoyées par le use case injecté', async () => {
    const recipes = twoRecipes();
    const listRecipes: ListRecipes = async () => recipes;
    const store = createTestStore({ listRecipes });

    await store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'success',
      recipes,
      error: null,
    });
  });

  it('loadCatalogue en échec passe en error avec le message du use case et conserve les recettes déjà chargées', async () => {
    const recipes = twoRecipes();
    let shouldFail = false;
    const listRecipes: ListRecipes = async () => {
      if (shouldFail) throw new Error('Firestore indisponible');
      return recipes;
    };
    const store = createTestStore({ listRecipes });

    await store.dispatch(loadCatalogue());
    shouldFail = true;
    await store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'error',
      recipes,
      error: 'Firestore indisponible',
    });
  });

  it('pendant un loadCatalogue en vol, le status passe à loading', () => {
    const pending: ListRecipes = () => new Promise<Recipe[]>(() => {});
    const store = createTestStore({ listRecipes: pending });

    void store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'loading',
      recipes: [],
      error: null,
    });
  });

  // [guard] green-on-arrival assumé : FULFILLED fait déjà `state.error = null`.
  // Dans le flux réel, `pending` tourne toujours avant `fulfilled` et efface déjà
  // l'erreur → les deux resets sont redondants et aucun ne meurt seul. On exerce
  // donc le reducer directement sur un état SALE (status error, error non-null)
  // avec l'action fulfilled, pour tuer précisément le mutant `state.error = null`
  // de la transition FULFILLED. Verrouille l'intention « un chargement réussi
  // efface l'erreur périmée d'une tentative précédente ».
  it('loadCatalogue réussi depuis un état en erreur efface l’erreur périmée', () => {
    const stale = RecipeBuilder.aRecipe().withId('stale').build();
    const fresh = twoRecipes();
    const errored: CatalogueState = {
      status: 'error',
      error: 'Firestore indisponible',
      recipes: [stale],
    };

    const next = catalogueReducer(errored, loadCatalogue.fulfilled(fresh, 'req-1', undefined));

    expect(next).toEqual({ status: 'success', recipes: fresh, error: null });
  });

  // [guard] même logique que le test fulfilled ci-dessus, appliquée à PENDING.
  // Dans le flux réel, un rechargement enchaîne pending → fulfilled/rejected ;
  // le reset d'erreur du pending ne meurt donc jamais seul. On exerce le reducer
  // directement sur un état SALE (status error, error non-null, recettes déjà
  // chargées) avec l'action pending, pour tuer le mutant `state.error = null` de
  // la transition PENDING. Verrouille l'intention « un rechargement efface
  // l'erreur périmée tout en conservant les recettes déjà affichées ».
  it('un rechargement (loadCatalogue.pending) efface l’erreur périmée et conserve les recettes', () => {
    const loaded = twoRecipes();
    const errored: CatalogueState = {
      status: 'error',
      error: 'Firestore indisponible',
      recipes: loaded,
    };

    const next = catalogueReducer(errored, loadCatalogue.pending('req-1', undefined));

    expect(next).toEqual({ status: 'loading', recipes: loaded, error: null });
  });
});
