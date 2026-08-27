import { useParams, useSearchParams } from 'react-router-dom';

import { useAppSelector } from '../../store/hooks';
import { selectCatalogue } from '../catalogue/catalogue-slice';
import { originOf } from '../catalogue/recipe-detail-origin';
import { recipeOfRoute, toLoadedProps, toPropsWithoutRecipe } from './recipe-detail-states';
import { RecipeDetailScreen, type RecipeDetailScreenProps } from './RecipeDetailScreen';

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
