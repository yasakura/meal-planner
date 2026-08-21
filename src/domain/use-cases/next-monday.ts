import { addDays, dayOfWeek, type CalendarDate } from '../entities/calendar-date';
import { type Clock } from '../ports/clock';

const LUNDI = 1;
const JOURS_PAR_SEMAINE = 7;

export function nextMondayUseCase(deps: { clock: Clock }): () => CalendarDate {
  return () => {
    const today = deps.clock.today();
    return addDays(today, (LUNDI - dayOfWeek(today) + JOURS_PAR_SEMAINE) % JOURS_PAR_SEMAINE);
  };
}

export type NextMonday = ReturnType<typeof nextMondayUseCase>;
