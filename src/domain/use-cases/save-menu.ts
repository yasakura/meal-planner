import { isBefore, subtractMonths } from '../entities/calendar-date';
import { type Menu } from '../entities/menu';
import { type Clock } from '../ports/clock';
import { type MenuRepository } from '../ports/menu-repository';

export type SaveMenuInput = {
  menu: Menu;
};

const MOIS_DE_RETENTION = 2;

export function saveMenuUseCase(deps: {
  menuRepository: MenuRepository;
  clock: Clock;
}): (input: SaveMenuInput) => Promise<void> {
  return async ({ menu }) => {
    await deps.menuRepository.save(menu);
    try {
      const limite = subtractMonths(deps.clock.today(), MOIS_DE_RETENTION);
      const menus = await deps.menuRepository.findAll();
      await Promise.all(
        menus
          .filter((ancien) => isBefore(ancien.dateDebut, limite))
          .map((ancien) => deps.menuRepository.remove(ancien.dateDebut)),
      );
      // eslint-disable-next-line no-empty
    } catch {}
  };
}

export type SaveMenu = ReturnType<typeof saveMenuUseCase>;
