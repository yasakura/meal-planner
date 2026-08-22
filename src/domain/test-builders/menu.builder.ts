import { createCalendarDate, type CalendarDate } from '../entities/calendar-date';
import { createMenu, type Menu } from '../entities/menu';
import { createRepas } from '../entities/repas';
import { createSlot } from '../entities/slot';

const LUNDI_5_JANVIER = createCalendarDate({ year: 2026, month: 1, day: 5 });
const JOURS_PAR_SEMAINE = 7;

function joursConsecutifs(jours: number): number[] {
  return Array.from({ length: jours }, (_, jour) => jour);
}

export class MenuBuilder {
  private constructor(
    private readonly dateDebut: CalendarDate,
    private readonly jours: number[],
  ) {}

  static aMenu(): MenuBuilder {
    return new MenuBuilder(LUNDI_5_JANVIER, joursConsecutifs(JOURS_PAR_SEMAINE));
  }

  startingOn(dateDebut: CalendarDate): MenuBuilder {
    return new MenuBuilder(dateDebut, this.jours);
  }

  lastingDays(jours: number): MenuBuilder {
    return new MenuBuilder(this.dateDebut, joursConsecutifs(jours));
  }

  withRepasAuxJours(jours: number[]): MenuBuilder {
    return new MenuBuilder(this.dateDebut, jours);
  }

  build(): Menu {
    return createMenu({
      dateDebut: this.dateDebut,
      repas: this.jours.map((jour) =>
        createRepas({ jour, creneau: 'midi', slots: [createSlot({ recipeId: 'recipe-1' })] }),
      ),
    });
  }
}
