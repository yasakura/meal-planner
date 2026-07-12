export const UNITS = ['g', 'kg', 'ml', 'l', 'piece'] as const;

export type Unit = (typeof UNITS)[number];

export type Ingredient = {
  readonly name: string;
  readonly quantity: number;
  readonly unit: Unit;
};

export type IngredientProps = {
  name: string;
  quantity: number;
  unit: Unit;
};

export function createIngredient(props: IngredientProps): Ingredient {
  const name = props.name.trim();
  if (name === '') {
    throw new Error("Le nom de l'ingrédient est obligatoire");
  }
  if (!Number.isFinite(props.quantity)) {
    throw new Error('La quantité doit être un nombre fini');
  }
  if (props.quantity <= 0) {
    throw new Error('La quantité doit être strictement positive');
  }
  if (!UNITS.includes(props.unit)) {
    throw new Error('Unité invalide');
  }
  return Object.freeze({ name, quantity: props.quantity, unit: props.unit });
}
