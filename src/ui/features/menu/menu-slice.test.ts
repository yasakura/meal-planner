import { describe, it, expect } from 'vitest';

import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import {
  generateMenu,
  menuReducer,
  menuWindowSelected,
  refreshMenuRecipes,
  selectMenu,
  type MenuState,
} from './menu-slice';

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
      selectedDays: 14,
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
      // Jamais touchée par le cycle de génération : la fenêtre choisie reste celle de départ,
      // et NON l'argument passé au thunk.
      selectedDays: 14,
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

    // Fenêtre NON-défaut : sans ce gage, l'assertion sur selectedDays passerait aussi bien
    // si la transition rejected remettait le champ à sa valeur par défaut.
    store.dispatch(menuWindowSelected(7));

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
      selectedDays: 7,
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
      selectedDays: 14,
    });
  });

  it('catalogue vide : rejette avec le discriminant « no-recipes » sans appeler la génération', async () => {
    let generateCalled = false;
    const generate: GenerateMenu = async () => {
      generateCalled = true;
      return aMenu();
    };
    const store = createTestStore({ generateMenu: generate, listRecipes: async () => [] });

    // Fenêtre NON-défaut : gage l'assertion sur selectedDays contre un reset en rejected.
    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'no-recipes',
      selectedDays: 7,
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
      selectedDays: 7,
    };

    const next = menuReducer(errored, generateMenu.fulfilled({ menu, recipes }, 'req-1', 7));

    expect(next).toEqual({ status: 'success', menu, recipes, error: null, selectedDays: 7 });
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
      selectedDays: 7,
    };

    const next = menuReducer(dirty, generateMenu.pending('req-1', 7));

    expect(next).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
      // La transition qui efface TOUT le reste n'efface pas la fenêtre choisie.
      selectedDays: 7,
    });
  });

  it('la fenêtre choisie par défaut est « 2 semaines » (14 jours)', () => {
    const store = createTestStore();

    expect(selectMenu(store.getState()).selectedDays).toBe(14);
  });

  it('choisir une fenêtre met à jour la fenêtre choisie', () => {
    const store = createTestStore();

    store.dispatch(menuWindowSelected(7));

    expect(selectMenu(store.getState()).selectedDays).toBe(7);
  });

  /**
   * Règle au cœur de l'issue #28 : la fenêtre choisie est une PRÉFÉRENCE, pas un état
   * transitoire. Aucune transition du cycle de génération ne la remet à sa valeur par défaut —
   * ni `pending`, qui efface pourtant menu, recettes et erreur, ni `fulfilled`.
   */
  it('la fenêtre choisie survit à un cycle de génération complet (pending → fulfilled)', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    let resolveGenerate!: (menu: Menu) => void;
    const generated = new Promise<Menu>((resolve) => {
      resolveGenerate = resolve;
    });
    const store = createTestStore({
      generateMenu: () => generated,
      listRecipes: async () => recipes,
    });

    store.dispatch(menuWindowSelected(7));
    const inFlight = store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
    });

    resolveGenerate(menu);
    await inFlight;

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
    });
  });
  /**
   * Le menu affichait un INSTANTANÉ des recettes, figé à la génération. En arrivant sur l'écran,
   * les recettes sont RELUES et les titres rafraîchis — sans toucher au menu lui-même : les mêmes
   * repas, aux mêmes jours, avec les bons noms.
   */
  it('rafraîchir les recettes met à jour les recettes sans toucher au menu ni à la fenêtre choisie', async () => {
    const menu = aMenu();
    let catalogue = twoRecipes();
    const store = createTestStore({
      generateMenu: async () => menu,
      listRecipes: async () => catalogue,
    });

    // Fenêtre NON-défaut : sans ce gage, l'assertion sur selectedDays passerait aussi bien si le
    // rafraîchissement remettait la fenêtre à sa valeur par défaut.
    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    // Le catalogue a changé sous les pieds du menu : c'est exactement le titre modifié ailleurs.
    catalogue = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];

    await store.dispatch(refreshMenuRecipes());

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      // Le MÊME menu, intact : le rafraîchissement ne rejoue pas la génération.
      menu,
      recipes: catalogue,
      error: null,
      selectedDays: 7,
    });
  });

  /**
   * Décision produit : si la relecture ÉCHOUE (hors réseau en arrivant sur l'écran), le menu
   * affiché est CONSERVÉ avec ses anciens titres, sans message d'erreur. Un rafraîchissement que
   * l'utilisateur n'a pas demandé ne détruit pas un écran qui fonctionne, et ne lui affiche pas
   * une panne pour une action qu'il n'a pas faite.
   */
  it('un rafraîchissement en échec laisse le menu, les recettes et le statut inchangés', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    let failPhase = false;
    const store = createTestStore({
      generateMenu: async () => menu,
      listRecipes: async () => {
        if (failPhase) throw new Error('Boom firestore');
        return recipes;
      },
    });

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    failPhase = true;
    await store.dispatch(refreshMenuRecipes());

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      // Pas de message d'erreur : l'utilisateur n'a rien demandé.
      error: null,
      selectedDays: 7,
    });
  });

  it('sans menu à rafraîchir, aucune lecture du catalogue n’est déclenchée', async () => {
    let listCalls = 0;
    const store = createTestStore({
      listRecipes: async () => {
        listCalls += 1;
        return twoRecipes();
      },
    });

    await store.dispatch(refreshMenuRecipes());

    expect(listCalls).toBe(0);
    expect(selectMenu(store.getState())).toEqual({
      status: 'idle',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 14,
    });
  });
});
