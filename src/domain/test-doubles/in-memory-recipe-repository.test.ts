import { describe, it, expect } from 'vitest';
import { RecipeBuilder } from '../test-builders/recipe.builder';
import { InMemoryRecipeRepository } from './in-memory-recipe-repository';

const gratin = RecipeBuilder.aRecipe().withId('r-1').withTitle('Gratin').build();
const curry = RecipeBuilder.aRecipe().withId('r-2').withTitle('Curry').build();
const omelette = RecipeBuilder.aRecipe().withId('r-3').withTitle('Omelette').build();

describe('InMemoryRecipeRepository', () => {
  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = InMemoryRecipeRepository.create();
    await repository.save(gratin);
    await repository.save(curry);
    await repository.save(omelette);

    expect(await repository.findAll()).toEqual([omelette, curry, gratin]);
  });
});
