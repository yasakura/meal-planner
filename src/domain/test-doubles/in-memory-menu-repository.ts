import { toIsoDate, type CalendarDate } from '../entities/calendar-date';
import { type Menu } from '../entities/menu';
import { type MenuRepository } from '../ports/menu-repository';

export class InMemoryMenuRepository implements MenuRepository {
  public saveCount = 0;
  public removeCount = 0;
  private readonly menus = new Map<string, Menu>();

  private constructor() {}

  static create(): InMemoryMenuRepository {
    return new InMemoryMenuRepository();
  }

  save(menu: Menu): Promise<void> {
    this.saveCount += 1;
    this.menus.set(toIsoDate(menu.dateDebut), menu);
    return Promise.resolve();
  }

  findAll(): Promise<Menu[]> {
    return Promise.resolve(this.all().reverse());
  }

  remove(dateDebut: CalendarDate): Promise<void> {
    this.removeCount += 1;
    this.menus.delete(toIsoDate(dateDebut));
    return Promise.resolve();
  }

  byStartDate(dateDebut: CalendarDate): Menu | undefined {
    return this.menus.get(toIsoDate(dateDebut));
  }

  all(): Menu[] {
    return [...this.menus.values()];
  }
}
