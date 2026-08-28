import { matchPath, type PathMatch } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { MenuBuilder } from '../../../domain/test-builders/menu.builder';
import {
  LISTE_DE_COURSES_ROUTE,
  dateDebutDeLaRoute,
  listeDeCoursesHref,
} from './liste-de-courses-route';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

const MENU_DU_24 = MenuBuilder.aMenu().startingOn(LUNDI_24_AOUT).build();

describe('adresse de la liste de courses', () => {
  it('l’adresse d’une liste porte la période du menu, qui est son identifiant', () => {
    expect(listeDeCoursesHref(MENU_DU_24)).toBe('/menu/2026-08-24/courses');
  });

  it('la route déclarée reconnaît l’adresse produite, et la période s’y relit telle qu’elle y a été écrite', () => {
    const trouve = matchPath(LISTE_DE_COURSES_ROUTE, listeDeCoursesHref(MENU_DU_24));

    expect(trouve).not.toBeNull();
    expect(dateDebutDeLaRoute((trouve as PathMatch).params)).toBe('2026-08-24');
  });

  it('la route de la liste ne capture pas le brouillon de menu, qui n’a pas de liste', () => {
    expect(matchPath(LISTE_DE_COURSES_ROUTE, '/menu/nouveau')).toBeNull();
  });
});
