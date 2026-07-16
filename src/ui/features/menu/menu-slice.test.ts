import { describe, it, expect } from 'vitest';

import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { generateMenu, menuReducer, selectMenu, type MenuState } from './menu-slice';

function aMenu(): Menu {
  return createMenu({
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ],
  });
}

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

describe('menu slice', () => {
  it('un store neuf est idle, sans menu ni recettes ni erreur', () => {
    const store = createTestStore();

    expect(selectMenu(store.getState())).toEqual({
      status: 'idle',
      menu: null,
      recipes: null,
      error: null,
    });
  });

  it('generateMenu réussi passe en success avec le menu et les recettes des deux use cases injectés', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    const generate: GenerateMenu = async () => menu;
    const list: ListRecipes = async () => recipes;
    const store = createTestStore({ generateMenu: generate, listRecipes: list });

    await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
    });
  });

  it('generateMenu transmet le nombre de jours au use case de génération', async () => {
    let received: { days: number } | null = null;
    const generate: GenerateMenu = async (input) => {
      received = input;
      return aMenu();
    };
    const store = createTestStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(generateMenu(5));

    expect(received).toEqual({ days: 5 });
  });

  it('generateMenu en échec, depuis un menu déjà affiché, repart en error en effaçant menu/recettes et porte le message', async () => {
    const menu = aMenu();
    let failPhase = false;
    const generate: GenerateMenu = ({ days }) => {
      void days;
      if (failPhase) return Promise.reject(new Error('Boom firestore'));
      return Promise.resolve(menu);
    };
    const store = createTestStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(generateMenu(7));
    // état peuplé : un menu et des recettes sont affichés
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    failPhase = true;
    await store.dispatch(generateMenu(7));

    // le null vient de la transition (pending), pas de l'initialState : rejected ne reset pas.
    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'Boom firestore',
    });
  });

  it('une génération en vol, depuis un menu déjà affiché, repart en loading en effaçant menu/recettes', async () => {
    const menu = aMenu();
    let pendingPhase = false;
    const generate: GenerateMenu = ({ days }) => {
      void days;
      if (pendingPhase) return new Promise<Menu>(() => {});
      return Promise.resolve(menu);
    };
    const store = createTestStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(generateMenu(7));
    // état peuplé
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    pendingPhase = true;
    void store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
    });
  });

  it('catalogue vide : rejette avec le discriminant « no-recipes » sans appeler la génération', async () => {
    let generateCalled = false;
    const generate: GenerateMenu = async () => {
      generateCalled = true;
      return aMenu();
    };
    const store = createTestStore({ generateMenu: generate, listRecipes: async () => [] });

    await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'no-recipes',
    });
    expect(generateCalled).toBe(false);
  });

  // [guard] tue le mutant `state.error = null` de la transition FULFILLED :
  // un menu regénéré avec succès efface l'erreur périmée d'une tentative précédente.
  it('generateMenu réussi depuis un état en erreur efface l’erreur périmée', () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    const errored: MenuState = {
      status: 'error',
      menu: null,
      recipes: null,
      error: 'Impossible de générer un menu sans recette',
    };

    const next = menuReducer(errored, generateMenu.fulfilled({ menu, recipes }, 'req-1', 7));

    expect(next).toEqual({ status: 'success', menu, recipes, error: null });
  });

  // [guard] tue les mutants de reset de la transition PENDING (`state.error = null`,
  // `state.menu = null`, `state.recipes = null`) : on part d'un état SALE peuplé
  // (erreur + menu + recettes non-null) ; une régénération efface tout avant de
  // repartir en chargement.
  it('une régénération (generateMenu.pending) efface l’erreur périmée, le menu et les recettes', () => {
    const dirty: MenuState = {
      status: 'error',
      menu: aMenu(),
      recipes: twoRecipes(),
      error: 'Impossible de générer un menu sans recette',
    };

    const next = menuReducer(dirty, generateMenu.pending('req-1', 7));

    expect(next).toEqual({ status: 'loading', menu: null, recipes: null, error: null });
  });
});
