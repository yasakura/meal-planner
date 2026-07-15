import { createRecipe, type Recipe } from '../domain/entities/recipe';
import { createIngredient, type Unit } from '../domain/entities/ingredient';

export type RecipeDocument = {
  title: string;
  ingredients: Array<{ name: string; quantity: number; unit: Unit }>;
  convivesReference: number;
  instructions?: string;
};

export function recipeToDocument(recipe: Recipe): RecipeDocument {
  return {
    title: recipe.title,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    })),
    convivesReference: recipe.convivesReference,
    ...(recipe.instructions !== undefined ? { instructions: recipe.instructions } : {}),
  };
}

export function documentToRecipe(id: string, data: unknown): Recipe {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Document recette invalide : la donnée doit être un objet');
  }
  const record = data as Record<string, unknown>;
  const { title, convivesReference, ingredients, instructions } = record;
  if (typeof title !== 'string') {
    throw new Error('Document recette invalide : le titre doit être une chaîne de caractères');
  }
  if (typeof convivesReference !== 'number') {
    throw new Error('Document recette invalide : le nombre de convives doit être un nombre');
  }
  if (!Array.isArray(ingredients)) {
    throw new Error('Document recette invalide : les ingrédients doivent être un tableau');
  }
  if (instructions !== undefined && typeof instructions !== 'string') {
    throw new Error(
      'Document recette invalide : les instructions doivent être une chaîne de caractères',
    );
  }
  return createRecipe({
    id,
    title,
    ...(instructions !== undefined ? { instructions } : {}),
    ingredients: ingredients.map((raw: unknown) => {
      if (typeof raw !== 'object' || raw === null) {
        throw new Error('Document recette invalide : chaque ingrédient doit être un objet');
      }
      const { name, quantity, unit } = raw as Record<string, unknown>;
      if (typeof name !== 'string') {
        throw new Error(
          "Document recette invalide : le nom de l'ingrédient doit être une chaîne de caractères",
        );
      }
      if (typeof quantity !== 'number') {
        throw new Error(
          "Document recette invalide : la quantité de l'ingrédient doit être un nombre",
        );
      }
      if (typeof unit !== 'string') {
        throw new Error(
          "Document recette invalide : l'unité de l'ingrédient doit être une chaîne de caractères",
        );
      }
      return createIngredient({ name, quantity, unit: unit as Unit });
    }),
    convivesReference,
  });
}
