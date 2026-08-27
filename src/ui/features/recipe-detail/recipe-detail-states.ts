import { type Ingredient, type Unit } from '../../../domain/entities/ingredient';
import { type Recipe } from '../../../domain/entities/recipe';
import { effectiveIngredients } from '../../../domain/use-cases/effective-ingredients';
import { type CatalogueState } from '../catalogue/catalogue-slice';
import { type Origin } from '../catalogue/recipe-detail-origin';
import { type RecipeDetailLoadedProps, type RecipeDetailScreenProps } from './RecipeDetailScreen';

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

function unitLabel(unit: Unit): string {
  return unit === 'piece' ? 'pièce' : unit;
}

function personnes(convives: number): string {
  return `${convives} personne${convives > 1 ? 's' : ''}`;
}

type Echelle = { ingredients: readonly Ingredient[]; convives: number | null };

function echelleDe(recipe: Recipe, convives: number | null): Echelle {
  const misesALEchelle = convives === null ? null : effectiveIngredients(recipe, convives);
  if (misesALEchelle === null) return { ingredients: recipe.ingredients, convives: null };
  return { ingredients: misesALEchelle, convives };
}

function convivesLabel(recipe: Recipe, convives: number | null): string {
  if (convives === null) return `Pour ${personnes(recipe.convivesReference)}`;
  return `Quantités pour ${personnes(convives)} · recette pour ${recipe.convivesReference}`;
}

export function toLoadedProps(recipe: Recipe, origin: Origin): RecipeDetailLoadedProps {
  const echelle = echelleDe(recipe, origin.convives);
  const provenance = echelle.convives === null ? origin.sansEffectif() : origin;
  return {
    status: 'loaded',
    title: recipe.title,
    convivesLabel: convivesLabel(recipe, echelle.convives),
    ingredients: echelle.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: `${ingredient.quantity} ${unitLabel(ingredient.unit)}`,
    })),
    instructions: recipe.instructions ?? null,
    editHref: provenance.recipeEditHref(recipe.id),
  };
}
