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
  it('rend les MENUS dans un ordre différent de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = InMemoryMenuRepository.create();
    const menuDu5Janvier = menuCommencantLe(LUNDI_5_JANVIER);
    const menuDu19Janvier = menuCommencantLe(LUNDI_19_JANVIER);
    const menuDu2Fevrier = menuCommencantLe(LUNDI_2_FEVRIER);
    await repository.save(menuDu5Janvier);
    await repository.save(menuDu19Janvier);
    await repository.save(menuDu2Fevrier);

    expect(await repository.findAll()).toEqual([menuDu2Fevrier, menuDu19Janvier, menuDu5Janvier]);
  });
});

describe('InMemoryMenuRepository — observation', () => {
  it("livre l'instantané courant dès l'abonnement, dans un ordre DIFFÉRENT de l'ordre d'insertion", async () => {
    const repository = InMemoryMenuRepository.create();
    const menuDu5Janvier = menuCommencantLe(LUNDI_5_JANVIER);
    const menuDu19Janvier = menuCommencantLe(LUNDI_19_JANVIER);
    await repository.save(menuDu5Janvier);
    await repository.save(menuDu19Janvier);
    const instantanes: (readonly Menu[])[] = [];

    repository.observeAll((menus) => instantanes.push(menus));

    expect(instantanes).toEqual([[menuDu19Janvier, menuDu5Janvier]]);
  });

  it('réémet la liste entière à chaque enregistrement et à chaque retrait', async () => {
    const repository = InMemoryMenuRepository.create();
    const menuDu5Janvier = menuCommencantLe(LUNDI_5_JANVIER);
    const instantanes: (readonly Menu[])[] = [];
    repository.observeAll((menus) => instantanes.push(menus));

    await repository.save(menuDu5Janvier);
    await repository.remove(LUNDI_5_JANVIER);

    expect(instantanes).toEqual([[], [menuDu5Janvier], []]);
  });

  it("n'émet plus rien une fois le désabonnement appelé", async () => {
    const repository = InMemoryMenuRepository.create();
    const instantanes: (readonly Menu[])[] = [];
    const stop = repository.observeAll((menus) => instantanes.push(menus));
    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));
    expect(instantanes).toHaveLength(2);

    stop();
    await repository.save(menuCommencantLe(LUNDI_19_JANVIER));

    expect(instantanes).toHaveLength(2);
  });
});
