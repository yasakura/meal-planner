export const UNITS = ['g', 'kg', 'ml', 'l', 'piece'] as const;

export type Unit = (typeof UNITS)[number];

export type Ingredient = {
  readonly name: string;
  readonly quantity: number;
  readonly unit: Unit;
};

export const CHIFFRES_SIGNIFICATIFS_FIABLES = 12;

export const LIMITE_DU_COMPTE_JUSTE = 10 ** CHIFFRES_SIGNIFICATIFS_FIABLES;

export const BASES_PAR_GRANDE_UNITE = 1000;

export const UNITE_DE_BASE: Record<Unit, Unit> = {
  g: 'g',
  kg: 'g',
  ml: 'ml',
  l: 'ml',
  piece: 'piece',
};

export function estUneGrandeUnite(unit: Unit): boolean {
  return UNITE_DE_BASE[unit] !== unit;
}

export function enUniteDeBase(quantity: number, unit: Unit): number {
  return estUneGrandeUnite(unit) ? quantity * BASES_PAR_GRANDE_UNITE : quantity;
}

function quantityRejection(quantity: number, unit: Unit): string | null {
  if (!Number.isFinite(quantity)) return 'La quantité doit être un nombre fini';
  if (quantity <= 0) return 'La quantité doit être strictement positive';
  if (enUniteDeBase(quantity, unit) > LIMITE_DU_COMPTE_JUSTE) {
    return 'La quantité ne doit pas dépasser le plafond du compte juste';
  }
  return null;
}

export function isAcceptableQuantity(quantity: number, unit: Unit): boolean {
  return quantityRejection(quantity, unit) === null;
}

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
  const quantityRejected = quantityRejection(props.quantity, props.unit);
  if (quantityRejected !== null) {
    throw new Error(quantityRejected);
  }
  if (!UNITS.includes(props.unit)) {
    throw new Error('Unité invalide');
  }
  return Object.freeze({ name, quantity: props.quantity, unit: props.unit });
}
