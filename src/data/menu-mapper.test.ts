import { describe, expect, it } from 'vitest';
import { createCalendarDate } from '../domain/entities/calendar-date';
import { createMenu, type Menu } from '../domain/entities/menu';
import { createRepas } from '../domain/entities/repas';
import { createSlot } from '../domain/entities/slot';
import {
  documentToMenu,
  menuDocumentId,
  menuToDocument,
  startDateFromDocumentId,
  type MenuDocument,
} from './menu-mapper';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

function menuImbrique(): Menu {
  return createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [
      createRepas({
        jour: 0,
        creneau: 'midi',
        slots: [createSlot({ recipeId: 'recipe-curry' }), createSlot({ recipeId: 'recipe-tarte' })],
      }),
      createRepas({
        jour: 13,
        creneau: 'soir',
        slots: [createSlot({ recipeId: 'recipe-gratin' })],
      }),
    ],
  });
}

describe('menu-mapper', () => {
  it('round-trip: documentToMenu(menuToDocument(menu)) reproduit le menu, imbrication comprise', () => {
    const menu = menuImbrique();

    const roundTripped = documentToMenu(menuDocumentId(menu.dateDebut), menuToDocument(menu));

    expect(roundTripped).toEqual(menu);
  });

  it("l'identifiant du document est la date de début au format ISO, mois et quantième sur 2 chiffres", () => {
    expect(menuDocumentId(createCalendarDate({ year: 2026, month: 1, day: 5 }))).toBe('2026-01-05');
  });

  it("relit la date de début depuis l'identifiant du document", () => {
    expect(startDateFromDocumentId('2026-01-05')).toEqual(
      createCalendarDate({ year: 2026, month: 1, day: 5 }),
    );
  });

  it('rejette un identifiant de document qui ne désigne aucun jour du calendrier', () => {
    expect(() => startDateFromDocumentId('2026-02-30')).toThrow('La date civile est invalide');
  });

  it('menuToDocument produit un objet plat sans date de début, avec le seul champ repas', () => {
    const doc = menuToDocument(menuImbrique());

    expect(doc).not.toHaveProperty('dateDebut');
    expect(Object.keys(doc)).toEqual(['repas']);
    expect(doc.repas).toEqual([
      {
        jour: 0,
        creneau: 'midi',
        slots: [{ recipeId: 'recipe-curry' }, { recipeId: 'recipe-tarte' }],
        presents: null,
        invites: 0,
      },
      {
        jour: 13,
        creneau: 'soir',
        slots: [{ recipeId: 'recipe-gratin' }],
        presents: null,
        invites: 0,
      },
    ]);
  });

  it('menuToDocument conserve les repas dans leur ordre, jour et créneau compris', () => {
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({ jour: 2, creneau: 'soir', slots: [createSlot({ recipeId: 'r-a' })] }),
        createRepas({ jour: 1, creneau: 'midi', slots: [createSlot({ recipeId: 'r-b' })] }),
      ],
    });

    expect(menuToDocument(menu).repas.map((repas) => [repas.jour, repas.creneau])).toEqual([
      [2, 'soir'],
      [1, 'midi'],
    ]);
  });

  describe('documentToMenu re-valide structure ET valeurs des données non fiables', () => {
    it('data non-objet (null) → throw structurel', () => {
      const data: unknown = null;

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : la donnée doit être un objet',
      );
    });

    it('data primitif non-null (string) → throw « la donnée doit être un objet », pas le garde repas', () => {
      const data: unknown = 'pas-un-objet';

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : la donnée doit être un objet',
      );
    });

    it('data primitif non-null (number) → throw « la donnée doit être un objet », pas le garde repas', () => {
      const data: unknown = 42;

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : la donnée doit être un objet',
      );
    });

    it('repas non-tableau → throw structurel', () => {
      const data: unknown = { repas: 'midi' };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : les repas doivent être un tableau',
      );
    });

    it('repas contenant un non-objet → throw structurel', () => {
      const data: unknown = { repas: ['midi'] };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : chaque repas doit être un objet',
      );
    });

    it('repas contenant null → throw « chaque repas doit être un objet »', () => {
      const data: unknown = { repas: [null] };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : chaque repas doit être un objet',
      );
    });

    it('jour non-nombre → throw structurel', () => {
      const data: unknown = { repas: [{ jour: '0', creneau: 'midi', slots: [{ recipeId: 'r' }] }] };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : le jour du repas doit être un nombre',
      );
    });

    it('creneau non-chaîne → throw structurel', () => {
      const data: unknown = { repas: [{ jour: 0, creneau: 1, slots: [{ recipeId: 'r' }] }] };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : le créneau du repas doit être une chaîne de caractères',
      );
    });

    it('créneau hors des créneaux du domaine → throw de la factory domaine (createRepas)', () => {
      const data: unknown = {
        repas: [{ jour: 0, creneau: 'brunch', slots: [{ recipeId: 'r' }] }],
      };

      expect(() => documentToMenu('2026-08-24', data)).toThrow('Créneau invalide');
    });

    it('présents non-tableau → throw structurel, plutôt qu’une liste de convives fabriquée lettre à lettre', () => {
      const data: unknown = {
        repas: [{ jour: 0, creneau: 'midi', slots: [{ recipeId: 'r' }], presents: 'c-lionel' }],
      };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : les présents du repas doivent être un tableau',
      );
    });

    it('présent non-chaîne → throw structurel, plutôt qu’un TypeError hors contrat', () => {
      const data: unknown = {
        repas: [{ jour: 0, creneau: 'midi', slots: [{ recipeId: 'r' }], presents: [42] }],
      };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : chaque présent du repas doit être une chaîne de caractères',
      );
    });

    it('invités non-nombre → throw structurel, sous le contrat du document et non celui de l’entité', () => {
      const data: unknown = {
        repas: [{ jour: 0, creneau: 'midi', slots: [{ recipeId: 'r' }], invites: '2' }],
      };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        "Document menu invalide : le nombre d'invités du repas doit être un nombre",
      );
    });

    it('slots non-tableau → throw structurel', () => {
      const data: unknown = { repas: [{ jour: 0, creneau: 'midi', slots: 'r' }] };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : les slots du repas doivent être un tableau',
      );
    });

    it('slots contenant un non-objet → throw structurel', () => {
      const data: unknown = { repas: [{ jour: 0, creneau: 'midi', slots: ['r'] }] };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : chaque slot doit être un objet',
      );
    });

    it('slots contenant null → throw « chaque slot doit être un objet »', () => {
      const data: unknown = { repas: [{ jour: 0, creneau: 'midi', slots: [null] }] };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : chaque slot doit être un objet',
      );
    });

    it('recipeId non-chaîne → throw structurel', () => {
      const data: unknown = { repas: [{ jour: 0, creneau: 'midi', slots: [{ recipeId: 7 }] }] };

      expect(() => documentToMenu('2026-08-24', data)).toThrow(
        'Document menu invalide : la recette référencée par le slot doit être une chaîne de caractères',
      );
    });

    it('identifiant de document hors format ISO → throw de la factory domaine (parseIsoDate)', () => {
      const doc: MenuDocument = {
        repas: [{ jour: 0, creneau: 'midi', slots: [{ recipeId: 'r-1' }] }],
      };

      expect(() => documentToMenu('24-08-2026', doc)).toThrow('La date civile est invalide');
    });

    it('repas sans aucun slot → throw de la factory domaine (createRepas)', () => {
      const doc: MenuDocument = { repas: [{ jour: 0, creneau: 'midi', slots: [] }] };

      expect(() => documentToMenu('2026-08-24', doc)).toThrow(
        'Un repas doit contenir au moins un créneau',
      );
    });

    it('jour négatif → throw de la factory domaine (createRepas)', () => {
      const doc: MenuDocument = {
        repas: [{ jour: -1, creneau: 'midi', slots: [{ recipeId: 'r' }] }],
      };

      expect(() => documentToMenu('2026-08-24', doc)).toThrow(
        'Le jour du repas doit être positif ou nul',
      );
    });

    it('recipeId vide → throw de la factory domaine (createSlot)', () => {
      const doc: MenuDocument = {
        repas: [{ jour: 0, creneau: 'midi', slots: [{ recipeId: '  ' }] }],
      };

      expect(() => documentToMenu('2026-08-24', doc)).toThrow(
        'La recette référencée par le créneau est obligatoire',
      );
    });
  });
});

describe('menu-mapper et la présence aux créneaux', () => {
  it('menuToDocument écrit les présents et les invités de chaque créneau', () => {
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({
          jour: 0,
          creneau: 'midi',
          slots: [createSlot({ recipeId: 'recipe-curry' })],
          presents: ['c-lionel'],
          invites: 2,
        }),
      ],
    });

    expect(menuToDocument(menu).repas.map((repas) => [repas.presents, repas.invites])).toEqual([
      [['c-lionel'], 2],
    ]);
  });

  it('un créneau que personne ne mange survit au round-trip, distinct du créneau laissé au défaut du foyer', () => {
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({
          jour: 0,
          creneau: 'midi',
          slots: [createSlot({ recipeId: 'recipe-curry' })],
          presents: [],
          invites: 0,
        }),
        createRepas({
          jour: 0,
          creneau: 'soir',
          slots: [createSlot({ recipeId: 'recipe-tarte' })],
        }),
      ],
    });

    const roundTripped = documentToMenu(menuDocumentId(menu.dateDebut), menuToDocument(menu));

    expect(roundTripped.repas.at(0)?.presents).toEqual([]);
    expect(roundTripped.repas.at(1)?.presents).toBeNull();
  });

  it('documentToMenu relit les présents et les invités écrits dans le document', () => {
    const data: unknown = {
      repas: [
        {
          jour: 0,
          creneau: 'midi',
          slots: [{ recipeId: 'recipe-curry' }],
          presents: ['c-lionel'],
          invites: 2,
        },
      ],
    };

    const menu = documentToMenu('2026-08-24', data);

    expect(menu.repas.at(0)?.presents).toEqual(['c-lionel']);
    expect(menu.repas.at(0)?.invites).toBe(2);
  });

  it('un document écrit avant les présences relit un créneau au défaut du foyer, sans invité', () => {
    const data: unknown = {
      repas: [{ jour: 0, creneau: 'midi', slots: [{ recipeId: 'recipe-curry' }] }],
    };

    const menu = documentToMenu('2026-08-24', data);

    expect(menu.repas.at(0)?.presents).toBeNull();
    expect(menu.repas.at(0)?.invites).toBe(0);
  });
});
