import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { addDays, type CalendarDate } from '../../../domain/entities/calendar-date';

const FORMAT_JOUR = 'EEEE d MMMM';
const FORMAT_PREMIER_DU_MOIS = "EEEE d'er' MMMM";
const PREMIER_DU_MOIS = 1;

export function menuDayLabel(dateDebut: CalendarDate, jour: number): string {
  const date = addDays(dateDebut, jour);
  const gabarit = date.day === PREMIER_DU_MOIS ? FORMAT_PREMIER_DU_MOIS : FORMAT_JOUR;
  return format(new Date(date.year, date.month - 1, date.day), gabarit, { locale: fr });
}
