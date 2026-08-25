import { addDays, type CalendarDate } from './calendar-date';
import { createRepas, type Repas, type RepasProps } from './repas';
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

export type Presence = {
  presents: string[] | null;
  invites: number;
};

function repasModifie(repas: Repas, changement: Partial<RepasProps>): Repas {
  return createRepas({
    jour: repas.jour,
    creneau: repas.creneau,
    slots: [...repas.slots],
    presents: repas.presents,
    invites: repas.invites,
    ...changement,
  });
}

export function replaceRepasPresence(menu: Menu, repasIndex: number, presence: Presence): Menu {
  if (menu.repas[repasIndex] === undefined) {
    throw new Error('Le repas visé est introuvable dans le menu');
  }
  return createMenu({
    dateDebut: menu.dateDebut,
    repas: menu.repas.map((repas, index) =>
      index === repasIndex
        ? repasModifie(repas, { presents: presence.presents, invites: presence.invites })
        : repas,
    ),
  });
}

export function replaceSlotRecipe(menu: Menu, address: SlotAddress, recipeId: string): Menu {
  const repasVise = menu.repas[address.repasIndex];
  if (repasVise === undefined || repasVise.slots[address.slotIndex] === undefined) {
    throw new Error('Le créneau visé est introuvable dans le menu');
  }
  return createMenu({
    dateDebut: menu.dateDebut,
    repas: menu.repas.map((repas, repasIndex) =>
      repasIndex === address.repasIndex
        ? repasModifie(repas, {
            slots: repas.slots.map((slot, slotIndex) =>
              slotIndex === address.slotIndex ? createSlot({ recipeId }) : slot,
            ),
          })
        : repas,
    ),
  });
}
