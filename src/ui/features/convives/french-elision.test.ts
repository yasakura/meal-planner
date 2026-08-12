import { describe, it, expect } from 'vitest';

import { elidedDe } from './french-elision';

describe('elidedDe', () => {
  it('élide devant une voyelle', () => {
    expect(elidedDe('Aurélie')).toBe('d’Aurélie');
  });

  it('n’élide pas devant une consonne', () => {
    expect(elidedDe('Rory')).toBe('de Rory');
  });

  it('élide devant un h initial', () => {
    // Juste sur les h muets, FAUTIF sur les h aspirés — Hakim, Hicham, Hind produiront
    // « d’Hicham » au lieu de « de Hicham ». Compromis assumé : aucun caractère ne distingue
    // les deux familles, seul un dictionnaire le ferait. Ces deux cas fixent la branche
    // choisie, ils ne prétendent pas que la règle est exacte.
    expect(elidedDe('Henri')).toBe('d’Henri');
    expect(elidedDe('Hugo')).toBe('d’Hugo');
  });

  it('élide devant une voyelle accentuée', () => {
    // Jeu DISCRIMINANT : une comparaison brute sur 'aeiou' raterait « É » (code-point 201)
    // et produirait « de Élise ».
    expect(elidedDe('Élise')).toBe('d’Élise');
  });

  it('élide quelle que soit la casse de l’initiale', () => {
    // Une saisie non capitalisée ne doit pas changer la grammaire du constat.
    expect(elidedDe('élise')).toBe('d’élise');
    expect(elidedDe('aurélie')).toBe('d’aurélie');
  });

  it('ignore les espaces autour du prénom, pour la grammaire comme pour l’affichage', () => {
    // Le slice mémorise l'argument BRUT de la soumission : le domaine trime pour l'entité,
    // pas pour le constat. Un espace de tête déciderait « de » au lieu de « d’ », et le
    // message recracherait la saisie parasite de l'utilisateur.
    expect(elidedDe('  Aurélie  ')).toBe('d’Aurélie');
    expect(elidedDe('  Rory  ')).toBe('de Rory');
  });

  it('n’élide pas devant une consonne accentuée', () => {
    // Jeu DISCRIMINANT : la normalisation ne doit pas transformer n'importe quel caractère
    // décomposable en voyelle. « Çeline » commence par une consonne.
    expect(elidedDe('Çeline')).toBe('de Çeline');
  });
});
