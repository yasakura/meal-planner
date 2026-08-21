import { type CalendarDate } from './calendar-date';
import { type Repas } from './repas';

export type Menu = {
  readonly dateDebut: CalendarDate;
  readonly repas: readonly Repas[];
};

export type MenuProps = {
  dateDebut: CalendarDate;
  repas: Repas[];
};

export function createMenu(props: MenuProps): Menu {
  if (props.dateDebut === undefined) {
    throw new Error('La date de début du menu est obligatoire');
  }
  return Object.freeze({
    dateDebut: props.dateDebut,
    repas: Object.freeze([...props.repas]),
  });
}
