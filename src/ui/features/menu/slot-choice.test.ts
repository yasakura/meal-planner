import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu, type SlotAddress } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { type CatalogueState } from '../catalogue/catalogue-slice';
import { FROM_MENU_DRAFT } from '../catalogue/recipe-detail-origin';
import { menuDays } from './menu-days';
import { slotChoiceViewOf, withSlotChoice } from './slot-choice';
import { slotAddressOf } from './slot-choice-route';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

function troisRecettes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    RecipeBuilder.aRecipe().withId('r3').withTitle('Curry de pois chiches').build(),
  ];
}

function unBrouillon(): Menu {
  return createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      createRepas({ jour: 1, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ],
  });
}

function catalogueState(overrides: Partial<CatalogueState>): CatalogueState {
  return { recipes: null, failure: null, attempt: 0, ...overrides };
}

function catalogueCharge(): CatalogueState {
  return catalogueState({ recipes: troisRecettes() });
}

const PREMIER_MIDI: SlotAddress = { repasIndex: 0, slotIndex: 0 };

function vue(menu: Menu | null, address: SlotAddress, catalogue = catalogueCharge()) {
  return slotChoiceViewOf(menu, catalogue, address);
}

describe('slotChoiceViewOf — ce que le sélecteur montre', () => {
  it('nomme le créneau visé par son jour et son créneau', () => {
    const montree = vue(unBrouillon(), { repasIndex: 1, slotIndex: 0 });

    expect(montree.status === 'loaded' && montree.slotLabel).toBe('lundi 24 août, Soir');
  });

  it('nomme le créneau d’un autre jour par ce jour-là', () => {
    const montree = vue(unBrouillon(), { repasIndex: 2, slotIndex: 0 });

    expect(montree.status === 'loaded' && montree.slotLabel).toBe('mardi 25 août, Midi');
  });

  it('propose toutes les recettes du catalogue, dans l’ordre du catalogue', () => {
    const montree = vue(unBrouillon(), PREMIER_MIDI);

    expect(montree.status === 'loaded' && montree.recipes.map((recette) => recette.title)).toEqual([
      'Ratatouille',
      'Blanquette',
      'Curry de pois chiches',
    ]);
  });

  it('signale la recette déjà servie ailleurs dans la fenêtre, et pas celle qui n’y est nulle part', () => {
    const montree = vue(unBrouillon(), PREMIER_MIDI);

    expect(
      montree.status === 'loaded' &&
        montree.recipes.map((recette) => [recette.id, recette.alreadyUsed]),
    ).toEqual([
      ['r1', true],
      ['r2', true],
      ['r3', false],
    ]);
  });

  it('compte la recette du créneau visé parmi celles déjà au menu', () => {
    const montree = vue(unBrouillon(), { repasIndex: 1, slotIndex: 0 });

    expect(
      montree.status === 'loaded' && montree.recipes.find((recette) => recette.id === 'r2'),
    ).toEqual({ id: 'r2', title: 'Blanquette', alreadyUsed: true });
  });

  it('déclare le créneau introuvable quand aucun brouillon n’est en cours', () => {
    expect(vue(null, PREMIER_MIDI)).toEqual({
      status: 'introuvable',
      message: 'Ce créneau est introuvable dans le menu.',
    });
  });

  it('déclare introuvable un rang de repas hors du menu, là où le dernier rang du menu résout', () => {
    expect(vue(unBrouillon(), { repasIndex: 3, slotIndex: 0 }).status).toBe('introuvable');
    expect(vue(unBrouillon(), { repasIndex: 2, slotIndex: 0 }).status).toBe('loaded');
  });

  it('déclare introuvable un rang de créneau hors du repas, là où le rang du seul créneau résout', () => {
    expect(vue(unBrouillon(), { repasIndex: 0, slotIndex: 1 }).status).toBe('introuvable');
    expect(vue(unBrouillon(), { repasIndex: 0, slotIndex: 0 }).status).toBe('loaded');
  });

  it('déclare introuvable un rang que l’URL n’a pas su nommer', () => {
    const address = slotAddressOf({ repasIndex: 'premier', slotIndex: '0' });

    expect(vue(unBrouillon(), address).status).toBe('introuvable');
  });

  it('ne propose rien tant que le catalogue se lit', () => {
    const catalogue = catalogueState({});

    expect(vue(unBrouillon(), PREMIER_MIDI, catalogue)).toEqual({ status: 'loading' });
  });

  it('porte le constat de lecture quand le catalogue est illisible', () => {
    const catalogue = catalogueState({ failure: 'unreadable' });

    expect(vue(unBrouillon(), PREMIER_MIDI, catalogue)).toEqual({
      status: 'error',
      message: 'Impossible de charger le catalogue.',
    });
  });

  it('porte le constat hors ligne quand le catalogue est injoignable', () => {
    const catalogue = catalogueState({ failure: 'unavailable' });

    expect(vue(unBrouillon(), PREMIER_MIDI, catalogue)).toEqual({
      status: 'unavailable',
      message: 'Aucune connexion — le catalogue n’a pas pu être chargé.',
    });
  });

  it('n’a rien à proposer quand le catalogue est vide', () => {
    const catalogue = catalogueState({ recipes: [] });

    expect(vue(unBrouillon(), PREMIER_MIDI, catalogue)).toEqual({ status: 'empty' });
  });
});

describe('withSlotChoice — l’accès au choix depuis le brouillon', () => {
  function joursDuBrouillon() {
    return menuDays(unBrouillon(), troisRecettes(), FROM_MENU_DRAFT);
  }

  it('ouvre, sur chaque ligne, le choix d’une recette pour SON créneau', () => {
    const jours = withSlotChoice(joursDuBrouillon());

    expect(jours.flatMap((jour) => jour.slots.map((slot) => slot.choose?.href))).toEqual([
      '/menu/nouveau/choisir/0/0',
      '/menu/nouveau/choisir/1/0',
      '/menu/nouveau/choisir/2/0',
    ]);
  });

  it('nomme chaque accès par le jour et le créneau qu’il vise', () => {
    const jours = withSlotChoice(joursDuBrouillon());

    expect(jours.flatMap((jour) => jour.slots.map((slot) => slot.choose?.label))).toEqual([
      'Choisir une recette pour lundi 24 août, Midi',
      'Choisir une recette pour lundi 24 août, Soir',
      'Choisir une recette pour mardi 25 août, Midi',
    ]);
  });

  it('le créneau que personne ne mange n’ouvre aucun choix de recette, là où son voisin du même jour l’ouvre', () => {
    const brouillon = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({
          jour: 0,
          creneau: 'midi',
          slots: [createSlot({ recipeId: 'r1' })],
          presents: [],
          invites: 0,
        }),
        createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });

    const jours = withSlotChoice(menuDays(brouillon, troisRecettes(), FROM_MENU_DRAFT));

    expect(jours.flatMap((jour) => jour.slots.map((slot) => slot.choose?.href ?? null))).toEqual([
      null,
      '/menu/nouveau/choisir/1/0',
    ]);
  });

  it('n’ouvre ce choix que sur les jours décorés : les mêmes jours, nus, n’en portent aucun', () => {
    const nus = joursDuBrouillon();

    expect(nus.flatMap((jour) => jour.slots.map((slot) => slot.choose))).toEqual([
      null,
      null,
      null,
    ]);
    expect(
      withSlotChoice(nus).flatMap((jour) => jour.slots.map((slot) => slot.choose !== null)),
    ).toEqual([true, true, true]);
  });
});
