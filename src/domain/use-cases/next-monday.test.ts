import { describe, it, expect } from 'vitest';
import { createCalendarDate } from '../entities/calendar-date';
import { DriftingClock } from '../test-doubles/drifting-clock';
import { nextMondayUseCase } from './next-monday';

function nextMondayFrom(props: { year: number; month: number; day: number }) {
  const clock = DriftingClock.startingOn(createCalendarDate(props));
  return nextMondayUseCase({ clock })();
}

describe('nextMondayUseCase', () => {
  // « Le prochain lundi » INCLUT aujourd'hui : ouvrir l'application un lundi propose ce
  // lundi-là, pas celui d'après. Les sept jours de la semaine sont pris — c'est le seul moyen
  // qu'aucun décalage d'un cran ne se cache derrière un jour non testé.
  it.each([
    ['lundi (aujourd’hui même)', { year: 2026, month: 8, day: 24 }, { d: 24, m: 8 }],
    ['mardi', { year: 2026, month: 8, day: 25 }, { d: 31, m: 8 }],
    ['mercredi', { year: 2026, month: 8, day: 26 }, { d: 31, m: 8 }],
    ['jeudi', { year: 2026, month: 8, day: 27 }, { d: 31, m: 8 }],
    ['vendredi', { year: 2026, month: 8, day: 28 }, { d: 31, m: 8 }],
    ['samedi', { year: 2026, month: 8, day: 29 }, { d: 31, m: 8 }],
    ['dimanche (le lendemain)', { year: 2026, month: 8, day: 30 }, { d: 31, m: 8 }],
  ])('depuis un %s, propose le prochain lundi', (_label, today, attendu) => {
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
    // L'horloge dérive d'un jour par lecture : partie d'un dimanche, la 1ʳᵉ lecture rend le
    // dimanche 23 (→ lundi 24), la 2ᵉ le lundi 24 (→ ce lundi 24 lui-même), la 3ᵉ le mardi 25
    // (→ lundi 31). Une implémentation qui mémoriserait sa première réponse rendrait trois
    // fois le 24 ; une qui lirait DEUX fois par appel sauterait la deuxième valeur.
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
