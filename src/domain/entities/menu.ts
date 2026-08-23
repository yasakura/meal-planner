import { addDays, type CalendarDate } from './calendar-date';
import { createRepas, type Repas } from './repas';
import { createSlot } from './slot';

export type Menu = {
  readonly dateDebut: CalendarDate;
  readonly repas: readonly Repas[];
};

export type MenuProps = {
  dateDebut: CalendarDate;
  repas: Repas[];
};

export function createMenu(props: MenuProps): Menu {
  if (props.repas.length === 0) {
    throw new Error('Un menu doit contenir au moins un repas');
  }
  return Object.freeze({
    dateDebut: props.dateDebut,
    repas: Object.freeze([...props.repas]),
  });
}

export function dateFinDuMenu(menu: Menu): CalendarDate {
  return addDays(menu.dateDebut, Math.max(...menu.repas.map((repas) => repas.jour)));
}

export type SlotAddress = {
  readonly repasIndex: number;
  readonly slotIndex: number;
};

export function replaceSlotRecipe(menu: Menu, address: SlotAddress, recipeId: string): Menu {
  const repasVise = menu.repas[address.repasIndex];
  if (repasVise === undefined || repasVise.slots[address.slotIndex] === undefined) {
    throw new Error('Le créneau visé est introuvable dans le menu');
  }
  return createMenu({
    dateDebut: menu.dateDebut,
    repas: menu.repas.map((repas, repasIndex) =>
      repasIndex === address.repasIndex
        ? createRepas({
            jour: repas.jour,
            creneau: repas.creneau,
            slots: repas.slots.map((slot, slotIndex) =>
              slotIndex === address.slotIndex ? createSlot({ recipeId }) : slot,
            ),
          })
        : repas,
    ),
  });
}
