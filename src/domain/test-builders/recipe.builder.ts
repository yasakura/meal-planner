import { createRecipe, type Recipe } from '../entities/recipe';
import { type Ingredient } from '../entities/ingredient';
import { IngredientBuilder } from './ingredient.builder';

export class RecipeBuilder {
  private constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly ingredients: Ingredient[],
    private readonly convivesReference: number | undefined,
    private readonly instructions: string | undefined,
  ) {}

  static aRecipe(): RecipeBuilder {
    return new RecipeBuilder(
      'recipe-1',
      'Poulet rôti',
      [IngredientBuilder.anIngredient().build()],
      4,
      undefined,
    );
  }

  withId(id: string): RecipeBuilder {
    return new RecipeBuilder(
      id,
      this.title,
      this.ingredients,
      this.convivesReference,
      this.instructions,
    );
  }

  withTitle(title: string): RecipeBuilder {
    return new RecipeBuilder(
      this.id,
      title,
      this.ingredients,
      this.convivesReference,
      this.instructions,
    );
  }

  withIngredients(ingredients: Ingredient[]): RecipeBuilder {
    return new RecipeBuilder(
      this.id,
      this.title,
      ingredients,
      this.convivesReference,
      this.instructions,
    );
  }

  withConvivesReference(convivesReference: number): RecipeBuilder {
    return new RecipeBuilder(
      this.id,
      this.title,
      this.ingredients,
      convivesReference,
      this.instructions,
    );
  }

  withInstructions(instructions: string): RecipeBuilder {
    return new RecipeBuilder(
      this.id,
      this.title,
      this.ingredients,
      this.convivesReference,
      instructions,
    );
  }

  withoutId(): RecipeBuilder {
    return this.withId('');
  }

  withoutTitle(): RecipeBuilder {
    return this.withTitle('');
  }

  withoutIngredients(): RecipeBuilder {
    return this.withIngredients([]);
  }

  withoutConvivesReference(): RecipeBuilder {
    return new RecipeBuilder(this.id, this.title, this.ingredients, undefined, this.instructions);
  }

  withoutInstructions(): RecipeBuilder {
    return new RecipeBuilder(
      this.id,
      this.title,
      this.ingredients,
      this.convivesReference,
      undefined,
    );
  }

  build(): Recipe {
    return createRecipe({
      id: this.id,
      title: this.title,
      ingredients: this.ingredients,
      ...(this.convivesReference !== undefined
        ? { convivesReference: this.convivesReference }
        : {}),
      ...(this.instructions !== undefined ? { instructions: this.instructions } : {}),
    });
  }
}
