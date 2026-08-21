import { addDays, type CalendarDate } from '../entities/calendar-date';
import { type Clock } from '../ports/clock';

export class DriftingClock implements Clock {
  private reads = 0;

  private constructor(private readonly start: CalendarDate) {}

  static startingOn(start: CalendarDate): DriftingClock {
    return new DriftingClock(start);
  }

  today(): CalendarDate {
    const date = addDays(this.start, this.reads);
    this.reads += 1;
    return date;
  }
}
