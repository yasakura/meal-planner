import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createIngredient } from '../../../domain/entities/ingredient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { RecipeCreateScreen, type IngredientRow } from './RecipeCreateScreen';
import { createRecipe, recipeFormOpened, selectRecipeCreation } from './recipe-slice';

function emptyRow(): IngredientRow {
  return { name: '', quantity: '', unit: 'g' };
}

function isValidRow(row: IngredientRow): boolean {
  const quantity = Number(row.quantity);
  return row.name.trim() !== '' && Number.isFinite(quantity) && quantity > 0;
}

export function RecipeCreateContainer() {
  const [title, setTitle] = useState('');
  const [convives, setConvives] = useState(4);
  const [rows, setRows] = useState<IngredientRow[]>([emptyRow()]);
  const [instructions, setInstructions] = useState('');

  const { status } = useAppSelector(selectRecipeCreation);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Un formulaire s'ouvre : on le SIGNALE au slice, qui décide seul s'il remet le statut à zéro.
  useEffect(() => {
    dispatch(recipeFormOpened());
  }, [dispatch]);

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

  const validRows = rows.filter(isValidRow);
  const submitDisabled = status === 'saving' || title.trim() === '' || validRows.length === 0;
  const submitLabel = status === 'saving' ? 'Enregistrement…' : 'Enregistrer';
  const confirmation = status === 'success' ? 'Recette enregistrée.' : null;
  const errorMessage = status === 'error' ? 'Impossible d’enregistrer la recette.' : null;

  // Retour à la liste sur l'ISSUE de l'enregistrement, jamais sur l'observation du statut :
  // un effet qui regarde `status === 'success'` renavigue au remontage suivant, avant même que
  // la remise à zéro signalée plus haut n'ait pu être lue (les effets d'un même commit voient
  // tous le statut de leur rendu). Sur erreur, on reste sur la page pour afficher le message.
  // Si l'utilisateur a quitté le formulaire entre-temps, l'enregistrement aboutit quand même
  // (rien ne l'annule), mais son geste de navigation prime : on ne le ramène pas au catalogue.
  const handleSubmit = () => {
    const ingredients = validRows.map((row) =>
      createIngredient({ name: row.name, quantity: Number(row.quantity), unit: row.unit }),
    );
    void dispatch(
      createRecipe({ title, ingredients, convivesReference: convives, instructions }),
    ).then((result) => {
      if (createRecipe.fulfilled.match(result) && monte.current) navigate('/catalogue');
    });
  };

  const handleRowChange = (index: number, patch: Partial<IngredientRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleAddRow = () => setRows((current) => [...current, emptyRow()]);

  const handleRemoveRow = (index: number) =>
    setRows((current) => current.filter((_, i) => i !== index));

  return (
    <RecipeCreateScreen
      title={title}
      convives={convives}
      rows={rows}
      instructions={instructions}
      onTitleChange={setTitle}
      onConvivesChange={setConvives}
      onInstructionsChange={setInstructions}
      onRowChange={handleRowChange}
      onAddRow={handleAddRow}
      onRemoveRow={handleRemoveRow}
      onSubmit={handleSubmit}
      submitDisabled={submitDisabled}
      submitLabel={submitLabel}
      confirmation={confirmation}
      errorMessage={errorMessage}
    />
  );
}
