import { type Recipe } from '../../../domain/entities/recipe';
import { type CatalogueState } from '../catalogue/catalogue-slice';
import { type RecipeDetailScreenProps } from './RecipeDetailScreen';

export function recipeOfRoute(catalogue: CatalogueState, id: string | undefined): Recipe | null {
  if (catalogue.recipes === null) return null;
  return catalogue.recipes.find((recipe) => recipe.id === id) ?? null;
}

export function toPropsWithoutRecipe(
  catalogue: CatalogueState,
  id: string | undefined,
): RecipeDetailScreenProps {
  if (catalogue.recipes !== null && id !== undefined) return { status: 'notFound' };
  if (catalogue.failure === 'unavailable') {
    return {
      status: 'unavailable',
      message: 'Aucune connexion — la recette n’a pas pu être chargée.',
    };
  }
  if (catalogue.failure === 'unreadable') {
    return { status: 'error', message: 'Impossible de charger la recette.' };
  }
  return { status: 'loading' };
}
