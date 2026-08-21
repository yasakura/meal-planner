import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { menuDays } from './menu-days';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

function menuOf(repas: ReturnType<typeof createRepas>[]): Menu {
  return createMenu({ dateDebut: LUNDI_24_AOUT, repas });
}

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

describe('menuDays', () => {
  it('regroupe les repas par jour, nomme le jour par sa date et traduit les créneaux', () => {
    const menu = menuOf([
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      createRepas({ jour: 1, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ]);

    expect(menuDays(menu, twoRecipes())).toEqual([
      {
        key: '0',
        label: 'lundi 24 août',
        slots: [
          {
            key: '0-midi',
            creneauLabel: 'Midi',
            title: 'Ratatouille',
            recipe: 'known',
            href: '/catalogue/r1?depuis=menu',
          },
          {
            key: '0-soir',
            creneauLabel: 'Soir',
            title: 'Blanquette',
            recipe: 'known',
            href: '/catalogue/r2?depuis=menu',
          },
        ],
      },
      {
        key: '1',
        label: 'mardi 25 août',
        slots: [
          {
            key: '1-midi',
            creneauLabel: 'Midi',
            title: 'Ratatouille',
            recipe: 'known',
            href: '/catalogue/r1?depuis=menu',
          },
        ],
      },
    ]);
  });

  it('un créneau dont la recette est absente du catalogue n’a ni titre ni destination, là où son voisin résolu a les deux', () => {
    const menu = menuOf([
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'disparue' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ]);

    expect(menuDays(menu, twoRecipes())).toEqual([
      {
        key: '0',
        label: 'lundi 24 août',
        slots: [
          { key: '0-midi', creneauLabel: 'Midi', title: 'Recette inconnue', recipe: 'unknown' },
          {
            key: '0-soir',
            creneauLabel: 'Soir',
            title: 'Blanquette',
            recipe: 'known',
            href: '/catalogue/r2?depuis=menu',
          },
        ],
      },
    ]);
  });
});
