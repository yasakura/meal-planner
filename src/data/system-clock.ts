import { createCalendarDate, type CalendarDate } from '../domain/entities/calendar-date';
import { type Clock } from '../domain/ports/clock';

/**
 * Le fuseau ne sert qu'à une chose : déterminer QUEL JOUR on est pour l'utilisateur. Il est
 * résolu ici, dans l'adapter, et jamais dans le domaine — qui ne connaît que des dates civiles.
 */
const PARIS = 'Europe/Paris';

export class SystemClock implements Clock {
  /**
   * Source d'instants en millisecondes, et non `() => Date` : le défaut est ainsi une RÉFÉRENCE
   * (`Date.now`) et non une lambda. Une lambda `() => new Date()` offre à la mutation un corps
   * qu'elle remplace par `undefined` — et `formatToParts(undefined)` formate justement l'instant
   * courant, donc le mutant survivait, indistinguable. Même forme que `MathRandomPicker`.
   */
  private constructor(private readonly now: () => number) {}

  static create(now: () => number = Date.now): SystemClock {
    return new SystemClock(now);
  }

  today(): CalendarDate {
    /**
     * Construit à CHAQUE appel, délibérément. Hissé en constante de module, il serait évalué à
     * l'import — donc avant que la mutation n'active quoi que ce soit : les mutants du fuseau et
     * des options survivaient tous, y compris un `timeZone: ''` qui ne peut que lever. Un
     * formateur non observable par la mutation est un formateur non testé.
     *
     * `formatToParts` plutôt qu'un `toISOString()` : convertir un instant en UTC rendrait la
     * veille tous les soirs après 22 h en été (le réveillon du 31 décembre 23 h 30 UTC est déjà
     * le 1er janvier à Paris). Et les composants sont lus PAR LEUR NOM, sans supposer aucun
     * ordre d'affichage.
     */
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
