import { type Recipe } from '../entities/recipe';
import { type RecipeRepository } from '../ports/recipe-repository';

export function getRecipeUseCase(deps: {
  recipeRepository: RecipeRepository;
}): (id: string) => Promise<Recipe | undefined> {
  return (id) => deps.recipeRepository.findById(id);
}

export type GetRecipe = ReturnType<typeof getRecipeUseCase>;
