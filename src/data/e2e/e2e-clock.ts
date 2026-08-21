import { type CalendarDate } from '../../domain/entities/calendar-date';
import { type Clock } from '../../domain/ports/clock';

export class E2eClock implements Clock {
  private constructor(private readonly date: CalendarDate) {}

  static on(date: CalendarDate): E2eClock {
    return new E2eClock(date);
  }

  today(): CalendarDate {
    return this.date;
  }
}
