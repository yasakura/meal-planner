import { describe, it, expect } from 'vitest';
import { createCalendarDate } from '../entities/calendar-date';
import { type Convive } from '../entities/convive';
import { type Unit } from '../entities/ingredient';
import { createMenu, type Menu } from '../entities/menu';
import { createRepas } from '../entities/repas';
import { createSlot } from '../entities/slot';
import { type Recipe } from '../entities/recipe';
import { ConviveBuilder } from '../test-builders/convive.builder';
import { IngredientBuilder } from '../test-builders/ingredient.builder';
import { RecipeBuilder } from '../test-builders/recipe.builder';
import { InMemoryRecipeRepository } from '../test-doubles/in-memory-recipe-repository';
import { listeDeCourses, type LigneDeCourses } from './liste-de-courses';

const LUNDI_5_JANVIER = createCalendarDate({ year: 2026, month: 1, day: 5 });

type CreneauSpec = {
  recipeIds: string[];
  presents?: readonly string[] | null;
  invites?: number;
};

const menuDe = (creneaux: CreneauSpec[]): Menu =>
  createMenu({
    dateDebut: LUNDI_5_JANVIER,
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

const foyerDeQuatre = (): Convive[] => [
  ConviveBuilder.aConvive().withId('c-lionel').withName('Lionel').build(),
  ConviveBuilder.aConvive().withId('c-aurelie').withName('Aurélie').build(),
  ConviveBuilder.aConvive().withId('c-rory').withName('Rory').build(),
  ConviveBuilder.aConvive().withId('c-nina').withName('Nina').build(),
];

const recette = (id: string, ingredients: ReturnType<IngredientBuilder['build']>[]): Recipe =>
  RecipeBuilder.aRecipe().withId(id).withConvivesReference(4).withIngredients(ingredients).build();

const ingredient = (name: string, quantity: number, unit: Unit) =>
  IngredientBuilder.anIngredient().withName(name).withQuantity(quantity).withUnit(unit).build();

const ligne = (name: string, quantity: number, unit: Unit): LigneDeCourses => ({
  name,
  quantity,
  unit,
});

describe('listeDeCourses', () => {
  it('deux créneaux qui emploient le même ingrédient ne font qu’une ligne, portant la somme (500 g + 250 g = 750 g)', () => {
    const menu = menuDe([{ recipeIds: ['r-gratin'] }, { recipeIds: ['r-salade'] }]);
    const catalogue = [
      recette('r-gratin', [ingredient('Tomates', 500, 'g')]),
      recette('r-salade', [ingredient('Tomates', 250, 'g')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Tomates', 750, 'g')],
    });
  });

  it('chaque créneau est mis à l’échelle de SON effectif avant d’être sommé : 20 g pour 3 donnent 7 g à 1 convive et 14 g à 2, soit 21 g, et non les 20 g d’une mise à l’échelle faite après la somme', () => {
    const menu = menuDe([
      { recipeIds: ['r-herbes'], presents: ['c-lionel'] },
      { recipeIds: ['r-herbes'], presents: ['c-lionel', 'c-rory'] },
    ]);
    const catalogue = [
      RecipeBuilder.aRecipe()
        .withId('r-herbes')
        .withConvivesReference(3)
        .withIngredients([ingredient('Herbes fraîches', 20, 'g')])
        .build(),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Herbes fraîches', 21, 'g')],
    });
  });

  it('un créneau que personne ne mange n’apporte rien, là où le même créneau mangé apporte ses 300 g', () => {
    const catalogue = [recette('r-riz', [ingredient('Riz', 300, 'g')])];
    const mange = menuDe([{ recipeIds: ['r-riz'] }]);
    const mangePuisDeserte = menuDe([
      { recipeIds: ['r-riz'] },
      { recipeIds: ['r-riz'], presents: [], invites: 0 },
    ]);

    expect(listeDeCourses(mange, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Riz', 300, 'g')],
    });
    expect(listeDeCourses(mangePuisDeserte, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Riz', 300, 'g')],
    });
  });

  it('un créneau dont la recette est absente du catalogue n’apporte rien à la liste, et les autres créneaux sont agrégés quand même', () => {
    const menu = menuDe([
      { recipeIds: ['r-gratin', 'r-oubliee'] },
      { recipeIds: ['r-supprimee'] },
      { recipeIds: ['r-salade'] },
    ]);
    const catalogue = [
      recette('r-gratin', [ingredient('Tomates', 500, 'g')]),
      recette('r-salade', [ingredient('Tomates', 250, 'g')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Tomates', 750, 'g')],
    });
  });

  it('un créneau dont la mise à l’échelle déborde le plafond du compte juste n’apporte rien à la liste et ne fait pas lever le calcul, et les autres créneaux sont agrégés quand même', () => {
    const menu = menuDe([
      { recipeIds: ['r-demesuree'], presents: ['c-lionel', 'c-rory'] },
      { recipeIds: ['r-salade'], presents: ['c-lionel', 'c-rory'] },
    ]);
    const catalogue = [
      RecipeBuilder.aRecipe()
        .withId('r-demesuree')
        .withConvivesReference(1)
        .withIngredients([ingredient('Sel', 10 ** 12, 'g')])
        .build(),
      recette('r-salade', [ingredient('Tomates', 500, 'g')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Tomates', 250, 'g')],
    });
  });

  it('l’ordre des lignes est alphabétique : ni l’ordre du catalogue mélangé par le dépôt, ni l’ordre des créneaux ne le changent', async () => {
    const depot = InMemoryRecipeRepository.create();
    const recettes = [
      recette('r-1', [ingredient('Dattes', 100, 'g')]),
      recette('r-2', [ingredient('Beurre', 200, 'g')]),
      recette('r-3', [ingredient('Ail', 30, 'g'), ingredient('Carottes', 400, 'g')]),
    ];
    for (const uneRecette of recettes) await depot.save(uneRecette);
    const catalogueMelange = await depot.findAll();
    const catalogueEnOrdreDInsertion = depot.all();
    const menu = menuDe([{ recipeIds: ['r-1'] }, { recipeIds: ['r-3'] }, { recipeIds: ['r-2'] }]);
    const menuALEnvers = menuDe([
      { recipeIds: ['r-2'] },
      { recipeIds: ['r-3'] },
      { recipeIds: ['r-1'] },
    ]);
    const attendu = {
      lignes: [
        ligne('Ail', 30, 'g'),
        ligne('Beurre', 200, 'g'),
        ligne('Carottes', 400, 'g'),
        ligne('Dattes', 100, 'g'),
      ],
    };

    expect(catalogueMelange.map((uneRecette) => uneRecette.id)).not.toEqual(
      catalogueEnOrdreDInsertion.map((uneRecette) => uneRecette.id),
    );
    expect(listeDeCourses(menu, catalogueMelange, foyerDeQuatre())).toEqual(attendu);
    expect(listeDeCourses(menu, catalogueEnOrdreDInsertion, foyerDeQuatre())).toEqual(attendu);
    expect(listeDeCourses(menuALEnvers, catalogueMelange, foyerDeQuatre())).toEqual(attendu);
  });

  it('un menu dont aucun créneau n’a de mangeur rend une liste vide sans lever, là où le même menu servi à un foyer rend ses lignes', () => {
    const menu = menuDe([{ recipeIds: ['r-gratin'] }, { recipeIds: ['r-salade'] }]);
    const catalogue = [
      recette('r-gratin', [ingredient('Tomates', 500, 'g')]),
      recette('r-salade', [ingredient('Tomates', 250, 'g')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Tomates', 750, 'g')],
    });
    expect(listeDeCourses(menu, catalogue, [])).toEqual({
      lignes: [],
    });
  });

  it('deux écritures d’un même ingrédient qui ne diffèrent que par la casse ou par les espaces internes ne font qu’une ligne, sous le libellé de leur première occurrence dans le menu', () => {
    const menu = menuDe([{ recipeIds: ['r-gratin'] }, { recipeIds: ['r-poelee'] }]);
    const catalogue = [
      recette('r-gratin', [
        ingredient('Tomates', 500, 'g'),
        ingredient('Pommes de terre', 400, 'g'),
      ]),
      recette('r-poelee', [
        ingredient('tomates', 250, 'g'),
        ingredient('Pommes  de  terre', 300, 'g'),
      ]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Pommes de terre', 700, 'g'), ligne('Tomates', 750, 'g')],
    });
  });

  it('un même nom écrit dans deux unités non convertibles fait deux lignes, l’unité de base les départageant plutôt que l’ordre des créneaux', () => {
    const menu = menuDe([{ recipeIds: ['r-aioli'] }, { recipeIds: ['r-soupe'] }]);
    const catalogue = [
      recette('r-aioli', [ingredient('Ail', 3, 'piece')]),
      recette('r-soupe', [ingredient('Ail', 100, 'g')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Ail', 100, 'g'), ligne('Ail', 3, 'piece')],
    });
  });

  it('un même nom écrit dans deux unités convertibles fait une ligne sommée en unité de base, remontée en grande unité dès 1000 (500 g + 1 kg = 1,5 kg ; 300 ml + 2 l = 2,3 l)', () => {
    const menu = menuDe([{ recipeIds: ['r-crepes'] }, { recipeIds: ['r-brioche'] }]);
    const catalogue = [
      recette('r-crepes', [ingredient('Farine', 500, 'g'), ingredient('Lait', 300, 'ml')]),
      recette('r-brioche', [ingredient('Farine', 1, 'kg'), ingredient('Lait', 2, 'l')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Farine', 1.5, 'kg'), ligne('Lait', 2.3, 'l')],
    });
  });

  it('une ligne remontée en grande unité s’arrondit au centième supérieur sans jamais dépasser : 1 501 g donnent 1,51 kg, et 1 510 g donnent 1,51 kg aussi', () => {
    const menu = menuDe([{ recipeIds: ['r-crepes'] }, { recipeIds: ['r-brioche'] }]);
    const catalogueDe = (grammes: number) => [
      recette('r-crepes', [ingredient('Farine', grammes, 'g')]),
      recette('r-brioche', [ingredient('Farine', 1, 'kg')]),
    ];

    expect(listeDeCourses(menu, catalogueDe(501), foyerDeQuatre())).toEqual({
      lignes: [ligne('Farine', 1.51, 'kg')],
    });
    expect(listeDeCourses(menu, catalogueDe(510), foyerDeQuatre())).toEqual({
      lignes: [ligne('Farine', 1.51, 'kg')],
    });
  });

  it('une somme fractionnaire en unité de base s’arrondit à l’unité supérieure au lieu de laisser sortir le bruit du flottant : 0,1 g + 0,2 g font 1 g, et non 0,30000000000000004 g', () => {
    const menu = menuDe([{ recipeIds: ['r-pincee'] }, { recipeIds: ['r-moulin'] }]);
    const catalogue = [
      recette('r-pincee', [ingredient('Sel', 0.1, 'g')]),
      recette('r-moulin', [ingredient('Sel', 0.2, 'g')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Sel', 1, 'g')],
    });
  });

  it('un cumul qui atteint exactement 1000 unités de base passe en grande unité, là où 999 restent en unité de base', () => {
    const menu = menuDe([{ recipeIds: ['r-gratin'] }, { recipeIds: ['r-salade'] }]);
    const catalogueDe = (grammes: number) => [
      recette('r-gratin', [ingredient('Tomates', 500, 'g')]),
      recette('r-salade', [ingredient('Tomates', grammes, 'g')]),
    ];

    expect(listeDeCourses(menu, catalogueDe(499), foyerDeQuatre())).toEqual({
      lignes: [ligne('Tomates', 999, 'g')],
    });
    expect(listeDeCourses(menu, catalogueDe(500), foyerDeQuatre())).toEqual({
      lignes: [ligne('Tomates', 1, 'kg')],
    });
  });

  it('une somme fractionnaire qui atteint la grande unité UNE FOIS ARRONDIE y monte : 0,9995 kg font 1 kg, et non 1000 g', () => {
    const menu = menuDe([{ recipeIds: ['r-brioche'] }]);
    const catalogue = [recette('r-brioche', [ingredient('Farine', 0.9995, 'kg')])];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Farine', 1, 'kg')],
    });
  });

  it('un cumul de 1000 pièces reste en pièces, faute de grande unité où monter', () => {
    const menu = menuDe([{ recipeIds: ['r-brochettes'] }, { recipeIds: ['r-tapas'] }]);
    const catalogue = [
      recette('r-brochettes', [ingredient('Olives', 600, 'piece')]),
      recette('r-tapas', [ingredient('Olives', 400, 'piece')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Olives', 1000, 'piece')],
    });
  });

  it('deux noms qui diffèrent par autre chose que la casse ou l’espacement font deux lignes : « Ail des ours » ne se confond pas avec « Aildesours »', () => {
    const menu = menuDe([{ recipeIds: ['r-pesto'] }, { recipeIds: ['r-tarte'] }]);
    const catalogue = [
      recette('r-pesto', [ingredient('Ail des ours', 50, 'g')]),
      recette('r-tarte', [ingredient('Aildesours', 30, 'g')]),
    ];

    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Ail des ours', 50, 'g'), ligne('Aildesours', 30, 'g')],
    });
  });

  it('une somme qui franchit le plafond du compte juste sort une ligne avec sa quantité, là où chaque contribution seule reste sous le plafond (10¹² g + 10¹² g = 2 000 000 000 kg)', () => {
    const menu = menuDe([{ recipeIds: ['r-saumure'] }, { recipeIds: ['r-conserve'] }]);
    const catalogue = [
      recette('r-saumure', [ingredient('Sel', 10 ** 12, 'g')]),
      recette('r-conserve', [ingredient('Sel', 10 ** 12, 'g')]),
    ];

    expect(
      listeDeCourses(menuDe([{ recipeIds: ['r-saumure'] }]), catalogue, foyerDeQuatre()),
    ).toEqual({
      lignes: [ligne('Sel', 10 ** 9, 'kg')],
    });
    expect(listeDeCourses(menu, catalogue, foyerDeQuatre())).toEqual({
      lignes: [ligne('Sel', 2 * 10 ** 9, 'kg')],
    });
  });
});
