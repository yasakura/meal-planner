import { describe, it, expect } from 'vitest';
import { createCalendarDate } from './calendar-date';
import { type Creneau } from './creneau';
import { createMenu, replaceRepasPresence, replaceSlotRecipe } from './menu';
import { createRepas } from './repas';
import { createSlot } from './slot';

const aRepas = () =>
  createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] });

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

describe('Menu', () => {
  it('se crée valide et expose ses repas', () => {
    const repas = aRepas();
    const menu = createMenu({ repas: [repas], dateDebut: LUNDI_24_AOUT });

    expect(menu.repas).toEqual([repas]);
  });

  it('refuse un menu sans aucun repas', () => {
    expect(() => createMenu({ repas: [], dateDebut: LUNDI_24_AOUT })).toThrow(
      'Un menu doit contenir au moins un repas',
    );
  });

  it('retourne un Menu gelé (immuable au runtime)', () => {
    const menu = createMenu({ repas: [aRepas()], dateDebut: LUNDI_24_AOUT });

    expect(Object.isFrozen(menu)).toBe(true);
  });

  it('gèle le tableau repas (copie défensive immuable)', () => {
    const menu = createMenu({ repas: [aRepas()], dateDebut: LUNDI_24_AOUT });

    expect(Object.isFrozen(menu.repas)).toBe(true);
  });

  it('copie le tableau repas fourni (isolation de la source)', () => {
    const source = [aRepas()];
    const menu = createMenu({ repas: source, dateDebut: LUNDI_24_AOUT });

    source.push(aRepas());

    expect(menu.repas).toHaveLength(1);
  });

  it('porte la date de début reçue', () => {
    const menu = createMenu({ repas: [aRepas()], dateDebut: LUNDI_24_AOUT });

    expect(menu.dateDebut).toEqual({ year: 2026, month: 8, day: 24 });
  });
});

const repasDe = (jour: number, creneau: Creneau, recipeIds: string[]) =>
  createRepas({ jour, creneau, slots: recipeIds.map((recipeId) => createSlot({ recipeId })) });

const menuDeLaSemaine = () =>
  createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [
      repasDe(0, 'midi', ['r-lundi-midi']),
      repasDe(0, 'soir', ['r-lundi-soir', 'r-gamelle']),
      repasDe(1, 'midi', ['r-mardi-midi']),
    ],
  });

describe('remplacement de la recette d’un créneau du menu', () => {
  it('associe la recette choisie au créneau visé', () => {
    const menu = menuDeLaSemaine();

    const modifie = replaceSlotRecipe(menu, { repasIndex: 1, slotIndex: 1 }, 'r-choisie');

    expect(modifie.repas[1]?.slots[1]).toEqual({ recipeId: 'r-choisie' });
  });

  it('rend un autre menu et laisse le menu d’origine intact', () => {
    const menu = menuDeLaSemaine();

    const modifie = replaceSlotRecipe(menu, { repasIndex: 1, slotIndex: 1 }, 'r-choisie');

    expect(modifie).not.toBe(menu);
    expect(menu.repas[1]?.slots[1]).toEqual({ recipeId: 'r-gamelle' });
  });

  it('ne change ni les autres repas, ni les autres créneaux du repas visé, ni la date de début', () => {
    const menu = menuDeLaSemaine();

    const modifie = replaceSlotRecipe(menu, { repasIndex: 1, slotIndex: 1 }, 'r-choisie');

    expect(modifie.repas).toEqual([
      repasDe(0, 'midi', ['r-lundi-midi']),
      repasDe(0, 'soir', ['r-lundi-soir', 'r-choisie']),
      repasDe(1, 'midi', ['r-mardi-midi']),
    ]);
    expect(modifie.dateDebut).toEqual(LUNDI_24_AOUT);
  });

  it('distingue deux repas de même jour et même créneau', () => {
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [repasDe(0, 'soir', ['r-lionel']), repasDe(0, 'soir', ['r-rory'])],
    });

    const modifie = replaceSlotRecipe(menu, { repasIndex: 1, slotIndex: 0 }, 'r-choisie');

    expect(modifie.repas).toEqual([
      repasDe(0, 'soir', ['r-lionel']),
      repasDe(0, 'soir', ['r-choisie']),
    ]);
  });

  it('accepte une recette déjà utilisée dans un autre créneau du menu', () => {
    const menu = menuDeLaSemaine();

    const modifie = replaceSlotRecipe(menu, { repasIndex: 1, slotIndex: 1 }, 'r-mardi-midi');

    expect(modifie.repas[1]?.slots[1]).toEqual({ recipeId: 'r-mardi-midi' });
    expect(modifie.repas[2]?.slots[0]).toEqual({ recipeId: 'r-mardi-midi' });
  });

  it('refuse une désignation dont le repas est hors du menu', () => {
    const menu = menuDeLaSemaine();

    expect(() => replaceSlotRecipe(menu, { repasIndex: 3, slotIndex: 0 }, 'r-choisie')).toThrow(
      'Le créneau visé est introuvable dans le menu',
    );
  });

  it('refuse une désignation dont le créneau est hors du repas visé', () => {
    const menu = menuDeLaSemaine();

    expect(() => replaceSlotRecipe(menu, { repasIndex: 0, slotIndex: 1 }, 'r-choisie')).toThrow(
      'Le créneau visé est introuvable dans le menu',
    );
  });
});

describe('déclaration de qui mange à un créneau du menu', () => {
  const menuDeDeuxCreneaux = () =>
    createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [repasDe(0, 'midi', ['r-lundi-midi']), repasDe(0, 'soir', ['r-lundi-soir'])],
    });

  it('déclare les présents et les invités du créneau visé sans toucher à ses recettes', () => {
    const menu = menuDeDeuxCreneaux();

    const modifie = replaceRepasPresence(menu, 1, { presents: ['c-lionel'], invites: 2 });

    expect(modifie.repas[1]?.presents).toEqual(['c-lionel']);
    expect(modifie.repas[1]?.invites).toBe(2);
    expect(modifie.repas[1]?.slots).toEqual([{ recipeId: 'r-lundi-soir' }]);
  });

  it('rend un autre menu, laisse le menu d’origine et les autres créneaux intacts', () => {
    const menu = menuDeDeuxCreneaux();

    const modifie = replaceRepasPresence(menu, 1, { presents: ['c-lionel'], invites: 2 });

    expect(modifie).not.toBe(menu);
    expect(menu.repas[1]?.presents).toBeNull();
    expect(modifie.repas[0]?.presents).toBeNull();
    expect(modifie.repas[0]?.invites).toBe(0);
  });

  it('refuse une déclaration dont le repas est hors du menu', () => {
    const menu = menuDeDeuxCreneaux();

    expect(() => replaceRepasPresence(menu, 2, { presents: [], invites: 0 })).toThrow(
      'Le repas visé est introuvable dans le menu',
    );
  });

  it('changer la recette d’un créneau ne change pas qui y mange', () => {
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({
          jour: 0,
          creneau: 'midi',
          slots: [createSlot({ recipeId: 'r-lundi-midi' })],
          presents: ['c-lionel'],
          invites: 2,
        }),
      ],
    });

    const modifie = replaceSlotRecipe(menu, { repasIndex: 0, slotIndex: 0 }, 'r-choisie');

    expect(modifie.repas[0]?.presents).toEqual(['c-lionel']);
    expect(modifie.repas[0]?.invites).toBe(2);
  });
});
