import { describe, expect, it } from 'vitest';
import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { IngredientBuilder } from '../domain/test-builders/ingredient.builder';
import { type Unit } from '../domain/entities/ingredient';
import { documentToRecipe, recipeToDocument, type RecipeDocument } from './recipe-mapper';

describe('recipe-mapper', () => {
  it('round-trip: documentToRecipe(recipeToDocument(recipe)) reproduit la recette', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withId('recipe-42')
      .withTitle('Ratatouille')
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Aubergine')
          .withQuantity(2)
          .withUnit('piece')
          .build(),
        IngredientBuilder.anIngredient().withName('Huile').withQuantity(50).withUnit('ml').build(),
      ])
      .withConvivesReference(6)
      .build();

    const roundTripped = documentToRecipe(recipe.id, recipeToDocument(recipe));

    expect(roundTripped).toEqual(recipe);
  });

  // [GUARD] Test de caractérisation (green-on-arrival assumé) : le round-trip #1
  // a déjà piloté la forme du document. Ce guard verrouille explicitement le
  // contrat de sérialisation (objet plat sans id, ingrédients à 3 champs) contre
  // toute régression future de recipeToDocument.
  it('recipeToDocument produit un objet plat sans id, avec des ingrédients {name, quantity, unit}', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withId('recipe-99')
      .withTitle('Soupe')
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Carotte')
          .withQuantity(3)
          .withUnit('piece')
          .build(),
      ])
      .withConvivesReference(2)
      .build();

    const doc = recipeToDocument(recipe);

    expect(doc).not.toHaveProperty('id');
    expect(doc.title).toBe('Soupe');
    expect(doc.convivesReference).toBe(2);
    expect(doc.ingredients).toEqual([{ name: 'Carotte', quantity: 3, unit: 'piece' }]);
  });

  describe('documentToRecipe re-valide structure ET valeurs des données non fiables', () => {
    it('data non-objet (null) → throw structurel', () => {
      const data: unknown = null;

      expect(() => documentToRecipe('recipe-1', data)).toThrow(
        'Document recette invalide : la donnée doit être un objet',
      );
    });

    it('title non-string (number) → throw structurel', () => {
      const data: unknown = {
        title: 123,
        ingredients: [{ name: 'Carotte', quantity: 3, unit: 'piece' }],
        convivesReference: 4,
      };

      expect(() => documentToRecipe('recipe-1', data)).toThrow(
        'Document recette invalide : le titre doit être une chaîne de caractères',
      );
    });

    it('convivesReference non-number (string) → throw structurel', () => {
      const data: unknown = {
        title: 'Soupe',
        ingredients: [{ name: 'Carotte', quantity: 3, unit: 'piece' }],
        convivesReference: '4',
      };

      expect(() => documentToRecipe('recipe-1', data)).toThrow(
        'Document recette invalide : le nombre de convives doit être un nombre',
      );
    });

    it('ingredients non-tableau (objet) → throw structurel', () => {
      const data: unknown = {
        title: 'Soupe',
        ingredients: { name: 'Carotte', quantity: 3, unit: 'piece' },
        convivesReference: 4,
      };

      expect(() => documentToRecipe('recipe-1', data)).toThrow(
        'Document recette invalide : les ingrédients doivent être un tableau',
      );
    });

    it('ingrédient non-objet (string) → throw structurel', () => {
      const data: unknown = {
        title: 'Soupe',
        ingredients: ['Carotte'],
        convivesReference: 4,
      };

      expect(() => documentToRecipe('recipe-1', data)).toThrow(
        'Document recette invalide : chaque ingrédient doit être un objet',
      );
    });

    it('ingrédient avec name non-string (number) → throw structurel', () => {
      const data: unknown = {
        title: 'Soupe',
        ingredients: [{ name: 123, quantity: 3, unit: 'piece' }],
        convivesReference: 4,
      };

      expect(() => documentToRecipe('recipe-1', data)).toThrow(
        "Document recette invalide : le nom de l'ingrédient doit être une chaîne de caractères",
      );
    });

    it('ingrédient avec quantity non-number (string) → throw structurel', () => {
      const data: unknown = {
        title: 'Soupe',
        ingredients: [{ name: 'Carotte', quantity: '3', unit: 'piece' }],
        convivesReference: 4,
      };

      expect(() => documentToRecipe('recipe-1', data)).toThrow(
        "Document recette invalide : la quantité de l'ingrédient doit être un nombre",
      );
    });

    it('ingrédient avec unit non-string (number) → throw structurel', () => {
      const data: unknown = {
        title: 'Soupe',
        ingredients: [{ name: 'Carotte', quantity: 3, unit: 5 }],
        convivesReference: 4,
      };

      expect(() => documentToRecipe('recipe-1', data)).toThrow(
        "Document recette invalide : l'unité de l'ingrédient doit être une chaîne de caractères",
      );
    });

    it('title vide → throw', () => {
      const doc: RecipeDocument = {
        title: '',
        ingredients: [{ name: 'Carotte', quantity: 3, unit: 'piece' }],
        convivesReference: 4,
      };

      expect(() => documentToRecipe('recipe-1', doc)).toThrow(
        'Le titre de la recette est obligatoire',
      );
    });

    it('ingredients vide → throw', () => {
      const doc: RecipeDocument = { title: 'Soupe', ingredients: [], convivesReference: 4 };

      expect(() => documentToRecipe('recipe-1', doc)).toThrow(
        'Une recette doit contenir au moins un ingrédient',
      );
    });

    it('unité invalide → throw', () => {
      const doc: RecipeDocument = {
        title: 'Soupe',
        ingredients: [{ name: 'Carotte', quantity: 3, unit: 'oz' as Unit }],
        convivesReference: 4,
      };

      expect(() => documentToRecipe('recipe-1', doc)).toThrow('Unité invalide');
    });

    it('convivesReference invalide (0) → throw', () => {
      const doc: RecipeDocument = {
        title: 'Soupe',
        ingredients: [{ name: 'Carotte', quantity: 3, unit: 'piece' }],
        convivesReference: 0,
      };

      expect(() => documentToRecipe('recipe-1', doc)).toThrow(
        'Le nombre de convives de référence doit être au moins 1',
      );
    });
  });
});
