import { describe, it, expect } from 'vitest';
import { type Unit } from '../entities/ingredient';
import { effectiveIngredients } from './effective-ingredients';
import { RecipeBuilder } from '../test-builders/recipe.builder';
import { IngredientBuilder } from '../test-builders/ingredient.builder';

describe('effectiveIngredients', () => {
  it('multiplie la quantité par le facteur convivesCible / convivesReference en préservant le nom, et l’unité tant qu’elle reste lisible', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Tomates')
          .withQuantity(500)
          .withUnit('g')
          .build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 5)).toEqual([
      IngredientBuilder.anIngredient().withName('Tomates').withQuantity(625).withUnit('g').build(),
    ]);
  });

  it("met à l'échelle chaque ingrédient de la recette", () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Tomates')
          .withQuantity(500)
          .withUnit('g')
          .build(),
        IngredientBuilder.anIngredient().withName('Lait').withQuantity(200).withUnit('ml').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 2)).toEqual([
      IngredientBuilder.anIngredient().withName('Tomates').withQuantity(250).withUnit('g').build(),
      IngredientBuilder.anIngredient().withName('Lait').withQuantity(100).withUnit('ml').build(),
    ]);
  });

  it('met les grammes à l’échelle sans rien perdre quand la division tombe juste (500 g pour 4 → 3 pers. = 375)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build()])
      .build();

    expect(effectiveIngredients(recipe, 3)).toEqual([
      IngredientBuilder.anIngredient().withQuantity(375).withUnit('g').build(),
    ]);
  });

  it('met kg / ml / l à l’échelle sans rien perdre quand la division tombe juste, le kilo tombé sous l’unité se disant en grammes', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Farine').withQuantity(1).withUnit('kg').build(),
        IngredientBuilder.anIngredient().withName('Lait').withQuantity(200).withUnit('ml').build(),
        IngredientBuilder.anIngredient().withName('Eau').withQuantity(2).withUnit('l').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 3)).toEqual([
      IngredientBuilder.anIngredient().withName('Farine').withQuantity(750).withUnit('g').build(),
      IngredientBuilder.anIngredient().withName('Lait').withQuantity(150).withUnit('ml').build(),
      IngredientBuilder.anIngredient().withName('Eau').withQuantity(1.5).withUnit('l').build(),
    ]);
  });

  it('arrondit les pièces au supérieur avec Math.ceil (6 pièces pour 4 → 5 pers. = 8)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Œufs').withQuantity(6).withUnit('piece').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 5)).toEqual([
      IngredientBuilder.anIngredient().withName('Œufs').withQuantity(8).withUnit('piece').build(),
    ]);
  });

  it("n'arrondit pas au-delà quand le résultat pièce est déjà entier (8 pièces pour 4 → 3 pers. = 6)", () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Œufs').withQuantity(8).withUnit('piece').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 3)).toEqual([
      IngredientBuilder.anIngredient().withName('Œufs').withQuantity(6).withUnit('piece').build(),
    ]);
  });

  it('laisse intacte, à effectif inchangé, la quantité écrite en grammes', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build()])
      .build();

    expect(effectiveIngredients(recipe, 4)).toEqual([
      IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build(),
    ]);
  });

  it('retourne des ingrédients validés et frozen (via createIngredient)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build()])
      .build();

    const result = effectiveIngredients(recipe, 5);

    expect(result?.map((ingredient) => Object.isFrozen(ingredient))).toEqual([true]);
  });

  it('rejette un convivesCible non entier (1.5)', () => {
    const recipe = RecipeBuilder.aRecipe().build();

    expect(() => effectiveIngredients(recipe, 1.5)).toThrow(
      'Le nombre de personnes doit être un entier positif',
    );
  });

  it('rejette un convivesCible égal à 0', () => {
    const recipe = RecipeBuilder.aRecipe().build();

    expect(() => effectiveIngredients(recipe, 0)).toThrow(
      'Le nombre de personnes doit être un entier positif',
    );
  });

  it('rejette un convivesCible négatif', () => {
    const recipe = RecipeBuilder.aRecipe().build();

    expect(() => effectiveIngredients(recipe, -2)).toThrow(
      'Le nombre de personnes doit être un entier positif',
    );
  });

  it("accepte la borne convivesCible = 1 et met à l'échelle (500 g pour 4 → 1 pers. = 125)", () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([IngredientBuilder.anIngredient().withQuantity(500).withUnit('g').build()])
      .build();

    expect(effectiveIngredients(recipe, 1)).toEqual([
      IngredientBuilder.anIngredient().withQuantity(125).withUnit('g').build(),
    ]);
  });

  it('arrondit les pièces au supérieur strictement (ceil, pas round) : 5 pièces pour 4 → 5 pers. = 6,25 → 7', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Œufs').withQuantity(5).withUnit('piece').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 5)).toEqual([
      IngredientBuilder.anIngredient().withName('Œufs').withQuantity(7).withUnit('piece').build(),
    ]);
  });

  it('arrondit les grammes au gramme supérieur : jamais moins que nécessaire (20 g pour 3 → 1 pers. = 6,67 → 7 g)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(3)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Herbes fraîches')
          .withQuantity(20)
          .withUnit('g')
          .build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 1)).toEqual([
      IngredientBuilder.anIngredient()
        .withName('Herbes fraîches')
        .withQuantity(7)
        .withUnit('g')
        .build(),
    ]);
  });

  it('arrondit les millilitres au millilitre supérieur (200 ml pour 3 → 1 pers. = 66,67 → 67 ml)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(3)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Lait').withQuantity(200).withUnit('ml').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 1)).toEqual([
      IngredientBuilder.anIngredient().withName('Lait').withQuantity(67).withUnit('ml').build(),
    ]);
  });

  it('descend sous le kilo au gramme près, et jamais au kilo supérieur : 1 kg pour 4 → 1 pers. donne 250 g, là où 1 kg pour 3 donne 334 g', () => {
    const recipe = (reference: number) =>
      RecipeBuilder.aRecipe()
        .withConvivesReference(reference)
        .withIngredients([
          IngredientBuilder.anIngredient()
            .withName('Farine')
            .withQuantity(1)
            .withUnit('kg')
            .build(),
        ])
        .build();

    expect(effectiveIngredients(recipe(4), 1)).toEqual([
      IngredientBuilder.anIngredient().withName('Farine').withQuantity(250).withUnit('g').build(),
    ]);
    expect(effectiveIngredients(recipe(3), 1)).toEqual([
      IngredientBuilder.anIngredient().withName('Farine').withQuantity(334).withUnit('g').build(),
    ]);
  });

  it('descend sous le litre au millilitre près (1 l pour 3 → 1 pers. = 333,3… → 334 ml)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(3)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Eau').withQuantity(1).withUnit('l').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 1)).toEqual([
      IngredientBuilder.anIngredient().withName('Eau').withQuantity(334).withUnit('ml').build(),
    ]);
  });

  it('ne monte pas d’un gramme sur un compte juste que le flottant salit (21 g pour 7 → 9 pers. = 27 g, pas 28)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(7)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Beurre').withQuantity(21).withUnit('g').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 9)).toEqual([
      IngredientBuilder.anIngredient().withName('Beurre').withQuantity(27).withUnit('g').build(),
    ]);
  });

  it('ne monte pas de dix grammes sur un compte juste que le flottant salit (1 kg pour 5 → 11 pers. = 2,2 kg, pas 2,21)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(5)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Farine').withQuantity(1).withUnit('kg').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 11)).toEqual([
      IngredientBuilder.anIngredient().withName('Farine').withQuantity(2.2).withUnit('kg').build(),
    ]);
  });

  it('ne rogne pas les chiffres d’une grande quantité mise à l’échelle (12345 g pour 4 → 8 pers. = 24690 g)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Sel').withQuantity(12345).withUnit('g').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 8)).toEqual([
      IngredientBuilder.anIngredient().withName('Sel').withQuantity(24690).withUnit('g').build(),
    ]);
  });
});

describe('effectiveIngredients — l’unité dans laquelle le besoin se lit', () => {
  const enKilos = (quantity: number, reference: number) =>
    RecipeBuilder.aRecipe()
      .withConvivesReference(reference)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Farine')
          .withQuantity(quantity)
          .withUnit('kg')
          .build(),
      ])
      .build();

  const enLitres = (quantity: number, reference: number) =>
    RecipeBuilder.aRecipe()
      .withConvivesReference(reference)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Bouillon')
          .withQuantity(quantity)
          .withUnit('l')
          .build(),
      ])
      .build();

  const farine = (quantity: number, unit: 'g' | 'kg') =>
    IngredientBuilder.anIngredient()
      .withName('Farine')
      .withQuantity(quantity)
      .withUnit(unit)
      .build();

  const bouillon = (quantity: number, unit: 'ml' | 'l') =>
    IngredientBuilder.anIngredient()
      .withName('Bouillon')
      .withQuantity(quantity)
      .withUnit(unit)
      .build();

  it('une quantité qui tombe sous le kilo se dit en grammes (1 kg pour 4 → 1 pers. = 250 g, pas 0,25 kg)', () => {
    expect(effectiveIngredients(enKilos(1, 4), 1)).toEqual([farine(250, 'g')]);
  });

  it('le prorata se compte au gramme, jamais au centième de kilo (1 kg pour 3 → 1 pers. = 334 g)', () => {
    expect(effectiveIngredients(enKilos(1, 3), 1)).toEqual([farine(334, 'g')]);
  });

  it('arrondit le centième de kilo au supérieur, jamais à l’inférieur (1 kg pour 3 → 4 pers. = 1,34 kg, là où l’arrondi ordinaire donnerait 1,33)', () => {
    expect(effectiveIngredients(enKilos(1, 3), 4)).toEqual([farine(1.34, 'kg')]);
  });

  it('à effectif égal à la référence, rien n’est calculé : la quantité écrite passe intacte, sans arrondi (1,234 kg pour 4 → 4 pers. = 1,234 kg)', () => {
    expect(effectiveIngredients(enKilos(1.234, 4), 4)).toEqual([farine(1.234, 'kg')]);
  });

  it('à effectif égal à la référence, une quantité sous le kilo n’est pas convertie non plus (0,5 kg pour 4 → 4 pers. = 0,5 kg, là où 4 → 2 pers. donne 250 g)', () => {
    expect(effectiveIngredients(enKilos(0.5, 4), 4)).toEqual([farine(0.5, 'kg')]);
    expect(effectiveIngredients(enKilos(0.5, 4), 2)).toEqual([farine(250, 'g')]);
  });

  it('une quantité qui tombe sous le litre se dit en millilitres (1 l pour 3 → 1 pers. = 334 ml)', () => {
    expect(effectiveIngredients(enLitres(1, 3), 1)).toEqual([bouillon(334, 'ml')]);
  });

  it('un volume qui reste au-dessus du litre garde le litre, au centième supérieur (2 l pour 3 → 4 pers. = 2,67 l)', () => {
    expect(effectiveIngredients(enLitres(2, 3), 4)).toEqual([bouillon(2.67, 'l')]);
  });

  it('à la bascule exacte, mille grammes se disent un kilo, là où neuf cent quatre-vingt-dix-neuf restent des grammes', () => {
    expect(effectiveIngredients(enKilos(2, 4), 2)).toEqual([farine(1, 'kg')]);
    expect(effectiveIngredients(enKilos(1.998, 4), 2)).toEqual([farine(999, 'g')]);
  });

  it('la pièce ne se compte jamais en fraction, même à effectif égal à la référence (0,5 pièce pour 4 → 4 pers. = 1 pièce, comme pour 3 et pour 5)', () => {
    const demiPiece = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Citron')
          .withQuantity(0.5)
          .withUnit('piece')
          .build(),
      ])
      .build();
    const unCitron = [
      IngredientBuilder.anIngredient().withName('Citron').withQuantity(1).withUnit('piece').build(),
    ];

    expect(effectiveIngredients(demiPiece, 3)).toEqual(unCitron);
    expect(effectiveIngredients(demiPiece, 4)).toEqual(unCitron);
    expect(effectiveIngredients(demiPiece, 5)).toEqual(unCitron);
  });

  it('la pièce ne se convertit en rien, même quand elle tombe sous l’unité (1 pièce pour 4 → 1 pers. = 1 pièce)', () => {
    const recipe = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Œuf').withQuantity(1).withUnit('piece').build(),
      ])
      .build();

    expect(effectiveIngredients(recipe, 1)).toEqual([
      IngredientBuilder.anIngredient().withName('Œuf').withQuantity(1).withUnit('piece').build(),
    ]);
  });

  it('ne monte pas d’un gramme sur un compte juste que le flottant salit, une fois en unité de base (3 kg pour 10 → 11 pers. = 3,3 kg, pas 3,301)', () => {
    expect(effectiveIngredients(enKilos(3, 10), 11)).toEqual([farine(3.3, 'kg')]);
  });
});

describe('effectiveIngredients — ce que le calcul refuse de compter', () => {
  const recetteDe = (quantity: number, unit: Unit, reference: number) =>
    RecipeBuilder.aRecipe()
      .withConvivesReference(reference)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Sel')
          .withQuantity(quantity)
          .withUnit(unit)
          .build(),
      ])
      .build();

  const sel = (quantity: number, unit: Unit) =>
    IngredientBuilder.anIngredient().withName('Sel').withQuantity(quantity).withUnit(unit).build();

  it('ne rend rien plutôt qu’un nombre rogné (999 999 999 999 g pour 4 → 8 pers., dont le compte juste est 1 999 999 999 998 g), là où 123 456 789 012 g pour 4 → 8 rend ses 246 913 578 024 g', () => {
    expect(effectiveIngredients(recetteDe(999999999999, 'g', 4), 8)).toBeNull();
    expect(effectiveIngredients(recetteDe(123456789012, 'g', 4), 8)).toEqual([
      sel(246913578024, 'g'),
    ]);
  });

  it('ne jette plus quand la mise à l’échelle sortirait du compte juste : elle ne rend rien, là où le même ingrédient passe intact à effectif inchangé', () => {
    expect(effectiveIngredients(recetteDe(1000000000000, 'g', 4), 5)).toBeNull();
    expect(effectiveIngredients(recetteDe(1000000000000, 'g', 4), 4)).toEqual([
      sel(1000000000000, 'g'),
    ]);
  });

  it('à magnitude égale, le gramme et le kilo répondent pareil : ni l’un ni l’autre ne rend de compte, là où mille grammes et un kilo comptent tous deux 250 g', () => {
    expect(effectiveIngredients(recetteDe(1000000000000, 'g', 4), 5)).toBeNull();
    expect(effectiveIngredients(recetteDe(1000000000, 'kg', 4), 5)).toBeNull();
    expect(effectiveIngredients(recetteDe(1000, 'g', 4), 1)).toEqual([sel(250, 'g')]);
    expect(effectiveIngredients(recetteDe(1, 'kg', 4), 1)).toEqual([sel(250, 'g')]);
  });

  it('refuse le premier besoin que douze chiffres ne portent plus (666 666 666 667 g pour 2 → 3 pers., dont le compte juste est 1 000 000 000 000,5 g), là où le dernier qu’ils portent est rendu', () => {
    expect(effectiveIngredients(recetteDe(666666666667, 'g', 2), 3)).toBeNull();
    expect(effectiveIngredients(recetteDe(666666666666, 'g', 2), 3)).toEqual([
      sel(999999999999, 'g'),
    ]);
  });

  it('à la frontière exacte, le besoin qui réclame un treizième chiffre ne se compte plus, là où le dernier que douze chiffres portent se compte encore', () => {
    expect(effectiveIngredients(recetteDe(500000000000, 'g', 1), 2)).toBeNull();
    expect(effectiveIngredients(recetteDe(499999999999.5, 'g', 1), 2)).toEqual([
      sel(999999999999, 'g'),
    ]);
  });

  it('un seul ingrédient hors de portée retire le compte de toute la liste, ses voisins compris', () => {
    const avecUnHorsDePortee = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Tomates')
          .withQuantity(200)
          .withUnit('g')
          .build(),
        sel(1000000000000, 'g'),
      ])
      .build();
    const sansLuiSeul = RecipeBuilder.aRecipe()
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Tomates')
          .withQuantity(200)
          .withUnit('g')
          .build(),
      ])
      .build();

    expect(effectiveIngredients(avecUnHorsDePortee, 5)).toBeNull();
    expect(effectiveIngredients(sansLuiSeul, 5)).toEqual([
      IngredientBuilder.anIngredient().withName('Tomates').withQuantity(250).withUnit('g').build(),
    ]);
  });
});
