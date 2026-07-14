import { createRecipe, type Recipe } from '../entities/recipe';
import { type Ingredient } from '../entities/ingredient';
import { type IdGenerator } from '../ports/id-generator';
import { type RecipeRepository } from '../ports/recipe-repository';

export type CreateRecipeInput = {
  title: string;
  ingredients: Ingredient[];
  convivesReference?: number;
};

export function createRecipeUseCase(deps: {
  idGenerator: IdGenerator;
  recipeRepository: RecipeRepository;
}): (input: CreateRecipeInput) => Promise<Recipe> {
  return async (input) => {
    const id = deps.idGenerator.generate();
    const recipe = createRecipe({ id, ...input });
    await deps.recipeRepository.save(recipe);
    return recipe;
  };
}
