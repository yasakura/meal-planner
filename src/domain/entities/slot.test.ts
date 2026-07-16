import { describe, it, expect } from 'vitest';
import { createSlot } from './slot';

describe('Slot', () => {
  it('se crée valide et référence la recette choisie par son id', () => {
    const slot = createSlot({ recipeId: 'recipe-1' });

    expect(slot.recipeId).toBe('recipe-1');
  });

  it('rejette un recipeId vide avec un message explicite', () => {
    expect(() => createSlot({ recipeId: '' })).toThrow(
      'La recette référencée par le créneau est obligatoire',
    );
  });

  it("rejette un recipeId composé uniquement d'espaces", () => {
    expect(() => createSlot({ recipeId: '   ' })).toThrow(
      'La recette référencée par le créneau est obligatoire',
    );
  });

  it('stocke le recipeId trimé', () => {
    const slot = createSlot({ recipeId: '  recipe-1  ' });

    expect(slot.recipeId).toBe('recipe-1');
  });

  it('retourne un Slot gelé (immuable au runtime, pas seulement readonly compile-time)', () => {
    const slot = createSlot({ recipeId: 'recipe-1' });

    expect(Object.isFrozen(slot)).toBe(true);
  });
});
