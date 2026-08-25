import { describe, it, expect } from 'vitest';
import { createCalendarDate } from '../entities/calendar-date';
import { generateMenuUseCase } from './generate-menu';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { SequenceRandomPicker } from '../test-doubles/sequence-random-picker';
import { RecipeBuilder } from '../test-builders/recipe.builder';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

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

    const menu = await generateMenu({ days: 2, dateDebut: LUNDI_24_AOUT });

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
      randomPicker: SequenceRandomPicker.returning(2, 0),
    });

    const menu = await generateMenu({ days: 1, dateDebut: LUNDI_24_AOUT });

    const catalogue = await recipeRepository.findAll();
    const recipeIds = menu.repas.map((r) => r.slots[0]?.recipeId);
    expect(recipeIds).toEqual([catalogue[2]?.id, catalogue[0]?.id]);
  });

  it('tire SANS REMISE dans une tournée : deux slots consécutifs ne réutilisent pas la même recette', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0, 0),
    });

    const menu = await generateMenu({ days: 1, dateDebut: LUNDI_24_AOUT });

    const catalogue = await recipeRepository.findAll();
    expect(menu.repas.map((r) => r.slots[0]?.recipeId)).toEqual([
      catalogue[0]?.id,
      catalogue[1]?.id,
    ]);
  });

  it('recharge le pool à l’épuisement (nouvelle tournée) : le cycle recommence sur le catalogue complet', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r1').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0, 0, 0, 0),
    });

    const menu = await generateMenu({ days: 2, dateDebut: LUNDI_24_AOUT });

    const [premiere, seconde] = await recipeRepository.findAll();
    expect(menu.repas.map((r) => r.slots[0]?.recipeId)).toEqual([
      premiere?.id,
      seconde?.id,
      premiere?.id,
      seconde?.id,
    ]);
  });

  it('force la répétition quand le catalogue (1 recette) est plus petit que le nombre de slots (recharge à chaque slot)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('only').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0, 0),
    });

    const menu = await generateMenu({ days: 1, dateDebut: LUNDI_24_AOUT });

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
      randomPicker: SequenceRandomPicker.returning(0, 0, 0, 0),
    });

    const menu = await generateMenu({ days: 2, dateDebut: LUNDI_24_AOUT });

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

    await expect(generateMenu({ days, dateDebut: LUNDI_24_AOUT })).rejects.toThrow(
      'Le nombre de jours doit être un entier positif',
    );
  });

  it('valide le nombre de jours AVANT le catalogue (days invalide rejette même catalogue vide)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0),
    });

    await expect(generateMenu({ days: 0, dateDebut: LUNDI_24_AOUT })).rejects.toThrow(
      'Le nombre de jours doit être un entier positif',
    );
  });

  it('rejette quand le catalogue est vide (impossible de remplir un slot sans recette)', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0),
    });

    await expect(generateMenu({ days: 1, dateDebut: LUNDI_24_AOUT })).rejects.toThrow(
      'Impossible de générer un menu sans recette',
    );
  });

  it('porte dans le menu produit la date de début reçue en entrée', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0, 0),
    });

    const menu = await generateMenu({
      days: 1,
      dateDebut: createCalendarDate({ year: 2027, month: 1, day: 4 }),
    });

    expect(menu.dateDebut).toEqual({ year: 2027, month: 1, day: 4 });
  });
});

describe('generateMenuUseCase et la présence aux créneaux', () => {
  it('le menu généré ne fige aucune présence : chaque créneau est au défaut du foyer, sans invité', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    await recipeRepository.save(RecipeBuilder.aRecipe().withId('r0').build());
    const generateMenu = generateMenuUseCase({
      recipeRepository,
      randomPicker: SequenceRandomPicker.returning(0, 0),
    });

    const menu = await generateMenu({ days: 1, dateDebut: LUNDI_24_AOUT });

    expect(menu.repas.map((r) => [r.presents, r.invites])).toEqual([
      [null, 0],
      [null, 0],
    ]);
  });
});
