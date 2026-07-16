import { describe, it, expect } from 'vitest';
import { createMenu } from './menu';
import { createRepas } from './repas';
import { createSlot } from './slot';

const aRepas = () =>
  createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] });

describe('Menu', () => {
  it('se crée valide et expose ses repas', () => {
    const repas = aRepas();
    const menu = createMenu({ repas: [repas] });

    expect(menu.repas).toEqual([repas]);
  });

  it('accepte un menu sans repas (0 jour) sans lever', () => {
    const menu = createMenu({ repas: [] });

    expect(menu.repas).toEqual([]);
  });

  it('retourne un Menu gelé (immuable au runtime)', () => {
    const menu = createMenu({ repas: [aRepas()] });

    expect(Object.isFrozen(menu)).toBe(true);
  });

  it('gèle le tableau repas (copie défensive immuable)', () => {
    const menu = createMenu({ repas: [aRepas()] });

    expect(Object.isFrozen(menu.repas)).toBe(true);
  });

  it('copie le tableau repas fourni (isolation de la source)', () => {
    const source = [aRepas()];
    const menu = createMenu({ repas: source });

    source.push(aRepas());

    expect(menu.repas).toHaveLength(1);
  });
});
