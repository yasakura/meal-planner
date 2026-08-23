import { describe, it, expect } from 'vitest';
import { CRENEAUX, type Creneau } from './creneau';
import { createRepas } from './repas';
import { createSlot } from './slot';

describe('Repas', () => {
  it('se crée valide et expose jour, creneau et slots', () => {
    const slot = createSlot({ recipeId: 'recipe-1' });
    const repas = createRepas({ jour: 0, creneau: 'midi', slots: [slot] });

    expect(repas.jour).toBe(0);
    expect(repas.creneau).toBe('midi');
    expect(repas.slots).toEqual([slot]);
  });

  it('rejette un jour non entier', () => {
    expect(() =>
      createRepas({ jour: 1.5, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ).toThrow('Le jour du repas doit être un entier');
  });

  it('rejette un jour négatif (index 0-based)', () => {
    expect(() =>
      createRepas({ jour: -1, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ).toThrow('Le jour du repas doit être positif ou nul');
  });

  it('rejette un créneau hors des créneaux du domaine', () => {
    expect(() =>
      createRepas({
        jour: 0,
        creneau: 'brunch' as Creneau,
        slots: [createSlot({ recipeId: 'r1' })],
      }),
    ).toThrow('Créneau invalide');
  });

  it.each(CRENEAUX)("accepte le créneau valide '%s'", (creneau) => {
    const repas = createRepas({ jour: 0, creneau, slots: [createSlot({ recipeId: 'r1' })] });

    expect(repas.creneau).toBe(creneau);
  });

  it('rejette un repas sans aucun slot', () => {
    expect(() => createRepas({ jour: 0, creneau: 'midi', slots: [] })).toThrow(
      'Un repas doit contenir au moins un créneau',
    );
  });

  it('retourne un Repas gelé (immuable au runtime)', () => {
    const repas = createRepas({
      jour: 0,
      creneau: 'soir',
      slots: [createSlot({ recipeId: 'r1' })],
    });

    expect(Object.isFrozen(repas)).toBe(true);
  });

  it('gèle le tableau slots (copie défensive immuable)', () => {
    const repas = createRepas({
      jour: 0,
      creneau: 'soir',
      slots: [createSlot({ recipeId: 'r1' })],
    });

    expect(Object.isFrozen(repas.slots)).toBe(true);
  });

  it('copie le tableau slots fourni (isolation de la source)', () => {
    const source = [createSlot({ recipeId: 'r1' })];
    const repas = createRepas({ jour: 0, creneau: 'midi', slots: source });

    source.push(createSlot({ recipeId: 'r2' }));

    expect(repas.slots).toHaveLength(1);
  });
});
