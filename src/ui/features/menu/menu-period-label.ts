import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { type CalendarDate } from '../../../domain/entities/calendar-date';
import { dateFinDuMenu, type Menu } from '../../../domain/entities/menu';

const FORMAT_MOIS = 'MMM';
const PREMIER_DU_MOIS = 1;

function quantieme(date: CalendarDate): string {
  return date.day === PREMIER_DU_MOIS ? '1er' : String(date.day);
}

function quantiemeEtMois(date: CalendarDate): string {
  const mois = format(new Date(date.year, date.month - 1, date.day), FORMAT_MOIS, { locale: fr });
  return `${quantieme(date)} ${mois}`;
}

export function menuPeriodLabel(menu: Menu): string {
  const fin = dateFinDuMenu(menu);
  const debut =
    menu.dateDebut.month === fin.month
      ? quantieme(menu.dateDebut)
      : quantiemeEtMois(menu.dateDebut);
  return `${debut} – ${quantiemeEtMois(fin)}`;
}
