import { type Recipe } from '../../domain/entities/recipe';
import { type RecipeRepository } from '../../domain/ports/recipe-repository';
import { type E2eFailureSwitch } from './e2e-failure-switch';

export class E2eRecipeRepository implements RecipeRepository {
  private readonly recipes: Map<string, Recipe>;

  private constructor(
    recipes: readonly Recipe[],
    private readonly failures: E2eFailureSwitch,
  ) {
    this.recipes = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  }

  static seededWith(recipes: readonly Recipe[], failures: E2eFailureSwitch): E2eRecipeRepository {
    return new E2eRecipeRepository(recipes, failures);
  }

  async save(recipe: Recipe): Promise<void> {
    this.failures.guardWrite();
    this.recipes.set(recipe.id, recipe);
  }

  async findAll(): Promise<Recipe[]> {
    this.failures.guardRead();
    return [...this.recipes.values()].reverse();
  }

  async findById(id: string): Promise<Recipe | undefined> {
    this.failures.guardRead();
    return this.recipes.get(id);
  }
}
