import { createRecipe, type Recipe } from '../entities/recipe';
import { type Ingredient } from '../entities/ingredient';
import { type RecipeRepository } from '../ports/recipe-repository';

/**
 * L'identifiant est REÇU, jamais inventé ici : il est posé à l'ouverture du formulaire
 * (`newRecipeIdUseCase`) et vaut pour tous les envois de ce formulaire-là. Un identifiant tiré à
 * chaque écriture ferait, d'un second envoi hors ligne, un second document — deux recettes pour
 * une seule au retour du réseau.
 */
export type CreateRecipeInput = {
  id: string;
  title: string;
  ingredients: Ingredient[];
  convivesReference?: number;
  instructions?: string;
};

export function createRecipeUseCase(deps: {
  recipeRepository: RecipeRepository;
}): (input: CreateRecipeInput) => Promise<Recipe> {
  return async (input) => {
    const recipe = createRecipe(input);
    await deps.recipeRepository.save(recipe);
    return recipe;
  };
}

export type CreateRecipe = ReturnType<typeof createRecipeUseCase>;
