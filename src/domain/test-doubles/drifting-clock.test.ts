import { describe, it, expect } from 'vitest';
import { createCalendarDate } from '../entities/calendar-date';
import { DriftingClock } from './drifting-clock';

describe('DriftingClock', () => {
  it('rend la date de départ à la première lecture', () => {
    const clock = DriftingClock.startingOn(createCalendarDate({ year: 2026, month: 8, day: 19 }));

    expect(clock.today()).toEqual({ year: 2026, month: 8, day: 19 });
  });

  it('avance d’un jour à chaque lecture suivante : aucune stabilité n’est promise', () => {
    const clock = DriftingClock.startingOn(createCalendarDate({ year: 2026, month: 8, day: 19 }));

    expect(clock.today()).toEqual({ year: 2026, month: 8, day: 19 });
    expect(clock.today()).toEqual({ year: 2026, month: 8, day: 20 });
    expect(clock.today()).toEqual({ year: 2026, month: 8, day: 21 });
  });

  it('dérive à travers une fin de mois', () => {
    const clock = DriftingClock.startingOn(createCalendarDate({ year: 2026, month: 8, day: 31 }));

    clock.today();

    expect(clock.today()).toEqual({ year: 2026, month: 9, day: 1 });
  });

  it('deux horloges nées de la même date dérivent indépendamment', () => {
    const start = createCalendarDate({ year: 2026, month: 8, day: 19 });
    const premiere = DriftingClock.startingOn(start);
    const seconde = DriftingClock.startingOn(start);

    premiere.today();
    premiere.today();

    expect(seconde.today()).toEqual({ year: 2026, month: 8, day: 19 });
  });
});
