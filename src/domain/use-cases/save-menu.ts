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
    const limite = subtractMonths(deps.clock.today(), MOIS_DE_RETENTION);
    try {
      const periodes = await deps.menuRepository.findAllStartDates();
      await Promise.all(
        periodes
          .filter((periode) => isBefore(periode, limite))
          .map((periode) => deps.menuRepository.remove(periode)),
      );
      // eslint-disable-next-line no-empty
    } catch {}
  };
}

export type SaveMenu = ReturnType<typeof saveMenuUseCase>;
