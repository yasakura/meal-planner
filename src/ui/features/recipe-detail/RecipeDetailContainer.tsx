import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { type Recipe } from '../../../domain/entities/recipe';
import { type Unit } from '../../../domain/entities/ingredient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { recipeForRoute } from './recipe-for-route';
import { loadRecipeDetail, selectRecipeDetail } from './recipe-detail-slice';
import { originOf, type Origin } from './recipe-detail-origin';
import { toPropsWithoutRecipe } from './recipe-detail-states';
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
  const { status, recipe } = useAppSelector(selectRecipeDetail);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (id !== undefined) dispatch(loadRecipeDetail(id));
  }, [dispatch, id]);

  const aMontrer = recipeForRoute(status, recipe, id);

  const origin = originOf(searchParams);

  const props: RecipeDetailScreenProps =
    aMontrer !== null ? toLoadedProps(aMontrer, origin) : toPropsWithoutRecipe(status);

  return <RecipeDetailScreen {...props} back={origin.backLink} />;
}
