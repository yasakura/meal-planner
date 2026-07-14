import { useState } from 'react';

import { createIngredient } from '../../../domain/entities/ingredient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { RecipeCreateScreen, type IngredientRow } from './RecipeCreateScreen';
import { createRecipe, selectRecipeCreation } from './recipe-slice';

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

  const { status } = useAppSelector(selectRecipeCreation);
  const dispatch = useAppDispatch();

  const validRows = rows.filter(isValidRow);
  const submitDisabled = status === 'saving' || title.trim() === '' || validRows.length === 0;
  const submitLabel = status === 'saving' ? 'Enregistrement…' : 'Enregistrer';
  const confirmation = status === 'success' ? 'Recette enregistrée.' : null;
  const errorMessage = status === 'error' ? 'Impossible d’enregistrer la recette.' : null;

  const handleSubmit = () => {
    const ingredients = validRows.map((row) =>
      createIngredient({ name: row.name, quantity: Number(row.quantity), unit: row.unit }),
    );
    dispatch(createRecipe({ title, ingredients, convivesReference: convives }));
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
      onTitleChange={setTitle}
      onConvivesChange={setConvives}
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
