import { type Menu, type SlotAddress } from '../../../domain/entities/menu';
import {
  CATALOGUE_UNAVAILABLE_NOTICE,
  CATALOGUE_UNREADABLE_NOTICE,
} from '../catalogue/catalogue-notice';
import { catalogueViewOf, type CatalogueState } from '../catalogue/catalogue-slice';
import { menuDayLabel } from './menu-day-label';
import { creneauLabel, type MenuDay } from './menu-days';
import { slotChoiceHref } from './slot-choice-route';

const SLOT_INTROUVABLE_NOTICE = 'Ce créneau est introuvable dans le menu.';

export type SlotChoiceItem = { id: string; title: string; alreadyUsed: boolean };

export type SlotChoiceView =
  | { status: 'introuvable'; message: string }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'empty' }
  | { status: 'loaded'; slotLabel: string; recipes: SlotChoiceItem[] };

function slotIntrouvable(): SlotChoiceView {
  return { status: 'introuvable', message: SLOT_INTROUVABLE_NOTICE };
}

function slotLabelOf(menu: Menu, address: SlotAddress): string | null {
  const repas = menu.repas[address.repasIndex];
  if (repas === undefined) return null;
  if (repas.slots[address.slotIndex] === undefined) return null;
  return `${menuDayLabel(menu.dateDebut, repas.jour)}, ${creneauLabel(repas.creneau)}`;
}

function recipeIdsOf(menu: Menu): Set<string> {
  return new Set(menu.repas.flatMap((repas) => repas.slots.map((slot) => slot.recipeId)));
}

export function slotChoiceViewOf(
  menu: Menu | null,
  catalogue: CatalogueState,
  address: SlotAddress,
): SlotChoiceView {
  if (menu === null) return slotIntrouvable();
  const slotLabel = slotLabelOf(menu, address);
  if (slotLabel === null) return slotIntrouvable();

  const catalogueView = catalogueViewOf(catalogue);
  if (catalogueView.status === 'loading') return { status: 'loading' };
  if (catalogueView.status === 'unavailable') {
    return { status: 'unavailable', message: CATALOGUE_UNAVAILABLE_NOTICE };
  }
  if (catalogueView.status === 'error') {
    return { status: 'error', message: CATALOGUE_UNREADABLE_NOTICE };
  }
  if (catalogueView.status === 'empty') return { status: 'empty' };

  const dejaAuMenu = recipeIdsOf(menu);
  return {
    status: 'loaded',
    slotLabel,
    recipes: catalogueView.recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      alreadyUsed: dejaAuMenu.has(recipe.id),
    })),
  };
}

export function withSlotChoice(days: MenuDay[]): MenuDay[] {
  return days.map((day) => ({
    ...day,
    slots: day.slots.map((slot) => ({
      ...slot,
      choose: {
        href: slotChoiceHref(slot.address),
        label: `Choisir une recette pour ${day.label}, ${slot.creneauLabel}`,
      },
    })),
  }));
}
