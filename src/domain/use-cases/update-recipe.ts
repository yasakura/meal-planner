import { createRecipe, type Recipe } from '../entities/recipe';
import { type Ingredient } from '../entities/ingredient';
import { type RecipeRepository } from '../ports/recipe-repository';

export type UpdateRecipeInput = {
  id: string;
  title: string;
  ingredients: Ingredient[];
  convivesReference?: number;
  instructions?: string;
};

export function updateRecipeUseCase(deps: {
  recipeRepository: RecipeRepository;
}): (input: UpdateRecipeInput) => Promise<Recipe> {
  return async (input) => {
    const recipe = createRecipe(input);
    await deps.recipeRepository.save(recipe);
    return recipe;
  };
}

export type UpdateRecipe = ReturnType<typeof updateRecipeUseCase>;
