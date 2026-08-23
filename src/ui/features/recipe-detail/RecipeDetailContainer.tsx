import { useParams, useSearchParams } from 'react-router-dom';

import { type Recipe } from '../../../domain/entities/recipe';
import { type Unit } from '../../../domain/entities/ingredient';
import { useAppSelector } from '../../store/hooks';
import { selectCatalogue } from '../catalogue/catalogue-slice';
import { originOf, type Origin } from '../catalogue/recipe-detail-origin';
import { recipeOfRoute, toPropsWithoutRecipe } from './recipe-detail-states';
import {
  RecipeDetailScreen,
  type RecipeDetailIngredient,
  type RecipeDetailScreenProps,
} from './RecipeDetailScreen';

function unitLabel(unit: Unit): string {
  return unit === 'piece' ? 'pièce' : unit;
}

function toLoadedProps(recipe: Recipe, origin: Origin): RecipeDetailScreenProps {
  const ingredients: RecipeDetailIngredient[] = recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: `${ingredient.quantity} ${unitLabel(ingredient.unit)}`,
  }));
  const convives = recipe.convivesReference;
  return {
    status: 'loaded',
    title: recipe.title,
    convivesLabel: `Pour ${convives} personne${convives > 1 ? 's' : ''}`,
    ingredients,
    instructions: recipe.instructions ?? null,
    editHref: origin.recipeEditHref(recipe.id),
  };
}

export function RecipeDetailContainer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const catalogue = useAppSelector(selectCatalogue);

  const aMontrer = recipeOfRoute(catalogue, id);

  const origin = originOf(searchParams);

  const props: RecipeDetailScreenProps =
    aMontrer !== null ? toLoadedProps(aMontrer, origin) : toPropsWithoutRecipe(catalogue, id);

  return <RecipeDetailScreen {...props} back={origin.backLink} />;
}
