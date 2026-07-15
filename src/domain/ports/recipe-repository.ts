import { type Recipe } from '../entities/recipe';

export interface RecipeRepository {
  save(recipe: Recipe): Promise<void>;
  findAll(): Promise<Recipe[]>;
}
