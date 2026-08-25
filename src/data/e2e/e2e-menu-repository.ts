import { toIsoDate, type CalendarDate } from '../../domain/entities/calendar-date';
import { type Menu } from '../../domain/entities/menu';
import { type MenuRepository } from '../../domain/ports/menu-repository';
import { type Unsubscribe } from '../../domain/ports/unsubscribe';
import { type E2eFailureSwitch } from './e2e-failure-switch';
import { E2eOptimisticCollection } from './e2e-optimistic-collection';

export class E2eMenuRepository implements MenuRepository {
  private constructor(private readonly menus: E2eOptimisticCollection<Menu>) {}

  static startingEmpty(failures: E2eFailureSwitch): E2eMenuRepository {
    return new E2eMenuRepository(E2eOptimisticCollection.seededWith<Menu>([], failures));
  }

  save(menu: Menu): Promise<void> {
    return this.menus.accepte((contenu) => {
      contenu.set(toIsoDate(menu.dateDebut), menu);
    });
  }

  async findAll(): Promise<Menu[]> {
    return this.menus.lireTout();
  }

  remove(dateDebut: CalendarDate): Promise<void> {
    return this.menus.accepte((contenu) => {
      contenu.delete(toIsoDate(dateDebut));
    });
  }

  observeAll(listener: (menus: Menu[]) => void, onError: (error: unknown) => void): Unsubscribe {
    return this.menus.observeAll(listener, onError);
  }
}
