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
  // La quantité est une CHAÎNE vide, pas « 0 » : un champ neuf ne propose aucune valeur, et
  // « 0 » serait à la fois une quantité refusée par la ligne et un chiffre à effacer à la main.
  it('ouvre une ligne sans nom, sans quantité, en grammes', () => {
    expect(emptyRow()).toEqual({ name: '', quantity: '', unit: 'g' });
  });
});

describe('isValidRow', () => {
  it('accepte une ligne portant un nom et une quantité strictement positive', () => {
    expect(isValidRow(row({ name: 'Crème', quantity: '200', unit: 'ml' }))).toBe(true);
  });

  // Sans ce refus, la ligne franchit le filtre et `createIngredient` LÈVE, en plein
  // gestionnaire de clic : le bouton devient mort, sans le moindre constat à l'écran.
  it('refuse une ligne sans nom, même avec une quantité valide', () => {
    expect(isValidRow(row({ name: '', quantity: '200', unit: 'g' }))).toBe(false);
  });

  // Distinct du cas ci-dessus : sans le `.trim()`, `'   ' !== ''` reste vrai. Le `trim()` de
  // l'entité ne couvre pas ce cas — elle LÈVE là où la ligne doit être écartée en silence.
  it('refuse un nom composé uniquement d’espaces', () => {
    expect(isValidRow(row({ name: '   ', quantity: '200', unit: 'g' }))).toBe(false);
  });

  it('refuse une quantité nulle', () => {
    expect(isValidRow(row({ name: 'Crème', quantity: '0', unit: 'ml' }))).toBe(false);
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

/**
 * La DÉCISION de refuser l'enregistrement, ici et pas dans un container : une ligne amorcée mais
 * incomplète est une saisie en cours, pas une ligne à jeter. Écartée en silence, elle détruit un
 * ingrédient existant lors d'une modification, et l'écran annonce quand même un succès.
 */
describe('hasIncompleteRow', () => {
  it('ne voit rien à signaler quand toutes les lignes sont valides', () => {
    expect(
      hasIncompleteRow([
        row({ name: 'Pommes de terre', quantity: '1', unit: 'kg' }),
        row({ name: 'Crème', quantity: '500', unit: 'ml' }),
      ]),
    ).toBe(false);
  });

  // La ligne ENTIÈREMENT vide est celle qui sert à en ajouter une : elle reste ignorée.
  it('ne voit rien à signaler dans une ligne entièrement vide', () => {
    expect(
      hasIncompleteRow([row({ name: 'Crème', quantity: '500', unit: 'ml' }), emptyRow()]),
    ).toBe(false);
  });

  // Le champ « Nom » est un texte libre : des espaces y sont ATTEIGNABLES. Une ligne où
  // l'utilisateur n'a frappé qu'un espace reste une ligne vide — refuser d'enregistrer en
  // désignant une ligne qui paraît vide serait incompréhensible.
  it('ne voit rien à signaler dans une ligne où seuls des espaces ont été frappés', () => {
    expect(hasIncompleteRow([row({ name: '   ', quantity: '' })])).toBe(false);
  });

  it('signale une ligne nommée dont la quantité est vide', () => {
    expect(hasIncompleteRow([row({ name: 'Crème', quantity: '', unit: 'ml' })])).toBe(true);
  });

  it('signale une ligne nommée dont la quantité est nulle', () => {
    expect(hasIncompleteRow([row({ name: 'Crème', quantity: '0', unit: 'ml' })])).toBe(true);
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
  // Le vocabulaire d'une saisie à reprendre, pas celui d'une panne : l'utilisateur peut agir,
  // et les deux remèdes qu'il a sont nommés.
  it('dit à l’utilisateur ce qu’il peut faire', () => {
    expect(INCOMPLETE_ROW_MESSAGE).toBe('Complète ou retire les lignes d’ingrédient incomplètes.');
  });
});
