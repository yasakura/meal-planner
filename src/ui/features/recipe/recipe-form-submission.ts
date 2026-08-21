import { validRowsOf, type IngredientRow } from './ingredient-rows';

export function isSubmitDisabled(form: {
  locked: boolean;
  title: string;
  rows: IngredientRow[];
}): boolean {
  return form.locked || form.title.trim() === '' || validRowsOf(form.rows).length === 0;
}
