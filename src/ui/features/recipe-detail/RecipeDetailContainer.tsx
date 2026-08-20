import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { type Recipe } from '../../../domain/entities/recipe';
import { type Unit } from '../../../domain/entities/ingredient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { recipeForRoute } from '../recipe/recipe-for-route';
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
    // Le formulaire est une ÉTAPE du parcours : il emporte la provenance, sinon tout ce qu'il
    // rend ensuite retombe sur le catalogue. L'adresse se demande à la provenance, qui est le
    // seul objet capable d'en produire une — ce container n'a aucun moyen de l'oublier.
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

  // La règle « quelle recette a le droit d'alimenter cet écran » vit dans un module pur et muté,
  // pas ici : voir `recipe-for-route.ts`. Sans elle, le premier rendu repeint la recette
  // PRÉCÉDEMMENT consultée — le store la porte encore, avec un statut qui dit déjà « succès » —
  // sous l'URL de la nouvelle, lien « Modifier » compris.
  const aMontrer = recipeForRoute(status, recipe, id);

  // La provenance vit dans l'URL, donc elle traverse un rechargement, un favori, un lien
  // partagé. Lue UNE fois ici, elle produit ensuite toutes les adresses de l'écran ; ce qu'elle
  // vaut — « ← Menu » ou « ← Recettes », avec ou sans paramètre — se décide dans un module pur
  // et muté, ce container ne fait que lui tendre les paramètres.
  const origin = originOf(searchParams);

  const props: RecipeDetailScreenProps =
    aMontrer !== null ? toLoadedProps(aMontrer, origin) : toPropsWithoutRecipe(status);

  return <RecipeDetailScreen {...props} back={origin.backLink} />;
}
