import { type CalendarDate } from '../entities/calendar-date';

/**
 * Source du jour courant pour le domaine, qui n'a pas le droit de lire `new Date()`.
 *
 * Rend une date CIVILE — « quel jour on est » pour l'utilisateur, à Paris — et jamais un
 * instant : c'est l'adapter qui résout le fuseau, le domaine n'en connaît aucun.
 *
 * NE PROMET RIEN entre deux lectures : à minuit, deux appels consécutifs tombent sur deux
 * jours différents. Toute logique qui lit l'horloge deux fois en supposant la stabilité est
 * fausse, et le test-double `DriftingClock` exerce activement cette absence de garantie.
 */
export interface Clock {
  today(): CalendarDate;
}
