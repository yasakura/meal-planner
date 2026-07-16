export type Slot = {
  readonly recipeId: string;
};

export type SlotProps = {
  recipeId: string;
};

export function createSlot(props: SlotProps): Slot {
  const recipeId = props.recipeId.trim();
  if (recipeId === '') {
    throw new Error('La recette référencée par le créneau est obligatoire');
  }
  return Object.freeze({ recipeId });
}
