import { type Recipe } from '../entities/recipe';
import { type RecipeRepository } from '../ports/recipe-repository';

export function listRecipesUseCase(deps: {
  recipeRepository: RecipeRepository;
}): () => Promise<Recipe[]> {
  return async () => {
    const recipes = await deps.recipeRepository.findAll();
    return [...recipes].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  };
}

export type ListRecipes = ReturnType<typeof listRecipesUseCase>;
