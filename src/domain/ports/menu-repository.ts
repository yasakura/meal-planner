import { type CalendarDate } from '../entities/calendar-date';
import { type Menu } from '../entities/menu';
import { type Unsubscribe } from './unsubscribe';

export interface MenuRepository {
  save(menu: Menu): Promise<void>;
  findAll(): Promise<Menu[]>;
  remove(dateDebut: CalendarDate): Promise<void>;
  observeAll(listener: (menus: Menu[]) => void, onError: (error: unknown) => void): Unsubscribe;
}
