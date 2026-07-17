import { createIngredient, type Ingredient } from '../entities/ingredient';
import { type Recipe } from '../entities/recipe';

export function effectiveIngredients(recipe: Recipe, convivesCible: number): Ingredient[] {
  if (!Number.isInteger(convivesCible) || convivesCible < 1) {
    throw new Error('Le nombre de personnes doit être un entier positif');
  }

  const facteur = convivesCible / recipe.convivesReference;

  return recipe.ingredients.map((ingredient) => {
    const brute = ingredient.quantity * facteur;
    const quantity = ingredient.unit === 'piece' ? Math.ceil(brute) : brute;
    return createIngredient({ name: ingredient.name, quantity, unit: ingredient.unit });
  });
}
