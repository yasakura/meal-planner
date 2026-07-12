import { createIngredient, type Ingredient, type Unit } from '../entities/ingredient';

export class IngredientBuilder {
  private constructor(
    private name: string,
    private quantity: number,
    private unit: Unit,
  ) {}

  static anIngredient(): IngredientBuilder {
    return new IngredientBuilder('Tomates', 500, 'g');
  }

  withName(name: string): IngredientBuilder {
    return new IngredientBuilder(name, this.quantity, this.unit);
  }

  withQuantity(quantity: number): IngredientBuilder {
    return new IngredientBuilder(this.name, quantity, this.unit);
  }

  withUnit(unit: Unit): IngredientBuilder {
    return new IngredientBuilder(this.name, this.quantity, unit);
  }

  withoutName(): IngredientBuilder {
    return this.withName('');
  }

  // Force une valeur non-string (ex. reconstruction depuis un doc Firestore non typé).
  // Cast interne assumé : contourne le typage pour exercer la validation runtime de la factory.
  withRawName(name: unknown): IngredientBuilder {
    return new IngredientBuilder(name as string, this.quantity, this.unit);
  }

  withoutQuantity(): IngredientBuilder {
    return this.withQuantity(0);
  }

  build(): Ingredient {
    return createIngredient({ name: this.name, quantity: this.quantity, unit: this.unit });
  }
}
