import { toIsoDate, type CalendarDate } from '../../domain/entities/calendar-date';
import { type Menu } from '../../domain/entities/menu';
import { type MenuRepository } from '../../domain/ports/menu-repository';
import { type E2eFailureSwitch } from './e2e-failure-switch';

export class E2eMenuRepository implements MenuRepository {
  private readonly menus = new Map<string, Menu>();

  private constructor(private readonly failures: E2eFailureSwitch) {}

  static startingEmpty(failures: E2eFailureSwitch): E2eMenuRepository {
    return new E2eMenuRepository(failures);
  }

  async save(menu: Menu): Promise<void> {
    this.failures.guardWrite();
    await this.failures.serverAck();
    this.menus.set(toIsoDate(menu.dateDebut), menu);
  }

  async findAll(): Promise<Menu[]> {
    this.failures.guardRead();
    return [...this.menus.values()].reverse();
  }

  async remove(dateDebut: CalendarDate): Promise<void> {
    this.failures.guardWrite();
    await this.failures.serverAck();
    this.menus.delete(toIsoDate(dateDebut));
  }
}
