import { createRecipe, type Recipe } from '../entities/recipe';
import { type Ingredient } from '../entities/ingredient';
import { IngredientBuilder } from './ingredient.builder';

export class RecipeBuilder {
  private constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly ingredients: Ingredient[],
    private readonly convivesReference: number | undefined,
  ) {}

  static aRecipe(): RecipeBuilder {
    return new RecipeBuilder(
      'recipe-1',
      'Poulet rôti',
      [IngredientBuilder.anIngredient().build()],
      4,
    );
  }

  withId(id: string): RecipeBuilder {
    return new RecipeBuilder(id, this.title, this.ingredients, this.convivesReference);
  }

  withTitle(title: string): RecipeBuilder {
    return new RecipeBuilder(this.id, title, this.ingredients, this.convivesReference);
  }

  withIngredients(ingredients: Ingredient[]): RecipeBuilder {
    return new RecipeBuilder(this.id, this.title, ingredients, this.convivesReference);
  }

  withConvivesReference(convivesReference: number): RecipeBuilder {
    return new RecipeBuilder(this.id, this.title, this.ingredients, convivesReference);
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
    return new RecipeBuilder(this.id, this.title, this.ingredients, undefined);
  }

  build(): Recipe {
    if (this.convivesReference !== undefined) {
      return createRecipe({
        id: this.id,
        title: this.title,
        ingredients: this.ingredients,
        convivesReference: this.convivesReference,
      });
    }
    return createRecipe({
      id: this.id,
      title: this.title,
      ingredients: this.ingredients,
    });
  }
}
