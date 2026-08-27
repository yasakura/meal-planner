import {
  createIngredient,
  isAcceptableQuantity,
  type Ingredient,
  type Unit,
} from '../../../domain/entities/ingredient';

export type IngredientRow = {
  name: string;
  quantity: string;
  unit: Unit;
};

export function emptyRow(): IngredientRow {
  return { name: '', quantity: '', unit: 'g' };
}

export function isValidRow(row: IngredientRow): boolean {
  return row.name.trim() !== '' && isAcceptableQuantity(Number(row.quantity), row.unit);
}

export function validRowsOf(rows: IngredientRow[]): IngredientRow[] {
  return rows.filter(isValidRow);
}

function isEmptyRow(row: IngredientRow): boolean {
  return row.name.trim() === '' && row.quantity === '';
}

export function hasIncompleteRow(rows: IngredientRow[]): boolean {
  return rows.some((row) => !isEmptyRow(row) && !isValidRow(row));
}

export const INCOMPLETE_ROW_MESSAGE = 'Complète ou retire les lignes d’ingrédient incomplètes.';

export function toIngredients(rows: IngredientRow[]): Ingredient[] {
  return validRowsOf(rows).map((row) =>
    createIngredient({ name: row.name, quantity: Number(row.quantity), unit: row.unit }),
  );
}
