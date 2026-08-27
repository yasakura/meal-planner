import { type Convive } from '../../../domain/entities/convive';
import { type Creneau } from '../../../domain/entities/creneau';
import { type Menu, type SlotAddress } from '../../../domain/entities/menu';
import { personneNeMangeAuRepas } from '../../../domain/entities/repas';
import { type Recipe } from '../../../domain/entities/recipe';
import { effectifDuRepas } from '../../../domain/use-cases/effectif-du-repas';
import { type Origin } from '../catalogue/recipe-detail-origin';
import { menuDayLabel } from './menu-day-label';

export type SlotChoiceLink = { href: string; label: string };

export type PresenceChip = { id: string; initials: string; label: string; present: boolean };

export type SlotPresence = {
  repasIndex: number;
  chips: PresenceChip[];
  invitesLabel: string;
  addInviteLabel: string;
  removeInviteLabel: string;
  removeInviteDisabled: boolean;
};

type SlotLine = {
  key: string;
  creneauLabel: string;
  title: string;
  address: SlotAddress;
  choose: SlotChoiceLink | null;
  presence: SlotPresence | null;
};

export type MenuSlotLine =
  | (SlotLine & { recipe: 'known'; href: string })
  | (SlotLine & { recipe: 'unknown' })
  | (SlotLine & { recipe: 'sortie' });

export type MenuDay = { key: string; label: string; slots: MenuSlotLine[] };

const CRENEAU_LABELS: Record<Creneau, string> = {
  midi: 'Midi',
  soir: 'Soir',
};

const RECETTE_INCONNUE = 'Recette inconnue';

const TITRE_INDISPONIBLE = 'Titre indisponible';

const FAMILLE_DE_SORTIE = 'La famille est de sortie';

export function creneauLabel(creneau: Creneau): string {
  return CRENEAU_LABELS[creneau];
}

export function menuDays(
  menu: Menu,
  recipes: Recipe[] | null,
  foyer: readonly Convive[],
  origin: Origin,
): MenuDay[] {
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
    const provenance = foyer.length === 0 ? origin : origin.pour(effectifDuRepas(repas, foyer));
    for (const [slotIndex, slot] of repas.slots.entries()) {
      const ligne = {
        key: `${repas.jour}-${day.slots.length}`,
        creneauLabel: creneauLabel(repas.creneau),
        address: { repasIndex, slotIndex },
        choose: null,
        presence: null,
      };
      const title = titleById.get(slot.recipeId);
      day.slots.push(
        personneNeMangeAuRepas(repas)
          ? { ...ligne, title: FAMILLE_DE_SORTIE, recipe: 'sortie' }
          : title === undefined
            ? { ...ligne, title: titreManquant, recipe: 'unknown' }
            : {
                ...ligne,
                title,
                recipe: 'known',
                href: provenance.recipeHref(slot.recipeId),
              },
      );
    }
  }

  return [...byJour.values()];
}
