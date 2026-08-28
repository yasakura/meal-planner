import { describe, it, expect } from 'vitest';

import {
  MENU_APRES_ENREGISTREMENT,
  MENU_SANS_PROVENANCE,
  arriveeApresEnregistrement,
  menuDeLaSemaine,
  retourAuMenuDeLaSemaine,
  semaineConsultee,
} from './menu-return';

function paramsDe(adresse: string): URLSearchParams {
  return new URLSearchParams(new URL(adresse, 'http://meal-planner.test').search);
}

describe('menu-return', () => {
  it('l’adresse où mène un enregistrement se relit comme venant d’un enregistrement', () => {
    expect(arriveeApresEnregistrement(paramsDe(MENU_APRES_ENREGISTREMENT))).toBe(true);
  });

  it('l’adresse où mène un enregistrement est celle de la consultation', () => {
    expect(new URL(MENU_APRES_ENREGISTREMENT, 'http://meal-planner.test').pathname).toBe('/menu');
  });

  it('l’arrivée par l’onglet ne prétend pas venir d’un enregistrement', () => {
    expect(arriveeApresEnregistrement(paramsDe('/menu'))).toBe(false);
  });

  it('l’adresse nettoyée est celle de la consultation, et ne prétend plus venir d’un enregistrement', () => {
    expect(new URL(MENU_SANS_PROVENANCE, 'http://meal-planner.test').pathname).toBe('/menu');
    expect(arriveeApresEnregistrement(paramsDe(MENU_SANS_PROVENANCE))).toBe(false);
  });

  it('l’adresse du menu d’une semaine porte sa période, et cette période s’y relit telle qu’elle y a été écrite', () => {
    expect(menuDeLaSemaine('2026-08-24')).toBe('/menu?semaine=2026-08-24');
    expect(semaineConsultee(paramsDe(menuDeLaSemaine('2026-08-24')))).toBe('2026-08-24');
  });

  it('l’arrivée par l’onglet ne désigne aucune semaine, là où l’adresse d’une semaine en désigne une', () => {
    expect(semaineConsultee(paramsDe('/menu'))).toBeNull();
    expect(semaineConsultee(paramsDe(menuDeLaSemaine('2026-08-24')))).toBe('2026-08-24');
  });

  it('le retour au menu emporte la semaine consultée, et retombe sur le menu tout court quand aucune période n’est connue', () => {
    expect(retourAuMenuDeLaSemaine('2026-08-24')).toEqual({
      href: '/menu?semaine=2026-08-24',
      label: '← Menu',
    });
    expect(retourAuMenuDeLaSemaine(undefined)).toEqual({ href: '/menu', label: '← Menu' });
  });
});
