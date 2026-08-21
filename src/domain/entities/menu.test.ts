import { describe, it, expect } from 'vitest';
import { createCalendarDate } from './calendar-date';
import { createMenu } from './menu';
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
