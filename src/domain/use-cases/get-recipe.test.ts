import { describe, it, expect } from 'vitest';
import { getRecipeUseCase } from './get-recipe';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { ThrowingRecipeRepository } from '../test-doubles/throwing-recipe-repository';
import { RecipeBuilder } from '../test-builders/recipe.builder';

describe('getRecipeUseCase', () => {
  it("retourne la recette stockée sous l'id demandé, elle-même et non une copie", async () => {
    const recipe = RecipeBuilder.aRecipe().withId('id-connu-42').build();
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(recipe);
    const getRecipe = getRecipeUseCase({ recipeRepository });

    expect(await getRecipe('id-connu-42')).toBe(recipe);
  });

  it("retourne undefined quand aucune recette ne correspond à l'id", async () => {
    const getRecipe = getRecipeUseCase({
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    expect(await getRecipe('id-inexistant')).toBeUndefined();
  });

  it('propage une erreur de lecture rejetée par le repository', async () => {
    const getRecipe = getRecipeUseCase({
      recipeRepository: ThrowingRecipeRepository.rejectingWith('boom'),
    });

    await expect(getRecipe('id-connu-42')).rejects.toThrow('boom');
  });
});
