import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { menuPeriodLabel } from './menu-period-label';

function menuDe(dateDebut: CalendarDate, dernierJour: number): Menu {
  return createMenu({
    dateDebut,
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: dernierJour, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ],
  });
}

describe('menuPeriodLabel', () => {
  it('une période tenant dans un seul mois ne nomme le mois qu’une fois, à la fin', () => {
    const menu = menuDe(createCalendarDate({ year: 2026, month: 8, day: 17 }), 13);

    expect(menuPeriodLabel(menu)).toBe('17 – 30 août');
  });

  it('une période à cheval sur deux mois nomme le mois de chaque borne', () => {
    const menu = menuDe(createCalendarDate({ year: 2026, month: 8, day: 17 }), 16);

    expect(menuPeriodLabel(menu)).toBe('17 août – 2 sept.');
  });

  it('une période qui franchit le 31 décembre n’affiche pas l’année', () => {
    const menu = menuDe(createCalendarDate({ year: 2026, month: 12, day: 28 }), 13);

    expect(menuPeriodLabel(menu)).toBe('28 déc. – 10 janv.');
  });

  it('la période s’arrête au dernier jour qui porte un repas, pas à la quinzaine entière', () => {
    const menu = menuDe(createCalendarDate({ year: 2026, month: 1, day: 5 }), 6);

    expect(menuPeriodLabel(menu)).toBe('5 – 11 janv.');
  });

  it('écrit « 1er » quand la période commence le premier du mois', () => {
    const menu = menuDe(createCalendarDate({ year: 2026, month: 2, day: 1 }), 13);

    expect(menuPeriodLabel(menu)).toBe('1er – 14 févr.');
  });

  it('écrit « 1er » quand la période finit le premier du mois', () => {
    const menu = menuDe(createCalendarDate({ year: 2026, month: 1, day: 19 }), 13);

    expect(menuPeriodLabel(menu)).toBe('19 janv. – 1er févr.');
  });

  it('ne rembourre le quantième d’aucune borne d’un zéro', () => {
    const menu = menuDe(createCalendarDate({ year: 2026, month: 3, day: 30 }), 5);

    expect(menuPeriodLabel(menu)).toBe('30 mars – 4 avr.');
  });
});
