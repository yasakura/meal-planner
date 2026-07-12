import { describe, it, expect } from 'vitest';
import { createRecipeUseCase } from './create-recipe';
import { StubIdGenerator } from '../test-doubles/stub-id-generator';
import { IngredientBuilder } from '../test-builders/ingredient.builder';

describe('createRecipeUseCase', () => {
  it("attribue à la recette l'id produit par le IdGenerator", () => {
    const idGenerator = StubIdGenerator.returning('id-connu-42');
    const createRecipe = createRecipeUseCase({ idGenerator });

    const recipe = createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipe.id).toBe('id-connu-42');
  });

  it('appelle generate() exactement une fois', () => {
    const idGenerator = StubIdGenerator.returning('id-connu-42');
    const createRecipe = createRecipeUseCase({ idGenerator });

    createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(idGenerator.callCount).toBe(1);
  });

  it('forwarde title, ingredients et convivesReference du input vers la recette', () => {
    const ingredients = [
      IngredientBuilder.anIngredient().withName('Tomates').build(),
      IngredientBuilder.anIngredient().withName('Oignons').build(),
    ];
    const createRecipe = createRecipeUseCase({ idGenerator: StubIdGenerator.create() });

    const recipe = createRecipe({
      title: 'Ratatouille',
      ingredients,
      convivesReference: 6,
    });

    expect(recipe.title).toBe('Ratatouille');
    expect(recipe.ingredients).toEqual(ingredients);
    expect(recipe.convivesReference).toBe(6);
  });

  // Guard (green-on-arrival assumé) : le use case ne fixe pas de défaut lui-même, il
  // délègue à la factory createRecipe (?? 4). Ce test verrouille le contrat de défaut
  // à travers le use case et tuerait un mutant qui interférerait avec le forward optionnel.
  it('laisse la factory appliquer le défaut convivesReference = 4 quand absent du input', () => {
    const createRecipe = createRecipeUseCase({ idGenerator: StubIdGenerator.create() });

    const recipe = createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipe.convivesReference).toBe(4);
  });

  // Guard (green-on-arrival assumé) : la validation d'entité appartient à la factory ;
  // le use case ne doit PAS avaler l'erreur. Verrouille la propagation d'un input invalide.
  it("propage l'erreur de validation de la factory sur un title vide", () => {
    const createRecipe = createRecipeUseCase({ idGenerator: StubIdGenerator.create() });

    expect(() =>
      createRecipe({
        title: '',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).toThrow('Le titre de la recette est obligatoire');
  });
});
