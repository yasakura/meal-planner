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
      randomPicker: SequenceRandomPicker.returning(0, 0, 0, 0),
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

  it('tire SANS REMISE dans une tournée : deux slots consécutifs ne réutilisent pas la même recette', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      // 1 jour = 2 slots. Index 0 sur le POOL COURANT à chaque slot :
      // slot1 pool [r0,r1] idx0 → r0 (retiré) ; slot2 pool [r1] idx0 → r1.
      randomPicker: SequenceRandomPicker.returning(0, 0),
    });

    const menu = await generateMenu({ days: 1 });

    expect(menu.repas.map((r) => r.slots[0]?.recipeId)).toEqual(['r0', 'r1']);
  });

  it('recharge le pool à l’épuisement (nouvelle tournée) : le cycle recommence sur le catalogue complet', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      // 2 jours = 4 slots. Index 0 sur le pool courant à chaque slot :
      // tournée 1 : r0 puis r1 (pool vidé) ; recharge ; tournée 2 : r0 puis r1.
      randomPicker: SequenceRandomPicker.returning(0, 0, 0, 0),
    });

    const menu = await generateMenu({ days: 2 });

    expect(menu.repas.map((r) => r.slots[0]?.recipeId)).toEqual(['r0', 'r1', 'r0', 'r1']);
  });

  it('force la répétition quand le catalogue (1 recette) est plus petit que le nombre de slots (recharge à chaque slot)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('only').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      // 1 jour = 2 slots, catalogue d'1 recette : pool vidé puis rechargé à chaque slot.
      randomPicker: SequenceRandomPicker.returning(0, 0),
    });

    const menu = await generateMenu({ days: 1 });

    expect(menu.repas.map((r) => r.slots[0]?.recipeId)).toEqual(['only', 'only']);
  });

  it('assure une diversité complète quand le catalogue (4 recettes) couvre exactement les 4 slots', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r2').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r3').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      // 2 jours = 4 slots. Toujours idx0 du pool courant qui rétrécit :
      // r0 (pool [r0,r1,r2,r3]), r1 (pool [r1,r2,r3]), r2 (pool [r2,r3]), r3 (pool [r3]).
      randomPicker: SequenceRandomPicker.returning(0, 0, 0, 0),
    });

    const menu = await generateMenu({ days: 2 });

    const recipeIds = menu.repas.map((r) => r.slots[0]?.recipeId);
    expect(new Set(recipeIds).size).toBe(4);
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
