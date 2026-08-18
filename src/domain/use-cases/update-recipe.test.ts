import { describe, it, expect } from 'vitest';

import { updateRecipeUseCase } from './update-recipe';
import { type Recipe } from '../entities/recipe';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { ThrowingRecipeRepository } from '../test-doubles/throwing-recipe-repository';
import { IngredientBuilder } from '../test-builders/ingredient.builder';
import { RecipeBuilder } from '../test-builders/recipe.builder';

/**
 * Dépôt préchargé d'une recette, via le port lui-même : `save` est un upsert (Firestore
 * `setDoc` avec id explicite), donc le semer par `save` est exactement ce que fera la
 * modification. Aucun accès privilégié, aucune méthode de confort ajoutée au double.
 */
async function repositoryHolding(...recipes: Recipe[]) {
  const recipeRepository = InMemoryRecipeRepository.create();
  for (const recipe of recipes) await recipeRepository.save(recipe);
  recipeRepository.saveCount = 0;
  return recipeRepository;
}

describe('updateRecipeUseCase', () => {
  // Règle 1 — modifier conserve l'identifiant : c'est la MÊME recette, pas une nouvelle.
  it('conserve l’identifiant fourni : la recette modifiée est la même entité', async () => {
    const recipeRepository = await repositoryHolding(
      RecipeBuilder.aRecipe().withId('r-1').withTitle('Poulet rôti').build(),
    );
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    const recipe = await updateRecipe({
      id: 'r-1',
      title: 'Poulet basquaise',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipe.id).toBe('r-1');
    expect(await recipeRepository.findById('r-1')).toBe(recipe);
  });

  // Règle 1 (suite) — aucune recette n'est créée à côté : le dépôt en compte toujours une.
  it('n’ajoute pas une seconde recette à côté de l’ancienne', async () => {
    const recipeRepository = await repositoryHolding(
      RecipeBuilder.aRecipe().withId('r-1').withTitle('Poulet rôti').build(),
    );
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await updateRecipe({
      id: 'r-1',
      title: 'Poulet basquaise',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipeRepository.all().map((recipe) => recipe.title)).toEqual(['Poulet basquaise']);
  });

  // Règle 2 — remplacement INTÉGRAL, pas une fusion : un ingrédient retiré du formulaire
  // disparaît de la recette, il ne survit pas à côté des nouveaux.
  it('remplace intégralement les ingrédients : celui qui n’est plus fourni disparaît', async () => {
    const tomates = IngredientBuilder.anIngredient().withName('Tomates').build();
    const creme = IngredientBuilder.anIngredient().withName('Crème').build();
    const recipeRepository = await repositoryHolding(
      RecipeBuilder.aRecipe().withId('r-1').withIngredients([tomates, creme]).build(),
    );
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await updateRecipe({ id: 'r-1', title: 'Poulet rôti', ingredients: [tomates] });

    const stored = await recipeRepository.findById('r-1');
    expect(stored?.ingredients).toEqual([tomates]);
  });

  // Règle 2 (suite) — le remplacement vaut pour TOUS les champs modifiables, pas seulement
  // les ingrédients : titre, personnes et préparation suivent le même contrat.
  it('remplace le titre, le nombre de personnes et la préparation', async () => {
    const recipeRepository = await repositoryHolding(
      RecipeBuilder.aRecipe()
        .withId('r-1')
        .withTitle('Poulet rôti')
        .withConvivesReference(4)
        .withInstructions('Enfourner 1 h.')
        .build(),
    );
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await updateRecipe({
      id: 'r-1',
      title: 'Poulet basquaise',
      ingredients: [IngredientBuilder.anIngredient().build()],
      convivesReference: 6,
      instructions: 'Mijoter 40 min.',
    });

    const stored = await recipeRepository.findById('r-1');
    expect(stored?.title).toBe('Poulet basquaise');
    expect(stored?.convivesReference).toBe(6);
    expect(stored?.instructions).toBe('Mijoter 40 min.');
  });

  // Règle 4 — une préparation vidée est RETIRÉE, jamais enregistrée comme chaîne vide.
  // C'est déjà le comportement de l'entité ; le use-case ne doit pas s'y interposer.
  it('retire la préparation quand elle est vidée, au lieu d’enregistrer une chaîne vide', async () => {
    const recipeRepository = await repositoryHolding(
      RecipeBuilder.aRecipe().withId('r-1').withInstructions('Enfourner 1 h.').build(),
    );
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await updateRecipe({
      id: 'r-1',
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
      instructions: '   ',
    });

    const stored = await recipeRepository.findById('r-1');
    expect(stored).not.toHaveProperty('instructions');
  });

  // Règle 3 — les invariants de l'entité s'appliquent à la modification comme à la création.
  // On ne peut pas rendre invalide par modification une recette qui était valide.
  it('refuse un titre vide et laisse la recette d’origine intacte', async () => {
    const original = RecipeBuilder.aRecipe().withId('r-1').withTitle('Poulet rôti').build();
    const recipeRepository = await repositoryHolding(original);
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await expect(
      updateRecipe({
        id: 'r-1',
        title: '   ',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).rejects.toThrow('Le titre de la recette est obligatoire');

    expect(await recipeRepository.findById('r-1')).toBe(original);
    expect(recipeRepository.saveCount).toBe(0);
  });

  it('refuse une recette sans aucun ingrédient et laisse la recette d’origine intacte', async () => {
    const original = RecipeBuilder.aRecipe().withId('r-1').build();
    const recipeRepository = await repositoryHolding(original);
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await expect(
      updateRecipe({ id: 'r-1', title: 'Poulet rôti', ingredients: [] }),
    ).rejects.toThrow('Une recette doit contenir au moins un ingrédient');

    expect(await recipeRepository.findById('r-1')).toBe(original);
    expect(recipeRepository.saveCount).toBe(0);
  });

  it('refuse un nombre de personnes inférieur à 1', async () => {
    const recipeRepository = await repositoryHolding(RecipeBuilder.aRecipe().withId('r-1').build());
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await expect(
      updateRecipe({
        id: 'r-1',
        title: 'Poulet rôti',
        ingredients: [IngredientBuilder.anIngredient().build()],
        convivesReference: 0,
      }),
    ).rejects.toThrow('Le nombre de convives de référence doit être au moins 1');

    expect(recipeRepository.saveCount).toBe(0);
  });

  it('refuse un nombre de personnes non entier', async () => {
    const recipeRepository = await repositoryHolding(RecipeBuilder.aRecipe().withId('r-1').build());
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await expect(
      updateRecipe({
        id: 'r-1',
        title: 'Poulet rôti',
        ingredients: [IngredientBuilder.anIngredient().build()],
        convivesReference: 2.5,
      }),
    ).rejects.toThrow('Le nombre de convives de référence doit être un entier');

    expect(recipeRepository.saveCount).toBe(0);
  });

  /**
   * Règle 5 — le use-case ne vérifie PAS que la recette existe. Aucune suppression de recette
   * n'existe dans l'application, le cas est donc inatteignable par l'utilisateur, et un garde
   * que rien n'exige serait du code mort. Un identifiant absent se traite à l'ÉCRAN, qui
   * affiche « Recette introuvable » avant même d'offrir un formulaire.
   *
   * Ce test verrouille l'absence de garde : il n'y a rien à quoi se raccrocher pour distinguer
   * « inexistant » de « existant » ici, et un `findById` défensif ferait échouer l'écriture.
   */
  it('n’exige pas que la recette existe déjà : elle est écrite telle quelle', async () => {
    const recipeRepository = await repositoryHolding();
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    const recipe = await updateRecipe({
      id: 'r-inconnue',
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(await recipeRepository.findById('r-inconnue')).toBe(recipe);
  });

  // Guard : `save` appelé EXACTEMENT une fois — ni zéro (rien persisté), ni deux.
  it('appelle save() exactement une fois', async () => {
    const recipeRepository = await repositoryHolding(RecipeBuilder.aRecipe().withId('r-1').build());
    const updateRecipe = updateRecipeUseCase({ recipeRepository });

    await updateRecipe({
      id: 'r-1',
      title: 'Poulet rôti',
      ingredients: [IngredientBuilder.anIngredient().build()],
    });

    expect(recipeRepository.saveCount).toBe(1);
  });

  it('propage une erreur de persistance rejetée par le repository', async () => {
    const updateRecipe = updateRecipeUseCase({
      recipeRepository: ThrowingRecipeRepository.rejectingWith('boom'),
    });

    await expect(
      updateRecipe({
        id: 'r-1',
        title: 'Poulet rôti',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    ).rejects.toThrow('boom');
  });
});
