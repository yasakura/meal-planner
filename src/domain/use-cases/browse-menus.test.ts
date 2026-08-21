import { describe, it, expect } from 'vitest';
import {
  addDays,
  createCalendarDate,
  toIsoDate,
  type CalendarDate,
} from '../entities/calendar-date';
import { type Menu } from '../entities/menu';
import { MenuBuilder } from '../test-builders/menu.builder';
import { DriftingClock } from '../test-doubles/drifting-clock';
import { InMemoryMenuRepository } from '../test-doubles/in-memory-menu-repository';
import { browseMenusUseCase, type MenuNavigation } from './browse-menus';

const MERCREDI_19_AOUT = createCalendarDate({ year: 2026, month: 8, day: 19 });

function jourRelatif(decalage: number): CalendarDate {
  return addDays(MERCREDI_19_AOUT, decalage);
}

function menuCommencantDans(decalage: number): MenuBuilder {
  return MenuBuilder.aMenu().startingOn(jourRelatif(decalage));
}

async function navigationSur(...menus: Menu[]): Promise<MenuNavigation> {
  const menuRepository = InMemoryMenuRepository.create();
  for (const menu of menus) {
    await menuRepository.save(menu);
  }
  const browseMenus = browseMenusUseCase({
    menuRepository,
    clock: DriftingClock.startingOn(MERCREDI_19_AOUT),
  });
  return browseMenus();
}

function debuts(navigation: MenuNavigation): string[] {
  return navigation.menus.map((menu) => toIsoDate(menu.dateDebut));
}

describe('browseMenusUseCase', () => {
  it('ne rend AUCUN menu et AUCUN index à ouvrir quand rien n’est enregistré', async () => {
    const navigation = await navigationSur();

    expect(navigation).toEqual({ menus: [], indexInitial: null });
  });

  it('rend les menus ENTIERS, ordonnés par date de début croissante, quel que soit l’ordre du dépôt', async () => {
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
    const menuTroue = menuCommencantDans(-3).withRepasAuxJours([0, 3, 1]).build();
    const menuAVenir = menuCommencantDans(30).lastingDays(7).build();

    const navigation = await navigationSur(menuTroue, menuAVenir);

    expect(debuts(navigation)).toEqual(['2026-08-16', '2026-09-18']);
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
});
