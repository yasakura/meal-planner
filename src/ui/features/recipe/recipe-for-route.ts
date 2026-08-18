import { type Recipe } from '../../../domain/entities/recipe';
import { type RecipeDetailStatus } from '../recipe-detail/recipe-detail-slice';

/**
 * La recette du store qui a le droit d'alimenter le formulaire de modification — ou `null`,
 * c'est-à-dire « rien à montrer, on attend ».
 *
 * Trois conditions, et les trois comptent :
 *
 * - le statut vaut `success` : tant que la lecture court ou a échoué, ce que le store porte est
 *   périmé, fût-ce sous le bon identifiant ;
 * - une recette est bien là ;
 * - c'est CELLE de la route. Le store est un singleton de session : au montage d'un formulaire,
 *   il porte encore la dernière recette consultée, avec un statut qui dit déjà « succès ». Sans
 *   cette dernière condition, le formulaire s'ouvre sur le contenu d'une autre recette.
 *
 * Cette règle vit dans un module pur, et non dans le container, pour deux raisons qui n'en font
 * qu'une : Stryker ne mute pas les `.tsx`, et la RTL ne peut pas l'observer — elle n'inspecte le
 * DOM qu'une fois les effets purgés, donc après que le chargement déclenché au montage a remis la
 * recette à `null`. Laissée dans le container, la règle n'aurait eu ni test capable de la voir
 * échouer, ni mutant pour la surveiller.
 */
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
