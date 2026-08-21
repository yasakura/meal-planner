import { describe, it, expect } from 'vitest';
import { createRecipeUseCase } from './create-recipe';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { ThrowingRecipeRepository } from '../test-doubles/throwing-recipe-repository';
import { IngredientBuilder } from '../test-builders/ingredient.builder';

describe('createRecipeUseCase', () => {
  it("attribue à la recette l'identifiant reçu en entrée", async () => {
    const createRecipe = createRecipeUseCase({
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    const recipe = await createRecipe({
      id: 'id-connu-42',
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipe.id).toBe('id-connu-42');
  });

  it('forwarde title, ingredients et convivesReference du input vers la recette', async () => {
    const ingredients = [
      IngredientBuilder.anIngredient().withName('Tomates').build(),
      IngredientBuilder.anIngredient().withName('Oignons').build(),
    ];
    const createRecipe = createRecipeUseCase({
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    const recipe = await createRecipe({
      id: 'id-connu-42',
      title: 'Ratatouille',
      ingredients,
      convivesReference: 6,
    });

    expect(recipe.title).toBe('Ratatouille');
    expect(recipe.ingredients).toEqual(ingredients);
    expect(recipe.convivesReference).toBe(6);
  });

  it('laisse la factory appliquer le défaut convivesReference = 4 quand absent du input', async () => {
    const createRecipe = createRecipeUseCase({
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    const recipe = await createRecipe({
      id: 'id-connu-42',
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipe.convivesReference).toBe(4);
  });

  it('forwarde instructions du input vers la recette en préservant les sauts de ligne', async () => {
    const createRecipe = createRecipeUseCase({
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    const recipe = await createRecipe({
      id: 'id-connu-42',
      title: 'Ratatouille',
      ingredients: [IngredientBuilder.anIngredient().build()],
      instructions: 'Étape 1\n- couper\n- cuire',
    });

    expect(recipe.instructions).toBe('Étape 1\n- couper\n- cuire');
  });

  it('persiste la recette RETOURNÉE elle-même, pas une copie rangée sous le même id', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const createRecipe = createRecipeUseCase({ recipeRepository });

    const recipe = await createRecipe({
      id: 'id-connu-42',
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(await recipeRepository.findById('id-connu-42')).toBe(recipe);
  });

  it('appelle save() exactement une fois', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const createRecipe = createRecipeUseCase({ recipeRepository });

    await createRecipe({
      id: 'id-connu-42',
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipeRepository.saveCount).toBe(1);
  });

  it('propage une erreur de persistance rejetée par le repository', async () => {
    const createRecipe = createRecipeUseCase({
      recipeRepository: ThrowingRecipeRepository.rejectingWith('boom'),
    });

    await expect(
      createRecipe({
        id: 'id-connu-42',
        title: 'Poulet rôti',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).rejects.toThrow('boom');
  });

  it("propage l'erreur de validation de la factory sur un title vide", async () => {
    const createRecipe = createRecipeUseCase({
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    await expect(
      createRecipe({
        id: 'id-connu-42',
        title: '',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).rejects.toThrow('Le titre de la recette est obligatoire');
  });

  it('ne persiste rien quand le input est invalide', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const createRecipe = createRecipeUseCase({ recipeRepository });

    await expect(
      createRecipe({
        id: 'id-connu-42',
        title: '',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).rejects.toThrow();

    expect(recipeRepository.saveCount).toBe(0);
    expect(recipeRepository.all()).toEqual([]);
  });
});
