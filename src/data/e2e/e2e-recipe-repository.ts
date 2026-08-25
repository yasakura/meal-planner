import { type Recipe } from '../../domain/entities/recipe';
import { type RecipeRepository } from '../../domain/ports/recipe-repository';
import { type Unsubscribe } from '../../domain/ports/unsubscribe';
import { type E2eFailureSwitch } from './e2e-failure-switch';
import { E2eOptimisticCollection } from './e2e-optimistic-collection';

export class E2eRecipeRepository implements RecipeRepository {
  private constructor(private readonly recipes: E2eOptimisticCollection<Recipe>) {}

  static seededWith(recipes: readonly Recipe[], failures: E2eFailureSwitch): E2eRecipeRepository {
    return new E2eRecipeRepository(
      E2eOptimisticCollection.seededWith(
        recipes.map((recipe) => [recipe.id, recipe] as const),
        failures,
      ),
    );
  }

  save(recipe: Recipe): Promise<void> {
    return this.recipes.accepte((contenu) => {
      contenu.set(recipe.id, recipe);
    });
  }

  async findAll(): Promise<Recipe[]> {
    return this.recipes.lireTout();
  }

  async findById(id: string): Promise<Recipe | undefined> {
    return this.recipes.lireUn(id);
  }

  observeAll(
    listener: (recipes: Recipe[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    return this.recipes.observeAll(listener, onError);
  }
}
