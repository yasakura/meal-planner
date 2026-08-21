import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
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
      latestRequestId: null,
    });
  });

  it('loadCatalogue réussi passe en success avec les recettes renvoyées par le use case injecté', async () => {
    const recipes = twoRecipes();
    const listRecipes: ListRecipes = async () => recipes;
    const store = createTestStore({ listRecipes });

    const loaded = await store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'success',
      recipes,
      error: null,
      latestRequestId: loaded.meta.requestId,
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
    const failed = await store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'error',
      recipes,
      error: 'Firestore indisponible',
      latestRequestId: failed.meta.requestId,
    });
  });

  it('pendant un loadCatalogue en vol, le status passe à loading', () => {
    const pending: ListRecipes = () => new Promise<Recipe[]>(() => {});
    const store = createTestStore({ listRecipes: pending });

    const inFlight = store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'loading',
      recipes: [],
      error: null,
      latestRequestId: inFlight.requestId,
    });
  });

  it('loadCatalogue réussi depuis un état en erreur efface l’erreur périmée', () => {
    const stale = RecipeBuilder.aRecipe().withId('stale').build();
    const fresh = twoRecipes();
    const errored: CatalogueState = {
      status: 'error',
      error: 'Firestore indisponible',
      recipes: [stale],
      latestRequestId: 'req-1',
    };

    const next = catalogueReducer(errored, loadCatalogue.fulfilled(fresh, 'req-1', undefined));

    expect(next).toEqual({
      status: 'success',
      recipes: fresh,
      error: null,
      latestRequestId: 'req-1',
    });
  });

  it('un rechargement (loadCatalogue.pending) efface l’erreur périmée et conserve les recettes', () => {
    const loaded = twoRecipes();
    const errored: CatalogueState = {
      status: 'error',
      error: 'Firestore indisponible',
      recipes: loaded,
      latestRequestId: null,
    };

    const next = catalogueReducer(errored, loadCatalogue.pending('req-1', undefined));

    expect(next).toEqual({
      status: 'loading',
      recipes: loaded,
      error: null,
      latestRequestId: 'req-1',
    });
  });

  it('un chargement empêché par un dépôt injoignable prend un status distinct de error', async () => {
    const unavailable: ListRecipes = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ listRecipes: unavailable });

    const refused = await store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'unavailable',
      recipes: [],
      error: null,
      latestRequestId: refused.meta.requestId,
    });
  });

  it('un dépôt injoignable efface l’erreur périmée et conserve les recettes déjà chargées', () => {
    const loaded = twoRecipes();
    const errored: CatalogueState = {
      status: 'error',
      error: 'Firestore indisponible',
      recipes: loaded,
      latestRequestId: 'req-1',
    };

    const next = catalogueReducer(
      errored,
      loadCatalogue.rejected(RepositoryUnavailableError.create(), 'req-1', undefined),
    );

    expect(next).toEqual({
      status: 'unavailable',
      recipes: loaded,
      error: null,
      latestRequestId: 'req-1',
    });
  });

  it('un rejet tardif d’un chargement dépassé n’écrase pas le catalogue fraîchement chargé', async () => {
    const fresh = twoRecipes();
    const slow = deferred<Recipe[]>();
    let call = 0;
    const listRecipes: ListRecipes = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.resolve(fresh);
    };
    const store = createTestStore({ listRecipes });

    const abandoned = store.dispatch(loadCatalogue());
    const current = store.dispatch(loadCatalogue());
    await current;
    slow.reject(RepositoryUnavailableError.create());
    await abandoned;

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'success',
      recipes: fresh,
      error: null,
      latestRequestId: current.requestId,
    });
  });

  it('un succès tardif d’un chargement dépassé ne réaffiche pas des recettes périmées', async () => {
    const stale = [RecipeBuilder.aRecipe().withId('vieille').withTitle('Périmée').build()];
    const fresh = twoRecipes();
    const slow = deferred<Recipe[]>();
    let call = 0;
    const listRecipes: ListRecipes = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.resolve(fresh);
    };
    const store = createTestStore({ listRecipes });

    const abandoned = store.dispatch(loadCatalogue());
    const current = store.dispatch(loadCatalogue());
    await current;
    slow.resolve(stale);
    await abandoned;

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'success',
      recipes: fresh,
      error: null,
      latestRequestId: current.requestId,
    });
  });
});
