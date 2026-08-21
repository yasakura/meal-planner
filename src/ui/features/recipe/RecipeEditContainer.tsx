import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { type Ingredient } from '../../../domain/entities/ingredient';
import { type Recipe } from '../../../domain/entities/recipe';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadRecipeDetail, selectRecipeDetail } from '../recipe-detail/recipe-detail-slice';
import { originOf, type BackLink } from '../recipe-detail/recipe-detail-origin';
import { toPropsWithoutRecipe } from '../recipe-detail/recipe-detail-states';
import { RecipeDetailScreen } from '../recipe-detail/RecipeDetailScreen';
import { recipeForRoute } from '../recipe-detail/recipe-for-route';
import { RecipeCreateScreen } from './RecipeCreateScreen';
import {
  INCOMPLETE_ROW_MESSAGE,
  emptyRow,
  hasIncompleteRow,
  toIngredients,
  type IngredientRow,
} from './ingredient-rows';
import { isSubmitDisabled } from './recipe-form-submission';
import {
  recipeEditFormOpened,
  recipeEditNoticeOf,
  selectRecipeEdition,
  updateRecipe,
} from './recipe-edit-slice';
import { type RecipeFormNotice } from './recipe-slice';

type FormState = {
  title: string;
  convives: number;
  rows: IngredientRow[];
  instructions: string;
};

export type RecipeEditValues = {
  title: string;
  ingredients: Ingredient[];
  convivesReference: number;
  instructions: string;
};

function formOf(recipe: Recipe): FormState {
  return {
    title: recipe.title,
    convives: recipe.convivesReference,
    rows: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit,
    })),
    instructions: recipe.instructions ?? '',
  };
}

function RecipeEditForm(props: {
  recipe: Recipe;
  back: BackLink;
  saving: boolean;
  notice: RecipeFormNotice | null;
  onSave: (values: RecipeEditValues) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formOf(props.recipe));
  const [rowsConstat, setRowsConstat] = useState<string | null>(null);

  const patch = (change: Partial<FormState>) => setForm((current) => ({ ...current, ...change }));
  const patchRows = (update: (rows: IngredientRow[]) => IngredientRow[]) =>
    setForm((current) => ({ ...current, rows: update(current.rows) }));

  return (
    <RecipeCreateScreen
      heading="Modifier la recette"
      backTo={props.back.href}
      backLabel={props.back.label}
      title={form.title}
      convives={form.convives}
      rows={form.rows}
      instructions={form.instructions}
      onTitleChange={(title) => patch({ title })}
      onConvivesChange={(convives) => patch({ convives })}
      onInstructionsChange={(instructions) => patch({ instructions })}
      onRowChange={(index, rowPatch) => {
        setRowsConstat(null);
        patchRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...rowPatch } : row)));
      }}
      onAddRow={() => patchRows((rows) => [...rows, emptyRow()])}
      onRemoveRow={(index) => {
        setRowsConstat(null);
        patchRows((rows) => rows.filter((_, i) => i !== index));
      }}
      onSubmit={() => {
        if (hasIncompleteRow(form.rows)) {
          setRowsConstat(INCOMPLETE_ROW_MESSAGE);
          return;
        }
        props.onSave({
          title: form.title,
          ingredients: toIngredients(form.rows),
          convivesReference: form.convives,
          instructions: form.instructions,
        });
      }}
      submitDisabled={isSubmitDisabled({
        locked: props.saving,
        title: form.title,
        rows: form.rows,
      })}
      submitLabel={props.saving ? 'Enregistrement…' : 'Enregistrer'}
      notice={rowsConstat !== null ? { tone: 'error', message: rowsConstat } : props.notice}
    />
  );
}

export function RecipeEditContainer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { status: loadStatus, recipe } = useAppSelector(selectRecipeDetail);
  const edition = useAppSelector(selectRecipeEdition);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const origin = originOf(searchParams);

  useEffect(() => {
    dispatch(recipeEditFormOpened());
  }, [dispatch, id]);

  useEffect(() => {
    if (id !== undefined) dispatch(loadRecipeDetail(id));
  }, [dispatch, id]);

  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  const loaded = recipeForRoute(loadStatus, recipe, id);

  if (loaded === null)
    return <RecipeDetailScreen {...toPropsWithoutRecipe(loadStatus)} back={origin.backLink} />;

  const handleSave = (values: RecipeEditValues) => {
    void dispatch(updateRecipe({ id: loaded.id, ...values })).then((result) => {
      if (updateRecipe.fulfilled.match(result) && monte.current)
        navigate(origin.recipeHref(loaded.id));
    });
  };

  return (
    <RecipeEditForm
      key={loaded.id}
      recipe={loaded}
      back={origin.backToRecipe(loaded.id)}
      saving={edition.status === 'saving'}
      notice={recipeEditNoticeOf(edition)}
      onSave={handleSave}
    />
  );
}
