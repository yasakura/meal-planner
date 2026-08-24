import { type Recipe } from '../../domain/entities/recipe';
import { type ObserveRecipes } from '../../domain/use-cases/observe-recipes';

type Subscriber = {
  listener: (recipes: Recipe[]) => void;
  onError: (error: unknown) => void;
};

export class RecipeChannel {
  public subscriptions = 0;

  private readonly subscribers = new Set<Subscriber>();

  private constructor(
    private emission: Recipe[] | null,
    private failure: unknown | null,
  ) {}

  static seededWith(recipes: Recipe[]): RecipeChannel {
    return new RecipeChannel(recipes, null);
  }

  static silent(): RecipeChannel {
    return new RecipeChannel(null, null);
  }

  static refusingWith(error: unknown): RecipeChannel {
    return new RecipeChannel(null, error);
  }

  get observeRecipes(): ObserveRecipes {
    return (listener, onError) => {
      const subscriber: Subscriber = { listener, onError };
      this.subscribers.add(subscriber);
      this.subscriptions += 1;
      if (this.failure !== null) onError(this.failure);
      else if (this.emission !== null) listener(this.emission);
      return () => {
        this.subscribers.delete(subscriber);
      };
    };
  }

  get live(): number {
    return this.subscribers.size;
  }

  willEmit(recipes: Recipe[]): void {
    this.emission = recipes;
    this.failure = null;
  }

  emit(recipes: Recipe[]): void {
    this.emission = recipes;
    this.failure = null;
    for (const subscriber of this.subscribers) subscriber.listener(recipes);
  }

  fail(error: unknown): void {
    this.failure = error;
    for (const subscriber of this.subscribers) subscriber.onError(error);
  }
}

export function emitting(recipes: Recipe[]): ObserveRecipes {
  return RecipeChannel.seededWith(recipes).observeRecipes;
}
