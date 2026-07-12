import { describe, it, expect } from 'vitest';
import { RecipeBuilder } from '../test-builders/recipe.builder';
import { IngredientBuilder } from '../test-builders/ingredient.builder';

describe('Recipe', () => {
  it('se crée valide et expose id, title, ingredients et convivesReference', () => {
    const ingredient = IngredientBuilder.anIngredient().build();
    const recipe = RecipeBuilder.aRecipe()
      .withId('recipe-42')
      .withTitle('Poulet rôti')
      .withIngredients([ingredient])
      .withConvivesReference(4)
      .build();

    expect(recipe.id).toBe('recipe-42');
    expect(recipe.title).toBe('Poulet rôti');
    expect(recipe.ingredients).toEqual([ingredient]);
    expect(recipe.convivesReference).toBe(4);
  });

  it('rejette un id vide avec un message explicite', () => {
    expect(() => RecipeBuilder.aRecipe().withoutId().build()).toThrow(
      "L'identifiant de la recette est obligatoire",
    );
  });

  it("rejette un id composé uniquement d'espaces", () => {
    expect(() => RecipeBuilder.aRecipe().withId('   ').build()).toThrow(
      "L'identifiant de la recette est obligatoire",
    );
  });

  it('rejette un title vide avec un message explicite', () => {
    expect(() => RecipeBuilder.aRecipe().withoutTitle().build()).toThrow(
      'Le titre de la recette est obligatoire',
    );
  });

  it("rejette un title composé uniquement d'espaces", () => {
    expect(() => RecipeBuilder.aRecipe().withTitle('   ').build()).toThrow(
      'Le titre de la recette est obligatoire',
    );
  });

  it('stocke le title trimé en préservant la casse', () => {
    const recipe = RecipeBuilder.aRecipe().withTitle('  Poulet RÔTI  ').build();

    expect(recipe.title).toBe('Poulet RÔTI');
  });

  it('rejette une liste d’ingrédients vide', () => {
    expect(() => RecipeBuilder.aRecipe().withoutIngredients().build()).toThrow(
      'Une recette doit contenir au moins un ingrédient',
    );
  });

  it('applique le défaut 4 quand convivesReference est absent des props', () => {
    const recipe = RecipeBuilder.aRecipe().withoutConvivesReference().build();

    expect(recipe.convivesReference).toBe(4);
  });

  it('rejette un convivesReference non entier (2.5)', () => {
    expect(() => RecipeBuilder.aRecipe().withConvivesReference(2.5).build()).toThrow(
      'Le nombre de convives de référence doit être un entier',
    );
  });

  it('rejette un convivesReference NaN', () => {
    expect(() => RecipeBuilder.aRecipe().withConvivesReference(Number.NaN).build()).toThrow(
      'Le nombre de convives de référence doit être un entier',
    );
  });

  it('rejette un convivesReference Infinity', () => {
    expect(() =>
      RecipeBuilder.aRecipe().withConvivesReference(Number.POSITIVE_INFINITY).build(),
    ).toThrow('Le nombre de convives de référence doit être un entier');
  });

  it('rejette un convivesReference -Infinity', () => {
    expect(() =>
      RecipeBuilder.aRecipe().withConvivesReference(Number.NEGATIVE_INFINITY).build(),
    ).toThrow('Le nombre de convives de référence doit être un entier');
  });

  it('rejette un convivesReference égal à 0', () => {
    expect(() => RecipeBuilder.aRecipe().withConvivesReference(0).build()).toThrow(
      'Le nombre de convives de référence doit être au moins 1',
    );
  });

  it('rejette un convivesReference négatif', () => {
    expect(() => RecipeBuilder.aRecipe().withConvivesReference(-3).build()).toThrow(
      'Le nombre de convives de référence doit être au moins 1',
    );
  });

  // Guard de mutation (non red-driven) : verrouille la borne basse inclusive (>= 1)
  // contre un mutant `< 1` → `<= 1` que le mutation testing exigerait de tuer — vert-à-l'écriture assumé.
  it('accepte un convivesReference égal à 1 (borne basse valide)', () => {
    const recipe = RecipeBuilder.aRecipe().withConvivesReference(1).build();

    expect(recipe.convivesReference).toBe(1);
  });

  it('gèle la recette ET son tableau d’ingrédients (immuable au runtime)', () => {
    const recipe = RecipeBuilder.aRecipe().build();

    expect(Object.isFrozen(recipe)).toBe(true);
    expect(Object.isFrozen(recipe.ingredients)).toBe(true);
  });

  it('copie défensivement le tableau source : muter la source après création n’affecte pas la recette', () => {
    const source = [IngredientBuilder.anIngredient().withName('Tomates').build()];
    const recipe = RecipeBuilder.aRecipe().withIngredients(source).build();

    source.push(IngredientBuilder.anIngredient().withName('Oignons').build());

    expect(recipe.ingredients).toHaveLength(1);
  });
});
