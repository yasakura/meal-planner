import { describe, expect, it } from 'vitest';

import { elementAt } from './element-at';

describe('elementAt', () => {
  it("retourne l'élément à un index valide", () => {
    expect(elementAt(['a', 'b', 'c'], 1)).toBe('b');
  });

  it("jette quand l'index est au-delà de la borne supérieure", () => {
    expect(() => elementAt(['a', 'b', 'c'], 3)).toThrow('Index hors des bornes du tableau');
  });

  it('jette pour un index négatif', () => {
    expect(() => elementAt(['a', 'b', 'c'], -1)).toThrow('Index hors des bornes du tableau');
  });
});
