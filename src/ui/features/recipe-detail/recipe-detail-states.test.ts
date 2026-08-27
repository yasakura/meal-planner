import { describe, it, expect } from 'vitest';

import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { type CatalogueState } from '../catalogue/catalogue-slice';
import { FROM_CATALOGUE, FROM_MENU } from '../catalogue/recipe-detail-origin';
import { recipeOfRoute, toLoadedProps, toPropsWithoutRecipe } from './recipe-detail-states';

const GRATIN = RecipeBuilder.aRecipe().withId('r-1').withTitle('Gratin dauphinois').build();

const TARTE = RecipeBuilder.aRecipe().withId('r-2').withTitle('Tarte aux poireaux').build();

function catalogueState(overrides: Partial<CatalogueState>): CatalogueState {
  return { recipes: null, failure: null, attempt: 0, ...overrides };
}

const CATALOGUE_EMIS = catalogueState({ recipes: [GRATIN, TARTE] });

describe('recipeOfRoute', () => {
  it('rend la recette du catalogue qui porte l’identifiant de la route', () => {
    expect(recipeOfRoute(CATALOGUE_EMIS, 'r-2')).toBe(TARTE);
  });

  it('ne rend rien pour un identifiant absent du catalogue, là où un identifiant présent rend la sienne', () => {
    expect(recipeOfRoute(CATALOGUE_EMIS, 'r-inconnue')).toBeNull();
    expect(recipeOfRoute(CATALOGUE_EMIS, 'r-1')).toBe(GRATIN);
  });

  it('ne rend rien tant que le canal n’a rien émis, fût-ce sur un identifiant qui existera', () => {
    expect(recipeOfRoute(catalogueState({}), 'r-1')).toBeNull();
  });

  it('ne rend rien quand la route ne porte aucun identifiant', () => {
    expect(recipeOfRoute(CATALOGUE_EMIS, undefined)).toBeNull();
  });
});

describe('toPropsWithoutRecipe', () => {
  it('rend l’introuvable quand le catalogue émis ne porte pas l’identifiant demandé', () => {
    expect(toPropsWithoutRecipe(CATALOGUE_EMIS, 'r-inconnue')).toEqual({ status: 'notFound' });
  });

  it('rend l’attente tant que le canal n’a rien émis ni rien constaté', () => {
    expect(toPropsWithoutRecipe(catalogueState({}), 'r-1')).toEqual({ status: 'loading' });
  });

  it('rend l’attente sous une route sans identifiant, au lieu de conclure à l’introuvable', () => {
    expect(toPropsWithoutRecipe(CATALOGUE_EMIS, undefined)).toEqual({ status: 'loading' });
  });

  it('nomme l’absence de connexion, sans jamais conclure à l’inexistence', () => {
    expect(toPropsWithoutRecipe(catalogueState({ failure: 'unavailable' }), 'r-1')).toEqual({
      status: 'unavailable',
      message: 'Aucune connexion — la recette n’a pas pu être chargée.',
    });
  });

  it('rend un constat de panne sobre, sans le message technique', () => {
    expect(toPropsWithoutRecipe(catalogueState({ failure: 'unreadable' }), 'r-1')).toEqual({
      status: 'error',
      message: 'Impossible de charger la recette.',
    });
  });

  it('un catalogue émis prime sur une panne survenue ensuite : l’introuvable, pas le hors-ligne', () => {
    const apresPanne = catalogueState({ recipes: [GRATIN], failure: 'unavailable' });

    expect(toPropsWithoutRecipe(apresPanne, 'r-inconnue')).toEqual({ status: 'notFound' });
  });
});

describe('toLoadedProps', () => {
  const RATATOUILLE = RecipeBuilder.aRecipe()
    .withId('r-1')
    .withTitle('Ratatouille')
    .withConvivesReference(4)
    .withIngredients([
      IngredientBuilder.anIngredient().withName('Tomates').withQuantity(200).withUnit('g').build(),
      IngredientBuilder.anIngredient().withName('Œufs').withQuantity(3).withUnit('piece').build(),
    ])
    .withInstructions('Émincer puis mijoter.')
    .build();

  it('sans effectif demandé, rend les quantités de référence et l’effectif de la recette', () => {
    expect(toLoadedProps(RATATOUILLE, FROM_CATALOGUE)).toEqual({
      status: 'loaded',
      title: 'Ratatouille',
      convivesLabel: 'Pour 4 personnes',
      ingredients: [
        { name: 'Tomates', quantity: '200 g' },
        { name: 'Œufs', quantity: '3 pièce' },
      ],
      instructions: 'Émincer puis mijoter.',
      editHref: '/catalogue/r-1/modifier',
    });
  });

  it('pour un effectif de trois, met les quantités à l’échelle et dit pour combien elle montre', () => {
    expect(toLoadedProps(RATATOUILLE, FROM_MENU.pour(3))).toEqual({
      status: 'loaded',
      title: 'Ratatouille',
      convivesLabel: 'Quantités pour 3 personnes · recette pour 4',
      ingredients: [
        { name: 'Tomates', quantity: '150 g' },
        { name: 'Œufs', quantity: '3 pièce' },
      ],
      instructions: 'Émincer puis mijoter.',
      editHref: '/catalogue/r-1/modifier?depuis=menu&pour=3',
    });
  });

  it('arrondit les pièces au supérieur au lieu de les couper en deux', () => {
    expect(toLoadedProps(RATATOUILLE, FROM_MENU.pour(2))).toMatchObject({
      ingredients: [
        { name: 'Tomates', quantity: '100 g' },
        { name: 'Œufs', quantity: '2 pièce' },
      ],
    });
  });

  it('accorde le singulier pour une personne, des deux côtés du libellé', () => {
    const pourUn = RecipeBuilder.aRecipe().withId('r-2').withConvivesReference(1).build();

    expect(toLoadedProps(RATATOUILLE, FROM_MENU.pour(1)).convivesLabel).toBe(
      'Quantités pour 1 personne · recette pour 4',
    );
    expect(toLoadedProps(pourUn, FROM_CATALOGUE).convivesLabel).toBe('Pour 1 personne');
  });

  it('un effectif dont les quantités ne se comptent pas montre la recette telle qu’écrite, comme un effectif inexploitable, et son lien Modifier n’emporte plus l’effectif', () => {
    const horsDePortee = RecipeBuilder.aRecipe()
      .withId('r-1')
      .withTitle('Ratatouille')
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Tomates')
          .withQuantity(200)
          .withUnit('g')
          .build(),
      ])
      .withInstructions('Émincer puis mijoter.')
      .build();

    expect(toLoadedProps(horsDePortee, FROM_MENU.pour(9007199254740991))).toEqual({
      status: 'loaded',
      title: 'Ratatouille',
      convivesLabel: 'Pour 4 personnes',
      ingredients: [{ name: 'Tomates', quantity: '200 g' }],
      instructions: 'Émincer puis mijoter.',
      editHref: '/catalogue/r-1/modifier?depuis=menu',
    });
  });

  it('rend l’absence de préparation telle quelle, sans l’inventer', () => {
    const sansPreparation = RecipeBuilder.aRecipe().withId('r-3').withoutInstructions().build();

    expect(toLoadedProps(sansPreparation, FROM_CATALOGUE).instructions).toBeNull();
  });
});
