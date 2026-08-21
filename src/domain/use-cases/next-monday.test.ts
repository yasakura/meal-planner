import { describe, it, expect } from 'vitest';
import { createCalendarDate } from '../entities/calendar-date';
import { DriftingClock } from '../test-doubles/drifting-clock';
import { nextMondayUseCase } from './next-monday';

function nextMondayFrom(props: { year: number; month: number; day: number }) {
  const clock = DriftingClock.startingOn(createCalendarDate(props));
  return nextMondayUseCase({ clock })();
}

describe('nextMondayUseCase', () => {
  it.each([
    ['lundi (aujourd’hui même)', { year: 2026, month: 8, day: 24 }, { d: 24, m: 8 }],
    ['mardi', { year: 2026, month: 8, day: 25 }, { d: 31, m: 8 }],
    ['mercredi', { year: 2026, month: 8, day: 26 }, { d: 31, m: 8 }],
    ['jeudi', { year: 2026, month: 8, day: 27 }, { d: 31, m: 8 }],
    ['vendredi', { year: 2026, month: 8, day: 28 }, { d: 31, m: 8 }],
    ['samedi', { year: 2026, month: 8, day: 29 }, { d: 31, m: 8 }],
    ['dimanche (le lendemain)', { year: 2026, month: 8, day: 30 }, { d: 31, m: 8 }],
  ])('depuis un %s, propose le prochain lundi, aujourd’hui compris', (_label, today, attendu) => {
    expect(nextMondayFrom(today)).toEqual({ year: 2026, month: attendu.m, day: attendu.d });
  });

  it('franchit une fin d’année : depuis le jeudi 31 décembre 2026, le lundi 4 janvier 2027', () => {
    expect(nextMondayFrom({ year: 2026, month: 12, day: 31 })).toEqual({
      year: 2027,
      month: 1,
      day: 4,
    });
  });

  it('lit l’horloge à CHAQUE appel, sans mémoriser sa première réponse', () => {
    const clock = DriftingClock.startingOn(createCalendarDate({ year: 2026, month: 8, day: 23 }));
    const nextMonday = nextMondayUseCase({ clock });

    expect([nextMonday(), nextMonday(), nextMonday()]).toEqual([
      { year: 2026, month: 8, day: 24 },
      { year: 2026, month: 8, day: 24 },
      { year: 2026, month: 8, day: 31 },
    ]);
  });

  it('rend une date civile gelée', () => {
    expect(Object.isFrozen(nextMondayFrom({ year: 2026, month: 8, day: 25 }))).toBe(true);
  });
});
