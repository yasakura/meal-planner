import { describe, it, expect } from 'vitest';

import { IngredientBuilder } from '../../domain/test-builders/ingredient.builder';
import { type E2eControls } from '../../data/e2e/e2e-failure-switch';
import { observeAuthState, selectAuth } from '../features/auth/auth-slice';
import { loadCatalogue, selectCatalogue } from '../features/catalogue/catalogue-slice';
import { addConvive, loadConvives, selectConvives } from '../features/convives/convives-slice';
import { generateMenu, selectMenu } from '../features/menu/menu-slice';
import {
  loadRecipeDetail,
  selectRecipeDetail,
} from '../features/recipe-detail/recipe-detail-slice';
import { updateRecipe } from '../features/recipe/recipe-edit-slice';
import { createRecipe } from '../features/recipe/recipe-slice';
import { createE2eStore, type E2eHost } from './create-e2e-store';

type TestHost = E2eHost & { __e2e?: E2eControls };

function hostAt(search: string): TestHost {
  return { location: { search } };
}

function controlsOf(host: TestHost): E2eControls {
  const controls = host.__e2e;
  if (controls === undefined) throw new Error('hook __e2e absent de l’hôte');
  return controls;
}

describe('createE2eStore', () => {
  it('démarre sur une session ouverte : l’AuthGate ne montre jamais l’écran de connexion', () => {
    const store = createE2eStore(hostAt(''));

    store.dispatch(observeAuthState());

    expect(selectAuth(store.getState()).status).toBe('authenticated');
  });

  it('précharge le foyer, dans l’ordre du domaine', async () => {
    const store = createE2eStore(hostAt(''));

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Alice',
      'Bruno',
      'Chloé',
      'Émile',
    ]);
  });

  it('précharge le catalogue, dans l’ordre du domaine', async () => {
    const store = createE2eStore(hostAt(''));

    await store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState()).recipes.map((recipe) => recipe.title)).toEqual([
      'Curry de pois chiches',
      'Gratin dauphinois',
      'Omelette aux herbes',
    ]);
  });

  it('obéit aux compteurs de l’URL pour l’état de départ', async () => {
    const store = createE2eStore(hostAt('?convives=1&recipes=0'));

    await store.dispatch(loadConvives());
    await store.dispatch(loadCatalogue());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Alice',
    ]);
    expect(selectCatalogue(store.getState()).recipes).toEqual([]);
  });

  it('ouvre le détail d’une recette préchargée par son id stable', async () => {
    const store = createE2eStore(hostAt(''));

    await store.dispatch(loadRecipeDetail('recipe-gratin-dauphinois'));

    const detail = selectRecipeDetail(store.getState());
    expect(detail.status).toBe('success');
    expect(detail.recipe?.title).toBe('Gratin dauphinois');
  });

  it('câble les use-cases convives sur un même dépôt : un ajout survit au rechargement', async () => {
    const store = createE2eStore(hostAt('?convives=0'));

    await store.dispatch(addConvive({ name: 'Zoé' }));
    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Zoé',
    ]);
  });

  it('n’écrase aucun convive préchargé en ajoutant : les ids générés sont hors du jeu de fixtures', async () => {
    const store = createE2eStore(hostAt(''));

    await store.dispatch(addConvive({ name: 'Zoé' }));
    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Alice',
      'Bruno',
      'Chloé',
      'Émile',
      'Zoé',
    ]);
  });

  it('câble les use-cases recettes sur un même dépôt : une création rejoint le catalogue', async () => {
    const store = createE2eStore(hostAt('?recipes=0'));

    await store.dispatch(
      createRecipe({
        title: 'Tarte aux poireaux',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    );
    await store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState()).recipes.map((recipe) => recipe.title)).toEqual([
      'Tarte aux poireaux',
    ]);
  });

  it('câble la modification sur le MÊME dépôt : une recette modifiée est relue au catalogue', async () => {
    const store = createE2eStore(hostAt(''));

    await store.dispatch(
      updateRecipe({
        id: 'recipe-gratin-dauphinois',
        title: 'Gratin de courgettes',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    );
    await store.dispatch(loadCatalogue());

    // La modification REMPLACE : l'ancien titre a disparu, aucune quatrième recette n'est née.
    expect(selectCatalogue(store.getState()).recipes.map((recipe) => recipe.title)).toEqual([
      'Curry de pois chiches',
      'Gratin de courgettes',
      'Omelette aux herbes',
    ]);
  });

  it('génère un menu REPRODUCTIBLE : deux générations identiques donnent le même menu', async () => {
    const store = createE2eStore(hostAt(''));

    await store.dispatch(generateMenu(3));
    const premier = selectMenu(store.getState()).menu;
    await store.dispatch(generateMenu(3));
    const second = selectMenu(store.getState()).menu;

    expect(premier).not.toBeNull();
    expect(second).toEqual(premier);
  });

  it('fait échouer les lectures à la demande, PUIS les rétablit sans trace', async () => {
    // La séquence, pas l'instantané : « échouer, observer, rétablir, observer ». Sans
    // pilotage en cours de scénario, la sortie d'un état non-nominal est invérifiable.
    const host = hostAt('');
    const store = createE2eStore(host);

    controlsOf(host).failReads();
    await store.dispatch(loadConvives());
    expect(selectConvives(store.getState()).status).toBe('unavailable');

    controlsOf(host).restore();
    await store.dispatch(loadConvives());
    expect(selectConvives(store.getState()).status).toBe('success');
    expect(selectConvives(store.getState()).convives).toHaveLength(4);
  });

  it('fait échouer les écritures à la demande, sans toucher aux lectures', async () => {
    const host = hostAt('');
    const store = createE2eStore(host);

    controlsOf(host).failWrites();
    await store.dispatch(addConvive({ name: 'Zoé' }));

    // Constat lu AVANT tout rechargement : `loadConvives.pending` remet le cycle d'ajout au
    // repos, c'est sa fonction — l'asserter après ne prouverait plus rien.
    expect(selectConvives(store.getState()).addStatus).toBe('unconfirmed');

    await store.dispatch(loadConvives());
    expect(selectConvives(store.getState()).status).toBe('success');
  });
});
