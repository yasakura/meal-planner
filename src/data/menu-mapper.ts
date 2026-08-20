import { parseIsoDate, toIsoDate, type CalendarDate } from '../domain/entities/calendar-date';
import { type Creneau } from '../domain/entities/creneau';
import { createMenu, type Menu } from '../domain/entities/menu';
import { createRepas } from '../domain/entities/repas';
import { createSlot } from '../domain/entities/slot';

/**
 * Corps du document `menus/{date ISO de début}`.
 *
 * La date de début n'y figure PAS : elle est l'identifiant du document. C'est ce choix qui
 * réalise « une période, un menu » — deux enregistrements sur la même date écrivent le même
 * document, sans qu'aucun garde applicatif n'ait à comparer quoi que ce soit, et
 * `remove(dateDebut)` n'a rien à chercher. La répéter dans le corps ouvrirait la porte à deux
 * vérités contradictoires sur la période d'un même menu.
 *
 * Les repas restent indexés par DÉCALAGE (`jour`), comme l'entité : une date par repas serait
 * dérivable de la date de début, donc redondante, et pourrait la contredire.
 *
 * La forme épouse l'entité au lieu de l'aplatir davantage (`slots: ['recipe-1']` par exemple) :
 * un slot est un objet dans le domaine, et l'écraser en chaîne encoderait ici une décision de
 * modélisation que le domaine n'a pas prise.
 */
export type MenuDocument = {
  repas: Array<{ jour: number; creneau: Creneau; slots: Array<{ recipeId: string }> }>;
};

/** L'identifiant du document EST la période, au format ISO : `2026-08-24`. */
export function menuDocumentId(dateDebut: CalendarDate): string {
  return toIsoDate(dateDebut);
}

export function startDateFromDocumentId(id: string): CalendarDate {
  return parseIsoDate(id);
}

export function menuToDocument(menu: Menu): MenuDocument {
  return {
    repas: menu.repas.map((repas) => ({
      jour: repas.jour,
      creneau: repas.creneau,
      slots: repas.slots.map((slot) => ({ recipeId: slot.recipeId })),
    })),
  };
}

export function documentToMenu(id: string, data: unknown): Menu {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Document menu invalide : la donnée doit être un objet');
  }
  const { repas } = data as Record<string, unknown>;
  if (!Array.isArray(repas)) {
    throw new Error('Document menu invalide : les repas doivent être un tableau');
  }
  return createMenu({
    dateDebut: startDateFromDocumentId(id),
    repas: repas.map((rawRepas: unknown) => {
      if (typeof rawRepas !== 'object' || rawRepas === null) {
        throw new Error('Document menu invalide : chaque repas doit être un objet');
      }
      const { jour, creneau, slots } = rawRepas as Record<string, unknown>;
      if (typeof jour !== 'number') {
        throw new Error('Document menu invalide : le jour du repas doit être un nombre');
      }
      if (typeof creneau !== 'string') {
        throw new Error(
          'Document menu invalide : le créneau du repas doit être une chaîne de caractères',
        );
      }
      if (!Array.isArray(slots)) {
        throw new Error('Document menu invalide : les slots du repas doivent être un tableau');
      }
      return createRepas({
        jour,
        creneau: creneau as Creneau,
        slots: slots.map((rawSlot: unknown) => {
          if (typeof rawSlot !== 'object' || rawSlot === null) {
            throw new Error('Document menu invalide : chaque slot doit être un objet');
          }
          const { recipeId } = rawSlot as Record<string, unknown>;
          if (typeof recipeId !== 'string') {
            throw new Error(
              'Document menu invalide : la recette référencée par le slot doit être une chaîne de caractères',
            );
          }
          return createSlot({ recipeId });
        }),
      });
    }),
  });
}
