import { type Recipe } from '../../../domain/entities/recipe';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { FROM_CATALOGUE } from './recipe-detail-origin';
import { CATALOGUE_UNAVAILABLE_NOTICE, CATALOGUE_UNREADABLE_NOTICE } from './catalogue-notice';
import { catalogueRetried, catalogueViewOf, selectCatalogue } from './catalogue-slice';
import {
  RecipeListScreen,
  type RecipeListItem,
  type RecipeListScreenProps,
} from './RecipeListScreen';

function toItem(recipe: Recipe): RecipeListItem {
  const count = recipe.ingredients.length;
  const meta = `${count} ingrédient${count > 1 ? 's' : ''} · ${recipe.convivesReference} personnes`;
  return {
    id: recipe.id,
    title: recipe.title,
    meta,
    href: FROM_CATALOGUE.recipeHref(recipe.id),
  };
}

export function CatalogueContainer() {
  const catalogue = useAppSelector(selectCatalogue);
  const view = catalogueViewOf(catalogue);
  const dispatch = useAppDispatch();

  let props: RecipeListScreenProps;
  if (view.status === 'unavailable') {
    props = {
      status: 'unavailable',
      message: CATALOGUE_UNAVAILABLE_NOTICE,
      onRetry: () => dispatch(catalogueRetried()),
    };
  } else if (view.status === 'error') {
    props = {
      status: 'error',
      message: CATALOGUE_UNREADABLE_NOTICE,
      onRetry: () => dispatch(catalogueRetried()),
    };
  } else if (view.status === 'loaded') {
    props = { status: 'loaded', recipes: view.recipes.map(toItem) };
  } else if (view.status === 'empty') {
    props = { status: 'empty' };
  } else {
    props = { status: 'loading' };
  }

  return <RecipeListScreen {...props} />;
}
