import { describe, it, expect } from 'vitest';

import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { recipeForRoute } from './recipe-for-route';

const RECETTE = RecipeBuilder.aRecipe().withId('r-1').withTitle('Gratin dauphinois').build();

describe('recipeForRoute', () => {
  it('rend la recette quand elle est chargée ET qu’elle est celle de la route', () => {
    expect(recipeForRoute('success', RECETTE, 'r-1')).toBe(RECETTE);
  });

  it('ne rend RIEN quand la recette chargée est une autre que celle de la route', () => {
    expect(recipeForRoute('success', RECETTE, 'r-2')).toBeNull();
  });

  it('ne rend rien quand la route ne porte aucun identifiant', () => {
    expect(recipeForRoute('success', RECETTE, undefined)).toBeNull();
  });

  it('ne rend rien quand aucune recette n’est chargée', () => {
    expect(recipeForRoute('success', null, 'r-1')).toBeNull();
  });

  it.each(['idle', 'loading', 'notFound', 'error', 'unavailable'] as const)(
    'ne rend rien tant que le statut est « %s », même sur le bon identifiant',
    (status) => {
      expect(recipeForRoute(status, RECETTE, 'r-1')).toBeNull();
    },
  );
});
