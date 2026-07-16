import { describe, it, expect } from 'vitest';
import { generateMenuUseCase } from './generate-menu';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { SequenceRandomPicker } from '../test-doubles/sequence-random-picker';
import { RecipeBuilder } from '../test-builders/recipe.builder';

describe('generateMenuUseCase', () => {
  it('produit days × 2 repas, ordonnés par jour croissant puis midi avant soir, chacun avec 1 slot', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r3').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0, 1, 2, 3),
    });

    const menu = await generateMenu({ days: 2 });

    expect(menu.repas).toHaveLength(4);
    expect(menu.repas.map((r) => [r.jour, r.creneau])).toEqual([
      [0, 'midi'],
      [0, 'soir'],
      [1, 'midi'],
      [1, 'soir'],
    ]);
    expect(menu.repas.every((r) => r.slots.length === 1)).toBe(true);
  });

  it('remplit chaque slot avec la recette tirée par le RandomPicker (index → recette du catalogue)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      // 1 jour = 2 slots : le picker choisit l'index 2 puis l'index 0 du catalogue.
      randomPicker: SequenceRandomPicker.returning(2, 0),
    });

    const menu = await generateMenu({ days: 1 });

    const recipeIds = menu.repas.map((r) => r.slots[0]?.recipeId);
    expect(recipeIds).toEqual(['r2', 'r0']);
  });

  it('tire AVEC REMISE : une même recette peut remplir plusieurs slots (catalogue plus petit que le nombre de slots)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('only').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      // 1 jour = 2 slots, catalogue d'1 recette : l'index 0 est retiré deux fois.
      randomPicker: SequenceRandomPicker.returning(0, 0),
    });

    const menu = await generateMenu({ days: 1 });

    expect(menu.repas.map((r) => r.slots[0]?.recipeId)).toEqual(['only', 'only']);
  });

  it.each([0, -1, 1.5])('rejette un nombre de jours invalide (%s)', async (days) => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0),
    });

    await expect(generateMenu({ days })).rejects.toThrow(
      'Le nombre de jours doit être un entier positif',
    );
  });

  it('valide le nombre de jours AVANT le catalogue (days invalide rejette même catalogue vide)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0),
    });

    await expect(generateMenu({ days: 0 })).rejects.toThrow(
      'Le nombre de jours doit être un entier positif',
    );
  });

  it('rejette quand le catalogue est vide (impossible de remplir un slot sans recette)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0),
    });

    await expect(generateMenu({ days: 1 })).rejects.toThrow(
      'Impossible de générer un menu sans recette',
    );
  });
});
