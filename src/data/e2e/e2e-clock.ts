import { type CalendarDate } from '../../domain/entities/calendar-date';
import { type Clock } from '../../domain/ports/clock';

/**
 * Horloge FIGÉE du mode e2e, au même titre que les identifiants séquentiels et le tirage
 * déterministe. Branchée sur l'horloge réelle, elle ferait dépendre du jour d'exécution les
 * dates affichées au menu : les scénarios Playwright deviendraient périssables, et rouges le
 * lendemain sans qu'une ligne de code ait bougé.
 */
export class E2eClock implements Clock {
  private constructor(private readonly date: CalendarDate) {}

  static on(date: CalendarDate): E2eClock {
    return new E2eClock(date);
  }

  today(): CalendarDate {
    return this.date;
  }
}
