import { describe, it, expect } from 'vitest';
import { createCalendarDate, toIsoDate, type CalendarDate } from '../entities/calendar-date';
import { createMenu, type Menu } from '../entities/menu';
import { createRepas } from '../entities/repas';
import { createSlot } from '../entities/slot';
import { type MenuRepository } from '../ports/menu-repository';
import { DriftingClock } from '../test-doubles/drifting-clock';
import { InMemoryMenuRepository } from '../test-doubles/in-memory-menu-repository';
import { saveMenuUseCase } from './save-menu';

const AUJOURD_HUI = { year: 2026, month: 8, day: 19 };
const LIMITE_19_JUIN = createCalendarDate({ year: 2026, month: 6, day: 19 });
const VEILLE_DE_LA_LIMITE_18_JUIN = createCalendarDate({ year: 2026, month: 6, day: 18 });
const RECENT_1ER_JUILLET = createCalendarDate({ year: 2026, month: 7, day: 1 });
const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

function menuCommencantLe(dateDebut: CalendarDate, jours = 1): Menu {
  const repas = Array.from({ length: jours }, (_, jour) =>
    createRepas({ jour, creneau: 'midi', slots: [createSlot({ recipeId: 'r0' })] }),
  );
  return createMenu({ dateDebut, repas });
}

function horlogeSurAujourdHui(): DriftingClock {
  return DriftingClock.startingOn(createCalendarDate(AUJOURD_HUI));
}

async function periodesConservees(menuRepository: MenuRepository): Promise<string[]> {
  const dates = await menuRepository.findAllStartDates();
  return dates.map(toIsoDate).sort();
}

async function depotSeedeAvec(...menus: Menu[]): Promise<InMemoryMenuRepository> {
  const menuRepository = InMemoryMenuRepository.create();
  for (const menu of menus) {
    await menuRepository.save(menu);
  }
  menuRepository.saveCount = 0;
  return menuRepository;
}

describe('saveMenuUseCase', () => {
  it('enregistre le menu demandé', async () => {
    const menuRepository = InMemoryMenuRepository.create();
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });
    const menu = menuCommencantLe(LUNDI_24_AOUT, 14);

    await saveMenu({ menu });

    expect(menuRepository.byStartDate(LUNDI_24_AOUT)).toEqual(menu);
    expect(menuRepository.saveCount).toBe(1);
  });

  it('écrase le menu de la MÊME période : une période porte un seul menu', async () => {
    const menuRepository = await depotSeedeAvec(menuCommencantLe(LUNDI_24_AOUT, 7));
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });
    const remplacant = menuCommencantLe(LUNDI_24_AOUT, 14);

    await saveMenu({ menu: remplacant });

    expect(menuRepository.byStartDate(LUNDI_24_AOUT)).toEqual(remplacant);
    expect(menuRepository.all()).toHaveLength(1);
  });

  it('garde côte à côte deux menus de périodes DIFFÉRENTES', async () => {
    const menuRepository = await depotSeedeAvec(menuCommencantLe(RECENT_1ER_JUILLET, 14));
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT, 14) });

    expect(await periodesConservees(menuRepository)).toEqual(['2026-07-01', '2026-08-24']);
  });

  it('purge, à l’enregistrement, les menus commencés plus de deux mois avant AUJOURD’HUI', async () => {
    const menuRepository = await depotSeedeAvec(
      menuCommencantLe(VEILLE_DE_LA_LIMITE_18_JUIN),
      menuCommencantLe(RECENT_1ER_JUILLET),
    );
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT, 14) });

    expect(await periodesConservees(menuRepository)).toEqual(['2026-07-01', '2026-08-24']);
  });

  it('garde le menu commencé EXACTEMENT deux mois avant aujourd’hui : la borne est inclusive', async () => {
    const menuRepository = await depotSeedeAvec(
      menuCommencantLe(LIMITE_19_JUIN),
      menuCommencantLe(VEILLE_DE_LA_LIMITE_18_JUIN),
    );
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT, 14) });

    expect(await periodesConservees(menuRepository)).toEqual(['2026-06-19', '2026-08-24']);
  });

  it('recule la limite de deux mois sur le dernier jour du mois quand le quantième n’existe pas', async () => {
    const menuRepository = await depotSeedeAvec(
      menuCommencantLe(createCalendarDate({ year: 2026, month: 2, day: 28 })),
      menuCommencantLe(createCalendarDate({ year: 2026, month: 2, day: 27 })),
    );
    const clock = DriftingClock.startingOn(createCalendarDate({ year: 2026, month: 4, day: 30 }));
    const saveMenu = saveMenuUseCase({ menuRepository, clock });

    await saveMenu({
      menu: menuCommencantLe(createCalendarDate({ year: 2026, month: 5, day: 4 })),
    });

    expect(await periodesConservees(menuRepository)).toEqual(['2026-02-28', '2026-05-04']);
  });

  it('mesure la rétention depuis AUJOURD’HUI, jamais depuis la date de début du menu enregistré', async () => {
    const menuRepository = await depotSeedeAvec(
      menuCommencantLe(RECENT_1ER_JUILLET),
      menuCommencantLe(VEILLE_DE_LA_LIMITE_18_JUIN),
    );
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await saveMenu({
      menu: menuCommencantLe(createCalendarDate({ year: 2026, month: 12, day: 1 })),
    });

    expect(await periodesConservees(menuRepository)).toEqual(['2026-07-01', '2026-12-01']);
  });

  it('compare la date de DÉBUT du menu, jamais sa fin', async () => {
    const menuRepository = await depotSeedeAvec(menuCommencantLe(VEILLE_DE_LA_LIMITE_18_JUIN, 14));
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT, 14) });

    expect(await periodesConservees(menuRepository)).toEqual(['2026-08-24']);
  });

  it('purge TOUS les menus trop anciens, pas seulement le premier rencontré', async () => {
    const menuRepository = await depotSeedeAvec(
      menuCommencantLe(createCalendarDate({ year: 2026, month: 4, day: 6 })),
      menuCommencantLe(createCalendarDate({ year: 2026, month: 5, day: 4 })),
      menuCommencantLe(VEILLE_DE_LA_LIMITE_18_JUIN),
    );
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT, 14) });

    expect(await periodesConservees(menuRepository)).toEqual(['2026-08-24']);
    expect(menuRepository.removeCount).toBe(3);
  });

  it('n’échappe pas à sa propre rétention : un menu commencé il y a trois mois ne survit pas à son enregistrement', async () => {
    const menuRepository = InMemoryMenuRepository.create();
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await saveMenu({
      menu: menuCommencantLe(createCalendarDate({ year: 2026, month: 5, day: 4 })),
    });

    expect(menuRepository.saveCount).toBe(1);
    expect(await periodesConservees(menuRepository)).toEqual([]);
  });

  it('relit l’horloge à CHAQUE enregistrement : la borne avance avec les jours', async () => {
    const menuRepository = await depotSeedeAvec(
      menuCommencantLe(LIMITE_19_JUIN),
      menuCommencantLe(createCalendarDate({ year: 2026, month: 6, day: 20 })),
    );
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT) });
    const apresLePremier = await periodesConservees(menuRepository);
    await saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT) });

    expect(apresLePremier).toEqual(['2026-06-19', '2026-06-20', '2026-08-24']);
    expect(await periodesConservees(menuRepository)).toEqual(['2026-06-20', '2026-08-24']);
  });

  it('enregistre le menu même si l’effacement d’un ancien échoue', async () => {
    const depot = await depotSeedeAvec(menuCommencantLe(VEILLE_DE_LA_LIMITE_18_JUIN));
    const menuRepository: MenuRepository = {
      save: (menu) => depot.save(menu),
      findAllStartDates: () => depot.findAllStartDates(),
      remove: () => Promise.reject(new Error('purge indisponible')),
    };
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await expect(saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT, 14) })).resolves.toBeUndefined();
    expect(depot.byStartDate(LUNDI_24_AOUT)).toBeDefined();
  });

  it('enregistre le menu même si la LECTURE des périodes échoue', async () => {
    const depot = InMemoryMenuRepository.create();
    const menuRepository: MenuRepository = {
      save: (menu) => depot.save(menu),
      findAllStartDates: () => Promise.reject(new Error('lecture indisponible')),
      remove: (dateDebut) => depot.remove(dateDebut),
    };
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await expect(saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT, 14) })).resolves.toBeUndefined();
    expect(depot.byStartDate(LUNDI_24_AOUT)).toBeDefined();
  });

  it('propage la panne du dépôt quand c’est l’ENREGISTREMENT lui-même qui échoue', async () => {
    const menuRepository: MenuRepository = {
      save: () => Promise.reject(new Error('boom')),
      findAllStartDates: () => Promise.resolve([]),
      remove: () => Promise.resolve(),
    };
    const saveMenu = saveMenuUseCase({ menuRepository, clock: horlogeSurAujourdHui() });

    await expect(saveMenu({ menu: menuCommencantLe(LUNDI_24_AOUT, 14) })).rejects.toThrow('boom');
  });
});
