import { createRecipe, type Recipe } from '../entities/recipe';
import { type Ingredient } from '../entities/ingredient';
import { type IdGenerator } from '../ports/id-generator';

export type CreateRecipeInput = {
  title: string;
  ingredients: Ingredient[];
  convivesReference?: number;
};

export function createRecipeUseCase(deps: {
  idGenerator: IdGenerator;
}): (input: CreateRecipeInput) => Recipe {
  return (input) => {
    const id = deps.idGenerator.generate();
    return createRecipe({ id, ...input });
  };
}
