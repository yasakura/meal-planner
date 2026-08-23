import { type Recipe } from '../entities/recipe';
import { type RecipeRepository } from '../ports/recipe-repository';
import { type Unsubscribe } from '../ports/unsubscribe';

export class ThrowingRecipeRepository implements RecipeRepository {
  private constructor(private readonly message: string) {}

  static rejectingWith(message: string): ThrowingRecipeRepository {
    return new ThrowingRecipeRepository(message);
  }

  save(): Promise<void> {
    return Promise.reject(new Error(this.message));
  }

  findAll(): Promise<Recipe[]> {
    return Promise.reject(new Error(this.message));
  }

  findById(): Promise<Recipe | undefined> {
    return Promise.reject(new Error(this.message));
  }

  observeAll(
    _listener: (recipes: Recipe[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    onError(new Error(this.message));
    return () => {};
  }
}
