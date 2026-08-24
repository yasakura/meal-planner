import { describe, it, expect } from 'vitest';

import {
  addDays,
  createCalendarDate,
  toIsoDate,
  type CalendarDate,
} from '../entities/calendar-date';
import { type Menu } from '../entities/menu';
import { type MenuRepository } from '../ports/menu-repository';
import { MenuBuilder } from '../test-builders/menu.builder';
import { DriftingClock } from '../test-doubles/drifting-clock';
import { InMemoryMenuRepository } from '../test-doubles/in-memory-menu-repository';
import { observeMenusUseCase, type MenuNavigation } from './observe-menus';

const MERCREDI_19_AOUT = createCalendarDate({ year: 2026, month: 8, day: 19 });

function jourRelatif(decalage: number): CalendarDate {
  return addDays(MERCREDI_19_AOUT, decalage);
}

function menuCommencantDans(decalage: number): MenuBuilder {
  return MenuBuilder.aMenu().startingOn(jourRelatif(decalage));
}

function collecting(): {
  emissions: MenuNavigation[];
  listener: (navigation: MenuNavigation) => void;
} {
  const emissions: MenuNavigation[] = [];
  return { emissions, listener: (navigation) => emissions.push(navigation) };
}

function observing(menuRepository: MenuRepository) {
  return observeMenusUseCase({
    menuRepository,
    clock: DriftingClock.startingOn(MERCREDI_19_AOUT),
  });
}

async function repositoryAvec(...menus: Menu[]): Promise<InMemoryMenuRepository> {
  const menuRepository = InMemoryMenuRepository.create();
  for (const menu of menus) {
    await menuRepository.save(menu);
  }
  return menuRepository;
}

async function navigationSur(...menus: Menu[]): Promise<MenuNavigation> {
  const collector = collecting();
  observing(await repositoryAvec(...menus))(collector.listener, () => {});
  return collector.emissions.at(-1) as MenuNavigation;
}

function debuts(navigation: MenuNavigation): string[] {
  return navigation.menus.map((menu) => toIsoDate(menu.dateDebut));
}

describe('observeMenusUseCase', () => {
  it('n’émet AUCUN menu et AUCUN index à ouvrir quand rien n’est enregistré', async () => {
    const navigation = await navigationSur();

    expect(navigation).toEqual({ menus: [], indexInitial: null });
  });

  it('émet les menus ENTIERS, ordonnés par date de début croissante, quel que soit l’ordre du dépôt', async () => {
    const menuDeJuillet = menuCommencantDans(-44).lastingDays(7).build();
    const menuDAout = menuCommencantDans(-2).lastingDays(7).build();
    const menuDeSeptembre = menuCommencantDans(19).lastingDays(14).build();

    const navigation = await navigationSur(menuDAout, menuDeSeptembre, menuDeJuillet);

    expect(debuts(navigation)).toEqual(['2026-07-06', '2026-08-17', '2026-09-07']);
    expect(navigation.menus).toEqual([menuDeJuillet, menuDAout, menuDeSeptembre]);
  });

  it('ouvre le menu dont la période contient aujourd’hui, même quand un autre a commencé plus tard', async () => {
    const menuEnCours = menuCommencantDans(-2).lastingDays(7).build();
    const menuAVenir = menuCommencantDans(30).lastingDays(7).build();

    const navigation = await navigationSur(menuEnCours, menuAVenir);

    expect(debuts(navigation)).toEqual(['2026-08-17', '2026-09-18']);
    expect(navigation.indexInitial).toBe(0);
  });

  it('ouvre le menu qui COMMENCE aujourd’hui : le premier jour de la période est dans la période', async () => {
    const menuCommencantAujourdHui = menuCommencantDans(0).lastingDays(7).build();
    const menuAVenir = menuCommencantDans(30).lastingDays(7).build();

    const navigation = await navigationSur(menuCommencantAujourdHui, menuAVenir);

    expect(debuts(navigation)).toEqual(['2026-08-19', '2026-09-18']);
    expect(navigation.indexInitial).toBe(0);
  });

  it('ouvre le menu qui SE TERMINE aujourd’hui : le dernier jour de la période est dans la période', async () => {
    const menuFinissantAujourdHui = menuCommencantDans(-6).lastingDays(7).build();
    const menuAVenir = menuCommencantDans(30).lastingDays(7).build();

    const navigation = await navigationSur(menuFinissantAujourdHui, menuAVenir);

    expect(debuts(navigation)).toEqual(['2026-08-13', '2026-09-18']);
    expect(navigation.indexInitial).toBe(0);
  });

  it('borne la période sur le PLUS GRAND jour de repas, pas sur le nombre de repas', async () => {
    const menuTroue = menuCommencantDans(-4).withRepasAuxJours([0, 5, 2]).build();
    const menuAVenir = menuCommencantDans(30).lastingDays(7).build();

    const navigation = await navigationSur(menuTroue, menuAVenir);

    expect(debuts(navigation)).toEqual(['2026-08-15', '2026-09-18']);
    expect(navigation.indexInitial).toBe(0);
  });

  it('ouvre le menu commencé le plus tard quand aucune période ne contient aujourd’hui : un menu fini HIER n’est plus ouvert', async () => {
    const menuFiniHier = menuCommencantDans(-7).lastingDays(7).build();
    const menuPlusAncien = menuCommencantDans(-30).lastingDays(7).build();

    const navigation = await navigationSur(menuFiniHier, menuPlusAncien);

    expect(debuts(navigation)).toEqual(['2026-07-20', '2026-08-12']);
    expect(navigation.indexInitial).toBe(1);
  });

  it('ouvre le PROCHAIN menu à venir, le plus proche, quand aucune période ne contient aujourd’hui', async () => {
    const menuDeDemain = menuCommencantDans(1).lastingDays(7).build();
    const menuDuMoisProchain = menuCommencantDans(30).lastingDays(7).build();

    const navigation = await navigationSur(menuDeDemain, menuDuMoisProchain);

    expect(debuts(navigation)).toEqual(['2026-08-20', '2026-09-18']);
    expect(navigation.indexInitial).toBe(0);
  });

  it('ouvre un menu À VENIR plutôt qu’un menu PASSÉ quand aucune période ne contient aujourd’hui', async () => {
    const menuPasse = menuCommencantDans(-30).lastingDays(7).build();
    const menuAVenir = menuCommencantDans(30).lastingDays(7).build();

    const navigation = await navigationSur(menuPasse, menuAVenir);

    expect(debuts(navigation)).toEqual(['2026-07-20', '2026-09-18']);
    expect(navigation.indexInitial).toBe(1);
  });

  it('ouvre celui qui a COMMENCÉ LE PLUS TARD quand deux périodes contiennent aujourd’hui', async () => {
    const menuCommenceIlYaSixJours = menuCommencantDans(-6).lastingDays(14).build();
    const menuCommenceIlYaTroisJours = menuCommencantDans(-3).lastingDays(7).build();

    const navigation = await navigationSur(menuCommenceIlYaSixJours, menuCommenceIlYaTroisJours);

    expect(debuts(navigation)).toEqual(['2026-08-13', '2026-08-16']);
    expect(navigation.indexInitial).toBe(1);
  });

  it('ordonne AUSSI les émissions suivantes, et y désigne le menu à ouvrir', async () => {
    const menuEnCours = menuCommencantDans(-2).lastingDays(7).build();
    const menuRepository = await repositoryAvec(menuCommencantDans(30).lastingDays(7).build());
    const collector = collecting();
    observing(menuRepository)(collector.listener, () => {});

    await menuRepository.save(menuEnCours);

    expect(collector.emissions).toHaveLength(2);
    expect(debuts(collector.emissions.at(-1) as MenuNavigation)).toEqual([
      '2026-08-17',
      '2026-09-18',
    ]);
    expect(collector.emissions.at(-1)?.indexInitial).toBe(0);
  });

  it('ne mute pas le tableau émis par le dépôt', () => {
    const menuDeSeptembre = menuCommencantDans(19).lastingDays(14).build();
    const menuDAout = menuCommencantDans(-2).lastingDays(7).build();
    const source = [menuDeSeptembre, menuDAout];
    const menuRepository: MenuRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve(source),
      remove: () => Promise.resolve(),
      observeAll: (listener) => {
        listener(source);
        return () => {};
      },
    };
    const collector = collecting();

    observing(menuRepository)(collector.listener, () => {});

    expect(debuts(collector.emissions.at(-1) as MenuNavigation)).toEqual([
      '2026-08-17',
      '2026-09-07',
    ]);
    expect(source.map((menu) => toIsoDate(menu.dateDebut))).toEqual(['2026-09-07', '2026-08-17']);
  });

  it('transmet l’erreur du dépôt à onError, sans passer par le listener', () => {
    const panne = new Error('boom');
    const menuRepository: MenuRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.reject(panne),
      remove: () => Promise.resolve(),
      observeAll: (_listener, onError) => {
        onError(panne);
        return () => {};
      },
    };
    const collector = collecting();
    const errors: unknown[] = [];

    observing(menuRepository)(collector.listener, (error) => errors.push(error));

    expect(errors).toEqual([panne]);
    expect(collector.emissions).toHaveLength(0);
  });

  it('rend le désabonnement du dépôt : après lui, une écriture n’émet plus rien', async () => {
    const menuRepository = await repositoryAvec();
    const collector = collecting();

    const unsubscribe = observing(menuRepository)(collector.listener, () => {});
    await menuRepository.save(menuCommencantDans(-2).lastingDays(7).build());
    expect(collector.emissions).toHaveLength(2);

    unsubscribe();
    await menuRepository.save(menuCommencantDans(30).lastingDays(7).build());

    expect(collector.emissions).toHaveLength(2);
  });
});
