import { type CalendarDate } from '../entities/calendar-date';
import { type Menu } from '../entities/menu';

export interface MenuRepository {
  save(menu: Menu): Promise<void>;
  findAllStartDates(): Promise<CalendarDate[]>;
  remove(dateDebut: CalendarDate): Promise<void>;
}
