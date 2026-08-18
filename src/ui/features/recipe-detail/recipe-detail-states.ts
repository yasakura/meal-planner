import { type RecipeDetailStatus } from './recipe-detail-slice';
import { type RecipeDetailScreenProps } from './RecipeDetailScreen';

/**
 * Ce que l'écran montre quand il n'a PAS la recette à afficher. Partagé par le détail et par le
 * formulaire de modification : les deux lisent la même recette par le même use-case, et les
 * trois constats qu'ils peuvent avoir à rendre sont mot pour mot les mêmes. Dupliqués, ils
 * dériveraient — et l'écran d'édition finirait par affirmer « introuvable » là où le détail dit
 * « aucune connexion », la confusion exacte que ce vocabulaire existe pour éviter.
 *
 * `success` retombe volontairement sur le chargement, et ce n'est pas un cas mort : c'est
 * l'ouverture d'un formulaire de modification sur un store qui porte encore la recette
 * PRÉCÉDEMMENT consultée. Le statut dit « succès », mais pas de la recette demandée — il n'y a
 * rien à montrer, sinon qu'on attend.
 */
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
