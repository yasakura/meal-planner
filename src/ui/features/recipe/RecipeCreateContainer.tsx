import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
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
  createRecipe,
  recipeCreateNoticeOf,
  recipeFormScreenOpened,
  selectIsCreationLocked,
  selectRecipeCreation,
  type RecipeFormNotice,
} from './recipe-slice';

export function RecipeCreateContainer() {
  const [title, setTitle] = useState('');
  const [convives, setConvives] = useState(4);
  const [rows, setRows] = useState<IngredientRow[]>([emptyRow()]);
  const [instructions, setInstructions] = useState('');
  const [rowsConstat, setRowsConstat] = useState<string | null>(null);

  const creation = useAppSelector(selectRecipeCreation);
  const envoiVerrouille = useAppSelector(selectIsCreationLocked);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(recipeFormScreenOpened());
  }, [dispatch]);

  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  const submitDisabled = isSubmitDisabled({ locked: envoiVerrouille, title, rows });
  const submitLabel = creation.status === 'saving' ? 'Enregistrement…' : 'Enregistrer';
  const notice: RecipeFormNotice | null =
    rowsConstat !== null ? { tone: 'error', message: rowsConstat } : recipeCreateNoticeOf(creation);

  const handleSubmit = () => {
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
      notice={notice}
    />
  );
}
