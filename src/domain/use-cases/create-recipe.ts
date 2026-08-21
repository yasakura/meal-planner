import { createRecipe, type Recipe } from '../entities/recipe';
import { type Ingredient } from '../entities/ingredient';
import { type RecipeRepository } from '../ports/recipe-repository';

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
