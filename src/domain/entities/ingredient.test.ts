import { describe, it, expect } from 'vitest';
import { IngredientBuilder } from '../test-builders/ingredient.builder';
import { UNITS, type Unit } from './ingredient';

describe('Ingredient', () => {
  it('se crée valide et expose name, quantity et unit', () => {
    const ingredient = IngredientBuilder.anIngredient()
      .withName('Tomates')
      .withQuantity(500)
      .withUnit('g')
      .build();

    expect(ingredient.name).toBe('Tomates');
    expect(ingredient.quantity).toBe(500);
    expect(ingredient.unit).toBe('g');
  });

  it('rejette un name vide avec un message explicite', () => {
    expect(() => IngredientBuilder.anIngredient().withoutName().build()).toThrow(
      "Le nom de l'ingrédient est obligatoire",
    );
  });

  it("rejette un name composé uniquement d'espaces", () => {
    expect(() => IngredientBuilder.anIngredient().withName('   ').build()).toThrow(
      "Le nom de l'ingrédient est obligatoire",
    );
  });

  it('stocke le name trimé en préservant la casse', () => {
    const ingredient = IngredientBuilder.anIngredient().withName('  Tomates  ').build();

    expect(ingredient.name).toBe('Tomates');
  });

  it('retourne un Ingredient gelé (immuable au runtime, pas seulement readonly compile-time)', () => {
    const ingredient = IngredientBuilder.anIngredient().build();

    expect(Object.isFrozen(ingredient)).toBe(true);
  });

  it('rejette une quantity égale à 0', () => {
    expect(() => IngredientBuilder.anIngredient().withoutQuantity().build()).toThrow(
      'La quantité doit être strictement positive',
    );
  });

  it('rejette une quantity négative', () => {
    expect(() => IngredientBuilder.anIngredient().withQuantity(-5).build()).toThrow(
      'La quantité doit être strictement positive',
    );
  });

  it('accepte une quantity décimale', () => {
    const ingredient = IngredientBuilder.anIngredient().withQuantity(0.5).build();

    expect(ingredient.quantity).toBe(0.5);
  });

  it('rejette une quantity NaN', () => {
    expect(() => IngredientBuilder.anIngredient().withQuantity(Number.NaN).build()).toThrow(
      'La quantité doit être un nombre fini',
    );
  });

  it('rejette une quantity Infinity', () => {
    expect(() =>
      IngredientBuilder.anIngredient().withQuantity(Number.POSITIVE_INFINITY).build(),
    ).toThrow('La quantité doit être un nombre fini');
  });

  it('rejette une quantity -Infinity', () => {
    expect(() =>
      IngredientBuilder.anIngredient().withQuantity(Number.NEGATIVE_INFINITY).build(),
    ).toThrow('La quantité doit être un nombre fini');
  });

  it('rejette une unit hors des unités autorisées', () => {
    expect(() =>
      IngredientBuilder.anIngredient()
        .withUnit('oz' as Unit)
        .build(),
    ).toThrow('Unité invalide');
  });

  it.each(UNITS)("accepte l'unité valide '%s'", (unit) => {
    const ingredient = IngredientBuilder.anIngredient().withUnit(unit).build();

    expect(ingredient.unit).toBe(unit);
  });
});
