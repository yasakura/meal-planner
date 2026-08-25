import { type Creneau } from '../../../domain/entities/creneau';
import { type Menu, type SlotAddress } from '../../../domain/entities/menu';
import { type Recipe } from '../../../domain/entities/recipe';
import { type Origin } from '../catalogue/recipe-detail-origin';
import { menuDayLabel } from './menu-day-label';

export type SlotChoiceLink = { href: string; label: string };

type SlotLine = {
  key: string;
  creneauLabel: string;
  title: string;
  address: SlotAddress;
  choose: SlotChoiceLink | null;
};

export type MenuSlotLine =
  (SlotLine & { recipe: 'known'; href: string }) | (SlotLine & { recipe: 'unknown' });

export type MenuDay = { key: string; label: string; slots: MenuSlotLine[] };

const CRENEAU_LABELS: Record<Creneau, string> = {
  midi: 'Midi',
  soir: 'Soir',
};

const RECETTE_INCONNUE = 'Recette inconnue';

const TITRE_INDISPONIBLE = 'Titre indisponible';

export function creneauLabel(creneau: Creneau): string {
  return CRENEAU_LABELS[creneau];
}

export function menuDays(menu: Menu, recipes: Recipe[] | null, origin: Origin): MenuDay[] {
  const titreManquant = recipes === null ? TITRE_INDISPONIBLE : RECETTE_INCONNUE;
  const titleById = new Map(recipes?.map((recipe) => [recipe.id, recipe.title]));
  const byJour = new Map<number, MenuDay>();

  for (const [repasIndex, repas] of menu.repas.entries()) {
    let day = byJour.get(repas.jour);
    if (day === undefined) {
      day = {
        key: String(repas.jour),
        label: menuDayLabel(menu.dateDebut, repas.jour),
        slots: [],
      };
      byJour.set(repas.jour, day);
    }
    for (const [slotIndex, slot] of repas.slots.entries()) {
      const ligne = {
        key: `${repas.jour}-${day.slots.length}`,
        creneauLabel: creneauLabel(repas.creneau),
        address: { repasIndex, slotIndex },
        choose: null,
      };
      const title = titleById.get(slot.recipeId);
      day.slots.push(
        title === undefined
          ? { ...ligne, title: titreManquant, recipe: 'unknown' }
          : { ...ligne, title, recipe: 'known', href: origin.recipeHref(slot.recipeId) },
      );
    }
  }

  return [...byJour.values()];
}
