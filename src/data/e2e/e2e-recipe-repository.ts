import { type Recipe } from '../../domain/entities/recipe';
import { type RecipeRepository } from '../../domain/ports/recipe-repository';
import { type E2eFailureSwitch } from './e2e-failure-switch';

/**
 * Dépôt de recettes en mémoire, embarqué dans l'application en mode e2e uniquement.
 *
 * Ce n'est PAS un test-double : c'est un adapter applicatif, il vit dans `data/` avec les
 * autres implémentations du port et il porte l'injection de panne que les scénarios pilotent.
 * La convention des doubles s'applique quand même — il ne promet rien de plus que son port.
 */
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

  /**
   * Rend l'ordre d'insertion INVERSÉ, délibérément : le port ne garantit aucun ordre, et un
   * adapter plus aimable que son contrat ferait passer en vert un tri que personne n'a écrit.
   * Inversion plutôt que mélange seedé — déterministe, et garanti différent de l'insertion dès
   * deux éléments, là où un shuffle peut retomber sur l'identité.
   */
  async findAll(): Promise<Recipe[]> {
    this.failures.guardRead();
    return [...this.recipes.values()].reverse();
  }

  /** `undefined` : la recette n'existe pas. Une absence, jamais une panne — cf. le port. */
  async findById(id: string): Promise<Recipe | undefined> {
    this.failures.guardRead();
    return this.recipes.get(id);
  }
}
