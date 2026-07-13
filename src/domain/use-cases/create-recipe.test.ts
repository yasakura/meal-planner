import { describe, it, expect } from 'vitest';
import { createRecipeUseCase } from './create-recipe';
import { StubIdGenerator } from '../test-doubles/stub-id-generator';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { ThrowingRecipeRepository } from '../test-doubles/throwing-recipe-repository';
import { IngredientBuilder } from '../test-builders/ingredient.builder';

describe('createRecipeUseCase', () => {
  it("attribue à la recette l'id produit par le IdGenerator", async () => {
    const idGenerator = StubIdGenerator.returning('id-connu-42');
    const createRecipe = createRecipeUseCase({
      idGenerator,
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    const recipe = await createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipe.id).toBe('id-connu-42');
  });

  it('appelle generate() exactement une fois', async () => {
    const idGenerator = StubIdGenerator.returning('id-connu-42');
    const createRecipe = createRecipeUseCase({
      idGenerator,
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    await createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(idGenerator.callCount).toBe(1);
  });

  it('forwarde title, ingredients et convivesReference du input vers la recette', async () => {
    const ingredients = [
      IngredientBuilder.anIngredient().withName('Tomates').build(),
      IngredientBuilder.anIngredient().withName('Oignons').build(),
    ];
    const createRecipe = createRecipeUseCase({
      idGenerator: StubIdGenerator.create(),
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    const recipe = await createRecipe({
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
  it('laisse la factory appliquer le défaut convivesReference = 4 quand absent du input', async () => {
    const createRecipe = createRecipeUseCase({
      idGenerator: StubIdGenerator.create(),
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    const recipe = await createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipe.convivesReference).toBe(4);
  });

  it('persiste la recette créée dans le repository', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const createRecipe = createRecipeUseCase({
      idGenerator: StubIdGenerator.returning('id-connu-42'),
      recipeRepository,
    });

    await createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipeRepository.findById('id-connu-42')).toBeDefined();
  });

  // Guard (green-on-arrival assumé) : verrouille qu'on persiste l'entité RETOURNÉE
  // (mêmes id/title/ingredients), pas une copie divergente. Tue un mutant qui
  // persisterait un objet reconstruit autrement.
  it("persiste l'entité effectivement retournée par le use case", async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const createRecipe = createRecipeUseCase({
      idGenerator: StubIdGenerator.returning('id-connu-42'),
      recipeRepository,
    });

    const recipe = await createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipeRepository.findById('id-connu-42')).toBe(recipe);
  });

  // Guard (green-on-arrival assumé) : save appelé EXACTEMENT une fois. Tue les mutants
  // qui ne persistent pas (0) ou persistent en double (2+).
  it('appelle save() exactement une fois', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const createRecipe = createRecipeUseCase({
      idGenerator: StubIdGenerator.create(),
      recipeRepository,
    });

    await createRecipe({
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipeRepository.saveCount).toBe(1);
  });

  it('propage une erreur de persistance rejetée par le repository', async () => {
    const createRecipe = createRecipeUseCase({
      idGenerator: StubIdGenerator.create(),
      recipeRepository: ThrowingRecipeRepository.rejectingWith('boom'),
    });

    await expect(
      createRecipe({
        title: 'Poulet rôti',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).rejects.toThrow('boom');
  });

  // Guard (green-on-arrival assumé) : la validation d'entité appartient à la factory ;
  // le use case ne doit PAS avaler l'erreur. Verrouille la propagation d'un input invalide.
  it("propage l'erreur de validation de la factory sur un title vide", async () => {
    const createRecipe = createRecipeUseCase({
      idGenerator: StubIdGenerator.create(),
      recipeRepository: InMemoryRecipeRepository.create(),
    });

    await expect(
      createRecipe({
        title: '',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).rejects.toThrow('Le titre de la recette est obligatoire');
  });

  // Guard (green-on-arrival assumé) : la factory throw AVANT le save, donc un input
  // invalide n'est jamais persisté. Verrouille l'ordre construire→save : tue un mutant
  // qui persisterait avant de valider.
  it('ne persiste rien quand le input est invalide', async () => {
    const recipeRepository = InMemoryRecipeRepository.create();
    const createRecipe = createRecipeUseCase({
      idGenerator: StubIdGenerator.create(),
      recipeRepository,
    });

    await expect(
      createRecipe({
        title: '',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).rejects.toThrow();

    expect(recipeRepository.saveCount).toBe(0);
    expect(recipeRepository.all()).toEqual([]);
  });
});
