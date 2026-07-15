import { type Recipe } from '../entities/recipe';
import { type RecipeRepository } from '../ports/recipe-repository';

export class InMemoryRecipeRepository implements RecipeRepository {
  public saveCount = 0;
  private readonly recipes = new Map<string, Recipe>();

  private constructor() {}

  static create(): InMemoryRecipeRepository {
    return new InMemoryRecipeRepository();
  }

  save(recipe: Recipe): Promise<void> {
    this.saveCount += 1;
    this.recipes.set(recipe.id, recipe);
    return Promise.resolve();
  }

  findAll(): Promise<Recipe[]> {
    return Promise.resolve(this.all());
  }

  all(): Recipe[] {
    return [...this.recipes.values()];
  }

  findById(id: string): Promise<Recipe | undefined> {
    return Promise.resolve(this.recipes.get(id));
  }
}
