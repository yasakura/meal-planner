import { toIsoDate } from '../../../domain/entities/calendar-date';
import { type Menu } from '../../../domain/entities/menu';

const MENU = '/menu';

const COURSES = 'courses';

export const LISTE_DE_COURSES_ROUTE = `${MENU}/:dateDebut/${COURSES}`;

export function listeDeCoursesHref(menu: Menu): string {
  return `${MENU}/${toIsoDate(menu.dateDebut)}/${COURSES}`;
}

export function dateDebutDeLaRoute(
  params: Readonly<Record<string, string | undefined>>,
): string | undefined {
  return params.dateDebut;
}
