import { describe, it, expect } from 'vitest';

import {
  INCOMPLETE_ROW_MESSAGE,
  emptyRow,
  hasIncompleteRow,
  isValidRow,
  toIngredients,
  validRowsOf,
  type IngredientRow,
} from './ingredient-rows';

function row(patch: Partial<IngredientRow>): IngredientRow {
  return { ...emptyRow(), ...patch };
}

describe('emptyRow', () => {
  it('ouvre une ligne sans nom, sans quantité, en grammes', () => {
    expect(emptyRow()).toEqual({ name: '', quantity: '', unit: 'g' });
  });
});

describe('isValidRow', () => {
  it('accepte une ligne portant un nom et une quantité strictement positive', () => {
    expect(isValidRow(row({ name: 'Crème', quantity: '200', unit: 'ml' }))).toBe(true);
  });

  it('refuse une ligne sans nom, même avec une quantité valide', () => {
    expect(isValidRow(row({ name: '', quantity: '200', unit: 'g' }))).toBe(false);
  });

  it('refuse un nom composé uniquement d’espaces', () => {
    expect(isValidRow(row({ name: '   ', quantity: '200', unit: 'g' }))).toBe(false);
  });

  it('refuse une quantité nulle', () => {
    expect(isValidRow(row({ name: 'Crème', quantity: '0', unit: 'ml' }))).toBe(false);
  });

  it('refuse une quantité au-delà du maximum sûr, qu’aucune mise à l’échelle ne pourra multiplier', () => {
    expect(isValidRow(row({ name: 'Farine', quantity: '1e307', unit: 'kg' }))).toBe(false);
  });

  it('refuse la ligne dont le kilo dépasse le plafond du compte juste, là où le même nombre de grammes passe', () => {
    expect(isValidRow(row({ name: 'Farine', quantity: '1000000001', unit: 'kg' }))).toBe(false);
    expect(isValidRow(row({ name: 'Farine', quantity: '1000000001', unit: 'g' }))).toBe(true);
  });

  it('accepte le plafond du compte juste lui-même, borne incluse', () => {
    expect(isValidRow(row({ name: 'Farine', quantity: '1000000000000', unit: 'g' }))).toBe(true);
  });

  it('accepte une quantité de cuisine à quatre chiffres', () => {
    expect(isValidRow(row({ name: 'Farine', quantity: '12345', unit: 'g' }))).toBe(true);
  });
});

describe('validRowsOf', () => {
  it('ne garde que les lignes valides, dans leur ordre', () => {
    const valide = row({ name: 'Crème', quantity: '200', unit: 'ml' });

    expect(validRowsOf([row({ name: 'Sel' }), valide, emptyRow()])).toEqual([valide]);
  });
});

describe('toIngredients', () => {
  it('convertit les lignes valides en ingrédients, quantité numérique', () => {
    expect(toIngredients([row({ name: 'Crème', quantity: '200', unit: 'ml' })])).toEqual([
      { name: 'Crème', quantity: 200, unit: 'ml' },
    ]);
  });

  it('écarte la ligne vide résiduelle sans lever', () => {
    expect(
      toIngredients([row({ name: 'Crème', quantity: '200', unit: 'ml' }), emptyRow()]),
    ).toEqual([{ name: 'Crème', quantity: 200, unit: 'ml' }]);
  });
});

describe('hasIncompleteRow', () => {
  it('ne voit rien à signaler quand toutes les lignes sont valides', () => {
    expect(
      hasIncompleteRow([
        row({ name: 'Pommes de terre', quantity: '1', unit: 'kg' }),
        row({ name: 'Crème', quantity: '500', unit: 'ml' }),
      ]),
    ).toBe(false);
  });

  it('ne voit rien à signaler dans une ligne entièrement vide', () => {
    expect(
      hasIncompleteRow([row({ name: 'Crème', quantity: '500', unit: 'ml' }), emptyRow()]),
    ).toBe(false);
  });

  it('ne voit rien à signaler dans une ligne où seuls des espaces ont été frappés', () => {
    expect(hasIncompleteRow([row({ name: '   ', quantity: '' })])).toBe(false);
  });

  it('signale une ligne nommée dont la quantité est vide', () => {
    expect(hasIncompleteRow([row({ name: 'Crème', quantity: '', unit: 'ml' })])).toBe(true);
  });

  it('signale une ligne nommée dont la quantité est nulle', () => {
    expect(hasIncompleteRow([row({ name: 'Crème', quantity: '0', unit: 'ml' })])).toBe(true);
  });

  it('signale une ligne nommée dont la quantité dépasse le maximum sûr', () => {
    expect(hasIncompleteRow([row({ name: 'Farine', quantity: '1e307', unit: 'kg' })])).toBe(true);
  });

  it('signale une quantité saisie sans nom', () => {
    expect(hasIncompleteRow([row({ name: '', quantity: '500', unit: 'ml' })])).toBe(true);
  });

  it('signale une ligne incomplète même quand une autre ligne est valide', () => {
    expect(
      hasIncompleteRow([
        row({ name: 'Pommes de terre', quantity: '1', unit: 'kg' }),
        row({ name: 'Crème', quantity: '', unit: 'ml' }),
      ]),
    ).toBe(true);
  });
});

describe('INCOMPLETE_ROW_MESSAGE', () => {
  it('dit à l’utilisateur ce qu’il peut faire', () => {
    expect(INCOMPLETE_ROW_MESSAGE).toBe('Complète ou retire les lignes d’ingrédient incomplètes.');
  });
});
