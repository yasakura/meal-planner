import { sortRecipesByTitle, type Recipe } from '../entities/recipe';
import { type RecipeRepository } from '../ports/recipe-repository';
import { type Unsubscribe } from '../ports/unsubscribe';

export function observeRecipesUseCase(deps: { recipeRepository: RecipeRepository }) {
  return (listener: (recipes: Recipe[]) => void, onError: (error: unknown) => void): Unsubscribe =>
    deps.recipeRepository.observeAll((recipes) => listener(sortRecipesByTitle(recipes)), onError);
}

export type ObserveRecipes = ReturnType<typeof observeRecipesUseCase>;
