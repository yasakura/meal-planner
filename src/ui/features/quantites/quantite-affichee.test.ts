import { describe, it, expect } from 'vitest';

import { UNITS } from '../../../domain/entities/ingredient';
import { quantiteAffichee } from './quantite-affichee';

describe('quantiteAffichee', () => {
  it('une quantité décimale s’écrit avec la virgule française, là où JavaScript écrirait un point', () => {
    expect(quantiteAffichee(1.34, 'kg')).toBe('1,34 kg');
  });

  it('une quantité entière ne se voit adjoindre aucun séparateur décimal', () => {
    expect(quantiteAffichee(200, 'g')).toBe('200 g');
  });

  it('la pièce s’accorde à partir de deux : 22 pièces et 2 pièces, quand 1 reste 1 pièce', () => {
    expect(quantiteAffichee(22, 'piece')).toBe('22 pièces');
    expect(quantiteAffichee(2, 'piece')).toBe('2 pièces');
    expect(quantiteAffichee(1, 'piece')).toBe('1 pièce');
  });

  it('un compte fractionnaire de pièces reste au singulier sous deux, comme le veut le français : 1,5 pièce', () => {
    expect(quantiteAffichee(1.5, 'piece')).toBe('1,5 pièce');
  });

  it('les symboles g, kg, ml et l sont invariables : à 2 comme à 1 ils s’écrivent sans s', () => {
    const symboles = UNITS.filter((unit) => unit !== 'piece');

    expect(symboles).toEqual(['g', 'kg', 'ml', 'l']);
    expect(symboles.map((unit) => quantiteAffichee(2, unit))).toEqual([
      '2 g',
      '2 kg',
      '2 ml',
      '2 l',
    ]);
    expect(symboles.map((unit) => quantiteAffichee(1, unit))).toEqual([
      '1 g',
      '1 kg',
      '1 ml',
      '1 l',
    ]);
  });
});
