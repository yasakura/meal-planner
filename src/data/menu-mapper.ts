import { parseIsoDate, toIsoDate, type CalendarDate } from '../domain/entities/calendar-date';
import { type Creneau } from '../domain/entities/creneau';
import { createMenu, type Menu } from '../domain/entities/menu';
import { createRepas } from '../domain/entities/repas';
import { createSlot } from '../domain/entities/slot';

export type MenuDocument = {
  repas: Array<{
    jour: number;
    creneau: Creneau;
    slots: Array<{ recipeId: string }>;
    presents?: readonly string[] | null;
    invites?: number;
  }>;
};

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
      presents: repas.presents,
      invites: repas.invites,
    })),
  };
}

function presentsDuDocument(presents: unknown): readonly string[] | null {
  if (presents === undefined || presents === null) return null;
  if (!Array.isArray(presents)) {
    throw new Error('Document menu invalide : les présents du repas doivent être un tableau');
  }
  return presents.map((present: unknown) => {
    if (typeof present !== 'string') {
      throw new Error(
        'Document menu invalide : chaque présent du repas doit être une chaîne de caractères',
      );
    }
    return present;
  });
}

function invitesDuDocument(invites: unknown): number {
  if (invites === undefined) return 0;
  if (typeof invites !== 'number') {
    throw new Error("Document menu invalide : le nombre d'invités du repas doit être un nombre");
  }
  return invites;
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
      const { jour, creneau, slots, presents, invites } = rawRepas as Record<string, unknown>;
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
        presents: presentsDuDocument(presents),
        invites: invitesDuDocument(invites),
      });
    }),
  });
}
