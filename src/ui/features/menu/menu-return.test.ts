import { describe, it, expect } from 'vitest';

import {
  MENU_APRES_ENREGISTREMENT,
  MENU_SANS_PROVENANCE,
  arriveeApresEnregistrement,
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
});
