import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { MenuBuilder } from '../../../domain/test-builders/menu.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import {
  recipesObservationFailed,
  recipesObserved,
  selectCatalogueAttempt,
} from '../catalogue/catalogue-slice';
import {
  convivesObservationFailed,
  convivesObserved,
  selectConvivesAttempt,
} from '../convives/convives-slice';
import {
  menusObservationFailed,
  menusObserved,
  selectSavedMenusAttempt,
} from './saved-menus-slice';
import { coursesRelancees } from './liste-de-courses-relance';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

type TestStore = ReturnType<typeof createTestStore>;

function tentatives(store: TestStore) {
  return {
    menus: selectSavedMenusAttempt(store.getState()),
    catalogue: selectCatalogueAttempt(store.getState()),
    foyer: selectConvivesAttempt(store.getState()),
  };
}

function livrerLesMenus(store: TestStore): void {
  store.dispatch(
    menusObserved({
      menus: [MenuBuilder.aMenu().startingOn(LUNDI_24_AOUT).build()],
      indexInitial: 0,
    }),
  );
}

function livrerLeCatalogue(store: TestStore): void {
  store.dispatch(recipesObserved([RecipeBuilder.aRecipe().withId('recipe-1').build()]));
}

function livrerLeFoyer(store: TestStore): void {
  store.dispatch(convivesObserved([ConviveBuilder.aConvive().build()]));
}

describe('coursesRelancees', () => {
  it('rouvre le canal des menus tombé à froid, et laisse tranquilles le catalogue et le foyer qui ont livré', () => {
    const store = createTestStore();
    livrerLeCatalogue(store);
    livrerLeFoyer(store);
    store.dispatch(menusObservationFailed({ unavailable: true }));

    store.dispatch(coursesRelancees());

    expect(tentatives(store)).toEqual({ menus: 1, catalogue: 0, foyer: 0 });
  });

  it('rouvre le canal du catalogue tombé à froid, et laisse tranquilles les menus et le foyer qui ont livré', () => {
    const store = createTestStore();
    livrerLesMenus(store);
    livrerLeFoyer(store);
    store.dispatch(recipesObservationFailed({ unavailable: false }));

    store.dispatch(coursesRelancees());

    expect(tentatives(store)).toEqual({ menus: 0, catalogue: 1, foyer: 0 });
  });

  it('rouvre le canal du foyer tombé à froid, et laisse tranquilles les menus et le catalogue qui ont livré', () => {
    const store = createTestStore();
    livrerLesMenus(store);
    livrerLeCatalogue(store);
    store.dispatch(convivesObservationFailed({ unavailable: true }));

    store.dispatch(coursesRelancees());

    expect(tentatives(store)).toEqual({ menus: 0, catalogue: 0, foyer: 1 });
  });

  it('rouvre les trois canaux quand les trois sont tombés à froid, quel que soit le genre de leur panne', () => {
    const store = createTestStore();
    store.dispatch(menusObservationFailed({ unavailable: false }));
    store.dispatch(recipesObservationFailed({ unavailable: true }));
    store.dispatch(convivesObservationFailed({ unavailable: true }));

    store.dispatch(coursesRelancees());

    expect(tentatives(store)).toEqual({ menus: 1, catalogue: 1, foyer: 1 });
  });

  it('ne rouvre rien quand les trois pannes sont survenues APRÈS la livraison : l’écran garde sa liste, il n’y a aucun canal à rouvrir', () => {
    const store = createTestStore();
    livrerLesMenus(store);
    livrerLeCatalogue(store);
    livrerLeFoyer(store);
    store.dispatch(menusObservationFailed({ unavailable: true }));
    store.dispatch(recipesObservationFailed({ unavailable: true }));
    store.dispatch(convivesObservationFailed({ unavailable: true }));

    store.dispatch(coursesRelancees());

    expect(tentatives(store)).toEqual({ menus: 0, catalogue: 0, foyer: 0 });
  });

  it('ne rouvre rien quand les sources manquantes n’ont rien constaté : sous un canal encore muet, il n’y a rien à rouvrir', () => {
    const store = createTestStore();

    store.dispatch(coursesRelancees());

    expect(tentatives(store)).toEqual({ menus: 0, catalogue: 0, foyer: 0 });
  });
});
