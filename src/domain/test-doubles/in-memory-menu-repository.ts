import { toIsoDate, type CalendarDate } from '../entities/calendar-date';
import { type Menu } from '../entities/menu';
import { type MenuRepository } from '../ports/menu-repository';
import { type Unsubscribe } from '../ports/unsubscribe';

export class InMemoryMenuRepository implements MenuRepository {
  public saveCount = 0;
  public removeCount = 0;
  private readonly menus = new Map<string, Menu>();
  private readonly listeners = new Set<(menus: Menu[]) => void>();

  private constructor() {}

  static create(): InMemoryMenuRepository {
    return new InMemoryMenuRepository();
  }

  save(menu: Menu): Promise<void> {
    this.saveCount += 1;
    this.menus.set(toIsoDate(menu.dateDebut), menu);
    this.emit();
    return Promise.resolve();
  }

  findAll(): Promise<Menu[]> {
    return Promise.resolve(this.snapshot());
  }

  remove(dateDebut: CalendarDate): Promise<void> {
    this.removeCount += 1;
    this.menus.delete(toIsoDate(dateDebut));
    this.emit();
    return Promise.resolve();
  }

  byStartDate(dateDebut: CalendarDate): Menu | undefined {
    return this.menus.get(toIsoDate(dateDebut));
  }

  all(): Menu[] {
    return [...this.menus.values()];
  }

  observeAll(listener: (menus: Menu[]) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private snapshot(): Menu[] {
    return this.all().reverse();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot());
  }
}
