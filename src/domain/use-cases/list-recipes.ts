import { sortRecipesByTitle, type Recipe } from '../entities/recipe';
import { type RecipeRepository } from '../ports/recipe-repository';

export function listRecipesUseCase(deps: {
  recipeRepository: RecipeRepository;
}): () => Promise<Recipe[]> {
  return async () => sortRecipesByTitle(await deps.recipeRepository.findAll());
}

export type ListRecipes = ReturnType<typeof listRecipesUseCase>;
