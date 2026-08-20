import { addDays, type CalendarDate } from '../entities/calendar-date';
import { type Clock } from '../ports/clock';

/**
 * Horloge de test qui AVANCE d'un jour à chaque lecture. Le port `Clock` ne promet aucune
 * stabilité entre deux appels ; un double qui rendrait éternellement la même date promettrait
 * plus que son port et rendrait verte toute logique qui lit l'horloge deux fois en supposant
 * qu'elle n'a pas bougé.
 */
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
