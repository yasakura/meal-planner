import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { RecipeCreateScreen } from './RecipeCreateScreen';
import {
  INCOMPLETE_ROW_MESSAGE,
  emptyRow,
  hasIncompleteRow,
  toIngredients,
  validRowsOf,
  type IngredientRow,
} from './ingredient-rows';
import { createRecipe, recipeFormOpened, selectRecipeCreation } from './recipe-slice';

export function RecipeCreateContainer() {
  const [title, setTitle] = useState('');
  const [convives, setConvives] = useState(4);
  const [rows, setRows] = useState<IngredientRow[]>([emptyRow()]);
  const [instructions, setInstructions] = useState('');
  // Le constat de saisie vit ICI, avec les lignes dont il parle et pour exactement leur durée de
  // vie : dans un slice il survivrait au formulaire, comme le statut d'ajout de FR-3. La règle
  // qu'il annonce, elle, vit dans `ingredient-rows.ts` — le seul des deux que la mutation voit.
  const [rowsConstat, setRowsConstat] = useState<string | null>(null);

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

  const validRows = validRowsOf(rows);
  const submitDisabled = status === 'saving' || title.trim() === '' || validRows.length === 0;
  const submitLabel = status === 'saving' ? 'Enregistrement…' : 'Enregistrer';
  const confirmation = status === 'success' ? 'Recette enregistrée.' : null;
  // Le constat de saisie prime sur celui de la panne : c'est le dernier geste de l'utilisateur.
  const errorMessage =
    rowsConstat ?? (status === 'error' ? 'Impossible d’enregistrer la recette.' : null);

  // Retour à la liste sur l'ISSUE de l'enregistrement, jamais sur l'observation du statut :
  // un effet qui regarde `status === 'success'` renavigue au remontage suivant, avant même que
  // la remise à zéro signalée plus haut n'ait pu être lue (les effets d'un même commit voient
  // tous le statut de leur rendu). Sur erreur, on reste sur la page pour afficher le message.
  // Si l'utilisateur a quitté le formulaire entre-temps, l'enregistrement aboutit quand même
  // (rien ne l'annule), mais son geste de navigation prime : on ne le ramène pas au catalogue.
  const handleSubmit = () => {
    // Le bouton reste ACTIF face à une ligne incomplète : c'est le clic qui refuse, et il le dit.
    // Rien ne part vers le dépôt — même règle et même message qu'à la modification.
    if (hasIncompleteRow(rows)) {
      setRowsConstat(INCOMPLETE_ROW_MESSAGE);
      return;
    }
    void dispatch(
      createRecipe({
        title,
        ingredients: toIngredients(rows),
        convivesReference: convives,
        instructions,
      }),
    ).then((result) => {
      if (createRecipe.fulfilled.match(result) && monte.current) navigate('/catalogue');
    });
  };

  const handleRowChange = (index: number, patch: Partial<IngredientRow>) => {
    setRowsConstat(null);
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleAddRow = () => setRows((current) => [...current, emptyRow()]);

  const handleRemoveRow = (index: number) => {
    setRowsConstat(null);
    setRows((current) => current.filter((_, i) => i !== index));
  };

  return (
    <RecipeCreateScreen
      heading="Nouvelle recette"
      backTo="/catalogue"
      backLabel="← Recettes"
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
