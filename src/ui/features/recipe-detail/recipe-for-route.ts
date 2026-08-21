import { type Recipe } from '../../../domain/entities/recipe';
import { type RecipeDetailStatus } from './recipe-detail-slice';

export function recipeForRoute(
  status: RecipeDetailStatus,
  recipe: Recipe | null,
  id: string | undefined,
): Recipe | null {
  if (status !== 'success') return null;
  if (recipe === null) return null;
  if (recipe.id !== id) return null;
  return recipe;
}
