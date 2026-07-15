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
    // Seedé DANS LE DÉSORDRE : l'ordre d'insertion ne doit PAS être l'ordre de sortie.
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').withTitle('Zeste').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').withTitle('éclair').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r3').withTitle('Ananas').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r4').withTitle('banane').build());
    const listRecipes = listRecipesUseCase({ recipeRepository });

    const recipes = await listRecipes();

    // Jeu DISCRIMINANT (locale fr vs tri brut code-point) :
    // un tri brut par code-point donnerait ['Ananas', 'Zeste', 'banane', 'éclair']
    // (Z=90 < b=98 < é=233) — l'attendu fr valide donc localeCompare('fr') vs tri naïf.
    expect(recipes.map((r) => r.title)).toEqual(['Ananas', 'banane', 'éclair', 'Zeste']);
  });

  it('retourne une liste vide quand le catalogue est vide', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const listRecipes = listRecipesUseCase({ recipeRepository });

    const recipes = await listRecipes();

    expect(recipes).toEqual([]);
  });

  // [guard] le tri se fait sur une COPIE défensive (`[...recipes]`), jamais en
  // place sur le tableau renvoyé par le repository. InMemoryRecipeRepository
  // renvoie un tableau frais à chaque findAll() → il ne peut pas prouver la
  // non-mutation. On utilise donc un stub qui renvoie TOUJOURS LA MÊME référence
  // et on vérifie qu'après tri, la source garde son ordre d'origine. Tue le
  // mutant `[...recipes].sort()` → `recipes.sort()` (tri en place).
  it('ne mute pas le tableau source renvoyé par le repository', async () => {
    const source = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Zeste').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Ananas').build(),
    ];
    const repo: RecipeRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve(source),
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
