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
      // Le chargement dont on reçoit le résultat est bien le dernier lancé : ce test parle
      // de l'effacement de l'erreur, pas de la garde de fraîcheur.
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

  // Le dépôt injoignable n'est ni un succès (catalogue vide) ni un échec quelconque : c'est
  // un état à part, sinon l'UI n'a aucun moyen de choisir le bon constat — et l'écran
  // d'accueil annonce « Aucune recette » à quelqu'un qui en a des dizaines.
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

  // `error` doit RETOMBER à null : sans ça, un écran qui lirait les deux champs afficherait
  // le constat hors-ligne ET le message d'échec périmé de la tentative précédente.
  // Les recettes déjà chargées, elles, ne sont pas jetées — l'indisponibilité porte sur le
  // status, pas sur ce qu'on savait déjà.
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

  // Le container n'annule pas ses thunks : quitter la route puis y revenir laisse la première
  // requête en vol. Sans garde, son rejet tardif écrase le catalogue qui vient de s'afficher —
  // et depuis ce cycle il l'écrase avec `unavailable`, qui ne propose même plus « Réessayer ».
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
    // Le rejet arrive APRÈS que le chargement courant a abouti : c'est tout l'enjeu.
    slow.reject(RepositoryUnavailableError.create());
    await abandoned;

    expect(selectCatalogue(store.getState())).toEqual({
      status: 'success',
      recipes: fresh,
      error: null,
      latestRequestId: current.requestId,
    });
  });

  // Symétrique : un succès tardif est tout aussi périmé qu'un rejet tardif. Sans garde,
  // l'écran reviendrait silencieusement à un catalogue plus ancien que celui affiché.
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
