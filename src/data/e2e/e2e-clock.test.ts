import { describe, expect, it } from 'vitest';
import { createCalendarDate } from '../../domain/entities/calendar-date';
import { E2eClock } from './e2e-clock';

describe('E2eClock', () => {
  it('rend la date sur laquelle elle est posée', () => {
    const clock = E2eClock.on(createCalendarDate({ year: 2026, month: 1, day: 1 }));

    expect(clock.today()).toEqual({ year: 2026, month: 1, day: 1 });
  });

  it('rend la MÊME date à chaque lecture : le temps ne passe pas en scénario', () => {
    const clock = E2eClock.on(createCalendarDate({ year: 2026, month: 1, day: 1 }));

    clock.today();
    clock.today();

    expect(clock.today()).toEqual({ year: 2026, month: 1, day: 1 });
  });
});
