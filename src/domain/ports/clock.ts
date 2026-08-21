import { type CalendarDate } from '../entities/calendar-date';

export interface Clock {
  today(): CalendarDate;
}
