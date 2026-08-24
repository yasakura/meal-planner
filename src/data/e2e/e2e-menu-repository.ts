import { toIsoDate, type CalendarDate } from '../../domain/entities/calendar-date';
import { type Menu } from '../../domain/entities/menu';
import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { type MenuRepository } from '../../domain/ports/menu-repository';
import { type Unsubscribe } from '../../domain/ports/unsubscribe';
import { type E2eFailureSwitch } from './e2e-failure-switch';

export class E2eMenuRepository implements MenuRepository {
  private menus = new Map<string, Menu>();
  private readonly listeners = new Set<(menus: Menu[]) => void>();

  private constructor(private readonly failures: E2eFailureSwitch) {}

  static startingEmpty(failures: E2eFailureSwitch): E2eMenuRepository {
    return new E2eMenuRepository(failures);
  }

  save(menu: Menu): Promise<void> {
    const avantEcriture = new Map(this.menus);
    this.menus.set(toIsoDate(menu.dateDebut), menu);
    this.emit();
    this.failures.refuseAfterwards(() => {
      this.rollbackTo(avantEcriture);
    });
    return Promise.resolve();
  }

  async findAll(): Promise<Menu[]> {
    this.failures.guardRead();
    return this.snapshot();
  }

  remove(dateDebut: CalendarDate): Promise<void> {
    const avantEcriture = new Map(this.menus);
    this.menus.delete(toIsoDate(dateDebut));
    this.emit();
    this.failures.refuseAfterwards(() => {
      this.rollbackTo(avantEcriture);
    });
    return Promise.resolve();
  }

  observeAll(listener: (menus: Menu[]) => void, onError: (error: unknown) => void): Unsubscribe {
    this.listeners.add(listener);
    if (this.failures.readsAreDown()) onError(RepositoryUnavailableError.create());
    else listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private rollbackTo(avantEcriture: Map<string, Menu>): void {
    this.menus = avantEcriture;
    this.emit();
  }

  private snapshot(): Menu[] {
    return [...this.menus.values()].reverse();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot());
  }
}
