import { describe, it, expect } from 'vitest';

import { type Recipe } from '../entities/recipe';
import { type RecipeRepository } from '../ports/recipe-repository';
import { RecipeBuilder } from '../test-builders/recipe.builder';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { ThrowingRecipeRepository } from '../test-doubles/throwing-recipe-repository';
import { observeRecipesUseCase } from './observe-recipes';

function collecting(): { emissions: Recipe[][]; listener: (recipes: Recipe[]) => void } {
  const emissions: Recipe[][] = [];
  return { emissions, listener: (recipes) => emissions.push(recipes) };
}

describe('observeRecipesUseCase', () => {
  it('trie la première émission par titre, alphabétique croissant, insensible casse/accents (fr)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').withTitle('Zeste').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').withTitle('éclair').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r3').withTitle('Ananas').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r4').withTitle('banane').build());
    const observeRecipes = observeRecipesUseCase({ recipeRepository });
    const collector = collecting();

    observeRecipes(collector.listener, () => {});

    expect(collector.emissions.at(-1)?.map((recipe) => recipe.title)).toEqual([
      'Ananas',
      'banane',
      'éclair',
      'Zeste',
    ]);
  });

  it('trie AUSSI les émissions suivantes, pas seulement la première', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').withTitle('Ananas').build());
    const observeRecipes = observeRecipesUseCase({ recipeRepository });
    const collector = collecting();
    observeRecipes(collector.listener, () => {});

    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').withTitle('Zeste').build());

    expect(collector.emissions.at(-1)?.map((recipe) => recipe.title)).toEqual(['Ananas', 'Zeste']);
  });

  it('ne mute pas le tableau émis par le dépôt', () => {
    const source = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Zeste').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Ananas').build(),
    ];
    const recipeRepository: RecipeRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve(source),
      findById: () => Promise.resolve(undefined),
      observeAll: (listener) => {
        listener(source);
        return () => {};
      },
    };
    const observeRecipes = observeRecipesUseCase({ recipeRepository });
    const collector = collecting();

    observeRecipes(collector.listener, () => {});

    expect(collector.emissions.at(-1)?.map((recipe) => recipe.title)).toEqual(['Ananas', 'Zeste']);
    expect(source.map((recipe) => recipe.title)).toEqual(['Zeste', 'Ananas']);
  });

  it('transmet l’erreur du dépôt à onError, sans passer par le listener', () => {
    const observeRecipes = observeRecipesUseCase({
      recipeRepository: ThrowingRecipeRepository.rejectingWith('boom'),
    });
    const collector = collecting();
    const errors: unknown[] = [];

    observeRecipes(collector.listener, (error) => errors.push(error));

    expect(errors).toHaveLength(1);
    expect(errors.at(0)).toBeInstanceOf(Error);
    expect((errors.at(0) as Error).message).toBe('boom');
    expect(collector.emissions).toHaveLength(0);
  });

  it('rend le désabonnement du dépôt : après lui, une écriture n’émet plus rien', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const observeRecipes = observeRecipesUseCase({ recipeRepository });
    const collector = collecting();

    const unsubscribe = observeRecipes(collector.listener, () => {});
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').withTitle('Zeste').build());
    expect(collector.emissions).toHaveLength(2);

    unsubscribe();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').withTitle('Ananas').build());

    expect(collector.emissions).toHaveLength(2);
  });
});
