import { describe, it, expect } from 'vitest';

import { emptyRow, type IngredientRow } from './ingredient-rows';
import { isSubmitDisabled } from './recipe-form-submission';

function row(patch: Partial<IngredientRow>): IngredientRow {
  return { ...emptyRow(), ...patch };
}

const LIGNE_VALIDE = row({ name: 'Crème', quantity: '200', unit: 'ml' });

/**
 * « Quand le bouton Enregistrer est-il verrouillé » — la même décision pour la création et pour
 * la modification, qui la portaient chacune en clair dans leur `.tsx`. Deux expressions jumelles
 * qu'aucun mutant ne surveillait (Stryker ne mute pas les `.tsx`) et dont la dérive n'aurait été
 * signalée par rien : les deux écrans se seraient mis à refuser des saisies différentes.
 */
describe('isSubmitDisabled', () => {
  it('déverrouille dès qu’un titre et une ligne valide sont saisis, hors enregistrement', () => {
    expect(isSubmitDisabled({ saving: false, title: 'Gratin', rows: [LIGNE_VALIDE] })).toBe(false);
  });

  // Le verrou de l'enregistrement en vol : sans lui, un double clic part deux fois.
  it('verrouille pendant qu’un enregistrement est en vol, saisie pourtant complète', () => {
    expect(isSubmitDisabled({ saving: true, title: 'Gratin', rows: [LIGNE_VALIDE] })).toBe(true);
  });

  it('verrouille sans titre, même avec une ligne valide', () => {
    expect(isSubmitDisabled({ saving: false, title: '', rows: [LIGNE_VALIDE] })).toBe(true);
  });

  // Distinct du cas ci-dessus : sans le `.trim()`, `'   ' !== ''` reste vrai et l'écran
  // accepterait d'enregistrer une recette dont le titre n'est fait que d'espaces.
  it('verrouille sur un titre fait uniquement d’espaces', () => {
    expect(isSubmitDisabled({ saving: false, title: '   ', rows: [LIGNE_VALIDE] })).toBe(true);
  });

  it('verrouille quand aucune ligne n’est valide, titre pourtant saisi', () => {
    expect(isSubmitDisabled({ saving: false, title: 'Gratin', rows: [row({ name: 'Sel' })] })).toBe(
      true,
    );
  });

  it('verrouille quand le formulaire ne porte aucune ligne du tout', () => {
    expect(isSubmitDisabled({ saving: false, title: 'Gratin', rows: [] })).toBe(true);
  });

  // Ce sont les lignes VALIDES qui sont comptées, pas les lignes : la ligne vide résiduelle et
  // la saisie en cours ne verrouillent rien, elles sont normales tant qu'une ligne est complète.
  it('déverrouille dès qu’UNE ligne est valide au milieu de lignes qui ne le sont pas', () => {
    expect(
      isSubmitDisabled({
        saving: false,
        title: 'Gratin',
        rows: [row({ name: 'Sel' }), LIGNE_VALIDE, emptyRow()],
      }),
    ).toBe(false);
  });
});
