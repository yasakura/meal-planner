import { type RecipeDetailStatus } from './recipe-detail-slice';
import { type RecipeDetailScreenProps } from './RecipeDetailScreen';

export function toPropsWithoutRecipe(status: RecipeDetailStatus): RecipeDetailScreenProps {
  if (status === 'unavailable') {
    return {
      status: 'unavailable',
      message: 'Aucune connexion — la recette n’a pas pu être chargée.',
    };
  }
  if (status === 'notFound') return { status: 'notFound' };
  if (status === 'error') return { status: 'error', message: 'Impossible de charger la recette.' };
  return { status: 'loading' };
}
