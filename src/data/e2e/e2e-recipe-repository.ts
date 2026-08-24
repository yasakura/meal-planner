import { type Recipe } from '../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { type RecipeRepository } from '../../domain/ports/recipe-repository';
import { type Unsubscribe } from '../../domain/ports/unsubscribe';
import { type E2eFailureSwitch } from './e2e-failure-switch';

export class E2eRecipeRepository implements RecipeRepository {
  private readonly recipes: Map<string, Recipe>;

  private readonly listeners = new Set<(recipes: Recipe[]) => void>();

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
    await this.failures.serverAck();
    this.recipes.set(recipe.id, recipe);
    this.emit();
  }

  async findAll(): Promise<Recipe[]> {
    this.failures.guardRead();
    return this.snapshot();
  }

  async findById(id: string): Promise<Recipe | undefined> {
    this.failures.guardRead();
    return this.recipes.get(id);
  }

  observeAll(
    listener: (recipes: Recipe[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    this.listeners.add(listener);
    if (this.failures.readsAreDown()) onError(RepositoryUnavailableError.create());
    else listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private snapshot(): Recipe[] {
    return [...this.recipes.values()].reverse();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot());
  }
}
