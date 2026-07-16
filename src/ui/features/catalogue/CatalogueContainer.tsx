import { useEffect } from 'react';

import { type Recipe } from '../../../domain/entities/recipe';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadCatalogue, selectCatalogue } from './catalogue-slice';
import {
  RecipeListScreen,
  type RecipeListItem,
  type RecipeListScreenProps,
} from './RecipeListScreen';

function toItem(recipe: Recipe): RecipeListItem {
  const count = recipe.ingredients.length;
  const meta = `${count} ingrédient${count > 1 ? 's' : ''} · ${recipe.convivesReference} personnes`;
  return { id: recipe.id, title: recipe.title, meta };
}

export function CatalogueContainer() {
  const { status, recipes } = useAppSelector(selectCatalogue);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadCatalogue());
  }, [dispatch]);

  let props: RecipeListScreenProps;
  if (status === 'error') {
    props = {
      status: 'error',
      message: 'Impossible de charger le catalogue.',
      onRetry: () => dispatch(loadCatalogue()),
    };
  } else if (status === 'success') {
    props =
      recipes.length === 0
        ? { status: 'empty' }
        : { status: 'loaded', recipes: recipes.map(toItem) };
  } else {
    props = { status: 'loading' };
  }

  return <RecipeListScreen {...props} />;
}
