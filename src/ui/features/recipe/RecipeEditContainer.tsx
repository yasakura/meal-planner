import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { type Ingredient } from '../../../domain/entities/ingredient';
import { type Recipe } from '../../../domain/entities/recipe';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadRecipeDetail, selectRecipeDetail } from '../recipe-detail/recipe-detail-slice';
import { toPropsWithoutRecipe } from '../recipe-detail/recipe-detail-states';
import { RecipeDetailScreen } from '../recipe-detail/RecipeDetailScreen';
import { RecipeCreateScreen } from './RecipeCreateScreen';
import {
  INCOMPLETE_ROW_MESSAGE,
  emptyRow,
  hasIncompleteRow,
  toIngredients,
  validRowsOf,
  type IngredientRow,
} from './ingredient-rows';
import { recipeEditFormOpened, selectRecipeEdition, updateRecipe } from './recipe-edit-slice';
import { recipeForRoute } from './recipe-for-route';

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

// La quantité redevient une chaîne : c'est ce qu'un champ de saisie porte. Une préparation
// absente ouvre un champ VIDE — l'entité ne stocke pas de chaîne vide, l'écran ne montre pas
// d'absence.
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

/**
 * La saisie, initialisée depuis la recette au MONTAGE — pas par un effet qui recopierait la
 * recette dans un état après coup. Le parent la monte sous une `key` portant l'identifiant :
 * changer de recette remonte le formulaire, et l'initialisation redevient donc suffisante.
 * C'est aussi ce qui garantit qu'aucune frappe de l'utilisateur n'est jamais écrasée par une
 * relecture tardive du dépôt.
 */
function RecipeEditForm(props: {
  recipe: Recipe;
  saving: boolean;
  errorMessage: string | null;
  onSave: (values: RecipeEditValues) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formOf(props.recipe));
  // Le constat de saisie vit ICI, avec les lignes dont il parle et pour exactement leur durée de
  // vie : dans un slice il survivrait au formulaire, comme le statut d'ajout de FR-3. La règle
  // qu'il annonce, elle, vit dans `ingredient-rows.ts` — le seul des deux que la mutation voit.
  const [rowsConstat, setRowsConstat] = useState<string | null>(null);

  const patch = (change: Partial<FormState>) => setForm((current) => ({ ...current, ...change }));

  return (
    <RecipeCreateScreen
      heading="Modifier la recette"
      backTo={`/catalogue/${props.recipe.id}`}
      backLabel="← Recette"
      title={form.title}
      convives={form.convives}
      rows={form.rows}
      instructions={form.instructions}
      onTitleChange={(title) => patch({ title })}
      onConvivesChange={(convives) => patch({ convives })}
      onInstructionsChange={(instructions) => patch({ instructions })}
      onRowChange={(index, rowPatch) => {
        setRowsConstat(null);
        patch({ rows: form.rows.map((row, i) => (i === index ? { ...row, ...rowPatch } : row)) });
      }}
      onAddRow={() => patch({ rows: [...form.rows, emptyRow()] })}
      onRemoveRow={(index) => {
        setRowsConstat(null);
        patch({ rows: form.rows.filter((_, i) => i !== index) });
      }}
      // Le bouton reste ACTIF face à une ligne incomplète : c'est le clic qui refuse, et il le
      // dit. Rien ne part vers le dépôt — une ligne écartée en silence détruirait un ingrédient.
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
      submitDisabled={
        props.saving || form.title.trim() === '' || validRowsOf(form.rows).length === 0
      }
      submitLabel={props.saving ? 'Enregistrement…' : 'Enregistrer'}
      // La modification renvoie au détail : une confirmation n'aurait le temps de rien dire, et
      // l'écran d'arrivée montre déjà le résultat. Seul l'échec a quelque chose à annoncer.
      confirmation={null}
      errorMessage={rowsConstat ?? props.errorMessage}
    />
  );
}

export function RecipeEditContainer() {
  const { id } = useParams();
  const { status: loadStatus, recipe } = useAppSelector(selectRecipeDetail);
  const { status: saveStatus } = useAppSelector(selectRecipeEdition);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Un formulaire s'ouvre : on le SIGNALE au slice, qui décide seul s'il remet le statut à zéro.
  useEffect(() => {
    dispatch(recipeEditFormOpened());
  }, [dispatch]);

  useEffect(() => {
    if (id !== undefined) dispatch(loadRecipeDetail(id));
  }, [dispatch, id]);

  // Le seul lien au cycle de vie dont dispose la suite du `then` plus bas : une promesse n'est pas
  // démontée avec son composant, et `useNavigate` ne s'en protège pas non plus (son garde interne
  // est posé par un effet SANS nettoyage, donc il reste ouvert après le démontage et la navigation
  // part quand même, sans warning). La réaffectation à `true` n'est pas redondante avec la valeur
  // initiale : StrictMode rejoue montage/démontage, et sans elle le drapeau resterait à `false`
  // pour toute la vie du formulaire en dev.
  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  // La règle « quelle recette a le droit d'alimenter ce formulaire » vit dans un module pur et
  // muté, pas ici : voir `recipe-for-route.ts`.
  const loaded = recipeForRoute(loadStatus, recipe, id);

  // Tant qu'aucune recette n'a alimenté le formulaire, l'écran est celui du détail : mêmes
  // constats, mot pour mot, et surtout même refus d'affirmer « introuvable » sur une lecture
  // qui n'a pas abouti.
  if (loaded === null) return <RecipeDetailScreen {...toPropsWithoutRecipe(loadStatus)} />;

  // Retour au DÉTAIL de la recette modifiée — pas au catalogue, contrairement à la création —
  // et sur l'ISSUE de l'enregistrement, jamais sur l'observation du statut : un effet qui
  // regarde `status === 'success'` renavigue au remontage suivant, avant même que la remise à
  // zéro signalée plus haut n'ait pu être lue. Sur erreur, on reste pour afficher le constat.
  // Si l'utilisateur a quitté le formulaire entre-temps, l'enregistrement aboutit quand même
  // (rien ne l'annule), mais son geste de navigation prime.
  const handleSave = (values: RecipeEditValues) => {
    void dispatch(updateRecipe({ id: loaded.id, ...values })).then((result) => {
      if (updateRecipe.fulfilled.match(result) && monte.current)
        navigate(`/catalogue/${loaded.id}`);
    });
  };

  return (
    <RecipeEditForm
      key={loaded.id}
      recipe={loaded}
      saving={saveStatus === 'saving'}
      errorMessage={saveStatus === 'error' ? 'Impossible d’enregistrer la recette.' : null}
      onSave={handleSave}
    />
  );
}
