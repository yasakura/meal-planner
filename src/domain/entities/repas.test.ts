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

describe('présence au créneau', () => {
  const unRepas = (presence: { presents?: string[] | null; invites?: number }) =>
    createRepas({
      jour: 0,
      creneau: 'midi',
      slots: [createSlot({ recipeId: 'r1' })],
      ...presence,
    });

  it('sans présence déclarée, le créneau est au défaut du foyer et sans invité', () => {
    const repas = unRepas({});

    expect(repas.presents).toBeNull();
    expect(repas.invites).toBe(0);
  });

  it('conserve les convives déclarés présents et le nombre d’invités', () => {
    const repas = unRepas({ presents: ['convive-1', 'convive-2'], invites: 2 });

    expect(repas.presents).toEqual(['convive-1', 'convive-2']);
    expect(repas.invites).toBe(2);
  });

  it('accepte un créneau que personne ne mange, distinct du défaut du foyer', () => {
    const repas = unRepas({ presents: [], invites: 0 });

    expect(repas.presents).toEqual([]);
    expect(repas.presents).not.toBeNull();
  });

  it('copie et gèle la liste des présents (isolation de la source)', () => {
    const source = ['convive-1'];
    const repas = unRepas({ presents: source });

    source.push('convive-2');

    expect(repas.presents).toEqual(['convive-1']);
    expect(Object.isFrozen(repas.presents)).toBe(true);
  });

  it('rejette un nombre d’invités non entier', () => {
    expect(() => unRepas({ invites: 1.5 })).toThrow(
      "Le nombre d'invités doit être un entier positif ou nul",
    );
  });

  it('rejette un nombre d’invités négatif', () => {
    expect(() => unRepas({ invites: -1 })).toThrow(
      "Le nombre d'invités doit être un entier positif ou nul",
    );
  });
});
