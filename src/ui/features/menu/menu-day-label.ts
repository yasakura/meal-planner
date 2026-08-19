import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { addDays, type CalendarDate } from '../../../domain/entities/calendar-date';

/**
 * Le premier du mois est le SEUL quantième que le français écrit en ordinal : « 1er septembre »,
 * puis « 2 septembre ». Le token `do` de date-fns rendrait bien « 1er », mais suffixerait aussi
 * « 2ème » et « 21ème » — d'où deux formats, et non un token ordinal. Les `'er'` sont entre
 * simples quotes : date-fns y voit du texte littéral, pas des jetons.
 */
const FORMAT_JOUR = 'EEEE d MMMM';
const FORMAT_PREMIER_DU_MOIS = "EEEE d'er' MMMM";
const PREMIER_DU_MOIS = 1;

/**
 * Nomme un jour du menu par sa date réelle : « lundi 24 août ». Sans année — un menu de deux
 * semaines n'en a pas besoin — et en minuscules, ce que le français impose au jour comme au mois.
 *
 * L'instant construit est LOCAL (`new Date(y, m - 1, d)`) et non UTC, parce que `format` lit les
 * composants locaux : un ancrage UTC afficherait la veille sur toute machine à l'ouest de
 * Greenwich. L'arithmétique, elle, reste dans le domaine, où elle est ancrée sur UTC.
 */
export function menuDayLabel(dateDebut: CalendarDate, jour: number): string {
  const date = addDays(dateDebut, jour);
  const gabarit = date.day === PREMIER_DU_MOIS ? FORMAT_PREMIER_DU_MOIS : FORMAT_JOUR;
  return format(new Date(date.year, date.month - 1, date.day), gabarit, { locale: fr });
}
