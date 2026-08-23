import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type ObserveRecipes } from '../../../domain/use-cases/observe-recipes';
import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { authStateChanged } from '../auth/auth-slice';
import {
  catalogueRetried,
  catalogueViewOf,
  observeRecipes,
  recipesObservationFailed,
  recipesObserved,
  selectCatalogue,
  selectCatalogueAttempt,
  selectCatalogueLinkLost,
  type CatalogueState,
} from './catalogue-slice';

function catalogueState(overrides: Partial<CatalogueState>): CatalogueState {
  return { recipes: null, failure: null, attempt: 0, ...overrides };
}

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

function emitting(recipes: Recipe[]): ObserveRecipes {
  return (listener) => {
    listener(recipes);
    return () => {};
  };
}

function refusing(error: unknown): ObserveRecipes {
  return (_listener, onError) => {
    onError(error);
    return () => {};
  };
}

describe('catalogue slice', () => {
  it('un store neuf n’a rien lu, ne constate aucune panne, et n’a tenté qu’une fois', () => {
    const store = createTestStore();

    expect(selectCatalogue(store.getState())).toEqual({
      recipes: null,
      failure: null,
      attempt: 0,
    });
  });

  it('une émission du canal remplit le catalogue avec les recettes émises', () => {
    const recipes = twoRecipes();
    const store = createTestStore();

    store.dispatch(recipesObserved(recipes));

    expect(selectCatalogue(store.getState())).toEqual({
      recipes,
      failure: null,
      attempt: 0,
    });
  });

  it('une émission ultérieure remplace le catalogue, elle ne s’y ajoute pas', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(twoRecipes()));

    const fraiches = [RecipeBuilder.aRecipe().withId('r9').withTitle('Tian').build()];
    store.dispatch(recipesObserved(fraiches));

    expect(selectCatalogue(store.getState()).recipes).toEqual(fraiches);
  });

  it('une panne ordinaire du canal se constate comme illisible', () => {
    const store = createTestStore();

    store.dispatch(recipesObservationFailed({ unavailable: false }));

    expect(selectCatalogue(store.getState())).toEqual({
      recipes: null,
      failure: 'unreadable',
      attempt: 0,
    });
  });

  it('une panne du canal sur dépôt injoignable se constate distinctement de l’illisible', () => {
    const store = createTestStore();

    store.dispatch(recipesObservationFailed({ unavailable: true }));

    expect(selectCatalogue(store.getState())).toEqual({
      recipes: null,
      failure: 'unavailable',
      attempt: 0,
    });
  });

  it('une émission après une panne efface le constat périmé', () => {
    const recipes = twoRecipes();
    const store = createTestStore();
    store.dispatch(recipesObservationFailed({ unavailable: true }));

    store.dispatch(recipesObserved(recipes));

    expect(selectCatalogue(store.getState())).toEqual({
      recipes,
      failure: null,
      attempt: 0,
    });
  });

  it('une panne après une émission garde les recettes déjà lues', () => {
    const recipes = twoRecipes();
    const store = createTestStore();
    store.dispatch(recipesObserved(recipes));

    store.dispatch(recipesObservationFailed({ unavailable: true }));

    expect(selectCatalogue(store.getState())).toEqual({
      recipes,
      failure: 'unavailable',
      attempt: 0,
    });
  });

  it('la relance efface le constat et compte une tentative de plus', () => {
    const store = createTestStore();
    store.dispatch(recipesObservationFailed({ unavailable: false }));

    store.dispatch(catalogueRetried());

    expect(selectCatalogue(store.getState())).toEqual({
      recipes: null,
      failure: null,
      attempt: 1,
    });
    expect(selectCatalogueAttempt(store.getState())).toBe(1);
  });

  it('la relance ne jette pas les recettes déjà lues', () => {
    const recipes = twoRecipes();
    const store = createTestStore();
    store.dispatch(recipesObserved(recipes));

    store.dispatch(catalogueRetried());

    expect(selectCatalogue(store.getState()).recipes).toEqual(recipes);
  });

  it('la déconnexion jette le catalogue de la session précédente', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(twoRecipes()));
    store.dispatch(recipesObservationFailed({ unavailable: true }));
    store.dispatch(catalogueRetried());

    store.dispatch(authStateChanged(null));

    expect(selectCatalogue(store.getState())).toEqual({
      recipes: null,
      failure: null,
      attempt: 0,
    });
  });

  it('une session qui s’ouvre ne jette pas ce que le canal vient d’émettre', () => {
    const recipes = twoRecipes();
    const store = createTestStore();
    store.dispatch(recipesObserved(recipes));

    store.dispatch(authStateChanged(AccountBuilder.anAccount().build()));

    expect(selectCatalogue(store.getState()).recipes).toEqual(recipes);
  });
});

describe('observeRecipes — l’abonnement branché sur le store', () => {
  it('pousse dans le store les recettes émises par le use case injecté', () => {
    const recipes = twoRecipes();
    const store = createTestStore({ observeRecipes: emitting(recipes) });

    store.dispatch(observeRecipes());

    expect(selectCatalogue(store.getState()).recipes).toEqual(recipes);
  });

  it('pousse le constat hors-ligne quand le canal refuse pour dépôt injoignable', () => {
    const store = createTestStore({
      observeRecipes: refusing(RepositoryUnavailableError.create()),
    });

    store.dispatch(observeRecipes());

    expect(selectCatalogue(store.getState()).failure).toBe('unavailable');
  });

  it('pousse le constat illisible pour toute autre panne', () => {
    const store = createTestStore({ observeRecipes: refusing(new Error('Firestore down')) });

    store.dispatch(observeRecipes());

    expect(selectCatalogue(store.getState()).failure).toBe('unreadable');
  });

  it('rend le désabonnement du use case, et c’est bien celui-là', () => {
    let desabonne = false;
    const observe: ObserveRecipes = () => () => {
      desabonne = true;
    };
    const store = createTestStore({ observeRecipes: observe });

    const unsubscribe = store.dispatch(observeRecipes());
    expect(desabonne).toBe(false);

    unsubscribe();

    expect(desabonne).toBe(true);
  });
});

describe('catalogueViewOf', () => {
  it('tant qu’aucune émission n’est arrivée, l’écran est un chargement', () => {
    const view = catalogueViewOf(catalogueState({}));

    expect(view).toEqual({ status: 'loading' });
  });

  it('tant qu’aucune émission n’est arrivée, une panne illisible donne un constat d’échec', () => {
    const view = catalogueViewOf(catalogueState({ failure: 'unreadable' }));

    expect(view).toEqual({ status: 'error' });
  });

  it('tant qu’aucune émission n’est arrivée, un dépôt injoignable donne le constat hors-ligne', () => {
    const view = catalogueViewOf(catalogueState({ failure: 'unavailable' }));

    expect(view).toEqual({ status: 'unavailable' });
  });

  it('une émission arrivée affiche les recettes émises', () => {
    const recipes = twoRecipes();

    const view = catalogueViewOf(catalogueState({ recipes }));

    expect(view).toEqual({ status: 'loaded', recipes });
  });

  it('une émission sans aucune recette est un catalogue vide, pas une lecture manquante', () => {
    const view = catalogueViewOf(catalogueState({ recipes: [] }));

    expect(view).toEqual({ status: 'empty' });
  });

  it('une panne après émission garde les recettes à l’écran, elle ne devient pas un constat d’échec', () => {
    const recipes = twoRecipes();

    const view = catalogueViewOf(catalogueState({ recipes, failure: 'unreadable' }));

    expect(view).toEqual({ status: 'loaded', recipes });
  });

  it('un dépôt injoignable après émission garde les recettes à l’écran, il n’annonce pas l’absence de connexion', () => {
    const recipes = twoRecipes();

    const view = catalogueViewOf(catalogueState({ recipes, failure: 'unavailable' }));

    expect(view).toEqual({ status: 'loaded', recipes });
  });

  it('un catalogue émis vide reste vide quand une panne survient ensuite', () => {
    const view = catalogueViewOf(catalogueState({ recipes: [], failure: 'unreadable' }));

    expect(view).toEqual({ status: 'empty' });
  });
});

describe('selectCatalogueLinkLost', () => {
  it('un store neuf n’a pas de lien perdu : rien n’a encore été observé', () => {
    const store = createTestStore();

    expect(selectCatalogueLinkLost(store.getState())).toBe(false);
  });

  it('une panne sans émission n’est pas un lien perdu : l’écran porte déjà le constat en pleine page', () => {
    const store = createTestStore();

    store.dispatch(recipesObservationFailed({ unavailable: false }));

    expect(selectCatalogueLinkLost(store.getState())).toBe(false);
  });

  it('une panne après émission est un lien perdu : les recettes restent mais plus rien ne les rafraîchira', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(twoRecipes()));

    store.dispatch(recipesObservationFailed({ unavailable: false }));

    expect(selectCatalogueLinkLost(store.getState())).toBe(true);
  });

  it('un dépôt injoignable après émission est un lien perdu au même titre qu’une panne ordinaire', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(twoRecipes()));

    store.dispatch(recipesObservationFailed({ unavailable: true }));

    expect(selectCatalogueLinkLost(store.getState())).toBe(true);
  });

  it('une émission qui arrive après la panne rétablit le lien', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(twoRecipes()));
    store.dispatch(recipesObservationFailed({ unavailable: true }));

    store.dispatch(recipesObserved(twoRecipes()));

    expect(selectCatalogueLinkLost(store.getState())).toBe(false);
  });

  it('la relance rétablit le lien le temps de la tentative, et une nouvelle panne le reperd', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(twoRecipes()));
    store.dispatch(recipesObservationFailed({ unavailable: true }));

    store.dispatch(catalogueRetried());
    expect(selectCatalogueLinkLost(store.getState())).toBe(false);

    store.dispatch(recipesObservationFailed({ unavailable: true }));

    expect(selectCatalogueLinkLost(store.getState())).toBe(true);
  });

  it('la déconnexion oublie le lien perdu de la session précédente', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(twoRecipes()));
    store.dispatch(recipesObservationFailed({ unavailable: true }));

    store.dispatch(authStateChanged(null));

    expect(selectCatalogueLinkLost(store.getState())).toBe(false);
  });
});
