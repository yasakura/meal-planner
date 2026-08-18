import { createIngredient, type Ingredient, type Unit } from '../../../domain/entities/ingredient';

/**
 * La ligne d'ingrédient telle que le FORMULAIRE la porte : `quantity` y est une chaîne, parce
 * qu'un champ de saisie l'est. La conversion vers l'entité du domaine se fait ici, en un seul
 * endroit, partagé par la création et la modification.
 *
 * Ce module est un `.ts` et non un `.tsx`, et ce n'est pas un détail : Stryker ne mute que les
 * fichiers `.ts` de `src/ui/features/`, jamais les `.tsx`. Ces règles-là sont des DÉCISIONS
 * (qu'est-ce qu'une ligne valide, que verrouille-t-elle) — elles n'ont rien à faire dans un
 * container que la mutation ne voit pas.
 */
export type IngredientRow = {
  name: string;
  quantity: string;
  unit: Unit;
};

export function emptyRow(): IngredientRow {
  return { name: '', quantity: '', unit: 'g' };
}

export function isValidRow(row: IngredientRow): boolean {
  const quantity = Number(row.quantity);
  return row.name.trim() !== '' && Number.isFinite(quantity) && quantity > 0;
}

export function validRowsOf(rows: IngredientRow[]): IngredientRow[] {
  return rows.filter(isValidRow);
}

/**
 * Ni nom ni quantité : l'amorce d'une saisie, pas une erreur. C'est la ligne qui sert à en
 * ajouter une.
 *
 * Le nom est trimé, la quantité ne l'est pas, et l'asymétrie est voulue : « Nom » est un texte
 * libre où des espaces s'attrapent d'une frappe, « Quantité » est un `input type="number"` qui
 * ne rend jamais d'espaces. Trimer la quantité serait une branche que rien n'emprunte.
 */
function isEmptyRow(row: IngredientRow): boolean {
  return row.name.trim() === '' && row.quantity === '';
}

/**
 * Une ligne AMORCÉE mais incomplète (un nom sans quantité valide, une quantité sans nom) est une
 * saisie en cours, jamais une ligne à jeter : l'écarter en silence détruit un ingrédient existant
 * lors d'une modification, et l'écran annonce quand même un succès. Elle REFUSE l'enregistrement.
 */
export function hasIncompleteRow(rows: IngredientRow[]): boolean {
  return rows.some((row) => !isEmptyRow(row) && !isValidRow(row));
}

/**
 * Le vocabulaire d'une saisie à reprendre, délibérément distinct de celui de la panne
 * (« Impossible d'enregistrer la recette. ») : ici l'utilisateur peut agir, et ses deux remèdes
 * sont nommés.
 */
export const INCOMPLETE_ROW_MESSAGE = 'Complète ou retire les lignes d’ingrédient incomplètes.';

/** Les lignes INVALIDES sont écartées, pas rejetées : la ligne vide résiduelle est normale. */
export function toIngredients(rows: IngredientRow[]): Ingredient[] {
  return validRowsOf(rows).map((row) =>
    createIngredient({ name: row.name, quantity: Number(row.quantity), unit: row.unit }),
  );
}
