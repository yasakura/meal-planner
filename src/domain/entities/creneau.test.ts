import { describe, it, expect } from 'vitest';
import { CRENEAUX } from './creneau';

describe('Creneau', () => {
  it('énumère les deux créneaux d’une journée, midi avant soir', () => {
    expect(CRENEAUX).toEqual(['midi', 'soir']);
  });
});
