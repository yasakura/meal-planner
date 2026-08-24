import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../domain/entities/calendar-date';
import { IngredientBuilder } from '../../domain/test-builders/ingredient.builder';
import { type E2eControls } from '../../data/e2e/e2e-failure-switch';
import { E2E_TODAY } from '../../data/e2e/e2e-fixtures';
import { observeAuthState, selectAuth } from '../features/auth/auth-slice';
import { observeRecipes, selectCatalogue } from '../features/catalogue/catalogue-slice';
import { addConvive, observeConvives, selectConvives } from '../features/convives/convives-slice';
import { generateMenu, saveMenu, selectMenu } from '../features/menu/menu-slice';
import { recipeOfRoute } from '../features/recipe-detail/recipe-detail-states';
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

    store.dispatch(observeConvives());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Alice',
      'Bruno',
      'Chloé',
      'Émile',
    ]);
  });

  it('précharge le catalogue, dans l’ordre du domaine', () => {
    const store = createE2eStore(hostAt(''));

    store.dispatch(observeRecipes());

    expect(selectCatalogue(store.getState()).recipes?.map((recipe) => recipe.title)).toEqual([
      'Curry de pois chiches',
      'Gratin dauphinois',
      'Omelette aux herbes',
    ]);
  });

  it('obéit aux compteurs de l’URL pour l’état de départ', async () => {
    const store = createE2eStore(hostAt('?convives=1&recipes=0'));

    store.dispatch(observeConvives());
    store.dispatch(observeRecipes());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Alice',
    ]);
    expect(selectCatalogue(store.getState()).recipes).toEqual([]);
  });

  it('ouvre le détail d’une recette préchargée par son id stable', () => {
    const store = createE2eStore(hostAt(''));

    store.dispatch(observeRecipes());

    const recette = recipeOfRoute(selectCatalogue(store.getState()), 'recipe-gratin-dauphinois');
    expect(recette).not.toBeNull();
    expect(recette?.title).toBe('Gratin dauphinois');
  });

  it('câble les use-cases convives sur un même dépôt : un ajout survit au rechargement', async () => {
    const store = createE2eStore(hostAt('?convives=0'));

    await store.dispatch(addConvive({ name: 'Zoé' }));
    store.dispatch(observeConvives());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Zoé',
    ]);
  });

  it('n’écrase aucun convive préchargé en ajoutant : les ids générés sont hors du jeu de fixtures', async () => {
    const store = createE2eStore(hostAt(''));

    await store.dispatch(addConvive({ name: 'Zoé' }));
    store.dispatch(observeConvives());

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
    store.dispatch(observeRecipes());

    expect(selectCatalogue(store.getState()).recipes?.map((recipe) => recipe.title)).toEqual([
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
    store.dispatch(observeRecipes());

    expect(selectCatalogue(store.getState()).recipes?.map((recipe) => recipe.title)).toEqual([
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

  it('date le menu sur l’horloge FIGÉE, au prochain lundi — qui n’est pas le jour même', async () => {
    const store = createE2eStore(hostAt(''));

    await store.dispatch(generateMenu(3));

    const dateDebut = selectMenu(store.getState()).menu?.dateDebut;
    expect(dateDebut).toEqual(createCalendarDate({ year: 2026, month: 1, day: 5 }));
    expect(dateDebut).not.toEqual(E2E_TODAY);
  });

  it('fait échouer les lectures à la demande, PUIS les rétablit sans trace', async () => {
    const host = hostAt('');
    const store = createE2eStore(host);

    controlsOf(host).failReads();
    store.dispatch(observeConvives());
    expect(selectConvives(store.getState()).failure).toBe('unavailable');
    expect(selectConvives(store.getState()).received).toBe(false);

    controlsOf(host).restore();
    store.dispatch(observeConvives());
    expect(selectConvives(store.getState()).failure).toBeNull();
    expect(selectConvives(store.getState()).received).toBe(true);
    expect(selectConvives(store.getState()).convives).toHaveLength(4);
  });

  it('enregistre le menu sur son dépôt e2e, et fait échouer l’écriture à la demande', async () => {
    const host = hostAt('');
    const store = createE2eStore(host);
    await store.dispatch(generateMenu(3));

    controlsOf(host).failWrites();
    await store.dispatch(saveMenu());
    expect(selectMenu(store.getState()).saveStatus).toBe('unconfirmed');

    controlsOf(host).restore();
    await store.dispatch(saveMenu());
    expect(selectMenu(store.getState()).saveStatus).toBe('saved');
  });

  it('fait échouer les écritures à la demande, sans toucher aux lectures', async () => {
    const host = hostAt('');
    const store = createE2eStore(host);

    controlsOf(host).failWrites();
    await store.dispatch(addConvive({ name: 'Zoé' }));

    expect(selectConvives(store.getState()).addStatus).toBe('unconfirmed');

    store.dispatch(observeConvives());
    expect(selectConvives(store.getState()).received).toBe(true);
    expect(selectConvives(store.getState()).failure).toBeNull();
  });
});
