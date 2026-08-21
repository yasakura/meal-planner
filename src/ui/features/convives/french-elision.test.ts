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
    expect(elidedDe('Henri')).toBe('d’Henri');
    expect(elidedDe('Hugo')).toBe('d’Hugo');
  });

  it('élide devant une voyelle accentuée', () => {
    expect(elidedDe('Élise')).toBe('d’Élise');
  });

  it('élide quelle que soit la casse de l’initiale', () => {
    expect(elidedDe('élise')).toBe('d’élise');
    expect(elidedDe('aurélie')).toBe('d’aurélie');
  });

  it('ignore les espaces autour du prénom, pour la grammaire comme pour l’affichage', () => {
    expect(elidedDe('  Aurélie  ')).toBe('d’Aurélie');
    expect(elidedDe('  Rory  ')).toBe('de Rory');
  });

  it('n’élide pas devant une consonne accentuée', () => {
    expect(elidedDe('Çeline')).toBe('de Çeline');
  });
});
