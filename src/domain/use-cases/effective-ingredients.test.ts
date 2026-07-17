import { describe, it, expect } from 'vitest';
import { effectiveIngredients } from './effective-ingredients';
import { RecipeBuilder } from '../test-builders/recipe.builder';
import { IngredientBuilder } from '../test-builders/ingredient.builder';

describe('effectiveIngredients', () => {
  it('multiplie la quantité par le facteur convivesCible / convivesReference en préservant nom et unité', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Tomates')
          .withQuantity(500)
          .withUnit('g')
          .build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 5)).toEqual([
      IngredientBuilder.anIngredient().withName('Tomates').withQuantity(625).withUnit('g').build(),
    ]);
  });

  it("met à l'échelle chaque ingrédient de la recette", () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Tomates')
          .withQuantity(500)
          .withUnit('g')
          .build(),
        IngredientBuilder.anIngredient().withName('Lait').withQuantity(200).withUnit('ml').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 2)).toEqual([
      IngredientBuilder.anIngredient().withName('Tomates').withQuantity(250).withUnit('g').build(),
      IngredientBuilder.anIngredient().withName('Lait').withQuantity(100).withUnit('ml').build(),
    ]);
  });

  it('ne fait aucun arrondi sur les grammes (500 g pour 4 → 3 pers. = 375)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build()])
      .build();

    expect(effectiveIngredients(recipe, 3)).toEqual([
      IngredientBuilder.anIngredient().withQuantity(375).withUnit('g').build(),
    ]);
  });

  it('ne fait aucun arrondi sur les kg / ml / l (valeur brute de la formule)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Farine').withQuantity(1).withUnit('kg').build(),
        IngredientBuilder.anIngredient().withName('Lait').withQuantity(200).withUnit('ml').build(),
        IngredientBuilder.anIngredient().withName('Eau').withQuantity(2).withUnit('l').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 3)).toEqual([
      IngredientBuilder.anIngredient().withName('Farine').withQuantity(0.75).withUnit('kg').build(),
      IngredientBuilder.anIngredient().withName('Lait').withQuantity(150).withUnit('ml').build(),
      IngredientBuilder.anIngredient().withName('Eau').withQuantity(1.5).withUnit('l').build(),
    ]);
  });

  it('arrondit les pièces au supérieur avec Math.ceil (6 pièces pour 4 → 5 pers. = 8)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Œufs').withQuantity(6).withUnit('piece').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 5)).toEqual([
      IngredientBuilder.anIngredient().withName('Œufs').withQuantity(8).withUnit('piece').build(),
    ]);
  });

  it("n'arrondit pas au-delà quand le résultat pièce est déjà entier (8 pièces pour 4 → 3 pers. = 6)", () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Œufs').withQuantity(8).withUnit('piece').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 3)).toEqual([
      IngredientBuilder.anIngredient().withName('Œufs').withQuantity(6).withUnit('piece').build(),
    ]);
  });

  it('laisse les quantités poids/volume inchangées quand convivesCible === convivesReference', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build()])
      .build();

    expect(effectiveIngredients(recipe, 4)).toEqual([
      IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build(),
    ]);
  });

  it('retourne des ingrédients validés et frozen (via createIngredient)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build()])
      .build();

    const result = effectiveIngredients(recipe, 5);

    expect(result.map((ingredient) => Object.isFrozen(ingredient))).toEqual([true]);
  });

  it('rejette un convivesCible non entier (1.5)', () => {
    const recipe = RecipeBuilder.aRecipe().build();

    expect(() => effectiveIngredients(recipe, 1.5)).toThrow(
      'Le nombre de personnes doit être un entier positif',
    );
  });

  it('rejette un convivesCible égal à 0', () => {
    const recipe = RecipeBuilder.aRecipe().build();

    expect(() => effectiveIngredients(recipe, 0)).toThrow(
      'Le nombre de personnes doit être un entier positif',
    );
  });

  it('rejette un convivesCible négatif', () => {
    const recipe = RecipeBuilder.aRecipe().build();

    expect(() => effectiveIngredients(recipe, -2)).toThrow(
      'Le nombre de personnes doit être un entier positif',
    );
  });

  it("accepte la borne convivesCible = 1 et met à l'échelle (500 g pour 4 → 1 pers. = 125)", () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build()])
      .build();

    expect(effectiveIngredients(recipe, 1)).toEqual([
      IngredientBuilder.anIngredient().withQuantity(125).withUnit('g').build(),
    ]);
  });

  it('arrondit les pièces au supérieur strictement (ceil, pas round) : 5 pièces pour 4 → 5 pers. = 6,25 → 7', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Œufs').withQuantity(5).withUnit('piece').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 5)).toEqual([
      IngredientBuilder.anIngredient().withName('Œufs').withQuantity(7).withUnit('piece').build(),
    ]);
  });
});
