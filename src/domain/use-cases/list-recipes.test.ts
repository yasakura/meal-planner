import { describe, it, expect } from 'vitest';
import { listRecipesUseCase } from './list-recipes';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { ThrowingRecipeRepository } from '../test-doubles/throwing-recipe-repository';
import { RecipeBuilder } from '../test-builders/recipe.builder';
import { type RecipeRepository } from '../ports/recipe-repository';

describe('listRecipesUseCase', () => {
  it('retourne toutes les recettes fournies par le repository', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').withTitle('Ananas').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').withTitle('Banane').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r3').withTitle('Cerise').build());
    const listRecipes = listRecipesUseCase({ recipeRepository });

    const recipes = await listRecipes();

    expect(recipes.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('trie les recettes par titre, alphabétique croissant, insensible casse/accents (fr)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').withTitle('Zeste').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').withTitle('éclair').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r3').withTitle('Ananas').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r4').withTitle('banane').build());
    const listRecipes = listRecipesUseCase({ recipeRepository });

    const recipes = await listRecipes();

    expect(recipes.map((r) => r.title)).toEqual(['Ananas', 'banane', 'éclair', 'Zeste']);
  });

  it('retourne une liste vide quand le catalogue est vide', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const listRecipes = listRecipesUseCase({ recipeRepository });

    const recipes = await listRecipes();

    expect(recipes).toEqual([]);
  });

  it('ne mute pas le tableau source renvoyé par le repository', async () => {
    const source = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Zeste').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Ananas').build(),
    ];
    const repo: RecipeRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve(source),
      findById: () => Promise.resolve(undefined),
      observeAll: () => () => {},
    };
    const listRecipes = listRecipesUseCase({ recipeRepository: repo });

    const recipes = await listRecipes();

    expect(recipes.map((r) => r.title)).toEqual(['Ananas', 'Zeste']);
    expect(source.map((r) => r.title)).toEqual(['Zeste', 'Ananas']);
  });

  it('propage une erreur rejetée par le repository', async () => {
    const listRecipes = listRecipesUseCase({
      recipeRepository: ThrowingRecipeRepository.rejectingWith('boom'),
    });

    await expect(listRecipes()).rejects.toThrow('boom');
  });
});
