import { type Recipe } from '../entities/recipe';
import { type Unsubscribe } from './unsubscribe';

export interface RecipeRepository {
  save(recipe: Recipe): Promise<void>;
  findAll(): Promise<Recipe[]>;
  findById(id: string): Promise<Recipe | undefined>;
  observeAll(listener: (recipes: Recipe[]) => void, onError: (error: unknown) => void): Unsubscribe;
}
