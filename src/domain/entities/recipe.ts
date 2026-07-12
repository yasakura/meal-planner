import { type Ingredient } from './ingredient';

export type Recipe = {
  readonly id: string;
  readonly title: string;
  readonly ingredients: readonly Ingredient[];
  readonly convivesReference: number;
};

export type RecipeProps = {
  id: string;
  title: string;
  ingredients: Ingredient[];
  convivesReference?: number;
};

export function createRecipe(props: RecipeProps): Recipe {
  const id = props.id.trim();
  if (id === '') {
    throw new Error("L'identifiant de la recette est obligatoire");
  }
  const title = props.title.trim();
  if (title === '') {
    throw new Error('Le titre de la recette est obligatoire');
  }
  if (props.ingredients.length === 0) {
    throw new Error('Une recette doit contenir au moins un ingrédient');
  }
  const convivesReference = props.convivesReference ?? 4;
  if (!Number.isInteger(convivesReference)) {
    throw new Error('Le nombre de convives de référence doit être un entier');
  }
  if (convivesReference < 1) {
    throw new Error('Le nombre de convives de référence doit être au moins 1');
  }
  return Object.freeze({
    id,
    title,
    ingredients: Object.freeze([...props.ingredients]),
    convivesReference,
  });
}
