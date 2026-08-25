import { isBefore, type CalendarDate } from '../entities/calendar-date';
import { dateFinDuMenu, type Menu } from '../entities/menu';
import { type Clock } from '../ports/clock';
import { type MenuRepository } from '../ports/menu-repository';
import { type Unsubscribe } from '../ports/unsubscribe';

export type MenuNavigation = {
  menus: Menu[];
  indexInitial: number | null;
};

function contient(menu: Menu, date: CalendarDate): boolean {
  return !isBefore(date, menu.dateDebut) && !isBefore(dateFinDuMenu(menu), date);
}

function indexInitialParmi(menus: Menu[], aujourdHui: CalendarDate): number | null {
  if (menus.length === 0) {
    return null;
  }
  const dernierCouvrant = menus.filter((menu) => contient(menu, aujourdHui)).at(-1);
  if (dernierCouvrant !== undefined) {
    return menus.indexOf(dernierCouvrant);
  }
  const prochainAVenir = menus.findIndex((menu) => isBefore(aujourdHui, menu.dateDebut));
  if (prochainAVenir !== -1) {
    return prochainAVenir;
  }
  return menus.length - 1;
}

function parDateDeDebut(enregistres: readonly Menu[]): Menu[] {
  return [...enregistres].sort((premier, second) =>
    isBefore(premier.dateDebut, second.dateDebut) ? -1 : 1,
  );
}

export function observeMenusUseCase(deps: { menuRepository: MenuRepository; clock: Clock }) {
  return (
    listener: (navigation: MenuNavigation) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe =>
    deps.menuRepository.observeAll((enregistres) => {
      const menus = parDateDeDebut(enregistres);
      listener({ menus, indexInitial: indexInitialParmi(menus, deps.clock.today()) });
    }, onError);
}

export type ObserveMenus = ReturnType<typeof observeMenusUseCase>;
