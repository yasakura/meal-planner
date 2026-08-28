import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { type Convive } from '../../../domain/entities/convive';
import { type Unit } from '../../../domain/entities/ingredient';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { type CatalogueState } from '../catalogue/catalogue-slice';
import { convivesInitialState, type ConvivesState } from '../convives/convives-slice';
import { type SavedMenusState } from './saved-menus-slice';
import { listeDeCoursesViewOf, sourcesEnPanne } from './liste-de-courses-view';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });
const LUNDI_31_AOUT = createCalendarDate({ year: 2026, month: 8, day: 31 });

const ADRESSE_DU_24 = '2026-08-24';
const ADRESSE_DU_31 = '2026-08-31';

const HORS_LIGNE = 'Aucune connexion — la liste de courses n’a pas pu être chargée.';
const ILLISIBLE = 'Impossible de charger la liste de courses.';
type CreneauSpec = {
  recipeIds: string[];
  presents?: readonly string[] | null;
  invites?: number;
};

function menuDe(dateDebut: CalendarDate, creneaux: CreneauSpec[]): Menu {
  return createMenu({
    dateDebut,
    repas: creneaux.map((spec, jour) =>
      createRepas({
        jour,
        creneau: 'midi',
        slots: spec.recipeIds.map((recipeId) => createSlot({ recipeId })),
        ...(spec.presents !== undefined ? { presents: spec.presents } : {}),
        ...(spec.invites !== undefined ? { invites: spec.invites } : {}),
      }),
    ),
  });
}

const ingredient = (name: string, quantity: number, unit: Unit) =>
  IngredientBuilder.anIngredient().withName(name).withQuantity(quantity).withUnit(unit).build();

const recette = (id: string, ingredients: ReturnType<typeof ingredient>[]): Recipe =>
  RecipeBuilder.aRecipe().withId(id).withConvivesReference(4).withIngredients(ingredients).build();

const FOYER: Convive[] = [
  ConviveBuilder.aConvive().withId('c-lionel').withName('Lionel').build(),
  ConviveBuilder.aConvive().withId('c-aurelie').withName('Aurélie').build(),
  ConviveBuilder.aConvive().withId('c-rory').withName('Rory').build(),
  ConviveBuilder.aConvive().withId('c-nina').withName('Nina').build(),
];

const CATALOGUE: Recipe[] = [
  recette('r-gratin', [ingredient('Pommes de terre', 840, 'g'), ingredient('Ail', 3, 'piece')]),
  recette('r-salade', [ingredient('Pommes de terre', 500, 'g')]),
];

const MENU_DU_24 = menuDe(LUNDI_24_AOUT, [
  { recipeIds: ['r-gratin'] },
  { recipeIds: ['r-salade'] },
]);

const MENU_DU_31 = menuDe(LUNDI_31_AOUT, [
  { recipeIds: ['r-salade'] },
  { recipeIds: ['r-salade'] },
]);

const LIGNES_DU_24 = [
  { name: 'Ail', quantity: '3 pièces' },
  { name: 'Pommes de terre', quantity: '1,34 kg' },
];

function menusRecus(menus: Menu[], overrides: Partial<SavedMenusState> = {}): SavedMenusState {
  return {
    menus,
    indexInitial: 0,
    failure: null,
    attempt: 0,
    cursor: null,
    ...overrides,
  };
}

function menusAttendus(overrides: Partial<SavedMenusState> = {}): SavedMenusState {
  return { menus: null, indexInitial: null, failure: null, attempt: 0, cursor: null, ...overrides };
}

function catalogueRecu(overrides: Partial<CatalogueState> = {}): CatalogueState {
  return { recipes: CATALOGUE, failure: null, attempt: 0, ...overrides };
}

function catalogueAttendu(overrides: Partial<CatalogueState> = {}): CatalogueState {
  return { recipes: null, failure: null, attempt: 0, ...overrides };
}

function foyerRecu(overrides: Partial<ConvivesState> = {}): ConvivesState {
  return { ...convivesInitialState('draft-1'), convives: FOYER, received: true, ...overrides };
}

function foyerAttendu(overrides: Partial<ConvivesState> = {}): ConvivesState {
  return { ...convivesInitialState('draft-1'), ...overrides };
}

describe('listeDeCoursesViewOf', () => {
  it('la liste du menu de l’adresse porte ses lignes agrégées, en français, sous la période du menu', () => {
    expect(
      listeDeCoursesViewOf(menusRecus([MENU_DU_24]), catalogueRecu(), foyerRecu(), ADRESSE_DU_24),
    ).toEqual({
      status: 'loaded',
      periodLabel: '24 – 25 août',
      lignes: LIGNES_DU_24,
    });
  });

  it('c’est l’adresse qui désigne le menu : deux menus enregistrés, deux listes, sans aucun curseur dans l’état', () => {
    const menus = menusRecus([MENU_DU_24, MENU_DU_31]);

    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerRecu(), ADRESSE_DU_24)).toEqual({
      status: 'loaded',
      periodLabel: '24 – 25 août',
      lignes: LIGNES_DU_24,
    });
    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerRecu(), ADRESSE_DU_31)).toEqual({
      status: 'loaded',
      periodLabel: '31 août – 1er sept.',
      lignes: [{ name: 'Pommes de terre', quantity: '1 kg' }],
    });
  });

  it('tant que le foyer n’est pas arrivé, l’écran attend, là où le même état foyer reçu rend la liste', () => {
    const menus = menusRecus([MENU_DU_24]);

    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerAttendu(), ADRESSE_DU_24)).toEqual({
      status: 'loading',
    });
    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerRecu(), ADRESSE_DU_24)).toEqual({
      status: 'loaded',
      periodLabel: '24 – 25 août',
      lignes: LIGNES_DU_24,
    });
  });

  it('tant que le catalogue n’est pas arrivé, l’écran attend au lieu de signaler tous les créneaux sans quantités', () => {
    const menus = menusRecus([MENU_DU_24]);

    expect(listeDeCoursesViewOf(menus, catalogueAttendu(), foyerRecu(), ADRESSE_DU_24)).toEqual({
      status: 'loading',
    });
    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerRecu(), ADRESSE_DU_24)).toEqual({
      status: 'loaded',
      periodLabel: '24 – 25 août',
      lignes: LIGNES_DU_24,
    });
  });

  it('tant que les menus enregistrés ne sont pas arrivés, l’écran attend au lieu de conclure à l’introuvable', () => {
    expect(
      listeDeCoursesViewOf(menusAttendus(), catalogueRecu(), foyerRecu(), ADRESSE_DU_24),
    ).toEqual({ status: 'loading' });
  });

  it('un dépôt injoignable, lequel que ce soit des trois, porte le constat hors ligne de la liste', () => {
    expect(
      listeDeCoursesViewOf(
        menusAttendus({ failure: 'unavailable' }),
        catalogueRecu(),
        foyerRecu(),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'unavailable', message: HORS_LIGNE });
    expect(
      listeDeCoursesViewOf(
        menusRecus([MENU_DU_24]),
        catalogueAttendu({ failure: 'unavailable' }),
        foyerRecu(),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'unavailable', message: HORS_LIGNE });
    expect(
      listeDeCoursesViewOf(
        menusRecus([MENU_DU_24]),
        catalogueRecu(),
        foyerAttendu({ failure: 'unavailable' }),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'unavailable', message: HORS_LIGNE });
  });

  it('une source illisible, laquelle que ce soit des trois, porte un constat de panne sobre, sans message technique', () => {
    expect(
      listeDeCoursesViewOf(
        menusAttendus({ failure: 'unreadable' }),
        catalogueRecu(),
        foyerRecu(),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'error', message: ILLISIBLE });
    expect(
      listeDeCoursesViewOf(
        menusRecus([MENU_DU_24]),
        catalogueAttendu({ failure: 'unreadable' }),
        foyerRecu(),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'error', message: ILLISIBLE });
    expect(
      listeDeCoursesViewOf(
        menusRecus([MENU_DU_24]),
        catalogueRecu(),
        foyerAttendu({ failure: 'unreadable' }),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'error', message: ILLISIBLE });
  });

  it('une source injoignable prime sur une source illisible : le hors-ligne, qui se répare tout seul', () => {
    expect(
      listeDeCoursesViewOf(
        menusAttendus({ failure: 'unreadable' }),
        catalogueAttendu({ failure: 'unavailable' }),
        foyerRecu(),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'unavailable', message: HORS_LIGNE });
  });

  it('une source illisible avoue la panne même quand une autre source manquante n’a rien constaté : les menus illisibles pendant que le catalogue n’est pas encore arrivé', () => {
    expect(
      listeDeCoursesViewOf(
        menusAttendus({ failure: 'unreadable' }),
        catalogueAttendu(),
        foyerRecu(),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'error', message: ILLISIBLE });
  });

  it('une panne survenue après l’arrivée des trois sources ne retire pas la liste de l’écran', () => {
    expect(
      listeDeCoursesViewOf(
        menusRecus([MENU_DU_24], { failure: 'unavailable' }),
        catalogueRecu({ failure: 'unreadable' }),
        foyerRecu({ failure: 'unavailable' }),
        ADRESSE_DU_24,
      ),
    ).toEqual({
      status: 'loaded',
      periodLabel: '24 – 25 août',
      lignes: LIGNES_DU_24,
    });
  });

  it('une période qu’aucun menu enregistré ne couvre rend l’introuvable, là où la période d’un menu rend sa liste', () => {
    const menus = menusRecus([MENU_DU_24]);

    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerRecu(), ADRESSE_DU_31)).toEqual({
      status: 'notFound',
    });
    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerRecu(), ADRESSE_DU_24)).toEqual({
      status: 'loaded',
      periodLabel: '24 – 25 août',
      lignes: LIGNES_DU_24,
    });
  });

  it('une adresse dont la période n’est pas une date rend l’introuvable, sans lever', () => {
    expect(
      listeDeCoursesViewOf(menusRecus([MENU_DU_24]), catalogueRecu(), foyerRecu(), 'pas-une-date'),
    ).toEqual({ status: 'notFound' });
  });

  it('un menu dont aucun créneau n’a de mangeur rend une liste vide reçue, distincte de l’attente d’un foyer', () => {
    const menuDeserte = menuDe(LUNDI_24_AOUT, [
      { recipeIds: ['r-gratin'], presents: [], invites: 0 },
      { recipeIds: ['r-salade'], presents: [], invites: 0 },
    ]);
    const menus = menusRecus([menuDeserte]);

    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerRecu(), ADRESSE_DU_24)).toEqual({
      status: 'empty',
      periodLabel: '24 – 25 août',
    });
    expect(listeDeCoursesViewOf(menus, catalogueRecu(), foyerAttendu(), ADRESSE_DU_24)).toEqual({
      status: 'loading',
    });
  });

  it('un créneau dont la recette est absente du catalogue ne retire rien de la liste : les lignes comptées sont celles du menu entier comptable', () => {
    const menuTroue = menuDe(LUNDI_24_AOUT, [
      { recipeIds: ['r-gratin', 'r-disparue'] },
      { recipeIds: ['r-salade'] },
    ]);

    expect(
      listeDeCoursesViewOf(menusRecus([menuTroue]), catalogueRecu(), foyerRecu(), ADRESSE_DU_24),
    ).toEqual({
      status: 'loaded',
      periodLabel: '24 – 25 août',
      lignes: LIGNES_DU_24,
    });
    expect(
      listeDeCoursesViewOf(menusRecus([MENU_DU_24]), catalogueRecu(), foyerRecu(), ADRESSE_DU_24),
    ).toEqual({
      status: 'loaded',
      periodLabel: '24 – 25 août',
      lignes: LIGNES_DU_24,
    });
  });

  it('un menu dont aucune recette n’est au catalogue rend une liste vide sans faire lever le calcul', () => {
    const menuIntrouvable = menuDe(LUNDI_24_AOUT, [
      { recipeIds: ['r-disparue'] },
      { recipeIds: ['r-envolee'] },
    ]);

    expect(
      listeDeCoursesViewOf(
        menusRecus([menuIntrouvable]),
        catalogueRecu(),
        foyerRecu(),
        ADRESSE_DU_24,
      ),
    ).toEqual({ status: 'empty', periodLabel: '24 – 25 août' });
  });
});

describe('sourcesEnPanne', () => {
  it('ne nomme que la source qui manque ET qui a constaté une panne : le catalogue tombé avant d’avoir livré, quand les menus tombés APRÈS avoir livré n’ont rien à rouvrir', () => {
    expect(
      sourcesEnPanne(
        menusRecus([MENU_DU_24], { failure: 'unavailable' }),
        catalogueAttendu({ failure: 'unreadable' }),
        foyerRecu(),
      ),
    ).toEqual(['catalogue']);
  });

  it('nomme les trois quand les trois sont tombées avant d’avoir livré', () => {
    expect(
      sourcesEnPanne(
        menusAttendus({ failure: 'unreadable' }),
        catalogueAttendu({ failure: 'unavailable' }),
        foyerAttendu({ failure: 'unavailable' }),
      ),
    ).toEqual(['menus', 'catalogue', 'foyer']);
  });

  it('ne nomme aucune source quand celle qui manque n’a rien constaté : il n’y a rien à rouvrir sous un canal encore muet', () => {
    expect(sourcesEnPanne(menusRecus([MENU_DU_24]), catalogueAttendu(), foyerRecu())).toEqual([]);
  });
});
