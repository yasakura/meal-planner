import { describe, it, expect } from 'vitest';
import {
  addDays,
  createCalendarDate,
  dayOfWeek,
  isBefore,
  parseIsoDate,
  subtractMonths,
  toIsoDate,
} from './calendar-date';

describe('CalendarDate', () => {
  it('se crée valide et expose ses composants civils', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(date).toEqual({ year: 2026, month: 8, day: 24 });
  });

  it('retourne une date gelée (immuable au runtime)', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(Object.isFrozen(date)).toBe(true);
  });

  it.each([
    ['30 février (mois court)', { year: 2026, month: 2, day: 30 }],
    ['31 avril (mois de 30 jours)', { year: 2026, month: 4, day: 31 }],
    ['29 février hors année bissextile', { year: 2026, month: 2, day: 29 }],
    ['mois 0', { year: 2026, month: 0, day: 12 }],
    ['mois 13', { year: 2026, month: 13, day: 12 }],
    ['jour 0', { year: 2026, month: 8, day: 0 }],
    ['jour 32', { year: 2026, month: 8, day: 32 }],
    ['jour fractionnaire', { year: 2026, month: 8, day: 24.5 }],
    ['mois fractionnaire', { year: 2026, month: 8.5, day: 24 }],
    ['année fractionnaire', { year: 2026.5, month: 8, day: 24 }],
    ['composant NaN', { year: Number.NaN, month: 8, day: 24 }],
  ])('rejette un triplet qui ne désigne aucun jour du calendrier : %s', (_label, props) => {
    expect(() => createCalendarDate(props)).toThrow('La date civile est invalide');
  });

  it('accepte le 29 février d’une année bissextile', () => {
    const date = createCalendarDate({ year: 2028, month: 2, day: 29 });

    expect(date).toEqual({ year: 2028, month: 2, day: 29 });
  });
});

describe('addDays', () => {
  it('ajoute zéro jour : la date ne bouge pas', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(addDays(date, 0)).toEqual({ year: 2026, month: 8, day: 24 });
  });

  it('ajoute un jour : le lendemain', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(addDays(date, 1)).toEqual({ year: 2026, month: 8, day: 25 });
  });

  it('ajoute treize jours (dernier jour d’une quinzaine)', () => {
    const date = createCalendarDate({ year: 2026, month: 1, day: 5 });

    expect(addDays(date, 13)).toEqual({ year: 2026, month: 1, day: 18 });
  });

  it('franchit la fin d’un mois', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 31 });

    expect(addDays(date, 1)).toEqual({ year: 2026, month: 9, day: 1 });
  });

  it('franchit la fin d’une année', () => {
    const date = createCalendarDate({ year: 2026, month: 12, day: 31 });

    expect(addDays(date, 1)).toEqual({ year: 2027, month: 1, day: 1 });
  });

  it('franchit le 29 février d’une année bissextile', () => {
    const date = createCalendarDate({ year: 2028, month: 2, day: 28 });

    expect(addDays(date, 1)).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it('ajoute des jours pleins autour du 29 mars, jour de 23 h en France, sans le traiter à part', () => {
    const date = createCalendarDate({ year: 2026, month: 3, day: 28 });

    expect(addDays(date, 1)).toEqual({ year: 2026, month: 3, day: 29 });
    expect(addDays(date, 2)).toEqual({ year: 2026, month: 3, day: 30 });
  });

  it('ajoute des jours pleins autour du 25 octobre, jour de 25 h en France, sans le traiter à part', () => {
    const date = createCalendarDate({ year: 2026, month: 10, day: 24 });

    expect(addDays(date, 1)).toEqual({ year: 2026, month: 10, day: 25 });
    expect(addDays(date, 2)).toEqual({ year: 2026, month: 10, day: 26 });
  });

  it('rend une date gelée, comme la factory', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(Object.isFrozen(addDays(date, 1))).toBe(true);
  });

  it('ne modifie pas la date reçue', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    addDays(date, 10);

    expect(date).toEqual({ year: 2026, month: 8, day: 24 });
  });
});

describe('dayOfWeek', () => {
  it.each([
    ['dimanche', { year: 2026, month: 8, day: 23 }, 0],
    ['lundi', { year: 2026, month: 8, day: 24 }, 1],
    ['mardi', { year: 2026, month: 8, day: 25 }, 2],
    ['mercredi', { year: 2026, month: 8, day: 26 }, 3],
    ['jeudi', { year: 2026, month: 8, day: 27 }, 4],
    ['vendredi', { year: 2026, month: 8, day: 28 }, 5],
    ['samedi', { year: 2026, month: 8, day: 29 }, 6],
  ])('rend le rang du jour de la semaine : %s', (_label, props, expected) => {
    expect(dayOfWeek(createCalendarDate(props))).toBe(expected);
  });
});

describe('toIsoDate', () => {
  it('rend le format du champ natif : AAAA-MM-JJ', () => {
    expect(toIsoDate(createCalendarDate({ year: 2026, month: 8, day: 24 }))).toBe('2026-08-24');
  });

  it('complète le mois et le quantième par un zéro', () => {
    expect(toIsoDate(createCalendarDate({ year: 2026, month: 1, day: 5 }))).toBe('2026-01-05');
  });
});

describe('parseIsoDate', () => {
  it('relit le format du champ natif', () => {
    expect(parseIsoDate('2026-08-24')).toEqual({ year: 2026, month: 8, day: 24 });
  });

  it('relit le 29 février d’une année bissextile', () => {
    expect(parseIsoDate('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it('rend une date gelée, comme la factory', () => {
    expect(Object.isFrozen(parseIsoDate('2026-08-24'))).toBe(true);
  });

  it.each([
    ['chaîne vide (le champ natif effacé)', ''],
    ['date partielle', '2026-08'],
    ['séparateurs français', '24/08/2026'],
    ['mois et quantième sans zéro', '2026-8-4'],
    ['horodatage complet', '2026-08-24T00:00:00'],
    ['espace en tête', ' 2026-08-24'],
    ['lettres', 'abcd-ef-gh'],
    ['mois 13', '2026-13-01'],
    ['mois 0', '2026-00-01'],
    ['quantième 32', '2026-08-32'],
    ['quantième 0', '2026-08-00'],
    ['30 février', '2026-02-30'],
    ['31 avril', '2026-04-31'],
    ['29 février hors année bissextile', '2026-02-29'],
  ])('rejette ce qui ne désigne aucun jour du calendrier : %s', (_label, iso) => {
    expect(() => parseIsoDate(iso)).toThrow('La date civile est invalide');
  });
});

describe('subtractMonths', () => {
  it('recule de deux mois en gardant le quantième quand il existe', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 19 });

    expect(subtractMonths(date, 2)).toEqual({ year: 2026, month: 6, day: 19 });
  });

  it('recule au-delà du 1er janvier : l’année suit', () => {
    const date = createCalendarDate({ year: 2026, month: 1, day: 15 });

    expect(subtractMonths(date, 2)).toEqual({ year: 2025, month: 11, day: 15 });
  });

  it.each([
    [
      '30 avril : février 2026 s’arrête au 28',
      { year: 2026, month: 4, day: 30 },
      2,
      { year: 2026, month: 2, day: 28 },
    ],
    [
      '31 mars : février 2028 est bissextile et s’arrête au 29',
      { year: 2028, month: 3, day: 31 },
      1,
      { year: 2028, month: 2, day: 29 },
    ],
    [
      '31 mai : avril s’arrête au 30',
      { year: 2026, month: 5, day: 31 },
      1,
      { year: 2026, month: 4, day: 30 },
    ],
    [
      '31 janvier : novembre 2025 s’arrête au 30',
      { year: 2026, month: 1, day: 31 },
      2,
      { year: 2025, month: 11, day: 30 },
    ],
  ])(
    'ramène au dernier jour du mois quand le quantième n’y existe pas : %s',
    (_label, props, months, expected) => {
      expect(subtractMonths(createCalendarDate(props), months)).toEqual(expected);
    },
  );
});

describe('isBefore', () => {
  it('la veille précède le jour', () => {
    const veille = createCalendarDate({ year: 2026, month: 6, day: 18 });
    const jour = createCalendarDate({ year: 2026, month: 6, day: 19 });

    expect(isBefore(veille, jour)).toBe(true);
  });

  it('un jour ne se précède pas LUI-MÊME : la comparaison est stricte', () => {
    const jour = createCalendarDate({ year: 2026, month: 6, day: 19 });
    const memeJour = createCalendarDate({ year: 2026, month: 6, day: 19 });

    expect(isBefore(jour, memeJour)).toBe(false);
  });

  it('le lendemain ne précède pas', () => {
    const lendemain = createCalendarDate({ year: 2026, month: 6, day: 20 });
    const jour = createCalendarDate({ year: 2026, month: 6, day: 19 });

    expect(isBefore(lendemain, jour)).toBe(false);
  });

  it('l’année l’emporte sur le quantième : le 31 décembre 2025 précède le 1er janvier 2026', () => {
    const finDAnnee = createCalendarDate({ year: 2025, month: 12, day: 31 });
    const nouvelAn = createCalendarDate({ year: 2026, month: 1, day: 1 });

    expect(isBefore(finDAnnee, nouvelAn)).toBe(true);
  });

  it('le mois l’emporte sur le quantième : le 31 mai précède le 1er juin', () => {
    const finDeMai = createCalendarDate({ year: 2026, month: 5, day: 31 });
    const debutDeJuin = createCalendarDate({ year: 2026, month: 6, day: 1 });

    expect(isBefore(finDeMai, debutDeJuin)).toBe(true);
  });
});
