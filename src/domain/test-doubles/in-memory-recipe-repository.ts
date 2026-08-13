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

  /**
   * Rend l'ordre d'insertion INVERSÉ, délibérément — même raison que pour les convives :
   * `RecipeRepository.findAll()` ne promet aucun ordre, le double ne doit donc pas en
   * offrir un. Tout test qui dépendrait implicitement de l'ordre d'insertion doit casser
   * ici, dans `domain/`, et non des semaines plus tard dans le navigateur.
   *
   * Déterministe et garanti différent de l'insertion dès deux éléments, contrairement à
   * un mélange seedé qui peut retomber sur l'identité.
   */
  findAll(): Promise<Recipe[]> {
    return Promise.resolve(this.all().reverse());
  }

  /** Inspection de test : rend l'ordre d'insertion, honnêtement. Hors contrat du port. */
  all(): Recipe[] {
    return [...this.recipes.values()];
  }

  findById(id: string): Promise<Recipe | undefined> {
    return Promise.resolve(this.recipes.get(id));
  }
}
