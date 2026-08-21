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
  if (props.repas.length === 0) {
    throw new Error('Un menu doit contenir au moins un repas');
  }
  return Object.freeze({
    dateDebut: props.dateDebut,
    repas: Object.freeze([...props.repas]),
  });
}
