import { describe, it, expect, vi } from 'vitest';

import { selectStartDateFloorIso, selectStartDateIso } from '../features/menu/menu-slice';

const MERCREDI_19_AOUT = '2026-08-19';
const LUNDI_SUIVANT_24_AOUT = '2026-08-24';

const horloges = vi.hoisted(() => ({
  jours: [
    { year: 2026, month: 8, day: 19 },
    { year: 2026, month: 8, day: 26 },
    { year: 2026, month: 9, day: 2 },
    { year: 2026, month: 9, day: 9 },
  ],
  creees: 0,
}));

vi.mock('../../config/firebase', () => ({ auth: {}, db: {} }));

vi.mock('../../data/system-clock', () => ({
  SystemClock: {
    create: () => {
      const jour = horloges.jours[horloges.creees];
      horloges.creees += 1;
      return { today: () => jour };
    },
  },
}));

const { createAppStore } = await import('./create-app-store');

describe('createAppStore', () => {
  it('lit UN SEUL aujourd’hui : le plancher de saisie et la date de début proposée décrivent la même semaine', () => {
    const store = createAppStore();

    expect(selectStartDateFloorIso(store.getState())).toBe(MERCREDI_19_AOUT);
    expect(selectStartDateIso(store.getState())).toBe(LUNDI_SUIVANT_24_AOUT);
  });
});
