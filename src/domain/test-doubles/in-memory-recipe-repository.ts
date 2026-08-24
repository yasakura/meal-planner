import { type Recipe } from '../entities/recipe';
import { type RecipeRepository } from '../ports/recipe-repository';
import { type Unsubscribe } from '../ports/unsubscribe';

export class InMemoryRecipeRepository implements RecipeRepository {
  public saveCount = 0;
  private readonly recipes = new Map<string, Recipe>();
  private readonly listeners = new Set<(recipes: Recipe[]) => void>();

  private constructor() {}

  static create(): InMemoryRecipeRepository {
    return new InMemoryRecipeRepository();
  }

  save(recipe: Recipe): Promise<void> {
    this.saveCount += 1;
    this.recipes.set(recipe.id, recipe);
    this.emit();
    return Promise.resolve();
  }

  findAll(): Promise<Recipe[]> {
    return Promise.resolve(this.snapshot());
  }

  all(): Recipe[] {
    return [...this.recipes.values()];
  }

  findById(id: string): Promise<Recipe | undefined> {
    return Promise.resolve(this.recipes.get(id));
  }

  observeAll(listener: (recipes: Recipe[]) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private snapshot(): Recipe[] {
    return this.all().reverse();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot());
  }
}
