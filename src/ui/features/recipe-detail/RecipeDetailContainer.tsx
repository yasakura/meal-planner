import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { type Recipe } from '../../../domain/entities/recipe';
import { type Unit } from '../../../domain/entities/ingredient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadRecipeDetail, selectRecipeDetail } from './recipe-detail-slice';
import { toPropsWithoutRecipe } from './recipe-detail-states';
import {
  RecipeDetailScreen,
  type RecipeDetailIngredient,
  type RecipeDetailScreenProps,
} from './RecipeDetailScreen';

function unitLabel(unit: Unit): string {
  return unit === 'piece' ? 'pièce' : unit;
}

function toLoadedProps(recipe: Recipe): RecipeDetailScreenProps {
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
    editHref: `/catalogue/${recipe.id}/modifier`,
  };
}

export function RecipeDetailContainer() {
  const { id } = useParams();
  const { status, recipe } = useAppSelector(selectRecipeDetail);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (id !== undefined) dispatch(loadRecipeDetail(id));
  }, [dispatch, id]);

  const props: RecipeDetailScreenProps =
    status === 'success' && recipe !== null ? toLoadedProps(recipe) : toPropsWithoutRecipe(status);

  return <RecipeDetailScreen {...props} />;
}
