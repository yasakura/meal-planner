import { addDays, dayOfWeek, type CalendarDate } from '../entities/calendar-date';
import { type Clock } from '../ports/clock';

const LUNDI = 1;
const JOURS_PAR_SEMAINE = 7;

/**
 * « Le prochain lundi » INCLUT aujourd'hui : ouvrir l'application un lundi propose ce lundi-là,
 * pas celui de la semaine suivante — le reste modulo 7 vaut alors 0 et la date ne bouge pas.
 *
 * L'horloge est relue à chaque appel : la date du jour n'est pas une valeur qu'on mémorise,
 * et le port ne promet rien entre deux lectures.
 */
export function nextMondayUseCase(deps: { clock: Clock }): () => CalendarDate {
  return () => {
    const today = deps.clock.today();
    return addDays(today, (LUNDI - dayOfWeek(today) + JOURS_PAR_SEMAINE) % JOURS_PAR_SEMAINE);
  };
}

export type NextMonday = ReturnType<typeof nextMondayUseCase>;
