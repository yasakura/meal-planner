import { type CalendarDate } from './calendar-date';
import { type Repas } from './repas';

export type Menu = {
  /**
   * Date civile du JOUR 0. Les repas restent indexés par décalage : le jour 1 est le lendemain
   * de cette date, le jour 13 le quatorzième jour. On ne stocke pas une date par repas.
   */
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
