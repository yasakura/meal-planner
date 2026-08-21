export type CalendarDate = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
};

export type CalendarDateProps = {
  year: number;
  month: number;
  day: number;
};

function toUtcInstant(props: CalendarDateProps): Date {
  return new Date(Date.UTC(props.year, props.month - 1, props.day));
}

function fromUtcInstant(instant: Date): CalendarDate {
  return Object.freeze({
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
  });
}

export function createCalendarDate(props: CalendarDateProps): CalendarDate {
  const civil = fromUtcInstant(toUtcInstant(props));
  if (civil.year !== props.year || civil.month !== props.month || civil.day !== props.day) {
    throw new Error('La date civile est invalide');
  }
  return civil;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const instant = toUtcInstant(date);
  instant.setUTCDate(instant.getUTCDate() + days);
  return fromUtcInstant(instant);
}

export function dayOfWeek(date: CalendarDate): number {
  return toUtcInstant(date).getUTCDay();
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toIsoDate(date: CalendarDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

export function parseIsoDate(iso: string): CalendarDate {
  const parts = ISO_DATE.exec(iso);
  if (parts === null) {
    throw new Error('La date civile est invalide');
  }
  const [, year, month, day] = parts;
  return createCalendarDate({ year: Number(year), month: Number(month), day: Number(day) });
}

export function subtractMonths(date: CalendarDate, months: number): CalendarDate {
  const arrivee = toUtcInstant({ year: date.year, month: date.month - months, day: 1 });
  const dernierJour = new Date(
    Date.UTC(arrivee.getUTCFullYear(), arrivee.getUTCMonth() + 1, 0),
  ).getUTCDate();
  arrivee.setUTCDate(Math.min(date.day, dernierJour));
  return fromUtcInstant(arrivee);
}

export function isBefore(date: CalendarDate, other: CalendarDate): boolean {
  return toUtcInstant(date).getTime() < toUtcInstant(other).getTime();
}
