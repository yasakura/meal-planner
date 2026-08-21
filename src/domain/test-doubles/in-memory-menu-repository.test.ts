import { describe, it, expect } from 'vitest';
import { createCalendarDate, type CalendarDate } from '../entities/calendar-date';
import { createMenu, type Menu } from '../entities/menu';
import { createRepas } from '../entities/repas';
import { createSlot } from '../entities/slot';
import { InMemoryMenuRepository } from './in-memory-menu-repository';

const LUNDI_5_JANVIER = createCalendarDate({ year: 2026, month: 1, day: 5 });
const LUNDI_19_JANVIER = createCalendarDate({ year: 2026, month: 1, day: 19 });
const LUNDI_2_FEVRIER = createCalendarDate({ year: 2026, month: 2, day: 2 });

function menuCommencantLe(dateDebut: CalendarDate): Menu {
  return createMenu({
    dateDebut,
    repas: [createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r-1' })] })],
  });
}

describe('InMemoryMenuRepository', () => {
  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = InMemoryMenuRepository.create();
    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));
    await repository.save(menuCommencantLe(LUNDI_19_JANVIER));
    await repository.save(menuCommencantLe(LUNDI_2_FEVRIER));

    expect(await repository.findAllStartDates()).toEqual([
      LUNDI_2_FEVRIER,
      LUNDI_19_JANVIER,
      LUNDI_5_JANVIER,
    ]);
  });
});
