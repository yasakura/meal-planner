import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { FROM_MENU, FROM_MENU_DRAFT } from '../catalogue/recipe-detail-origin';
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

    expect(menuDays(menu, twoRecipes(), FROM_MENU)).toEqual([
      {
        key: '0',
        label: 'lundi 24 août',
        slots: [
          {
            key: '0-0',
            creneauLabel: 'Midi',
            title: 'Ratatouille',
            recipe: 'known',
            href: '/catalogue/r1?depuis=menu',
            address: { repasIndex: 0, slotIndex: 0 },
            choose: null,
            presence: null,
            sortie: null,
          },
          {
            key: '0-1',
            creneauLabel: 'Soir',
            title: 'Blanquette',
            recipe: 'known',
            href: '/catalogue/r2?depuis=menu',
            address: { repasIndex: 1, slotIndex: 0 },
            choose: null,
            presence: null,
            sortie: null,
          },
        ],
      },
      {
        key: '1',
        label: 'mardi 25 août',
        slots: [
          {
            key: '1-0',
            creneauLabel: 'Midi',
            title: 'Ratatouille',
            recipe: 'known',
            href: '/catalogue/r1?depuis=menu',
            address: { repasIndex: 2, slotIndex: 0 },
            choose: null,
            presence: null,
            sortie: null,
          },
        ],
      },
    ]);
  });

  it('un catalogue qu’on n’a pas pu lire ne déclare aucune recette inconnue : ses créneaux disent le titre indisponible, là où le même créneau lu porte le titre de sa recette', () => {
    const menu = menuOf([
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ]);

    expect(menuDays(menu, null, FROM_MENU).at(0)?.slots).toEqual([
      {
        key: '0-0',
        creneauLabel: 'Midi',
        title: 'Titre indisponible',
        recipe: 'unknown',
        address: { repasIndex: 0, slotIndex: 0 },
        choose: null,
        presence: null,
        sortie: null,
      },
    ]);
    expect(menuDays(menu, twoRecipes(), FROM_MENU).at(0)?.slots.at(0)?.title).toBe('Ratatouille');
  });

  it('un créneau dont la recette est absente du catalogue porte un titre de substitution et aucune destination, là où son voisin résolu porte le titre de sa recette et un lien', () => {
    const menu = menuOf([
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'disparue' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ]);

    expect(menuDays(menu, twoRecipes(), FROM_MENU)).toEqual([
      {
        key: '0',
        label: 'lundi 24 août',
        slots: [
          {
            key: '0-0',
            creneauLabel: 'Midi',
            title: 'Recette inconnue',
            recipe: 'unknown',
            address: { repasIndex: 0, slotIndex: 0 },
            choose: null,
            presence: null,
            sortie: null,
          },
          {
            key: '0-1',
            creneauLabel: 'Soir',
            title: 'Blanquette',
            recipe: 'known',
            href: '/catalogue/r2?depuis=menu',
            address: { repasIndex: 1, slotIndex: 0 },
            choose: null,
            presence: null,
            sortie: null,
          },
        ],
      },
    ]);
  });
  it('deux slots d’un même repas donnent deux lignes, et leurs clés ne se confondent pas', () => {
    const menu = menuOf([
      createRepas({
        jour: 0,
        creneau: 'midi',
        slots: [createSlot({ recipeId: 'r1' }), createSlot({ recipeId: 'r2' })],
      }),
    ]);

    const slots = menuDays(menu, twoRecipes(), FROM_MENU).at(0)?.slots ?? [];

    expect(slots.map((slot) => slot.title)).toEqual(['Ratatouille', 'Blanquette']);
    expect(slots.at(0)?.key).not.toEqual(slots.at(1)?.key);
  });

  it('deux repas de même jour et même créneau donnent deux lignes, et leurs clés ne se confondent pas', () => {
    const menu = menuOf([
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r2' })] }),
    ]);

    const slots = menuDays(menu, twoRecipes(), FROM_MENU).at(0)?.slots ?? [];

    expect(slots.map((slot) => slot.title)).toEqual(['Ratatouille', 'Blanquette']);
    expect(slots.at(0)?.key).not.toEqual(slots.at(1)?.key);
  });

  it('deux slots d’un même repas se distinguent par le rang de leur créneau', () => {
    const menu = menuOf([
      createRepas({
        jour: 0,
        creneau: 'midi',
        slots: [createSlot({ recipeId: 'r1' }), createSlot({ recipeId: 'r2' })],
      }),
    ]);

    const slots = menuDays(menu, twoRecipes(), FROM_MENU).at(0)?.slots ?? [];

    expect(slots.map((slot) => slot.address)).toEqual([
      { repasIndex: 0, slotIndex: 0 },
      { repasIndex: 0, slotIndex: 1 },
    ]);
  });

  it('deux repas du même jour se distinguent par le rang de leur repas', () => {
    const menu = menuOf([
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r2' })] }),
    ]);

    const slots = menuDays(menu, twoRecipes(), FROM_MENU).at(0)?.slots ?? [];

    expect(slots.map((slot) => slot.address)).toEqual([
      { repasIndex: 0, slotIndex: 0 },
      { repasIndex: 1, slotIndex: 0 },
    ]);
  });

  it('le même menu reconstruit à l’identique redonne exactement les mêmes clés', () => {
    const repasDuMenu = () => [
      createRepas({
        jour: 0,
        creneau: 'midi',
        slots: [createSlot({ recipeId: 'r1' }), createSlot({ recipeId: 'r2' })],
      }),
      createRepas({ jour: 1, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ];
    const keysOf = (menu: Menu) =>
      menuDays(menu, twoRecipes(), FROM_MENU).flatMap((day) => day.slots.map((slot) => slot.key));

    const premierRendu = keysOf(menuOf(repasDuMenu()));

    expect(new Set(premierRendu).size).toBe(3);
    expect(keysOf(menuOf(repasDuMenu()))).toEqual(premierRendu);
  });

  it('les lignes d’un brouillon mènent aux fiches marquées comme venant du brouillon', () => {
    const menu = menuOf([
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ]);

    expect(menuDays(menu, twoRecipes(), FROM_MENU_DRAFT).at(0)?.slots).toEqual([
      {
        key: '0-0',
        creneauLabel: 'Midi',
        title: 'Ratatouille',
        recipe: 'known',
        href: '/catalogue/r1?depuis=menu-nouveau',
        address: { repasIndex: 0, slotIndex: 0 },
        choose: null,
        presence: null,
        sortie: null,
      },
    ]);
  });
});

describe('menuDays et les créneaux que personne ne mange', () => {
  it('le créneau que personne ne mange porte la mention de sortie et garde le titre de sa recette, là où son voisin du même jour n’en porte aucune', () => {
    const menu = menuOf([
      createRepas({
        jour: 0,
        creneau: 'midi',
        slots: [createSlot({ recipeId: 'r1' })],
        presents: [],
        invites: 0,
      }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ]);

    const slots = menuDays(menu, twoRecipes(), FROM_MENU_DRAFT).at(0)?.slots ?? [];

    expect(slots.at(0)?.sortie).toBe('La famille est de sortie');
    expect(slots.at(0)?.title).toBe('Ratatouille');
    expect(slots.at(1)?.title).toBe('Blanquette');
    expect(slots.at(1)?.sortie).toBeNull();
  });

  it('le créneau sans aucun convive du foyer mais avec des invités ne porte aucune mention de sortie, là où son voisin sans personne la porte', () => {
    const menu = menuOf([
      createRepas({
        jour: 0,
        creneau: 'midi',
        slots: [createSlot({ recipeId: 'r1' })],
        presents: [],
        invites: 3,
      }),
      createRepas({
        jour: 0,
        creneau: 'soir',
        slots: [createSlot({ recipeId: 'r2' })],
        presents: [],
        invites: 0,
      }),
    ]);

    const slots = menuDays(menu, twoRecipes(), FROM_MENU_DRAFT).at(0)?.slots ?? [];

    expect(slots.at(0)?.sortie).toBeNull();
    expect(slots.at(1)?.sortie).toBe('La famille est de sortie');
  });

  it('les deux recettes d’un même créneau portent la même mention de sortie', () => {
    const menu = menuOf([
      createRepas({
        jour: 0,
        creneau: 'soir',
        slots: [createSlot({ recipeId: 'r1' }), createSlot({ recipeId: 'r2' })],
        presents: [],
        invites: 0,
      }),
    ]);

    const slots = menuDays(menu, twoRecipes(), FROM_MENU_DRAFT).at(0)?.slots ?? [];

    expect(slots.map((slot) => slot.sortie)).toEqual([
      'La famille est de sortie',
      'La famille est de sortie',
    ]);
  });
});
