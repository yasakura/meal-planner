import { describe, it, expect } from 'vitest';

import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { type CatalogueState } from '../catalogue/catalogue-slice';
import { recipeOfRoute, toPropsWithoutRecipe } from './recipe-detail-states';

const GRATIN = RecipeBuilder.aRecipe().withId('r-1').withTitle('Gratin dauphinois').build();

const TARTE = RecipeBuilder.aRecipe().withId('r-2').withTitle('Tarte aux poireaux').build();

function catalogueState(overrides: Partial<CatalogueState>): CatalogueState {
  return { recipes: null, failure: null, attempt: 0, ...overrides };
}

const CATALOGUE_EMIS = catalogueState({ recipes: [GRATIN, TARTE] });

describe('recipeOfRoute', () => {
  it('rend la recette du catalogue qui porte l’identifiant de la route', () => {
    expect(recipeOfRoute(CATALOGUE_EMIS, 'r-2')).toBe(TARTE);
  });

  it('ne rend rien pour un identifiant absent du catalogue, là où un identifiant présent rend la sienne', () => {
    expect(recipeOfRoute(CATALOGUE_EMIS, 'r-inconnue')).toBeNull();
    expect(recipeOfRoute(CATALOGUE_EMIS, 'r-1')).toBe(GRATIN);
  });

  it('ne rend rien tant que le canal n’a rien émis, fût-ce sur un identifiant qui existera', () => {
    expect(recipeOfRoute(catalogueState({}), 'r-1')).toBeNull();
  });

  it('ne rend rien quand la route ne porte aucun identifiant', () => {
    expect(recipeOfRoute(CATALOGUE_EMIS, undefined)).toBeNull();
  });
});

describe('toPropsWithoutRecipe', () => {
  it('rend l’introuvable quand le catalogue émis ne porte pas l’identifiant demandé', () => {
    expect(toPropsWithoutRecipe(CATALOGUE_EMIS, 'r-inconnue')).toEqual({ status: 'notFound' });
  });

  it('rend l’attente tant que le canal n’a rien émis ni rien constaté', () => {
    expect(toPropsWithoutRecipe(catalogueState({}), 'r-1')).toEqual({ status: 'loading' });
  });

  it('rend l’attente sous une route sans identifiant, au lieu de conclure à l’introuvable', () => {
    expect(toPropsWithoutRecipe(CATALOGUE_EMIS, undefined)).toEqual({ status: 'loading' });
  });

  it('nomme l’absence de connexion, sans jamais conclure à l’inexistence', () => {
    expect(toPropsWithoutRecipe(catalogueState({ failure: 'unavailable' }), 'r-1')).toEqual({
      status: 'unavailable',
      message: 'Aucune connexion — la recette n’a pas pu être chargée.',
    });
  });

  it('rend un constat de panne sobre, sans le message technique', () => {
    expect(toPropsWithoutRecipe(catalogueState({ failure: 'unreadable' }), 'r-1')).toEqual({
      status: 'error',
      message: 'Impossible de charger la recette.',
    });
  });

  it('un catalogue émis prime sur une panne survenue ensuite : l’introuvable, pas le hors-ligne', () => {
    const apresPanne = catalogueState({ recipes: [GRATIN], failure: 'unavailable' });

    expect(toPropsWithoutRecipe(apresPanne, 'r-inconnue')).toEqual({ status: 'notFound' });
  });
});
