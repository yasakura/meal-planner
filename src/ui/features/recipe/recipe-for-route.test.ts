import { describe, it, expect } from 'vitest';

import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { recipeForRoute } from './recipe-for-route';

const RECETTE = RecipeBuilder.aRecipe().withId('r-1').withTitle('Gratin dauphinois').build();

/**
 * Quelle recette du store a le droit d'alimenter le formulaire de modification.
 *
 * La décision vit ICI, dans un `.ts` que Stryker mute, et non dans le container : le store est un
 * singleton de session et porte encore, au montage, la recette PRÉCÉDEMMENT consultée avec un
 * statut qui dit déjà « succès ». La RTL ne peut pas voir ce défaut — elle n'inspecte le DOM
 * qu'une fois les effets purgés, donc après que le chargement en cours a remis la recette à null.
 * Seule une fonction pure peut être confrontée à ce cas ; laissée dans le `.tsx`, la règle
 * n'aurait ni test rouge possible ni mutant pour la surveiller.
 */
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

  // Un statut qui n'est pas `success` ne dit rien de la recette qu'il porte : même si une recette
  // du bon identifiant traîne dans le store, elle est périmée tant que la lecture court.
  it.each(['idle', 'loading', 'notFound', 'error', 'unavailable'] as const)(
    'ne rend rien tant que le statut est « %s », même sur le bon identifiant',
    (status) => {
      expect(recipeForRoute(status, RECETTE, 'r-1')).toBeNull();
    },
  );
});
