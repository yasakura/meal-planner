import { describe, it, expect } from 'vitest';

import { emptyRow, type IngredientRow } from './ingredient-rows';
import { isSubmitDisabled } from './recipe-form-submission';

function row(patch: Partial<IngredientRow>): IngredientRow {
  return { ...emptyRow(), ...patch };
}

const LIGNE_VALIDE = row({ name: 'Crème', quantity: '200', unit: 'ml' });

describe('isSubmitDisabled', () => {
  it('déverrouille dès qu’un titre et une ligne valide sont saisis, hors enregistrement', () => {
    expect(isSubmitDisabled({ locked: false, title: 'Gratin', rows: [LIGNE_VALIDE] })).toBe(false);
  });

  it('verrouille dès que l’appelant fournit le verrou, saisie pourtant complète', () => {
    expect(isSubmitDisabled({ locked: true, title: 'Gratin', rows: [LIGNE_VALIDE] })).toBe(true);
  });

  it('verrouille sans titre, même avec une ligne valide', () => {
    expect(isSubmitDisabled({ locked: false, title: '', rows: [LIGNE_VALIDE] })).toBe(true);
  });

  it('verrouille sur un titre fait uniquement d’espaces', () => {
    expect(isSubmitDisabled({ locked: false, title: '   ', rows: [LIGNE_VALIDE] })).toBe(true);
  });

  it('verrouille quand aucune ligne n’est valide, titre pourtant saisi', () => {
    expect(isSubmitDisabled({ locked: false, title: 'Gratin', rows: [row({ name: 'Sel' })] })).toBe(
      true,
    );
  });

  it('verrouille quand le formulaire ne porte aucune ligne du tout', () => {
    expect(isSubmitDisabled({ locked: false, title: 'Gratin', rows: [] })).toBe(true);
  });

  it('déverrouille dès qu’UNE ligne est valide au milieu de lignes qui ne le sont pas', () => {
    expect(
      isSubmitDisabled({
        locked: false,
        title: 'Gratin',
        rows: [row({ name: 'Sel' }), LIGNE_VALIDE, emptyRow()],
      }),
    ).toBe(false);
  });
});
