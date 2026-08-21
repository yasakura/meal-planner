import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { menuDayLabel } from './menu-day-label';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

describe('menuDayLabel', () => {
  it('nomme le jour 0 par la date de début elle-même', () => {
    expect(menuDayLabel(LUNDI_24_AOUT, 0)).toBe('lundi 24 août');
  });

  it('nomme le jour 1 par le lendemain de la date de début', () => {
    expect(menuDayLabel(LUNDI_24_AOUT, 1)).toBe('mardi 25 août');
  });

  it('nomme le dernier jour d’une quinzaine (décalage 13)', () => {
    expect(menuDayLabel(LUNDI_24_AOUT, 13)).toBe('dimanche 6 septembre');
  });

  it('franchit une fin de mois sans se tromper de mois', () => {
    expect(menuDayLabel(createCalendarDate({ year: 2026, month: 8, day: 31 }), 1)).toBe(
      'mardi 1er septembre',
    );
  });

  it('écrit « 1er » le premier du mois, et le quantième nu les autres jours', () => {
    const jeudi1erJanvier = createCalendarDate({ year: 2026, month: 1, day: 1 });

    expect(menuDayLabel(jeudi1erJanvier, 0)).toBe('jeudi 1er janvier');
    expect(menuDayLabel(jeudi1erJanvier, 1)).toBe('vendredi 2 janvier');
    expect(menuDayLabel(jeudi1erJanvier, 20)).toBe('mercredi 21 janvier');
  });

  it('n’affiche jamais l’année, même en franchissant le 31 décembre', () => {
    const jeudi31Decembre = createCalendarDate({ year: 2026, month: 12, day: 31 });

    expect(menuDayLabel(jeudi31Decembre, 0)).toBe('jeudi 31 décembre');
    expect(menuDayLabel(jeudi31Decembre, 4)).toBe('lundi 4 janvier');
  });

  it('écrit le jour de la semaine et le mois en toutes lettres, en minuscules', () => {
    expect(menuDayLabel(createCalendarDate({ year: 2026, month: 1, day: 5 }), 0)).toBe(
      'lundi 5 janvier',
    );
  });

  it('ne rembourre pas le quantième d’un zéro', () => {
    expect(menuDayLabel(createCalendarDate({ year: 2026, month: 1, day: 5 }), 1)).toBe(
      'mardi 6 janvier',
    );
  });
});
