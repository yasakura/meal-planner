import { createCalendarDate, type CalendarDate } from '../domain/entities/calendar-date';
import { type Clock } from '../domain/ports/clock';

const PARIS = 'Europe/Paris';

export class SystemClock implements Clock {
  private constructor(private readonly now: () => number) {}

  static create(now: () => number = Date.now): SystemClock {
    return new SystemClock(now);
  }

  today(): CalendarDate {
    const parisParts = new Intl.DateTimeFormat('en-US', {
      timeZone: PARIS,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts: Record<string, string> = {};
    for (const part of parisParts.formatToParts(this.now())) {
      parts[part.type] = part.value;
    }
    return createCalendarDate({
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
    });
  }
}
